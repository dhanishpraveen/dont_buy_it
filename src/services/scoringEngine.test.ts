import { describe, expect, it } from 'vitest';
import { mockAccessOptions } from '../data/mockAccessOptions';
import type { AccessOption } from '../../shared/types/accessOptions';
import type { UserRequirement } from '../../shared/types/requirements';
import { calculateAccessScore, DEFAULT_SCORING_WEIGHTS, rankAccessOptions, validateScoringWeights } from './scoringEngine';

const requirement = (overrides: Partial<UserRequirement> = {}): UserRequirement => ({
    item: 'projector', purpose: 'college presentation', duration: '5 hours', frequency: 'one-time', date: 'tomorrow', location: null, urgency: 'high', budget: null, requiredCapabilities: [], ...overrides,
});

let fixtureId = 0;
const option = (overrides: Partial<AccessOption> = {}): AccessOption => ({ ...mockAccessOptions[0], id: `test-${fixtureId++}`, ...overrides });
const weights = (overrides: Partial<typeof DEFAULT_SCORING_WEIGHTS> = {}) => ({ ...DEFAULT_SCORING_WEIGHTS, ...overrides });

describe('scoring engine', () => {
    it('gives lower-cost options a higher cost score', () => {
        const low = option({ id: 'low', totalCost: 0 });
        const high = option({ id: 'high', totalCost: 1000 });
        expect(calculateAccessScore(low, requirement(), DEFAULT_SCORING_WEIGHTS, [low, high]).factorScores.cost).toBeGreaterThan(calculateAccessScore(high, requirement(), DEFAULT_SCORING_WEIGHTS, [low, high]).factorScores.cost);
    });

    it('gives fully available options a higher availability score', () => {
        const available = option({ id: 'available', availability: 'available' });
        const partial = option({ id: 'partial', availability: 'partially-available' });
        expect(calculateAccessScore(available, requirement()).factorScores.availability).toBeGreaterThan(calculateAccessScore(partial, requirement()).factorScores.availability);
    });

    it('gives closer options a higher distance score', () => {
        const close = option({ id: 'close', distanceKm: 1 });
        const far = option({ id: 'far', distanceKm: 10 });
        expect(calculateAccessScore(close, requirement(), DEFAULT_SCORING_WEIGHTS, [close, far]).factorScores.distance).toBeGreaterThan(calculateAccessScore(far, requirement(), DEFAULT_SCORING_WEIGHTS, [close, far]).factorScores.distance);
    });

    it('normalizes trust scores from the existing five-point scale', () => {
        expect(calculateAccessScore(option({ trustScore: 5 }), requirement()).factorScores.trust).toBe(100);
        expect(calculateAccessScore(option({ trustScore: 2.5 }), requirement()).factorScores.trust).toBe(50);
    });

    it('preserves higher condition scores', () => {
        expect(calculateAccessScore(option({ conditionScore: 95 }), requirement()).factorScores.condition).toBeGreaterThan(calculateAccessScore(option({ conditionScore: 55 }), requirement()).factorScores.condition);
    });

    it('reduces usage suitability for capability mismatches', () => {
        const matching = option({ capabilities: ['HDMI', '3000 lumens'], usageSuitabilityScore: 100 });
        const mismatch = option({ capabilities: ['VGA'], usageSuitabilityScore: 100 });
        expect(calculateAccessScore(matching, requirement({ requiredCapabilities: ['HDMI', '3000 lumens'] })).factorScores.usageSuitability).toBeGreaterThan(calculateAccessScore(mismatch, requirement({ requiredCapabilities: ['HDMI', '3000 lumens'] })).factorScores.usageSuitability);
    });

    it('changes usage suitability for one-time and long-term context', () => {
        const borrow = option({ accessMethod: 'borrow', usageSuitabilityScore: 80 });
        const purchase = option({ accessMethod: 'buy-new', usageSuitabilityScore: 80 });
        expect(calculateAccessScore(borrow, requirement({ frequency: 'one-time' })).factorScores.usageSuitability).toBeGreaterThan(calculateAccessScore(purchase, requirement({ frequency: 'one-time' })).factorScores.usageSuitability);
        expect(calculateAccessScore(purchase, requirement({ frequency: 'regular', duration: 'six months' })).factorScores.usageSuitability).toBeGreaterThan(calculateAccessScore(borrow, requirement({ frequency: 'regular', duration: 'six months' })).factorScores.usageSuitability);
    });

    it('keeps final scores between zero and one hundred', () => {
        const scored = calculateAccessScore(option(), requirement());
        expect(scored.finalScore).toBeGreaterThanOrEqual(0);
        expect(scored.finalScore).toBeLessThanOrEqual(100);
    });

    it('supports a cost-only weight configuration', () => {
        const scored = calculateAccessScore(option({ totalCost: 0 }), requirement(), weights({ cost: 100, availability: 0, distance: 0, trust: 0, convenience: 0, condition: 0, usageSuitability: 0 }), [option({ id: 'same', totalCost: 0 })]);
        expect(scored.finalScore).toBe(100);
        expect(scored.weightedBreakdown.cost).toBe(100);
    });

    it('rejects negative and all-zero weights', () => {
        expect(() => validateScoringWeights(weights({ cost: -1 }))).toThrow();
        expect(() => validateScoringWeights({ cost: 0, availability: 0, distance: 0, trust: 0, convenience: 0, condition: 0, usageSuitability: 0 })).toThrow();
    });

    it('handles empty and single-option inputs', () => {
        expect(rankAccessOptions([], requirement())).toEqual([]);
        const single = rankAccessOptions([option({ id: 'single' })], requirement());
        expect(single).toHaveLength(1);
        expect(single[0].factorScores.distance).toBe(100);
    });

    it('handles equal and missing distances safely', () => {
        const equal = rankAccessOptions([option({ id: 'a', distanceKm: 3 }), option({ id: 'b', distanceKm: 3 })], requirement());
        expect(equal.every((scored) => scored.factorScores.distance === 100)).toBe(true);
        const missing = calculateAccessScore(option({ distanceKm: Number.NaN }), requirement());
        expect(missing.factorScores.distance).toBe(0);
    });

    it('handles missing optional numeric scoring data safely', () => {
        const scored = calculateAccessScore(option({ trustScore: Number.NaN, convenienceScore: Number.NaN, conditionScore: Number.NaN, usageSuitabilityScore: Number.NaN }), requirement());
        expect(Number.isFinite(scored.finalScore)).toBe(true);
    });

    it('ranks options in descending final-score order', () => {
        const ranked = rankAccessOptions([option({ id: 'expensive', totalCost: 30000 }), option({ id: 'free', totalCost: 0 })], requirement());
        expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);
    });

    it('uses deterministic tie-breaking by stable id', () => {
        const ranked = rankAccessOptions([option({ id: 'z-option', totalCost: 10 }), option({ id: 'a-option', totalCost: 10 })], requirement());
        expect(ranked.map((scored) => scored.id)).toEqual(['a-option', 'z-option']);
    });

    it('returns identical output for repeated calculations', () => {
        const candidates = [option({ id: 'a', totalCost: 10 }), option({ id: 'b', totalCost: 100 })];
        expect(rankAccessOptions(candidates, requirement())).toEqual(rankAccessOptions(candidates, requirement()));
    });

    it('can change ranking when weights change', () => {
        const cheap = option({ id: 'cheap', totalCost: 0, trustScore: 2 });
        const trusted = option({ id: 'trusted', totalCost: 10000, trustScore: 5 });
        const costRank = rankAccessOptions([trusted, cheap], requirement(), weights({ cost: 100, availability: 0, distance: 0, trust: 0, convenience: 0, condition: 0, usageSuitability: 0 }));
        const trustRank = rankAccessOptions([trusted, cheap], requirement(), weights({ cost: 0, availability: 0, distance: 0, trust: 100, convenience: 0, condition: 0, usageSuitability: 0 }));
        expect(costRank[0].id).toBe('cheap');
        expect(trustRank[0].id).toBe('trusted');
    });

    it('scores the real projector candidate set without selecting a recommendation', () => {
        const candidates = mockAccessOptions.filter((candidate) => candidate.itemId === 'projector');
        const ranked = rankAccessOptions(candidates, requirement());
        expect(ranked).toHaveLength(5);
        expect(ranked.every((candidate) => candidate.finalScore >= 0 && candidate.finalScore <= 100)).toBe(true);
        expect(new Set(ranked.map((candidate) => candidate.accessMethod))).toEqual(new Set(['borrow', 'rent', 'buy-used', 'buy-new']));
        expect(ranked.every((candidate) => candidate.weightedBreakdown.total === candidate.finalScore)).toBe(true);
    });
});