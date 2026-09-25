import type { UserRequirement } from '../../shared/types/requirements';
import type { DecisionResult } from '../../shared/types/recommendation';
import { analyzeOwnership } from './ownershipAnalyzer';
import { generateRecommendation } from './recommendationEngine';
import { getAccessOptions } from './resourceService';
import { rankAccessOptions } from './scoringEngine';
import { generateRecommendationExplanation } from './explanationService';
import type { AnalyzeSource } from './llmService';

export async function buildDecisionResult(requirement: UserRequirement, aiSource: AnalyzeSource, fallbackReason?: string): Promise<DecisionResult> {
    const accessOptions = await getAccessOptions(requirement);
    const scoredOptions = rankAccessOptions(accessOptions, requirement);
    const ownershipAnalysis = analyzeOwnership(requirement, scoredOptions);
    const recommendation = generateRecommendation(requirement, scoredOptions, ownershipAnalysis);
    const explanation = await generateRecommendationExplanation(recommendation.explanationData);

    return {
        requirement,
        accessOptions,
        scoredOptions,
        ownershipAnalysis,
        recommendation,
        explanation,
        aiSource,
        fallbackReason,
        createdAt: Date.now(),
    };
}
