import type { PlayerStats } from './types';

export interface FightRound {
  round: number;
  cHp: number;
  dHp: number;
  cDmg: number;
  dDmg: number;
}

export interface FightResult {
  winner: 'challenger' | 'defender';
  xpTransferred: number;
  fightLog: FightRound[];
  shareCard: ShareCard;
}

export interface ShareCard {
  title: string;
  subtitle: string;
  winnerStats: string;
  cta: string;
}

export function calculateFight(challenger: PlayerStats, defender: PlayerStats): FightResult {
  const challengerPower = {
    attack:  challenger.weaponPower + Math.floor(challenger.mrr / 100000),
    defense: challenger.armorDefense + Math.floor(challenger.followers / 5000),
    speed:   challenger.level * 2,
    hp:      100 + challenger.xp / 100,
  };

  const defenderPower = {
    attack:  defender.weaponPower + Math.floor(defender.mrr / 100000),
    defense: defender.armorDefense + Math.floor(defender.followers / 5000),
    speed:   defender.level * 2,
    hp:      100 + defender.xp / 100,
  };

  const fightLog: FightRound[] = [];
  let cHp = challengerPower.hp;
  let dHp = defenderPower.hp;
  let round = 0;

  while (cHp > 0 && dHp > 0 && round < 20) {
    const cDmg = Math.max(1, challengerPower.attack - defenderPower.defense / 2 + Math.random() * 10);
    const dDmg = Math.max(1, defenderPower.attack - challengerPower.defense / 2 + Math.random() * 10);

    dHp -= cDmg;
    if (dHp > 0) cHp -= dDmg;

    fightLog.push({
      round,
      cHp: Math.max(0, cHp),
      dHp: Math.max(0, dHp),
      cDmg: Math.round(cDmg * 10) / 10,
      dDmg: Math.round(dDmg * 10) / 10,
    });
    round++;
  }

  const challengerWon = cHp > 0;
  const winner = challengerWon ? challenger : defender;
  const loser = challengerWon ? defender : challenger;
  const xpTransferred = Math.floor(Math.min(loser.xp * 0.1, 500));

  return {
    winner: challengerWon ? 'challenger' : 'defender',
    xpTransferred,
    fightLog,
    shareCard: generateShareCard(winner, loser, xpTransferred),
  };
}

function generateShareCard(winner: PlayerStats, loser: PlayerStats, xpGained: number): ShareCard {
  return {
    title: `⚔️ @${winner.xUsername} defeated @${loser.xUsername} in The Arena`,
    subtitle: `Took ${xpGained} XP · Now ranked #${winner.rank ?? '?'} globally`,
    winnerStats: `💰 $${(winner.mrr / 100).toLocaleString()}/mo MRR · 👥 ${winner.followers.toLocaleString()} followers`,
    cta: 'Play at midforgegame.com →',
  };
}
