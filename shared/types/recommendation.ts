import type { AccessMethod, AccessOption } from './accessOptions.js';
import type { ScoredAccessOption } from './scoring.js';
import type { UserRequirement } from './requirements.js';

export type RecommendationReasonCode = 'one_time_use' | 'frequent_use' | 'low_total_cost' | 'low_cost_per_use' | 'nearby' | 'high_trust' | 'available' | 'strong_capability_match' | 'within_budget' | 'ownership_economical' | 'borrowing_available' | 'rental_more_economical' | 'used_purchase_more_economical' | 'new_purchase_more_suitable';

export type MethodEconomicComparison = {
    accessMethod: AccessMethod;
    optionId: string | null;
    totalCost: number | null;
    costPerUse: number | null;
};

export type OwnershipAnalysis = {
    expectedUses: number;
    expectedUsageLabel: string;
    purchasePrice: number | null;
    totalOwnershipCost: number | null;
    ownershipCostPerUse: number | null;
    estimatedRentalCost: number | null;
    borrowingCost: number | null;
    ownershipNecessityScore: number;
    comparison: MethodEconomicComparison[];
    baselinePurchaseOptionId: string | null;
};

export type ExplanationData = {
    item: string | null;
    purpose: string | null;
    recommendationType: AccessMethod;
    accessScore: number;
    estimatedSavings: number | null;
    reasonCodes: RecommendationReasonCode[];
    usage: { duration: string | null; frequency: string | null; expectedUses: number };
};

export type RecommendationCandidateDebug = {
    optionId: string;
    accessMethod: AccessMethod;
    accessScore: number;
    totalCost: number | null;
    ownershipCostPerUse: number | null;
    ownershipNecessityScore: number;
    recommendationContribution: number;
};

export type RecommendationResult = {
    recommendedOption: ScoredAccessOption;
    recommendationType: AccessMethod;
    confidence: number;
    reasonCodes: RecommendationReasonCode[];
    estimatedSavings: number | null;
    accessScore: number;
    ownershipComparison: OwnershipAnalysis;
    explanationData: ExplanationData;
    rankedOptions: ScoredAccessOption[];
    requirement: UserRequirement;
    debugInfo?: {
        expectedUses: number;
        ownershipNecessityScore: number;
        candidates: RecommendationCandidateDebug[];
    };
};

export type RecommendationExplanation = {
    explanation: string;
    source: 'gemini' | 'fallback';
};

export type RecommendationInput = {
    requirement: UserRequirement;
    recommendation: RecommendationResult;
    options: AccessOption[];
};