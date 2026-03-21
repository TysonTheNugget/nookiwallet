// src/components/BattleArena.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import OrdinookiCard from './OrdinookiCard';
import { getAnimation } from '../styles/animations';
import './BattleArena.css';
import WebSocketManager from '../utils/WebSocketManager';

// Correcting the styled component syntax
const AnimatedCard = styled.div`
  animation: ${(props) => getAnimation(props.$isAttacking, props.$isBeingAttacked, props.$side)};
`;

const BattleArena = ({ player1, player2, battleId, currentTurn, onEndBattle }) => {
  const initialHp1 = player1?.meta?.stats?.HP ?? 0;
  const initialHp2 = player2?.meta?.stats?.HP ?? 0;

  const [health1, setHealth1] = useState(initialHp1);
  const [health2, setHealth2] = useState(initialHp2);
  const [battleInProgress, setBattleInProgress] = useState(true);
  const [battleResult, setBattleResult] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [turnOwner, setTurnOwner] = useState(currentTurn || null);

  const [isAttacking1, setIsAttacking1] = useState(false);
  const [isAttacking2, setIsAttacking2] = useState(false);
  const [isBeingAttacked1, setIsBeingAttacked1] = useState(false);
  const [isBeingAttacked2, setIsBeingAttacked2] = useState(false);

  // Function to log messages to the battle log
  const logMessage = (msg) => {
    setBattleLog((prev) => [...prev, msg]);
  };

  // Keep health in sync if battle participants change.
  useEffect(() => {
    setHealth1(initialHp1);
    setHealth2(initialHp2);
    setBattleInProgress(true);
    setBattleResult(null);
    setBattleLog([]);
    setTurnOwner(currentTurn || null);
  }, [initialHp1, initialHp2, currentTurn, battleId]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!player1?.name || !player2?.name) {
      return;
    }

    const handleMessage = (data) => {
      switch (data.type) {
        case 'battle_update':
          // Support both payload formats:
          // 1) Newer: { battle_id, log, p1_hp, p2_hp, actor, action }
          // 2) Legacy: { message: "<attacker> dealt <dmg> damage to <defender>. <defender> has <hp> HP left." }
          if (data.battle_id && battleId && data.battle_id !== battleId) break;

          const messageText = data.log || data.message || 'Battle action occurred.';
          logMessage(messageText);

          let didAnimate = false;

          if (typeof data.p1_hp === 'number') setHealth1(data.p1_hp);
          if (typeof data.p2_hp === 'number') setHealth2(data.p2_hp);

          if (data.actor) {
            if (data.actor === player1.name) {
              setIsAttacking1(true);
              if (data.action === 'attack') setIsBeingAttacked2(true);
              didAnimate = true;
            } else if (data.actor === player2.name) {
              setIsAttacking2(true);
              if (data.action === 'attack') setIsBeingAttacked1(true);
              didAnimate = true;
            }
          } else if (data.message) {
            const legacyRegex = /(.+?) dealt (\d+) damage to (.+?)\. (.+?) has (\d+) HP left\./;
            const matches = data.message.match(legacyRegex);
            if (matches) {
              const attackerName = matches[1];
              const defenderName = matches[3];
              const remainingHP = parseInt(matches[5], 10);

              if (defenderName === player1.name && Number.isFinite(remainingHP)) {
                setHealth1(remainingHP);
              } else if (defenderName === player2.name && Number.isFinite(remainingHP)) {
                setHealth2(remainingHP);
              }

              if (attackerName === player1.name) {
                setIsAttacking1(true);
                setIsBeingAttacked2(true);
                didAnimate = true;
              } else if (attackerName === player2.name) {
                setIsAttacking2(true);
                setIsBeingAttacked1(true);
                didAnimate = true;
              }
            }
          }

          if (didAnimate) {
            setTimeout(() => {
              setIsAttacking1(false);
              setIsAttacking2(false);
              setIsBeingAttacked1(false);
              setIsBeingAttacked2(false);
            }, 450);
          }
          break;

        case 'battle_turn':
          setTurnOwner(data.current_turn || null);
          break;

        case 'battle_result':
          setBattleResult(
            data.winner
              ? `${data.winner} Wins!`
              : (data.result || data.log || 'Battle finished.')
          );
          if (data.log) logMessage(data.log);
          if (data.result) logMessage(data.result);
          setBattleInProgress(false);
          break;

        case 'battle_error':
          logMessage(data.message || 'Battle error');
          setBattleResult(data.message || 'Battle error');
          setBattleInProgress(false);
          break;

        default:
          break;
      }
    };

    WebSocketManager.registerOnMessage(handleMessage);

    return () => {
      WebSocketManager.unregisterOnMessage(handleMessage);
    };
  }, [player1?.name, player2?.name, battleId]);

  // Defensive checks after hooks so hook order is always consistent.
  if (!player1?.meta?.stats) {
    return <div>Error: Player 1 Ordinooki data is missing.</div>;
  }
  if (!player2?.meta?.stats) {
    return <div>Error: Player 2 Ordinooki data is missing.</div>;
  }

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
        {!battleInProgress && battleResult && (
          <div className="battle-result">
            <p>{battleResult}</p>
            <button onClick={onEndBattle}>Close</button>
          </div>
        )}
        {battleInProgress && (
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <p style={{ margin: 0, alignSelf: 'center' }}>
              Auto Battle Running. Turn: {turnOwner || '...'}
            </p>
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
