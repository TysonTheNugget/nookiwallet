// src/components/BattleArena.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import OrdinookiCard from './OrdinookiCard';
import { calculateDamage, determineTurnOrder } from '../utils/battleUtils';
import { getAnimation } from '../styles/animations';
import './BattleArena.css';

// Correcting the styled component syntax
const AnimatedCard = styled.div`
  animation: ${(props) => getAnimation(props.$isAttacking, props.$isBeingAttacked, props.$side)};
`;

const BattleArena = ({ player1, player2, onEndBattle }) => {
  // Defensive checks to ensure data integrity
  if (!player1 || !player1.meta || !player1.meta.stats) {
    return <div>Error: Player 1 Ordinooki data is missing.</div>;
  }
  if (!player2 || !player2.meta || !player2.meta.stats) {
    return <div>Error: Player 2 Ordinooki data is missing.</div>;
  }

  const [health1, setHealth1] = useState(player1.meta.stats.HP);
  const [health2, setHealth2] = useState(player2.meta.stats.HP);
  const [battleInProgress, setBattleInProgress] = useState(true);
  const [isAttacking1, setIsAttacking1] = useState(false);
  const [isAttacking2, setIsAttacking2] = useState(false);
  const [isBeingAttacked1, setIsBeingAttacked1] = useState(false);
  const [isBeingAttacked2, setIsBeingAttacked2] = useState(false);
  const [battleLog, setBattleLog] = useState([]);

  // Create refs to keep track of the latest health values
  const health1Ref = useRef(health1);
  const health2Ref = useRef(health2);

  // Update refs whenever health changes
  useEffect(() => {
    health1Ref.current = health1;
  }, [health1]);

  useEffect(() => {
    health2Ref.current = health2;
  }, [health2]);

  // Function to log messages to the battle log
  const logMessage = (msg) => {
    setBattleLog((prev) => [...prev, msg]);
  };

  // Function to handle attacks
  const executeAttack = useCallback(
    (attacker, defender, setIsAttacking, setIsBeingAttacked, setHealthDefender, defenderRef) => {
      setIsAttacking(true);
      logMessage(`${attacker.name} is attacking ${defender.name}!`);

      setTimeout(() => {
        setIsAttacking(false);
        setIsBeingAttacked(true);
        let damage = calculateDamage(attacker, defender);
        setHealthDefender((prevHealth) => {
          const newHealth = Math.max(prevHealth - damage, 0);
          defenderRef.current = newHealth; // Update the defender's health ref
          logMessage(
            `${attacker.name} dealt ${damage} damage to ${defender.name}. ${defender.name} has ${newHealth} HP left.`
          );
          return newHealth;
        });
        setTimeout(() => {
          setIsBeingAttacked(false);
        }, 500); // End of being attacked animation
      }, 1000); // Duration of attacking animation
    },
    []
  );

  const handleBattle = useCallback(() => {
    if (health1Ref.current <= 0 || health2Ref.current <= 0) {
      setBattleInProgress(false);
      return;
    }

    const [first, second] = determineTurnOrder(player1, player2);

    // First Ordinooki attacks
    if (first.id === player1.id) {
      executeAttack(
        player1,
        player2,
        setIsAttacking1,
        setIsBeingAttacked2,
        setHealth2,
        health2Ref
      );
    } else {
      executeAttack(
        player2,
        player1,
        setIsAttacking2,
        setIsBeingAttacked1,
        setHealth1,
        health1Ref
      );
    }

    // Wait for first attack to complete before second attack
    setTimeout(() => {
      if (health1Ref.current <= 0 || health2Ref.current <= 0) {
        setBattleInProgress(false);
        return;
      }

      // Second Ordinooki attacks
      if (second.id === player1.id) {
        executeAttack(
          player1,
          player2,
          setIsAttacking1,
          setIsBeingAttacked2,
          setHealth2,
          health2Ref
        );
      } else {
        executeAttack(
          player2,
          player1,
          setIsAttacking2,
          setIsBeingAttacked1,
          setHealth1,
          health1Ref
        );
      }

      // Wait for second attack to complete before next round
      setTimeout(() => {
        handleBattle(); // Proceed to next battle round
      }, 2000); // Delay before next round
    }, 2000); // Delay before second attack
  }, [executeAttack, player1, player2]);

  useEffect(() => {
    // Start the battle when the component mounts
    handleBattle();
    // Empty dependency array ensures this runs only once
  }, []);

  return (
    <div className="battle-arena-overlay">
      <div className="battle-arena-content">
        {/* Cards Container */}
        <div
          className="cards-container"
          style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%' }}
        >
          <AnimatedCard
            $isAttacking={isAttacking1}
            $isBeingAttacked={isBeingAttacked1}
            $side="left"
          >
            <OrdinookiCard ordinooki={player1} health={health1} />
          </AnimatedCard>
          <AnimatedCard
            $isAttacking={isAttacking2}
            $isBeingAttacked={isBeingAttacked2}
            $side="right"
          >
            <OrdinookiCard ordinooki={player2} health={health2} />
          </AnimatedCard>
        </div>
        {/* Battle Result */}
        {!battleInProgress && (health1 <= 0 || health2 <= 0) && (
          <div className="battle-result">
            {health1 <= 0 && health2 <= 0 && <p>It's a Draw!</p>}
            {health1 <= 0 && health2 > 0 && <p>{player2.name} Wins!</p>}
            {health2 <= 0 && health1 > 0 && <p>{player1.name} Wins!</p>}
            <button onClick={onEndBattle}>Close</button>
          </div>
        )}
        {/* Battle Log */}
        <div className="battle-log">
          <h4>Battle Log:</h4>
          <ul>
            {battleLog.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BattleArena;
