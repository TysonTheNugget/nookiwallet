// src/components/OrdinookiCard.js
import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
  width: 250px; /* Adjusted width for better layout */
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const OrdinookiImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 10px;
`;

const HealthBar = styled.div`
  width: 100%;
  height: 20px;
  background-color: #ddd;
  border-radius: 10px;
  margin: 10px 0;
  position: relative;
`;

const HealthFill = styled.div`
  width: ${(props) => (props.$health / props.$maxHealth) * 100}%;
  max-width: 100%;
  height: 100%;
  background-color: #4caf50;
  border-radius: 10px;
  transition: width 0.5s ease-in-out;
`;

const HealthText = styled.div`
  position: absolute;
  width: 100%;
  text-align: center;
  top: 0;
  left: 0;
  font-weight: bold;
  color: #fff;
`;

const Stats = styled.div`
  margin-top: 10px;
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
`;

const OrdinookiCard = ({ ordinooki, health }) => {
  const { meta, id, name } = ordinooki;
  const imageUrl = `https://static.unisat.io/content/${id}`; // Ensure this URL is correct

  const maxHealth = meta.stats.HP;

  return (
    <CardContainer>
      <OrdinookiImage src={imageUrl} alt={name} />
      <HealthBar>
        <HealthFill $health={health} $maxHealth={maxHealth} />
        <HealthText>
          {health} / {maxHealth} HP
        </HealthText>
      </HealthBar>
      <Stats>
        <StatItem>
          <span>Attack:</span> <span>{meta.stats.Attack}</span>
        </StatItem>
        <StatItem>
          <span>Defense:</span> <span>{meta.stats.Defense}</span>
        </StatItem>
        <StatItem>
          <span>Speed:</span> <span>{meta.stats.Speed}</span>
        </StatItem>
        <StatItem>
          <span>Critical Chance:</span> <span>{meta.stats['Critical Chance']}</span>
        </StatItem>
      </Stats>
    </CardContainer>
  );
};

export default OrdinookiCard;
