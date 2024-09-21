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
