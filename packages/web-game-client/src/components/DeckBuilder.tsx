// packages/web-game-client/src/components/DeckBuilder.tsx

// Reactとそのフック（useState, useEffect）をインポートします。
// これらはReactコンポーネクトで状態管理や副作用を扱うために必要です。
import React, { useState, useEffect } from 'react';
// ゲームのカードテンプレートの型定義をインポートします。
import { CardTemplate } from '../types';
// カードテンプレートをAPIから取得するための関数をインポートします。
import { fetchCardTemplates } from '../api/realtimeClient';

// DeckBuilderコンポーネントが受け取るProps（プロパティ）のインターフェースを定義します。
// 現時点ではプロパティは定義されていませんが、将来的に追加される可能性があります（例: currentDeck）。
interface DeckBuilderProps {
  // Props will be added later, e.g., currentDeck
}

/**
 * DeckBuilderコンポーネントは、ユーザーがゲームで使用するデッキを構築するためのUIを提供します。
 * 利用可能なカードテンプレートの表示、デッキへのカードの追加・削除機能が含まれます。
 */
const DeckBuilder: React.FC<DeckBuilderProps> = () => {
  // 利用可能なすべてのカードテンプレートを保持するステートです。
  // キーはtemplateId、値はCardTemplateオブジェクトです。
  const [availableCardTemplates, setAvailableCardTemplates] = useState<{ [templateId: string]: CardTemplate }>({});
  // 現在構築中のデッキ内のカードのリストを保持するステートです。
  const [currentDeck, setCurrentDeck] = useState<CardTemplate[]>([]);

  // コンポーネントがマウントされた後（初回レンダリング後）に一度だけ実行される副作用フックです。
  // ここでAPIからカードテンプレートをフェッチします。
  useEffect(() => {
    // 非同期関数を定義し、カードテンプレートをロードします。
    const loadCardTemplates = async () => {
      // APIクライアントの`fetchCardTemplates`関数を呼び出して、カードテンプレートを取得します。
      // 'v1' はAPIのバージョンやエンドポイントの指定を想定しています。
      const fetchedTemplates = await fetchCardTemplates('v1'); // DBからフェッチ
      // 取得したテンプレートを`availableCardTemplates`ステートに設定します。
      setAvailableCardTemplates(fetchedTemplates);
    };
    // 定義したロード関数を実行します。
    loadCardTemplates();
  }, []); // 空の依存配列により、このエフェクトはコンポーネントのマウント時に一度だけ実行されます。

  /**
   * 利用可能なカードリストからデッキにカードを追加するハンドラ関数です。
   * デッキの最大枚数（10枚）を超えないように制限します。
   * @param cardTemplate デッキに追加するカードのテンプレート情報
   */
  const handleAddCardToDeck = (cardTemplate: CardTemplate) => {
    // 現在のデッキの枚数が10枚未満の場合のみ、カードを追加します。
    if (currentDeck.length < 10) {
      // 新しいカードを既存のデッキに追加し、新しい配列としてステートを更新します。
      // これにより、Reactが変更を検知して再レンダリングします。
      setCurrentDeck([...currentDeck, cardTemplate]);
    } else {
      // デッキが満杯の場合、アラートメッセージを表示します。
      // NOTE: 実際のアプリケーションでは、alert()ではなく、よりリッチなUI（モーダルなど）を使用することが推奨されます。
      alert('デッキは10枚までです！');
    }
  };

  /**
   * 現在のデッキからカードを削除するハンドラ関数です。
   * @param index 削除するカードのデッキ内でのインデックス
   */
  const handleRemoveCardFromDeck = (index: number) => {
    // 現在のデッキのコピーを作成します。
    const newDeck = [...currentDeck];
    // 指定されたインデックスのカードを削除します。
    newDeck.splice(index, 1);
    // 更新されたデッキでステートを更新します。
    setCurrentDeck(newDeck);
  };

  // コンポーネントのUIをレンダリングします。
  return (
    // 全体的なコンテナ。flexboxで垂直方向に要素を配置します。
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2>デッキ構築</h2>
      {/* 利用可能なカードと現在のデッキを並べて表示するためのコンテナ */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
        {/* 利用可能なカードのセクション */}
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>利用可能なカード</h3>
          {/* カードリストがスクロール可能になるように設定 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {/* `availableCardTemplates`オブジェクトの値を配列に変換し、各カードをマップして表示します */}
            {Object.values(availableCardTemplates).map((card) => {
              // カード画像へのパスを構築します。templateIdに基づいています。
              const imageUrl = `/images/cards/${card.templateId}.jpg`; // .jpg形式を想定

              return (
                // 各カードアイテムのコンテナ。ユニークな`key`プロップが必要です。
                <div key={card.templateId} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                  {/* カード画像が存在する場合のみ表示 */}
                  {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                  <div>
                    {/* カードの名前とコストを表示 */}
                    <h4>{card.name} (コスト: {card.cost})</h4>
                    {/* カードの説明を表示（小さいフォントサイズで） */}
                    <p style={{ fontSize: '0.8em' }}>{card.description}</p>
                    {/* デッキにカードを追加するボタン */}
                    <button onClick={() => handleAddCardToDeck(card)}>デッキに追加</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 現在のデッキのセクション */}
        <div style={{ border: '1px solid lightgray', padding: '10px', width: '45%' }}>
          <h3>現在のデッキ ({currentDeck.length}/10)</h3>
          {/* デッキリストがスクロール可能になるように設定 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {/* デッキが空の場合と、カードがある場合で表示を切り替えます */}
            {currentDeck.length === 0 ? (
              <p>デッキにカードがありません。</p>
            ) : (
              // `currentDeck`の各カードをマップして表示します
              currentDeck.map((card, index) => {
                // カード画像へのパスを構築します。
                const imageUrl = `/images/cards/${card.templateId}.jpg`; // .jpg形式を想定
                return (
                  // 各デッキカードアイテムのコンテナ。インデックスをkeyとして使用しますが、
                  // リストの順序が頻繁に変わる場合は、より安定したIDを使用することが推奨されます。
                  <div key={index} style={{ border: '1px solid gray', margin: '5px', padding: '5px', display: 'flex', alignItems: 'center' }}>
                    {/* カード画像が存在する場合のみ表示 */}
                    {imageUrl && <img src={imageUrl} alt={card.name} style={{ width: '50px', height: 'auto', marginRight: '10px' }} />}
                    <div>
                      {/* カードの名前を表示 */}
                      <h4>{card.name}</h4>
                      {/* デッキからカードを削除するボタン */}
                      <button onClick={() => handleRemoveCardFromDeck(index)}>デッキから削除</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* デッキ保存ボタンはここに配置される予定です */}
      {/* Save Deck Button will go here */}
    </div>
  );
};

// DeckBuilderコンポーネントをエクスポートし、他のファイルからインポートして使用できるようにします。
export default DeckBuilder;
