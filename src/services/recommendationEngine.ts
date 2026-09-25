import type { AccessMethod } from '../../shared/types/accessOptions';
import type { ExplanationData, OwnershipAnalysis, RecommendationReasonCode, RecommendationResult } from '../../shared/types/recommendation';
import type { UserRequirement } from '../../shared/types/requirements';
import type { ScoredAccessOption } from '../../shared/types/scoring';

const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
const methods: AccessMethod[] = ['borrow', 'rent', 'buy-used', 'buy-new'];

function comparisonCost(method: AccessMethod, ownership: OwnershipAnalysis): number | null {
    return ownership.comparison.find((comparison) => comparison.accessMethod === method)?.totalCost ?? null;
}

function ownershipEconomicsScore(option: ScoredAccessOption, ownership: OwnershipAnalysis): number {
    const necessity = ownership.ownershipNecessityScore;
    const expectedUses = ownership.expectedUses;
    const selectedComparison = ownership.comparison.find((comparison) => comparison.accessMethod === option.accessMethod);
    const selectedCostPerUse = selectedComparison?.costPerUse ?? null;
    const rentPerUse = ownership.estimatedRentalCost !== null && expectedUses > 0 ? ownership.estimatedRentalCost / expectedUses : null;
    const ownershipPerUse = ownership.ownershipCostPerUse ?? null;
    const ownershipIsPreferable = ownershipPerUse !== null && rentPerUse !== null && ownershipPerUse <= rentPerUse;

    if (option.accessMethod === 'borrow') {
        const repeatedUsePenalty = expectedUses > 2 ? Math.min(40, (expectedUses - 2) * 2.5) : 0;
        const availabilityPenalty = option.factorScores.availability < 80 ? 15 : 0;
        return clamp(100 - necessity * 0.5 - repeatedUsePenalty - availabilityPenalty);
    }

    if (option.accessMethod === 'rent') {
        const partialUsageScore = clamp(60 + (100 - necessity) * 0.45 + (option.factorScores.availability > 85 ? 10 : 0));
        const longTermPenalty = Math.max(0, expectedUses - 12) * 1.5;
        return clamp(partialUsageScore - longTermPenalty);
    }

    const buyPreference = clamp(necessity * 0.8 + (expectedUses > 2 ? 15 : 0) + (ownershipIsPreferable ? 15 : 0));
    const costPenalty = selectedCostPerUse !== null && rentPerUse !== null && selectedCostPerUse > rentPerUse * 1.5 ? 15 : 0;
    return clamp(buyPreference - costPenalty);
}

function economicFit(option: ScoredAccessOption, options: ScoredAccessOption[], ownership: OwnershipAnalysis): number {
    const baseline = ownershipEconomicsScore(option, ownership);
    const selectedCost = comparisonCost(option.accessMethod, ownership);
    const costs = options.map((candidate) => comparisonCost(candidate.accessMethod, ownership)).filter((cost): cost is number => cost !== null);
    if (selectedCost === null || !costs.length) return baseline;
    const minimum = Math.min(...costs);
    const maximum = Math.max(...costs);
    const costFit = maximum === minimum ? 100 : clamp(((maximum - selectedCost) / (maximum - minimum)) * 100);
    return clamp((baseline * 0.7) + (costFit * 0.3));
}

function reasonCodes(option: ScoredAccessOption, requirement: UserRequirement, ownership: OwnershipAnalysis): RecommendationReasonCode[] {
    const reasons: RecommendationReasonCode[] = [];
    const frequency = requirement.frequency?.toLowerCase() ?? '';
    const selectedCost = comparisonCost(option.accessMethod, ownership);
    const lowestCost = ownership.comparison.map((comparison) => comparison.totalCost).filter((cost): cost is number => cost !== null).sort((left, right) => left - right)[0];
    if (frequency.includes('one-time') || frequency.includes('once')) reasons.push('one_time_use');
    if (frequency.includes('regular') || frequency.includes('weekly') || frequency.includes('long-term')) reasons.push('frequent_use');
    if (selectedCost !== null && selectedCost === lowestCost) reasons.push('low_total_cost');
    const selectedComparison = ownership.comparison.find((comparison) => comparison.accessMethod === option.accessMethod);
    const lowestCostPerUse = ownership.comparison.map((comparison) => comparison.costPerUse).filter((cost): cost is number => cost !== null).sort((left, right) => left - right)[0];
    if (selectedComparison?.costPerUse !== null && selectedComparison?.costPerUse === lowestCostPerUse) reasons.push('low_cost_per_use');
    if (option.distanceKm <= 5) reasons.push('nearby');
    if (option.trustScore >= 4.5) reasons.push('high_trust');
    if (option.factorScores.availability >= 90) reasons.push('available');
    if (requirement.requiredCapabilities.length && option.factorScores.usageSuitability >= 85) reasons.push('strong_capability_match');
    if (requirement.budget !== null && selectedCost !== null && selectedCost <= requirement.budget) reasons.push('within_budget');
    if (option.accessMethod === 'borrow' && ownership.borrowingCost !== null) reasons.push('borrowing_available');
    if (option.accessMethod === 'rent' && ownership.estimatedRentalCost !== null && ownership.purchasePrice !== null && ownership.estimatedRentalCost < ownership.purchasePrice) reasons.push('rental_more_economical');
    if (option.accessMethod === 'buy-used' && ownership.ownershipNecessityScore >= 60) reasons.push('used_purchase_more_economical');
    if (option.accessMethod === 'buy-new' && option.factorScores.condition >= 95) reasons.push('new_purchase_more_suitable');
    if (ownership.ownershipNecessityScore < 40 && option.accessMethod === 'borrow') reasons.push('ownership_economical');
    return reasons;
}

export function generateRecommendation(requirement: UserRequirement, scoredOptions: ScoredAccessOption[], ownershipAnalysis: OwnershipAnalysis): RecommendationResult {
    const viableOptions = scoredOptions.filter((option) => option.factorScores.availability > 0 && option.factorScores.usageSuitability >= (requirement.requiredCapabilities.length ? 50 : 0));
    if (!viableOptions.length) throw new Error('No compatible access options are available for this requirement.');

    const candidateMetrics = viableOptions.map((option) => {
        const contribution = (option.finalScore * 0.7) + (economicFit(option, viableOptions, ownershipAnalysis) * 0.3);
        return {
            optionId: option.id,
            accessMethod: option.accessMethod,
            accessScore: option.finalScore,
            totalCost: comparisonCost(option.accessMethod, ownershipAnalysis),
            ownershipCostPerUse: ownershipAnalysis.comparison.find((comparison) => comparison.accessMethod === option.accessMethod)?.costPerUse ?? null,
            ownershipNecessityScore: ownershipAnalysis.ownershipNecessityScore,
            recommendationContribution: clamp(contribution),
        };
    });

    const ranked = [...viableOptions].sort((left, right) => {
        const leftFit = candidateMetrics.find((candidate) => candidate.optionId === left.id)?.recommendationContribution ?? 0;
        const rightFit = candidateMetrics.find((candidate) => candidate.optionId === right.id)?.recommendationContribution ?? 0;
        return rightFit - leftFit || right.finalScore - left.finalScore || left.id.localeCompare(right.id);
    });

    const recommendedOption = ranked[0];
    const reasons = reasonCodes(recommendedOption, requirement, ownershipAnalysis);
    const selectedCost = comparisonCost(recommendedOption.accessMethod, ownershipAnalysis);
    const newPurchaseCost = comparisonCost('buy-new', ownershipAnalysis);
    const estimatedSavings = newPurchaseCost !== null && selectedCost !== null && newPurchaseCost > selectedCost ? newPurchaseCost - selectedCost : null;
    const confidence = clamp(recommendedOption.finalScore * 0.75 + recommendedOption.factorScores.usageSuitability * 0.15 + recommendedOption.factorScores.availability * 0.1 + Math.max(0, ownershipAnalysis.ownershipNecessityScore - 50) * 0.1);
    const explanationData: ExplanationData = { item: requirement.item, purpose: requirement.purpose, recommendationType: recommendedOption.accessMethod, accessScore: recommendedOption.finalScore, estimatedSavings, reasonCodes: reasons, usage: { duration: requirement.duration, frequency: requirement.frequency, expectedUses: ownershipAnalysis.expectedUses } };
    return { recommendedOption, recommendationType: recommendedOption.accessMethod, confidence, reasonCodes: reasons, estimatedSavings, accessScore: recommendedOption.finalScore, ownershipComparison: ownershipAnalysis, explanationData, rankedOptions: scoredOptions, requirement, debugInfo: { expectedUses: ownershipAnalysis.expectedUses, ownershipNecessityScore: ownershipAnalysis.ownershipNecessityScore, candidates: candidateMetrics } };
}

export function recommendationMethods(): AccessMethod[] {
    return [...methods];
}