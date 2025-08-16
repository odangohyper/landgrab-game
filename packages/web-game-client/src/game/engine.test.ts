// packages/web-game-client/src/game/engine.test.ts

// テスト対象となるゲームの状態（GameState）、プレイヤーの状態（PlayerState）、
// プレイヤーが実行するアクション（Action）、カード（Card）、
// そしてカードのテンプレート（CardTemplate）の型定義をインポートします。
import { GameState, PlayerState, Action, Card, CardTemplate } from '../types';
// テストの主役であるGameEngineクラスをインポートします。
import { GameEngine } from './engine';

// Jestフレームワークのdescribeブロックを使用して、
// GameEngineクラスに関連するテストケースをグループ化します。
describe('GameEngine', () => {
  // 各テストで再利用する、ゲームの初期状態を保持する変数です。
  let initialState: GameState;
  // テスト対象のGameEngineインスタンスを保持する変数です。
  let engine: GameEngine;
  // テストで使用するモック（模擬）のカードテンプレートです。
  // 実際のゲームロジックをテストするために、必要なカードを定義します。
  const mockCardTemplates: { [key: string]: CardTemplate } = {
    'ACQUIRE': { templateId: 'ACQUIRE', name: '買収', cost: 2, type: 'ACQUIRE' },           // 資産を奪うカード
    'DEFEND': { templateId: 'DEFEND', name: '防衛', cost: 0, type: 'DEFEND' },             // 買収から資産を守るカード
    'FRAUD': { templateId: 'FRAUD', name: '詐欺', cost: 1, type: 'FRAUD' },             // 詐欺を働くカード
    'BRIBE': { templateId: 'BRIBE', name: '賄賂', cost: 5, type: 'BRIBE' },             // 防御・詐欺を無視して買収するカード
    'INVEST': { templateId: 'INVEST', name: '投資', cost: 1, type: 'INVEST' },           // 資金を3得るカード
  };

  // 各テストケースが実行される前に毎回実行される設定処理です。
  // これにより、各テストがクリーンな状態から開始されることが保証されます。
  beforeEach(() => {
    // 2人のプレイヤーを持つゲームの初期状態を生成します。
    // 'player1-id' と 'player2-id' はプレイヤーの識別子です。
    initialState = GameEngine.createInitialState('player1-id', 'player2-id', mockCardTemplates);
    // 生成した初期状態とモックカードテンプレートで、GameEngineのインスタンスを作成します。
    engine = new GameEngine(initialState, mockCardTemplates);
  });

  // `it`ブロックは、単一のテストケースを定義します。
  // テストの目的を説明するわかりやすい名前を付けます。
  it('should create an initial game state correctly', () => {
    // エンジンの現在の状態を取得します。
    const state = engine.getState();
    // 初期状態が正しく設定されていることを検証（アサート）します。
    // `matchId`が一意に定義されていること。
    expect(state.matchId).toBeDefined();
    // `turn`が初期値の0であること。
    expect(state.turn).toBe(0);
    // ゲームのフェーズが`DRAW`フェーズで始まっていること。
    expect(state.phase).toBe('DRAW');
    // プレイヤーが2人いること。
    expect(state.players.length).toBe(2);

    // プレイヤー1とプレイヤー2の状態を検索して取得します。
    const player1 = state.players.find(p => p.playerId === 'player1-id');
    const player2 = state.players.find(p => p.playerId === 'player2-id');

    // プレイヤー1が存在すること。
    expect(player1).toBeDefined();
    // プレイヤー1の初期資金が2であること。
    expect(player1?.funds).toBe(0);
    // プレイヤー1の初期資産が1であること。
    expect(player1?.properties).toBe(1);
    // プレイヤー1のデッキが10枚であること。
    expect(player1?.deck.length).toBe(10);
    // 各カードが2枚ずつあることを確認
    expect(player1?.deck.filter(c => c.templateId === 'ACQUIRE').length).toBe(2);
    expect(player1?.deck.filter(c => c.templateId === 'DEFEND').length).toBe(2);
    expect(player1?.deck.filter(c => c.templateId === 'FRAUD').length).toBe(2);
    expect(player1?.deck.filter(c => c.templateId === 'BRIBE').length).toBe(2);
    expect(player1?.deck.filter(c => c.templateId === 'INVEST').length).toBe(2);

    // プレイヤー2の状態も同様に検証します。
    expect(player2).toBeDefined();
    expect(player2?.funds).toBe(0);
    expect(player2?.properties).toBe(1);
    // プレイヤー2のデッキが10枚であること。
    expect(player2?.deck.length).toBe(10);
    // 各カードが2枚ずつあることを確認
    expect(player2?.deck.filter(c => c.templateId === 'ACQUIRE').length).toBe(2);
    expect(player2?.deck.filter(c => c.templateId === 'DEFEND').length).toBe(2);
    expect(player2?.deck.filter(c => c.templateId === 'FRAUD').length).toBe(2);
    expect(player2?.deck.filter(c => c.templateId === 'BRIBE').length).toBe(2);
    expect(player2?.deck.filter(c => c.templateId === 'INVEST').length).toBe(2);
  });

  it('should hydrate player arrays in constructor if they are null/undefined', () => {
    const stateWithNullArrays: GameState = {
      ...initialState,
      players: [
        { ...initialState.players[0], hand: null as any, deck: null as any, discard: null as any },
        { ...initialState.players[1], hand: undefined as any, deck: undefined as any, discard: undefined as any },
      ],
    };
    const hydratedEngine = new GameEngine(stateWithNullArrays, mockCardTemplates);
    const state = hydratedEngine.getState();
    expect(state.players[0].hand).toEqual([]);
    expect(state.players[0].deck).toEqual([]);
    expect(state.players[0].discard).toEqual([]);
    expect(state.players[1].hand).toEqual([]);
    expect(state.players[1].deck).toEqual([]);
    expect(state.players[1].discard).toEqual([]);
  });

  it('should hydrate lastActions in constructor if it is null/undefined', () => {
    const stateWithNullLastActions: GameState = {
      ...initialState,
      lastActions: null as any,
    };
    const hydratedEngine = new GameEngine(stateWithNullLastActions, mockCardTemplates);
    const state = hydratedEngine.getState();
    expect(state.lastActions).toEqual([]);

    const stateWithUndefinedLastActions: GameState = {
      ...initialState,
      lastActions: undefined as any,
    };
    const hydratedEngine2 = new GameEngine(stateWithUndefinedLastActions, mockCardTemplates);
    const state2 = hydratedEngine2.getState();
    expect(state2.lastActions).toEqual([]);
  });

  it('should discard the entire hand and draw 3 new cards when advancing turn', () => {
    // ターン1: プレイヤーは3枚のカードを引く
    let stateAfterTurn1 = engine.advanceTurn();
    let player1 = stateAfterTurn1.players[0];
    expect(player1.hand.length).toBe(3);

    // ターン1のアクションフェーズをシミュレート: プレイヤーは1枚カードを使用
    const cardUsed = player1.hand.pop()!;
    player1.discard.push(cardUsed);
    expect(player1.hand.length).toBe(2); // ターン終了時、手札は2枚
    const remainingHandIds = player1.hand.map(c => c.id);

    // この変更された状態で新しいエンジンを作成して、次のターンに進める
    const engineForTurn2 = new GameEngine(stateAfterTurn1, mockCardTemplates);
    const stateAfterTurn2 = engineForTurn2.advanceTurn();
    const updatedPlayer1 = stateAfterTurn2.players[0];

    // ターン2: 新しい手札は3枚になっているか
    expect(updatedPlayer1.hand.length).toBe(3);

    // ターン1の残りの手札(2枚)が捨て札に移動しているか
    remainingHandIds.forEach(cardId => {
      expect(updatedPlayer1.discard).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: cardId })
      ]));
    });

    // ターン2の新しい手札に、ターン1のカードが含まれていないか
    updatedPlayer1.hand.forEach(card => {
      expect(remainingHandIds).not.toContain(card.id);
    });
  });

  it('should reshuffle discard pile into deck when deck is empty', () => {
    // 現在のゲーム状態を取得します。
    const state = engine.getState();
    // プレイヤー1の状態を取得します。
    const player1 = state.players[0];
    // プレイヤー1の手札を空にします。
    player1.hand = [];
    // デッキにあるすべてのカードを捨て札に移動させます。
    player1.discard = [...player1.deck]; 
    // デッキを空にします。
    player1.deck = [];
    
    // 変更した状態を持つ新しいGameEngineインスタンスを作成します。
    const testEngine = new GameEngine(state, mockCardTemplates);
    // ターンを進めます。このとき、デッキが空なので捨て札がデッキにシャッフルされるはずです。
    const newState = testEngine.advanceTurn();
    
    // 更新されたプレイヤー1の状態を取得します。
    const updatedPlayer1 = newState.players[0];
    // デッキが空ではなくなっていることを検証します。
    expect(updatedPlayer1.deck.length).toBeGreaterThan(0);
    // 捨て札が空になっていることを検証します。
    expect(updatedPlayer1.discard.length).toBe(0);
    // 手札が3枚になっていることを検証します。
    expect(updatedPlayer1.hand.length).toBe(3);
  });

  // アクション解決のシナリオをグループ化するためのdescribeブロックです。
  describe('Action Resolution Scenarios', () => {
    // 各シナリオで使用するプレイヤーの状態とゲームの状態を保持する変数です。
    let player1: PlayerState;
    let player2: PlayerState;
    let testState: GameState;

    // 各アクション解決テストケースの前に実行される共通のセットアップです。
    beforeEach(() => {
      // 初期状態をディープコピーして、各テストが独立した状態から開始されるようにします。
      testState = JSON.parse(JSON.stringify(initialState));
      // プレイヤー1とプレイヤー2の参照を取得します。
      player1 = testState.players.find(p => p.playerId === 'player1-id')!;
      player2 = testState.players.find(p => p.playerId === 'player2-id')!;
    });
    
    it('should not apply card effect if card template is not found', () => {
      const player1 = testState.players.find(p => p.playerId === 'player1-id')!;
      const player2 = testState.players.find(p => p.playerId === 'player2-id')!;
      const nonExistentCard: Card = { id: 'non-existent', templateId: 'NON_EXISTENT_CARD' };
      // Directly call applyCardEffect with a non-existent template
      // This is a private method, so we cast to any for testing purposes 
      (engine as any).applyCardEffect(testState, player1, nonExistentCard, player2);
      // Assert that no changes occurred
      expect(player1.funds).toBe(0);
      expect(player1.properties).toBe(1);
      expect(player2.funds).toBe(0);
      expect(player2.properties).toBe(1);
    });

    it('should nullify both actions in an ACQUIRE vs ACQUIRE conflict', () => {
      // プレイヤー1と2の両方に「買収」カードを持たせ、資金を2に設定します。
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'ACQUIRE' }];
      player2.funds = 2;

      // このテスト用のGameEngineインスタンスを作成します。
      const testEngine = new GameEngine(testState, mockCardTemplates);
      // プレイヤー1と2のアクションを定義します。
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      // 両プレイヤーのアクションを適用します。
      const newState = testEngine.applyAction(p1Action, p2Action);

      // 更新されたプレイヤー1と2の状態を取得します。
      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      // 両者「買収」の場合、両方のアクションが無効になり、資産が変化しないことを検証します。
      expect(newPlayer1.properties).toBe(1); // 変化なし
      expect(newPlayer2.properties).toBe(1); // 変化なし
    });

    it('should nullify ACQUIRE with DEFEND', () => {
      // プレイヤー1に「買収」カード、プレイヤー2に「防衛」カードを持たせます。
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'DEFEND' }];
      player2.funds = 0; // 防衛はコスト0

      // このテスト用のGameEngineインスタンスを作成します。
      const testEngine = new GameEngine(testState, mockCardTemplates);
      // アクションを定義します。
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      // アクションを適用します。
      const newState = testEngine.applyAction(p1Action, p2Action);

      // 更新されたプレイヤー1と2の状態を取得します。
      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      // 「防衛」により「買収」が無効になり、資産が変化しないことを検証します。
      expect(newPlayer1.properties).toBe(1); // 変化なし
      expect(newPlayer2.properties).toBe(1); // 変化なし
    });

    it('should nullify ACQUIRE with FRAUD and let FRAUD succeed', () => {
      // プレイヤー1に「買収」カード、プレイヤー2に「詐欺」カードを持たせます。
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;
      player2.hand = [{ id: 'p2card', templateId: 'FRAUD' }];
      player2.funds = 1; // 詐欺のコスト

      // このテスト用のGameEngineインスタンスを作成します。
      const testEngine = new GameEngine(testState, mockCardTemplates);
      // アクションを定義します。
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      // アクションを適用します。
      const newState = testEngine.applyAction(p1Action, p2Action);

      // 更新されたプレイヤー1と2の状態を取得します。
      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      // 「詐欺」が「買収」を無効化し、かつ「詐欺」が成功して資産を奪い合うことを検証します。
      expect(newPlayer1.properties).toBe(0); // 詐欺により資産を失う
      expect(newPlayer2.properties).toBe(2); // 詐欺により資産を得る
    });

    it('should resolve COLLECT_FUNDS command correctly', () => {
      // プレイヤー1の資金を0に設定します。
      player1.funds = 0;
      // プレイヤー2の資金を0に設定します。
      player2.funds = 0;

      // このテスト用のGameEngineインスタンスを作成します。
      const testEngine = new GameEngine(testState, mockCardTemplates);
      // プレイヤー1は「資金集め」コマンドを実行し、プレイヤー2は何もプレイしないとします。
      const p1Action: Action = { playerId: 'player1-id', actionType: 'collect_funds' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'collect_funds' }; // NPC also collects funds
      // アクションを適用し、新しいゲーム状態を取得します。
      const newState = testEngine.applyAction(p1Action, p2Action);

      // 更新されたプレイヤー1と2の状態を取得します。
      const newPlayer1 = newState.players[0];
      const newPlayer2 = newState.players[1];

      // プレイヤー1の資金が0から「資金集め」により1増えて1になっていることを検証します。
      expect(newPlayer1.funds).toBe(1); // 0 + 1 = 1
      // プレイヤー1の資産が変化しないことを検証します。
      expect(newPlayer1.properties).toBe(1);
      // プレイヤー2の資金が0から「資金集め」により1増えて1になっていることを検証します。
      expect(newPlayer2.funds).toBe(1); // 0 + 1 = 1
      // プレイヤー2の資産が変化しないことを検証します。
      expect(newPlayer2.properties).toBe(1);
      // ゲームログに両プレイヤーの「資金集め」が記録されていることを検証します。
      expect(newState.log).toContain('プレイヤーは「資金集め」コマンドを実行した');
      expect(newState.log).toContain('対戦相手は「資金集め」コマンドを実行した');
    });

    it('should resolve ACQUIRE successfully when opponent plays nothing', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const newState = testEngine.applyAction(p1Action, null);

      expect(newState.players[0].properties).toBe(2); // 資産が1増える
      expect(newState.players[1].properties).toBe(0); // 相手の資産が1減る
      expect(newState.log).toContain('プレイヤーの行動「買収」');
      expect(newState.log).toContain('プレイヤーの買収は成功した！');
    });

    it('should resolve ACQUIRE successfully when opponent collects funds', () => {
      player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
      player1.funds = 2;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'collect_funds' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      expect(newState.players[0].properties).toBe(2); // 資産が1増える
      expect(newState.players[1].properties).toBe(0); // 相手の資産が1減る
      expect(newState.players[1].funds).toBe(1); // 相手の資金が増える
      expect(newState.log).toContain('プレイヤーの行動「買収」');
      expect(newState.log).toContain('プレイヤーの買収は成功した！');
      expect(newState.log).toContain('対戦相手は「資金集め」コマンドを実行した');
    });

    it('should resolve opponent ACQUIRE successfully when player plays nothing', () => {
      player2.hand = [{ id: 'p2card', templateId: 'ACQUIRE' }];
      player2.funds = 2;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      const newState = testEngine.applyAction(null, p2Action);

      expect(newState.players[1].properties).toBe(2); // 資産が1増える
      expect(newState.players[0].properties).toBe(0); // 相手の資産が1減る
      expect(newState.log).toContain('対戦相手の行動「買収」');
      expect(newState.log).toContain('対戦相手の買収は成功した！');
    });

    it('should resolve opponent ACQUIRE successfully when player collects funds', () => {
      player2.hand = [{ id: 'p2card', templateId: 'ACQUIRE' }];
      player2.funds = 2;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'collect_funds' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      expect(newState.players[1].properties).toBe(2); // 資産が1増える
      expect(newState.players[0].properties).toBe(0); // 相手の資産が1減る
      expect(newState.players[0].funds).toBe(1); // 相手の資金が増える
      expect(newState.log).toContain('対戦相手の行動「買収」');
      expect(newState.log).toContain('対戦相手の買収は成功した！');
      expect(newState.log).toContain('プレイヤーは「資金集め」コマンドを実行した');
    });

    it('should resolve DEFEND when opponent plays nothing', () => {
      player1.hand = [{ id: 'p1card', templateId: 'DEFEND' }];
      player1.funds = 0;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const newState = testEngine.applyAction(p1Action, null);

      expect(newState.players[0].properties).toBe(1); // 資産は変化しない
      expect(newState.log).toContain('プレイヤーの行動「防衛」');
    });

    it('should resolve FRAUD when opponent plays nothing (fraud fails)', () => {
      player1.hand = [{ id: 'p1card', templateId: 'FRAUD' }];
      player1.funds = 1;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const newState = testEngine.applyAction(p1Action, null);

      expect(newState.players[0].properties).toBe(1); // 資産は変化しない
      expect(newState.log).toContain('プレイヤーの行動「詐欺」');
      // 詐欺が成功しないので、詐欺成功のログは含まれない
      expect(newState.log).not.toContain('プレイヤーの買収は詐欺で返り討ちにあった！');
    });

    it('should allow a player to use "資金集め" command when they cannot afford any card', () => {
        // プレイヤー1の手札に「買収」カードを設定しますが、資金は足りない0に設定します（コストは2）。
        player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
        player1.funds = 0; 
        // プレイヤー2は何もプレイせず、資金は0に設定します。
        player2.hand = [];
        player2.funds = 0;
 
        // このテスト用のGameEngineインスタンスを作成します。
        const testEngine = new GameEngine(testState, mockCardTemplates);
        // プレイヤー1は「資金集め」コマンドを実行し、プレイヤー2は何もプレイしないとします。
        const p1Action: Action = { playerId: 'player1-id', actionType: 'collect_funds' };
        const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'non-existent-card' }; // NPC plays nothing
        // アクションを適用します。
        const newState = testEngine.applyAction(p1Action, p2Action);
 
        // 更新されたプレイヤー1と2の状態を取得します。
        const newPlayer1 = newState.players[0];
        const newPlayer2 = newState.players[1];
 
        // プレイヤー1の資金が0から「資金集め」により1増えて1になっていることを検証します。
        expect(newPlayer1.funds).toBe(1); // 0 + 1 = 1
        // プレイヤー1の資産が変化しないことを検証します。
        expect(newPlayer1.properties).toBe(1);
        // ゲームログにプレイヤー1の「資金集め」が記録されていることを検証します。
        expect(newState.log).toContain('プレイヤーは「資金集め」コマンドを実行した');
        // プレイヤー2の資金と資産が変化しないことを検証します。
        expect(newPlayer2.funds).toBe(0);
        expect(newPlayer2.properties).toBe(1);
    });

    it('should resolve INVEST successfully, increasing funds by 3', () => {
      player1.hand = [{ id: 'p1card', templateId: 'INVEST' }];
      player1.funds = 1; // Cost is 1

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const newState = testEngine.applyAction(p1Action, null);

      expect(newState.players[0].funds).toBe(1 - 1 + 3); // Initial - cost + gain
      expect(newState.log).toContain('プレイヤーは投資で3資金を獲得した！');
    });

    it('should resolve BRIBE successfully against DEFEND', () => {
      player1.hand = [{ id: 'p1card', templateId: 'BRIBE' }];
      player1.funds = 5;
      player2.hand = [{ id: 'p2card', templateId: 'DEFEND' }];
      player2.funds = 0;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      expect(newState.players[0].properties).toBe(2); // Bribe succeeds
      expect(newState.players[1].properties).toBe(0);
      expect(newState.log).toContain('プレイヤーの賄賂は成功した！');
      expect(newState.log).not.toContain('対戦相手の買収は防がれた！'); // Should not contain this log
    });

    it('should resolve BRIBE successfully against FRAUD', () => {
      player1.hand = [{ id: 'p1card', templateId: 'BRIBE' }];
      player1.funds = 5;
      player2.hand = [{ id: 'p2card', templateId: 'FRAUD' }];
      player2.funds = 1;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      expect(newState.players[0].properties).toBe(2); // Bribe succeeds
      expect(newState.players[1].properties).toBe(0);
      expect(newState.log).toContain('プレイヤーの賄賂は成功した！');
      expect(newState.log).not.toContain('プレイヤーの買収は詐欺で返り討ちにあった！');
    });

    it('should nullify both actions in a BRIBE vs BRIBE conflict', () => {
      player1.hand = [{ id: 'p1card', templateId: 'BRIBE' }];
      player1.funds = 5;
      player2.hand = [{ id: 'p2card', templateId: 'BRIBE' }];
      player2.funds = 5;

      const testEngine = new GameEngine(testState, mockCardTemplates);
      const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
      const p2Action: Action = { playerId: 'player2-id', actionType: 'play_card', cardId: 'p2card' };
      const newState = testEngine.applyAction(p1Action, p2Action);

      expect(newState.players[0].properties).toBe(1); // No change
      expect(newState.players[1].properties).toBe(1);
      expect(newState.log).toContain('両者の賄賂は互いに打ち消しあった！');
    });
  });

  it('should end the game when a player loses all properties', () => {
    // ゲーム終了条件をテストするために、初期状態をコピーします。
    const testState = JSON.parse(JSON.stringify(initialState));
    // プレイヤー1に「買収」カードを持たせ、資金を2に設定します。
    const player1 = testState.players.find(p => p.playerId === 'player1-id')!;
    player1.hand = [{ id: 'p1card', templateId: 'ACQUIRE' }];
    player1.funds = 2;

    // プレイヤー2は手札を空にし、資産を1に設定します（これで買収されると0になる）。
    const player2 = testState.players.find(p => p.playerId === 'player2-id')!;
    player2.hand = []; 
    player2.properties = 1; 

    // このテスト用のGameEngineインスタンスを作成します。
    const testEngine = new GameEngine(testState, mockCardTemplates);
    // プレイヤー1が「買収」アクションを実行し、プレイヤー2はアクションなしとします。
    const p1Action: Action = { playerId: 'player1-id', actionType: 'play_card', cardId: 'p1card' };
    const newState = testEngine.applyAction(p1Action, null); // プレイヤー2は何もプレイしない

    // プレイヤー2の資産が0になり、ゲームのフェーズが`GAME_OVER`になっていることを検証します。
    expect(newState.phase).toBe('GAME_OVER');
  });

  it('should end the game and log message when player 1 loses all properties', () => {
    const testState = JSON.parse(JSON.stringify(initialState));
    const player1 = testState.players.find(p => p.playerId === 'player1-id')!;
    player1.properties = 0; // プレイヤー1の不動産を0にする

    const testEngine = new GameEngine(testState, mockCardTemplates);
    // applyActionを呼び出すことでcheckWinConditionがトリガーされる
    const newState = testEngine.applyAction(null, null); // アクションは関係ないのでnull

    expect(newState.phase).toBe('GAME_OVER');
    expect(newState.log).toContain('プレイヤーの不動産が0になった！対戦相手の勝利！');
  });

  it('should end the game and log message when player 2 loses all properties', () => {
    const testState = JSON.parse(JSON.stringify(initialState));
    const player2 = testState.players.find(p => p.playerId === 'player2-id')!;
    player2.properties = 0; // プレイヤー2の不動産を0にする

    const testEngine = new GameEngine(testState, mockCardTemplates);
    // applyActionを呼び出すことでcheckWinConditionがトリガーされる
    const newState = testEngine.applyAction(null, null); // アクションは関係ないのでnull

    expect(newState.phase).toBe('GAME_OVER');
    expect(newState.log).toContain('対戦相手の不動産が0になった！プレイヤーの勝利！');
  });
});
