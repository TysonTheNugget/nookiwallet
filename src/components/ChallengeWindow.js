// ChallengeWindow.js
import React from 'react';
import { startFight, cancelFight } from '../utils/FightManager';

function ChallengeWindow({ challengeData, onClose, onCancel, token }) {
  const handleFight = () => {
    startFight(token, challengeData.from);
    onClose(); // Close the modal after initiating the fight
  };

  const handleCancel = () => {
    if (
      window.confirm(
        'Are you sure you want to cancel the fight?\n(Data will not be stored)'
      )
    ) {
      cancelFight(token, challengeData.from);
      onCancel(); // Close the modal after cancelling the fight
    }
  };

  return (
    <div className="challenge-window-overlay">
      <div className="challenge-window-content">
        <p>{challengeData.from} has challenged you to a fight!</p>
        <button onClick={handleFight} className="fight-button">
          Fight
        </button>
        <button onClick={handleCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ChallengeWindow;
