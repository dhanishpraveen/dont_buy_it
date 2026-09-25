import type { AccessOption } from '../../shared/types/accessOptions';
import type { UserRequirement } from '../../shared/types/requirements';
import type { FactorScores, ScoredAccessOption, ScoringFactor, ScoringWeights, WeightedBreakdown } from '../../shared/types/scoring';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
    cost: 30,
    availability: 20,
    distance: 15,
    trust: 15,
    convenience: 10,
    condition: 5,
    usageSuitability: 5,
};

const factors: ScoringFactor[] = ['cost', 'availability', 'distance', 'trust', 'convenience', 'condition', 'usageSuitability'];
const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
const numericOrNull = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function validateScoringWeights(weights: ScoringWeights): void {
    const values = factors.map((factor) => weights[factor]);
    if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error('Scoring weights must be finite, non-negative numbers.');
    if (values.reduce((total, value) => total + value, 0) <= 0) throw new Error('Scoring weights must total more than zero.');
}

function normalizedWeights(weights: ScoringWeights): ScoringWeights {
    validateScoringWeights(weights);
    const total = factors.reduce((sum, factor) => sum + weights[factor], 0);
    return factors.reduce((normalized, factor) => ({ ...normalized, [factor]: weights[factor] * 100 / total }), {} as ScoringWeights);
}

function scoreCost(option: AccessOption, candidates: AccessOption[], requirement: UserRequirement): number {
    const costs = candidates.map((candidate) => numericOrNull(candidate.totalCost)).filter((cost): cost is number => cost !== null && cost >= 0);
    const cost = numericOrNull(option.totalCost);
    if (cost === null || !costs.length) return 0;
    const minimum = Math.min(...costs);
    const maximum = Math.max(...costs);
    let score = maximum === minimum ? 100 : ((maximum - cost) / (maximum - minimum)) * 100;
    if (requirement.budget !== null && requirement.budget >= 0) score = cost <= requirement.budget ? Math.min(100, score + 10) : score * Math.max(0, requirement.budget / cost);
    return clamp(score);
}

function scoreAvailability(option: AccessOption, requirement: UserRequirement): number {
    if (option.availability === 'unavailable') return 0;
    if (option.availability === 'partially-available') return 70;
    if (!requirement.date || !option.availableFrom) return 100;
    const requested = requirement.date.toLowerCase();
    const available = option.availableFrom.toLowerCase();
    if (requested.includes('tomorrow')) return available.includes('today') || available.includes('tomorrow') ? 100 : 45;
    if (requested.includes('today')) return available.includes('today') ? 100 : 35;
    return 90;
}

function scoreDistance(option: AccessOption, candidates: AccessOption[]): number {
    const distance = numericOrNull(option.distanceKm);
    const distances = candidates.map((candidate) => numericOrNull(candidate.distanceKm)).filter((value): value is number => value !== null && value >= 0);
    if (distance === null || !distances.length) return 0;
    const maximum = Math.max(...distances);
    const minimum = Math.min(...distances);
    return clamp(maximum === minimum ? 100 : ((maximum - distance) / (maximum - minimum)) * 100);
}

function scoreTrust(option: AccessOption): number {
    const trust = numericOrNull(option.trustScore);
    return trust === null ? 0 : clamp(trust <= 5 ? trust * 20 : trust);
}

function scoreCondition(option: AccessOption): number {
    const existing = numericOrNull(option.conditionScore);
    if (existing !== null) return clamp(existing);
    const normalized = option.condition.toLowerCase();
    if (normalized.includes('excellent') || normalized.includes('new')) return 98;
    if (normalized.includes('like new')) return 95;
    if (normalized.includes('good')) return 82;
    if (normalized.includes('fair')) return 60;
    if (normalized.includes('poor')) return 30;
    return 0;
}

function capabilityMatch(option: AccessOption, requiredCapabilities: string[]): number {
    if (!requiredCapabilities.length) return 100;
    const available = option.capabilities.map((capability) => capability.toLowerCase());
    const matched = requiredCapabilities.filter((required) => {
        const words = required.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
        return words.length > 0 && words.some((word) => available.some((capability) => capability.includes(word)));
    }).length;
    return clamp((matched / requiredCapabilities.length) * 100);
}

function scoreUsageSuitability(option: AccessOption, requirement: UserRequirement): number {
    const base = numericOrNull(option.usageSuitabilityScore) ?? 0;
    const capabilityScore = capabilityMatch(option, requirement.requiredCapabilities);
    let score = base * (0.4 + capabilityScore / 166.67);
    const frequency = requirement.frequency?.toLowerCase() ?? '';
    const oneTime = frequency.includes('one-time') || frequency.includes('once') || frequency.includes('occasional');
    const longTerm = frequency.includes('regular') || frequency.includes('weekly') || frequency.includes('long-term') || Boolean(requirement.duration?.match(/month|year/i));
    if (oneTime) score += option.accessMethod === 'borrow' || option.accessMethod === 'rent' ? 5 : -5;
    if (longTerm) score += option.accessMethod === 'buy-used' || option.accessMethod === 'buy-new' ? 5 : -3;
    return clamp(score);
}

function factorScores(option: AccessOption, requirement: UserRequirement, candidates: AccessOption[]): FactorScores {
    return {
        cost: scoreCost(option, candidates, requirement),
        availability: scoreAvailability(option, requirement),
        distance: scoreDistance(option, candidates),
        trust: scoreTrust(option),
        convenience: clamp(numericOrNull(option.convenienceScore) ?? 0),
        condition: scoreCondition(option),
        usageSuitability: scoreUsageSuitability(option, requirement),
    };
}

export function calculateAccessScore(option: AccessOption, requirement: UserRequirement, weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS, comparisonOptions: AccessOption[] = [option]): ScoredAccessOption {
    const normalized = normalizedWeights(weights);
    const scores = factorScores(option, requirement, comparisonOptions);
    const weighted = factors.reduce((breakdown, factor) => ({ ...breakdown, [factor]: scores[factor] * normalized[factor] / 100 }), {} as WeightedBreakdown);
    weighted.total = factors.reduce((total, factor) => total + weighted[factor], 0);
    return { ...option, finalScore: clamp(weighted.total), factorScores: scores, weightedBreakdown: weighted };
}

function validOption(option: AccessOption): boolean {
    return Boolean(option && typeof option.id === 'string' && option.id && typeof option.title === 'string' && option.title);
}

export function rankAccessOptions(options: AccessOption[], requirement: UserRequirement, weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS): ScoredAccessOption[] {
    if (!Array.isArray(options) || !options.length) return [];
    const validOptions = options.filter(validOption);
    const scored = validOptions.map((option) => calculateAccessScore(option, requirement, weights, validOptions));
    return scored.sort((left, right) => right.finalScore - left.finalScore || right.factorScores.availability - left.factorScores.availability || right.factorScores.trust - left.factorScores.trust || left.totalCost - right.totalCost || left.distanceKm - right.distanceKm || left.id.localeCompare(right.id));
}