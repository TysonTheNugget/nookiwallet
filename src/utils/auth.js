// src/utils/auth.js
import { jwtDecode } from 'jwt-decode'; // Corrected import statement

/**
 * Extracts the username from a JWT token.
 * @param {string} token - The JWT token.
 * @returns {string} The username extracted from the token, or 'Unknown' if decoding fails.
 */
export function getUsernameFromToken(token) {
  try {
    const decoded = jwtDecode(token);
    return decoded.username;
  } catch (e) {
    console.error('Failed to decode token', e);
    return 'Unknown';
  }
}
