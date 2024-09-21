# utils/battle_utils.py

def calculate_damage(attacker, defender):
    """
    Calculate damage based on attacker and defender stats.
    Implement your logic here.
    """
    # Example logic (replace with actual game mechanics)
    base_damage = 10
    return base_damage

def determine_turn_order(player1, player2):
    """
    Determine which player attacks first based on speed stats or other criteria.
    Returns a list [first_player, second_player]
    """
    # Example logic: Player with higher speed goes first
    speed1 = player1['ordinooki'].get('meta', {}).get('stats', {}).get('Speed', 10)
    speed2 = player2['ordinooki'].get('meta', {}).get('stats', {}).get('Speed', 10)
    if speed1 >= speed2:
        return [player1, player2]
    else:
        return [player2, player1]
