import type { AccessOption } from './accessOptions.js';
import type { UserRequirement } from './requirements.js';
import type { RecommendationResult } from './recommendation.js';
import type { OwnershipAnalysis } from './recommendation.js';
import type { ScoredAccessOption } from './scoring.js';

export type ScenarioStatus = 'idle' | 'processing' | 'completed' | 'error';

export type Scenario = {
    id: string;
    name: string;
    description: string;
    inputText: string;
    requirement?: UserRequirement;
    recommendation?: RecommendationResult;
    scoredOptions?: ScoredAccessOption[];
    ownershipAnalysis?: OwnershipAnalysis;
    status: ScenarioStatus;
    error?: string;
};

export type ScenarioComparisonResult = {
    scenarios: Scenario[];
    changedFactors: string[];
    recommendationChanged: boolean;
    accessMethodChanges: { scenarioA: string; scenarioB: string; from: string; to: string }[];
    scoreChanges: { scenarioId: string; score: number | null }[];
    costChanges: { scenarioId: string; cost: number | null }[];
    ownershipChanges: { scenarioId: string; ownershipCostPerUse: number | null }[];
    explanationData: {
        summary: string;
        detail: string;
    };
};
