# packages/api-server/app/game/cards/acquire.py
from app.game.models import PlayerState

def apply_acquire(player: PlayerState, opponent: PlayerState) -> None:
    """
    「買収」カードの効果を適用します。
    相手の不動産を1つ奪います。
    """
    if opponent.properties > 0:
        opponent.properties -= 1
        player.properties += 1
