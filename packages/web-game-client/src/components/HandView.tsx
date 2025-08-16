// packages/web-game-client/src/components/HandView.tsx

// Reactコンポーネントを定義するためにReactをインポートします。
import React from 'react';
// ゲームで使用するカード（Card）とカードのテンプレート（CardTemplate）の型定義をインポートします。
import { Card, CardTemplate } from '../types';

// HandViewコンポーネントが受け取るProps（プロパティ）のインターフェースを定義します。
interface HandViewProps {
  hand: Card[]; // 現在プレイヤーの手札にあるカードの配列
  onCardSelect: (cardId: string) => void; // カードが選択されたときに呼び出されるコールバック関数
  playableCardIds: string[]; // 現在プレイ可能なカードのIDの配列
  cardTemplates: { [templateId: string]: CardTemplate }; // カードテンプレートIDをキーとするカードテンプレートのマップ
  selectedCardId: string | null; // 現在選択されているカードのID（選択されていない場合はnull）
}

/**
 * HandViewコンポーネントは、プレイヤーの手札を表示し、カードの選択を可能にします。
 * プレイ可能なカードと選択中のカードを視覚的に区別します。
 */
const HandView: React.FC<HandViewProps> = ({ hand, onCardSelect, playableCardIds, cardTemplates, selectedCardId }) => {
  // 手札がnullまたはundefinedの場合に備えて、空の配列をデフォルト値として設定します。
  const currentHand = hand || [];

  // コンポーネントのUIをレンダリングします。
  return (
    // 手札全体を囲むコンテナ。CSSクラス`hand-container`が適用されます。
    <div className="hand-container">
      {/* 手札にカードがあるかどうかで表示を切り替えます */}
      {currentHand.length === 0 ? (
        // 手札が空の場合に表示されるメッセージ。
        <p className="no-cards-message">No cards in hand.</p>
      ) : (
        // 手札にカードがある場合、各カードをマップして表示します。
        currentHand.map((card) => {
          // 現在のカードがプレイ可能かどうかを判定します。
          const isPlayable = playableCardIds.includes(card.id);
          // 現在のカードが選択されているカードかどうかを判定します。
          const isSelected = card.id === selectedCardId;
          // カードのテンプレートIDに基づいて、対応するカードテンプレート情報を取得します。
          const template = cardTemplates[card.templateId];
          // カードテンプレートのIDに基づいて画像URLを構築します。
          const imageUrl = template ? `/images/cards/${template.templateId}.jpg` : '';

          // カードアイテムに適用するCSSクラスを動的に生成します。
          // プレイ可能、選択中、無効化の状態に応じてクラスが追加されます。
          const cardClasses = [
            'card-item', // すべてのカードアイテムに共通の基本クラス
            isPlayable ? 'playable' : 'disabled', // プレイ可能なら'playable'、そうでなければ'disabled'
            isSelected ? 'selected' : '', // 選択中なら'selected'
            // Add this line: If selected, add 'no-hover' class
            isSelected ? 'no-hover' : '',
          ].join(' ').trim(); // 配列をスペースで結合し、余分なスペースをトリムします。

          return (
            // 各カードアイテムのコンテナ。カードのユニークなIDを`key`プロップとして使用します。
            <div
              key={card.id}
              className={cardClasses} // 動的に生成されたCSSクラスを適用
              // Modify onClick handler
              onClick={() => {
                if (isSelected) {
                  // If already selected, deselect it
                  onCardSelect(null); // Assuming null deselects
                } else if (isPlayable) {
                  // Otherwise, if playable, select it
                  onCardSelect(card.id);
                }
              }}
            >
              {/* カード画像が存在する場合のみ表示します */}
              {imageUrl && <img src={imageUrl} alt={template?.name} className="card-image" />}
              {/* カードの名前を表示します。テンプレートが見つからない場合はテンプレートIDを表示します。 */}
              <p className="card-name">{template?.name || card.templateId}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

// HandViewコンポーネントをエクスポートし、他のファイルからインポートして使用できるようにします。
export default HandView;
