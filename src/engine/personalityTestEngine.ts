import { PERSONALITY_QUESTIONS_BY_WORLD } from '../data/personalityQuestions';
import type { PersonalityAnswers, TraitKey, TraitScores, WorldType } from '../types/game';

const TRAIT_KEYS: TraitKey[] = ['膽識', '人情', '觀察', '執念', '變通', '口才'];

export function getPersonalityQuestions(worldType: WorldType) {
  return PERSONALITY_QUESTIONS_BY_WORLD[worldType];
}

export function calculateTraitScores(worldType: WorldType, answers: PersonalityAnswers): TraitScores {
  const scores = TRAIT_KEYS.reduce<TraitScores>(
    (result, key) => ({ ...result, [key]: 1 }),
    { 膽識: 1, 人情: 1, 觀察: 1, 執念: 1, 變通: 1, 口才: 1 },
  );

  for (const question of getPersonalityQuestions(worldType)) {
    const selectedOption = question.options.find((option) => option.id === answers[question.id]);
    if (selectedOption) {
      scores[selectedOption.trait] += 2;
    }
  }

  return scores;
}

export function isPersonalityComplete(worldType: WorldType, answers: PersonalityAnswers) {
  return getPersonalityQuestions(worldType).every((question) => Boolean(answers[question.id]));
}
