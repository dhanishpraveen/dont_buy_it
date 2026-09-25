import type { AccessOption } from './accessOptions.js';

export type ScoringFactor = 'cost' | 'availability' | 'distance' | 'trust' | 'convenience' | 'condition' | 'usageSuitability';

export type ScoringWeights = Record<ScoringFactor, number>;

export type FactorScores = Record<ScoringFactor, number>;
export type WeightedBreakdown = Record<ScoringFactor, number> & { total: number };

export type ScoredAccessOption = AccessOption & {
    finalScore: number;
    factorScores: FactorScores;
    weightedBreakdown: WeightedBreakdown;
};