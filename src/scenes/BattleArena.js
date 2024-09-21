import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import OrdinookiCard from './OrdinookiCard';
import { calculateDamage, determineTurnOrder } from '../utils/battleUtils';
import { getAnimation } from '../styles/animations';

// Styled component for animating the Ordinooki cards
const AnimatedCard = styled.div`
  animation: ${props => getAnimation(props.isAttacking, props.isBeingAttacked, props.side)};
`;

/**
 * BattleArena Component
 * @param {object} props
 * @param {object} props.player1 - Data for Player 1
 * @param {object} props.player2 - Data for Player 2
 * @param {function} props.onEndBattle - Callback to end the battle
 */
const BattleArena = ({ player1, player2, onEndBattle }) => {
  const [health1, setHealth1] = useState(player1.meta.stats.HP);
  const [health2, setHealth2] = useState(player2.meta.stats.HP);
  const [battleInProgress, setBattleInProgress] = useState(false);
  const [isAttacking1, setIsAttacking1] = useState(false);
  const [isAttacking2, setIsAttacking2] = useState(false);
  const [isBeingAttacked1, setIsBeingAttacked1] = useState(false);
  const [isBeingAttacked2, setIsBeingAttacked2] = useState(false);

  // Memoize the handleBattle function to avoid unnecessary re-renders
  const handleBattle = useCallback(() => {
    if (health1 <= 0 || health2 <= 0) {
      setBattleInProgress(false);
      onEndBattle();
      return;
    }

    const [first, second] = determineTurnOrder(player1, player2);

    if (health1 > 0 && health2 > 0) {
      // First Ordinooki attacks
      if (first.id === player1.id) {
        setIsAttacking1(true);
        setTimeout(() => {
          setIsAttacking1(false);
          setIsBeingAttacked2(true);
          let damage = calculateDamage(first, second);
          setHealth2(prevHealth => Math.max(prevHealth - damage, 0));
          setTimeout(() => setIsBeingAttacked2(false), 500); // End the shake animation
        }, 500); // Wait for the attack animation to start before impact
      } else {
        setIsAttacking2(true);
        setTimeout(() => {
          setIsAttacking2(false);
          setIsBeingAttacked1(true);
          let damage = calculateDamage(first, second);
          setHealth1(prevHealth => Math.max(prevHealth - damage, 0));
          setTimeout(() => setIsBeingAttacked1(false), 500); // End the shake animation
        }, 500);
      }
    }

    if (health1 > 0 && health2 > 0) {
      // Second Ordinooki attacks
      setTimeout(() => {
        if (second.id === player1.id) {
          setIsAttacking1(true);
          setTimeout(() => {
            setIsAttacking1(false);
            setIsBeingAttacked2(true);
            let damage = calculateDamage(second, first);
            setHealth2(prevHealth => Math.max(prevHealth - damage, 0));
            setTimeout(() => setIsBeingAttacked2(false), 500); // End the shake animation
          }, 500);
        } else {
          setIsAttacking2(true);
          setTimeout(() => {
            setIsAttacking2(false);
            setIsBeingAttacked1(true);
            let damage = calculateDamage(second, first);
            setHealth1(prevHealth => Math.max(prevHealth - damage, 0));
            setTimeout(() => setIsBeingAttacked1(false), 500); // End the shake animation
          }, 500);
        }
      }, 1500); // Delay before the second Ordinooki attacks
    }
  }, [health1, health2, player1, player2, onEndBattle]);

  useEffect(() => {
    if (battleInProgress) {
      const interval = setInterval(() => {
        handleBattle();
      }, 3000); // Slowing down the battle to 3 seconds per turn

      return () => clearInterval(interval);
    }
  }, [battleInProgress, handleBattle]);

  const startBattle = () => {
    setBattleInProgress(true);
  };

  return (
    <div className="battle-arena-overlay">
      <div className="battle-arena-content">
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <AnimatedCard isAttacking={isAttacking1} isBeingAttacked={isBeingAttacked1} side="left">
            <OrdinookiCard ordinooki={player1} health={health1} />
          </AnimatedCard>
          <button onClick={startBattle} disabled={battleInProgress}>
            Fight!
          </button>
          <AnimatedCard isAttacking={isAttacking2} isBeingAttacked={isBeingAttacked2} side="right">
            <OrdinookiCard ordinooki={player2} health={health2} />
          </AnimatedCard>
        </div>
        {!battleInProgress && (health1 <= 0 || health2 <= 0) && (
          <div className="battle-result">
            {health1 <= 0 && health2 <= 0 && <p>It's a Draw!</p>}
            {health1 <= 0 && health2 > 0 && <p>{player2.name} Wins!</p>}
            {health2 <= 0 && health1 > 0 && <p>{player1.name} Wins!</p>}
            <button onClick={onEndBattle}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleArena;
