# packages/api-server/app/game/cards/gain_funds.py
from app.game.models import PlayerState

def apply_gain_funds(player: PlayerState) -> None:
    """
    「資金集め」カードの効果を適用します。
    資金が1増加します。
    """
    player.funds += 2
