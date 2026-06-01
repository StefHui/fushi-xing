import type { CharacterStats, TraitScores, WorldType } from '../types/game';

const WORLD_BONUSES: Record<WorldType, Partial<CharacterStats>> = {
  武俠: { 體魄: 1, 機敏: 1 },
  修仙: { 心神: 2 },
  末日: { 體魄: 1, 運道: 1 },
  無限流: { 機敏: 1, 口才: 1 },
};

export function buildCharacterStats(worldType: WorldType, traits: TraitScores): CharacterStats {
  const base: CharacterStats = {
    體魄: 3 + Math.floor((traits.膽識 + traits.執念) / 2),
    心神: 3 + Math.floor((traits.觀察 + traits.執念) / 2),
    機敏: 3 + Math.floor((traits.觀察 + traits.變通) / 2),
    口才: 3 + Math.floor((traits.口才 + traits.人情) / 2),
    運道: 3 + Math.floor((traits.變通 + traits.膽識) / 2),
  };
  const bonus = WORLD_BONUSES[worldType];

  return {
    體魄: clampStat(base.體魄 + (bonus.體魄 ?? 0)),
    心神: clampStat(base.心神 + (bonus.心神 ?? 0)),
    機敏: clampStat(base.機敏 + (bonus.機敏 ?? 0)),
    口才: clampStat(base.口才 + (bonus.口才 ?? 0)),
    運道: clampStat(base.運道 + (bonus.運道 ?? 0)),
  };
}

export function applyStatEffects(stats: CharacterStats, effects: Partial<CharacterStats>): CharacterStats {
  return {
    體魄: clampStat(stats.體魄 + (effects.體魄 ?? 0)),
    心神: clampStat(stats.心神 + (effects.心神 ?? 0)),
    機敏: clampStat(stats.機敏 + (effects.機敏 ?? 0)),
    口才: clampStat(stats.口才 + (effects.口才 ?? 0)),
    運道: clampStat(stats.運道 + (effects.運道 ?? 0)),
  };
}

function clampStat(value: number) {
  return Math.max(1, Math.min(12, value));
}
