// FightManager.js
import WebSocketManager from '../utils/WebSocketManager';
import { getUsernameFromToken } from '../utils/auth'; // Assume you have an auth utility

/**
 * Initiates the fight by sending a fight_start message via WebSocket
 * @param {string} token - The JWT token of the current user
 * @param {string} opponent - The username of the opponent
 */
export function startFight(token, opponent) {
  const message = {
    type: 'fight_start',
    from: getUsernameFromToken(token),
    to: opponent,
  };
  WebSocketManager.sendData(message);
}

/**
 * Cancels the fight by sending a fight_cancel message via WebSocket
 * @param {string} token - The JWT token of the current user
 * @param {string} opponent - The username of the opponent
 */
export function cancelFight(token, opponent) {
  const message = {
    type: 'fight_cancel',
    from: getUsernameFromToken(token),
    to: opponent,
  };
  WebSocketManager.sendData(message);
}

/**
 * Handles incoming fight_start messages
 * @param {object} data - The data received from WebSocket
 * @param {function} navigateToFight - Function to navigate to the fight scene
 */
export function handleIncomingFight(data, navigateToFight) {
  if (data.type === 'fight_start') {
    console.log(`Fight started with ${data.from}`);
    navigateToFight(data.from);
  }

