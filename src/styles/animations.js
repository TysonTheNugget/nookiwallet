import { keyframes, css } from 'styled-components';

// Attack animations
export const attackLeft = keyframes`
  0% { transform: translateX(0); }
  50% { transform: translateX(-20px); }
  100% { transform: translateX(50px); }
`;

export const attackRight = keyframes`
  0% { transform: translateX(0); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(-50px); }
`;

// Shake animation for being hit
export const shakeAnimation = keyframes`
  0% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
  100% { transform: translateX(0); }
`;

// Function to apply animations based on attacking or being attacked
export const getAnimation = (isAttacking, isBeingAttacked, side) => {
  if (isAttacking) {
    return side === 'left'
      ? css`${attackLeft} 0.5s forwards`
      : css`${attackRight} 0.5s forwards`;
  }

  if (isBeingAttacked) {
    return css`${shakeAnimation} 0.5s`;
  }

  return '';
};
