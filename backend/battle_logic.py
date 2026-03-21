# battle_logic.py

import asyncio
import json
import random

class BattleSession:
    def __init__(self, player1, player2, server):
        """
        Initialize a battle session between two players.

        :param player1: Dictionary containing player1's data (username, ordinooki)
        :param player2: Dictionary containing player2's data (username, ordinooki)
        :param server: Reference to the main server to send messages
        """
        self.player1 = {
            "username": player1['username'],
            "ordinooki": player1['ordinooki'],
            "health": player1['ordinooki']['meta']['stats']['HP']
        }
        self.player2 = {
            "username": player2['username'],
            "ordinooki": player2['ordinooki'],
            "health": player2['ordinooki']['meta']['stats']['HP']
        }
        self.server = server
        self.battle_log = []
        self.is_active = True
        self.lock = asyncio.Lock()

    def calculate_damage(self, attacker, defender):
        base_damage = attacker['ordinooki']['meta']['stats']['Attack'] - defender['ordinooki']['meta']['stats']['Defense']
        base_damage = max(base_damage, 0)
        critical_chance = attacker['ordinooki']['meta']['stats'].get('Critical Chance', 0)
        critical_hit = 1.5 if random.random() < critical_chance else 1
        damage = base_damage * critical_hit
        damage = max(int(damage), 0)
        return damage, critical_hit > 1

    def determine_turn_order(self):
        speed1 = self.player1['ordinooki']['meta']['stats']['Speed']
        speed2 = self.player2['ordinooki']['meta']['stats']['Speed']
        if speed1 > speed2:
            return self.player1, self.player2
        elif speed2 > speed1:
            return self.player2, self.player1
        else:
            return (self.player1, self.player2) if random.random() < 0.5 else (self.player2, self.player1)

    async def start_battle(self):
        attacker, defender = self.determine_turn_order()
        start_msg = f"{attacker['username']} starts the battle!"
        self.battle_log.append(start_msg)
        await self.server.broadcast_battle_update(self.player1['username'], self.player2['username'], start_msg, self.player1['health'], self.player2['health'])

        while self.is_active:
            damage, is_critical = self.calculate_damage(attacker, defender)
            attack_msg = f"{attacker['username']} attacks {defender['username']} for {damage} damage{' (Critical Hit!)' if is_critical else ''}."
            self.battle_log.append(attack_msg)
            defender['health'] -= damage

            # Broadcast the attack
            await self.server.broadcast_battle_update(
                self.player1['username'],
                self.player2['username'],
                attack_msg,
                self.player1['health'],
                self.player2['health']
            )

            # Check for battle end
            if defender['health'] <= 0:
                self.is_active = False
                if attacker['health'] > 0 and defender['health'] <= 0:
                    result_msg = f"{attacker['username']} Wins!"
                elif defender['health'] <= 0 and attacker['health'] <= 0:
                    result_msg = "It's a Draw!"
                else:
                    result_msg = f"{defender['username']} Wins!"
                self.battle_log.append(result_msg)
                await self.server.broadcast_battle_result(self.player1['username'], self.player2['username'], result_msg)
                break

            # Swap roles for next turn
            attacker, defender = defender, attacker
            await asyncio.sleep(1)  # Simulate time between turns


async def handle_battle(player1_data, player2_data, client1=None, client2=None):
    """
    Legacy-compatible battle handler expected by websocket_server.py.
    Returns:
      (battle_log: list[str], result: str)
    """
    p1 = {
        "name": player1_data["name"],
        "health": int(player1_data["health"]),
        "attack": int(player1_data["ordinooki"]["meta"]["stats"]["Attack"]),
        "defense": int(player1_data["ordinooki"]["meta"]["stats"]["Defense"]),
        "speed": int(player1_data["ordinooki"]["meta"]["stats"]["Speed"]),
        "crit": float(player1_data["ordinooki"]["meta"]["stats"].get("Critical Chance", 0)),
    }
    p2 = {
        "name": player2_data["name"],
        "health": int(player2_data["health"]),
        "attack": int(player2_data["ordinooki"]["meta"]["stats"]["Attack"]),
        "defense": int(player2_data["ordinooki"]["meta"]["stats"]["Defense"]),
        "speed": int(player2_data["ordinooki"]["meta"]["stats"]["Speed"]),
        "crit": float(player2_data["ordinooki"]["meta"]["stats"].get("Critical Chance", 0)),
    }

    battle_log = []

    # Higher speed goes first, random tie-break.
    if p1["speed"] > p2["speed"]:
        attacker, defender = p1, p2
    elif p2["speed"] > p1["speed"]:
        attacker, defender = p2, p1
    else:
        attacker, defender = (p1, p2) if random.random() < 0.5 else (p2, p1)

    while p1["health"] > 0 and p2["health"] > 0:
        base_damage = max(attacker["attack"] - defender["defense"], 1)
        crit_multiplier = 1.5 if random.random() < attacker["crit"] else 1.0
        damage = max(int(base_damage * crit_multiplier), 1)
        defender["health"] = max(defender["health"] - damage, 0)

        # Keep message format compatible with frontend regex in BattleArena.
        battle_log.append(
            f"{attacker['name']} dealt {damage} damage to {defender['name']}. "
            f"{defender['name']} has {defender['health']} HP left."
        )

        if defender["health"] <= 0:
            break

        attacker, defender = defender, attacker
        await asyncio.sleep(0.25)

    if p1["health"] <= 0 and p2["health"] <= 0:
        result = "It's a Draw!"
    elif p1["health"] <= 0:
        result = f"{p2['name']} Wins!"
    else:
        result = f"{p1['name']} Wins!"

    return battle_log, result
