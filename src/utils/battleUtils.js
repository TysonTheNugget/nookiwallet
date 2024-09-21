export const calculateDamage = (attacker, defender) => {
  const baseDamage = attacker.meta.stats.Attack - defender.meta.stats.Defense;
  const criticalHit = Math.random() < attacker.meta.stats['Critical Chance'] ? 1.5 : 1;
  const damage = Math.max(0, baseDamage * criticalHit);
  return damage;
};

export const determineTurnOrder = (ordinooki1, ordinooki2) => {
  if (ordinooki1.meta.stats.Speed > ordinooki2.meta.stats.Speed) {
    return [ordinooki1, ordinooki2];
  } else if (ordinooki1.meta.stats.Speed < ordinooki2.meta.stats.Speed) {
    return [ordinooki2, ordinooki1];
  } else {
    return Math.random() < 0.5 ? [ordinooki1, ordinooki2] : [ordinooki2, ordinooki1];
  }
};
