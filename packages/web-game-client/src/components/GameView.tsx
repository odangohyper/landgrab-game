import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { MainGameScene } from '../game/scenes/MainGameScene';
import { GameState, PlayerState, CardInstance, Action, CardTemplate, Deck, SelectedAction } from '../types';
import HandView from './HandView';
import DeckInfo from './DeckInfo';
import Modal from './Modal';
import { launch } from '../game/PhaserGame';
import { createMatch, writeState, watchMatchData, fetchCardTemplates } from '../api/realtimeClient';
import { NullAuthAdapter } from '../auth/NullAuthAdapter';
import { database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import Phaser from 'phaser';
import { choose_card } from '../game/ai/ai';
import { getDeck } from '../api/deckApi';

// Import recommended decks directly to bypass fetch issues
import recommendedDeck1 from '../../public/decks/recommended_deck_1.json';
import recommendedDeck2 from '../../public/decks/recommended_deck_2.json';
import recommendedDeck3 from '../../public/decks/recommended_deck_3.json';

const recommendedDecksMap: { [key: string]: Deck } = {
  'recommended_1': recommendedDeck1,
  'recommended_2': recommendedDeck2,
  'recommended_3': recommendedDeck3,
};

interface GameViewProps {
  selectedDeckId: string | null;
}

const MAX_STACK_IMAGES = 6;
const STACK_OFFSET_X = 2;
const STACK_OFFSET_Y = 2;

const GameView: React.FC<GameViewProps> = ({ selectedDeckId }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<CardInstance[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [cardTemplates, setCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPhaserReady, setIsPhaserReady] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const previousGameStateRef = useRef<GameState | null>(null);
  const [playerFundsGlow, setPlayerFundsGlow] = useState<'increase' | 'decrease' | 'none'>('none');
  const [playerPropertiesGlow, setPlayerPropertiesGlow] = useState<'increase' | 'decrease' | 'none'>('none');
  const [opponentFundsGlow, setOpponentFundsGlow] = useState<'increase' | 'decrease' | 'none'>('none');
  const [opponentPropertiesGlow, setOpponentPropertiesGlow] = useState<'increase' | 'decrease' | 'none'>('none');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalContent, setModalContent] = useState<'deck' | 'discard' | null>(null);

  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const isResolvingTurnRef = useRef(false);

  const selectedDeckIdRef = useRef(selectedDeckId);
  useEffect(() => {
    selectedDeckIdRef.current = selectedDeckId;
  }, [selectedDeckId]);

  useEffect(() => {
    if (playerFundsGlow !== 'none') {
      const timer = setTimeout(() => setPlayerFundsGlow('none'), 700); // Glow duration
      return () => clearTimeout(timer);
    }
  }, [playerFundsGlow]);

  useEffect(() => {
    if (playerPropertiesGlow !== 'none') {
      const timer = setTimeout(() => setPlayerPropertiesGlow('none'), 700);
      return () => clearTimeout(timer);
    }
  }, [playerPropertiesGlow]);

  useEffect(() => {
    if (opponentFundsGlow !== 'none') {
      const timer = setTimeout(() => setOpponentFundsGlow('none'), 700);
      return () => clearTimeout(timer);
    }
  }, [opponentFundsGlow]);

  useEffect(() => {
    if (opponentPropertiesGlow !== 'none') {
      const timer = setTimeout(() => setOpponentPropertiesGlow('none'), 700);
      return () => clearTimeout(timer);
    }
  }, [opponentPropertiesGlow]);

  useEffect(() => {
    if (phaserContainerRef.current && !gameRef.current) {
      console.log("GameView: Launching Phaser...");
      const gameInstance = launch(phaserContainerRef.current);
      gameRef.current = gameInstance;
      setIsPhaserReady(true);

      const handleStartGame = async () => {
        console.log("Phaser event 'startGame' received. Initializing game logic...");
        if (!selectedDeckIdRef.current) {
          console.error("handleStartGame: No deck selected. Cannot start game.");
          alert("対戦を開始するには、まず「デッキ構築」画面でデッキを選択してください。");
          gameRef.current?.scene.getScene('TitleScene')?.scene.restart();
          return;
        }

        const authAdapter = new NullAuthAdapter();
        const currentClientId = authAdapter.getClientId();
        setClientId(currentClientId);

        if (gameRef.current) {
          gameRef.current.registry.set('clientId', currentClientId);
          console.log(`Set clientId in registry: ${currentClientId}`);
        } else {
          console.error("handleStartGame: gameRef.current is null, cannot set clientId in registry.");
        }

        const npcId = 'npc-player-id';
        setOpponentId(npcId);

        console.log("handleStartGame: Fetching required data...");
        const fetchedCardTemplates = await fetchCardTemplates();
        setCardTemplates(fetchedCardTemplates);
        gameInstance.registry.set('cardTemplates', fetchedCardTemplates);
        console.log("Card templates set in registry.");

        if (gameRef.current) {
          console.log("Transitioning to MainGameScene...");
          gameRef.current.scene.start('MainGameScene');
        } else {
          console.error("handleStartGame: gameRef.current is null, cannot start MainGameScene.");
        }

        let playerDeckPromise;
        if (selectedDeckIdRef.current && recommendedDecksMap[selectedDeckIdRef.current]) {
          console.log(`handleStartGame: Using imported recommended deck: ${selectedDeckIdRef.current}`);
          playerDeckPromise = Promise.resolve(recommendedDecksMap[selectedDeckIdRef.current]);
        } else {
          console.log(`handleStartGame: Fetching user deck from API: ${selectedDeckIdRef.current}`);
          playerDeckPromise = getDeck(selectedDeckIdRef.current!);
        }

        const npcDeckPromise = fetch('/decks/npc_default_deck.json').then(res => res.json());

        const [loadedPlayerDeck, loadedNpcDeck] = await Promise.all([
          playerDeckPromise,
          npcDeckPromise
        ]).catch(error => {
          console.error("handleStartGame: Failed to load decks:", error);
          return [null, null];
        });

        if (!loadedPlayerDeck || !loadedNpcDeck) {
          console.error("handleStartGame: A required deck is missing. Aborting.");
          return;
        }
        
        const currentMatchId = await createMatch();
        setMatchId(currentMatchId);

        const initialGameState = GameEngine.createInitialState(currentClientId, npcId, fetchedCardTemplates, loadedPlayerDeck, loadedNpcDeck);
        engineRef.current = new GameEngine(initialGameState, fetchedCardTemplates);

        watchMatchData(currentMatchId, async (data) => {
            console.log(`WATCH: Data received. Phase: ${data?.state?.phase}, Actions exist: ${!!data?.actions}`);
            const { state: dbGameState, actions } = data;
            if (!dbGameState || !engineRef.current) return;

            const previousGameState = previousGameStateRef.current;

            engineRef.current.setState(dbGameState);
            setGameState(dbGameState);
            const currentPlayerState = dbGameState.players.find((p) => p.playerId === currentClientId);
            const currentOpponentState = dbGameState.players.find((p) => p.playerId === opponentId);

            if (currentPlayerState) {
              setPlayerHand(currentPlayerState.hand);
              if (previousGameState) {
                const prevPlayerState = previousGameState.players.find((p) => p.playerId === currentClientId);
                if (prevPlayerState) {
                  setPlayerFundsGlow(currentPlayerState.funds > prevPlayerState.funds ? 'increase' : currentPlayerState.funds < prevPlayerState.funds ? 'decrease' : 'none');
                  setPlayerPropertiesGlow(currentPlayerState.properties > prevPlayerState.properties ? 'increase' : currentPlayerState.properties < prevPlayerState.properties ? 'decrease' : 'none');
                }
              }
            }

            if (currentOpponentState && previousGameState) {
              const prevOpponentState = previousGameState.players.find((p) => p.playerId === opponentId);
              if (prevOpponentState) {
                setOpponentFundsGlow(currentOpponentState.funds > prevOpponentState.funds ? 'increase' : currentOpponentState.funds < prevOpponentState.funds ? 'decrease' : 'none');
                setOpponentPropertiesGlow(currentOpponentState.properties > prevOpponentState.properties ? 'increase' : currentOpponentState.properties < prevOpponentState.properties ? 'decrease' : 'none');
              }
            }

            const playerAction = actions ? actions[currentClientId] : undefined;
            const opponentAction = actions ? actions[npcId] : undefined;

            if (playerAction && opponentAction && dbGameState.phase === 'ACTION') {
              console.log('WATCH: Both actions found, applying...');
              const engineForApply = new GameEngine(dbGameState, fetchedCardTemplates);
              const newState = engineForApply.applyAction(playerAction, opponentAction);
              await writeState(currentMatchId, newState);
              previousGameStateRef.current = dbGameState; // Update ref here as well
              return;
            }

            if ((dbGameState.phase === 'RESOLUTION' || dbGameState.phase === 'GAME_OVER') && !isResolvingTurnRef.current) {
              isResolvingTurnRef.current = true;
              console.log('%cWATCH: State is RESOLUTION, starting animation...', 'color: cyan; font-weight: bold;');

              gameRef.current?.registry.set('lastActions', dbGameState.lastActions);
              const mainGameScene = gameRef.current?.scene.getScene('MainGameScene') as MainGameScene;
              if (mainGameScene && mainGameScene.scene.isActive()) {
                mainGameScene.displayTurnActions(dbGameState.lastActions);
              }

              await new Promise<void>(resolve => gameRef.current?.events.once('animationComplete', () => resolve()));
              console.log('WATCH: Animation complete.');

              if (dbGameState.result !== 'IN_PROGRESS') {
                console.log('WATCH: Game is over, displaying result.');
                let message: string;
                let isWin: boolean = false;
                const playerIsP1 = dbGameState.players[0].playerId === currentClientId;
                const result = playerIsP1 ? dbGameState.result :
                               dbGameState.result === 'WIN' ? 'LOSE' :
                               dbGameState.result === 'LOSE' ? 'WIN' : 'DRAW';

                switch (result) {
                  case 'WIN': message = 'You Win!'; isWin = true; break;
                  case 'LOSE': message = 'You Lose!'; break;
                  case 'DRAW': message = 'Draw!'; break;
                  default: message = 'Game Over (Unknown Result)'; break;
                }
                gameRef.current?.events.emit('gameOver', message, isWin);
              } else {
                console.log('WATCH: Game not over, advancing turn.');
                const engineForAdvance = new GameEngine(dbGameState, fetchedCardTemplates);
                const nextTurnState = engineForAdvance.advanceTurn();
                await set(ref(database, `matches/${currentMatchId}/actions`), null);
                await writeState(currentMatchId, nextTurnState);
              }

              isResolvingTurnRef.current = false;
              previousGameStateRef.current = dbGameState; // Update ref here
              return;
            }
            previousGameStateRef.current = dbGameState; // Update ref here for all cases
          });

          console.log("handleStartGame: Writing initial state...");
          const gameStateWithInitialHand = engineRef.current.advanceTurn();
          await writeState(currentMatchId, gameStateWithInitialHand);
          setGameStarted(true);
          console.log("handleStartGame: Initial game state written to DB and game started.");
      };

      gameInstance.events.on('startGame', handleStartGame);

      return () => {
        console.log("GameView Cleanup: Destroying Phaser game instance and event listeners.");
        gameInstance.events.off('startGame', handleStartGame);
        if (gameRef.current && gameRef.current.isBooted) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
      };
    }
  }, []);

  const handleActionSelect = (action: SelectedAction | null) => {
    setSelectedAction(action);
    const mainGameScene = gameRef.current?.scene.getScene('MainGameScene') as MainGameScene;
    if (mainGameScene) {
      mainGameScene.displaySelectedCardBack(action !== null);
    }
  };

  const handlePlayTurn = async () => {
    if (gameState?.phase !== 'ACTION' || !matchId || !clientId || !opponentId || !selectedAction) return;

    setIsResolving(true);

    let player1Action: Action | null = null;
    if (selectedAction.type === 'play_card') {
      player1Action = { playerId: clientId, actionType: 'play_card', cardUuid: selectedAction.cardUuid };
    } else if (selectedAction.type === 'collect_funds') {
      player1Action = { playerId: clientId, actionType: 'collect_funds' };
    }

    if (!player1Action) {
      console.warn('handlePlayTurn: Player action is null, aborting.');
      setIsResolving(false);
      return;
    }

    const npcPlayerState = gameState.players.find(p => p.playerId === opponentId);
    let player2Action: Action | null = null;
    if (npcPlayerState && gameState) {
      player2Action = choose_card(gameState, npcPlayerState.hand, Date.now(), cardTemplates);
    }

    if (!player2Action) {
      console.log('NPC action was null, defaulting to collect_funds.');
      player2Action = { playerId: opponentId!, actionType: 'collect_funds' };
    }

    const mainGameScene = gameRef.current?.scene.getScene('MainGameScene') as MainGameScene;
    if (mainGameScene) {
      await mainGameScene.animateAndResolveTurn(player1Action, player2Action);
    }

    const actionsToSubmit: { [key: string]: Action } = {
      [clientId]: player1Action,
      [opponentId]: player2Action,
    };

    await set(ref(database, `matches/${matchId}/actions`), actionsToSubmit);
    setSelectedAction(null);
    setIsResolving(false);
  };

  const currentPlayerState = gameState?.players.find(p => p.playerId === clientId);
  const opponentState = gameState?.players.find(p => p.playerId === opponentId);
  const playableCardUuids = currentPlayerState && gameState && cardTemplates
    ? new GameEngine(gameState, cardTemplates).getPlayableCards(currentPlayerState).map(card => card.uuid)
    : [];

  const logsToRender = (() => {
    if (!gameState) return [];
    const logsWithOriginalIndex = gameState.log.map((text, index) => ({ text, originalIndex: index }));
    const lastTurnMarkerIndex = gameState.log.findLastIndex((log: string) => log.startsWith('ターン'));
    const slicedLogs = logsWithOriginalIndex.slice(-6);
    return slicedLogs.map(logItem => ({
      ...logItem,
      isLatest: lastTurnMarkerIndex === -1 || logItem.originalIndex >= lastTurnMarkerIndex,
    })).reverse();
  })();

  const handleDeckClick = () => {
    setModalTitle('山札');
    setModalContent('deck');
    setIsModalOpen(true);
  };

  const handleDiscardClick = () => {
    setModalTitle('捨て札');
    setModalContent('discard');
    setIsModalOpen(true);
  };

  return (
    <div className="game-container">
      <div className="main-area">
        <div id="phaser-game-container" ref={phaserContainerRef}></div>
        {gameStarted && gameState && (
          <>
            {opponentState && (
              <div className="hud opponent-hud">
                <h2>対戦相手</h2>
                <p className={opponentFundsGlow === 'increase' ? 'glow-blue' : opponentFundsGlow === 'decrease' ? 'glow-red' : ''}>資金: {opponentState.funds}</p>
                <p className={opponentPropertiesGlow === 'increase' ? 'glow-blue' : opponentPropertiesGlow === 'decrease' ? 'glow-red' : ''}>不動産: {opponentState.properties}</p>
              </div>
            )}
            {opponentState && (
              <div className="hud opponent-deck-area">
                <h2>山札：{opponentState.deck.length}枚</h2>
                {Array.from({ length: Math.min(opponentState.deck.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`opponent-deck-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
            {opponentState && (
              <div className="hud opponent-discard-area">
                <h2>捨札：{opponentState.discard.length}枚</h2>
                {Array.from({ length: Math.min(opponentState.discard.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`opponent-discard-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
            {currentPlayerState && (
              <div className="hud player-hud">
                <h2>プレイヤー</h2>
                <p className={playerFundsGlow === 'increase' ? 'glow-blue' : playerFundsGlow === 'decrease' ? 'glow-red' : ''}>資金: {currentPlayerState.funds}</p>
                <p className={playerPropertiesGlow === 'increase' ? 'glow-blue' : playerPropertiesGlow === 'decrease' ? 'glow-red' : ''}>不動産: {currentPlayerState.properties}</p>
              </div>
            )}
            {currentPlayerState && (
              <div className="hud player-deck-area clickable" onClick={handleDeckClick}>
                <h2>山札：{currentPlayerState.deck.length}枚</h2>
                {Array.from({ length: Math.min(currentPlayerState.deck.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`player-deck-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
            {currentPlayerState && (
              <div className="hud player-discard-area clickable" onClick={handleDiscardClick}>
                <h2>捨札：{currentPlayerState.discard.length}枚</h2>
                {Array.from({ length: Math.min(currentPlayerState.discard.length, MAX_STACK_IMAGES) }).map((_, index) => (
                  <img
                    key={`player-discard-${index}`}
                    src="images/cards/card_back.jpg"
                    alt="Card Back"
                    className="card-stack-image"
                    style={{
                      transform: `translate(calc(-50% + ${index * STACK_OFFSET_X}px), calc(-50% + ${index *STACK_OFFSET_Y}px))`,
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {gameStarted && gameState && (
        <div className="player-area">
          <div className="bottom-panel">
            <div className="game-log-area">
              <div className="log-entries">
                {logsToRender.map((logItem) => (
                  <p key={logItem.originalIndex} className={logItem.isLatest ? 'latest-log' : ''}>{logItem.text}</p>
                ))}
              </div>
            </div>
            <HandView
              hand={playerHand}
              onActionSelect={handleActionSelect} // Corrected prop name
              playableCardUuids={playableCardUuids} // Corrected prop name
              cardTemplates={cardTemplates}
              selectedAction={selectedAction} // Corrected prop name
              playerId={clientId || ''}
            />
            <div className="action-bar">
              <div
                id="gain-funds-button"
                className={`action-card-item ${selectedAction?.type === 'collect_funds' ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedAction?.type === 'collect_funds') {
                    handleActionSelect(null);
                  } else {
                    handleActionSelect({ type: 'collect_funds' });
                  }
                }}
              >
                <p className="action-card-name">資金集め</p>
              </div>
              <button onClick={handlePlayTurn} disabled={!selectedAction || isResolving || (gameState?.phase !== 'ACTION')} className="play-button">
                {isResolving ? '解決中...' : 'Play Turn'}
              </button>
            </div>
          </div>
        </div>
      )}
      {!isPhaserReady && !gameStarted && (
        <div className="loading-overlay visible">
          <p>Loading...</p>
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        {modalContent === 'deck' && currentPlayerState && (
          <DeckInfo cards={currentPlayerState.deck} cardTemplates={cardTemplates} isDeck={true} />
        )}
        {modalContent === 'discard' && currentPlayerState && (
          <DeckInfo cards={currentPlayerState.discard} cardTemplates={cardTemplates} isDeck={false} />
        )}
      </Modal>
    </div>
  );
};

export default GameView;
