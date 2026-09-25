import { describe, expect, it } from 'vitest';
import { mockAccessOptions } from '../data/mockAccessOptions';
import { analyzeOwnership } from './ownershipAnalyzer';
import { generateRecommendation } from './recommendationEngine';
import { rankAccessOptions } from './scoringEngine';
import { deterministicExplanation } from '../../server/services/llm/explanationGenerator';
import type { UserRequirement } from '../../shared/types/requirements';

const requirement = (overrides: Partial<UserRequirement> = {}): UserRequirement => ({ item: 'projector', purpose: 'college presentation', duration: '5 hours', frequency: 'one-time', date: 'tomorrow', location: null, urgency: 'high', budget: null, requiredCapabilities: [], ...overrides });

describe('ownership and recommendation engine', () => {
    it('estimates one-time ownership usage and compares all methods', () => {
        const candidates = mockAccessOptions.filter((option) => option.itemId === 'projector');
        const ranked = rankAccessOptions(candidates, requirement());
        const ownership = analyzeOwnership(requirement(), ranked);
        expect(ownership.expectedUses).toBe(1);
        expect(ownership.borrowingCost).toBe(0);
        expect(ownership.estimatedRentalCost).toBe(700);
        expect(ownership.purchasePrice).toBe(28000);
        expect(ownership.comparison).toHaveLength(4);
    });

    it('increases expected uses for regular long-term use', () => {
        const ownership = analyzeOwnership(requirement({ frequency: 'regular', duration: 'six months' }), rankAccessOptions(mockAccessOptions.filter((option) => option.itemId === 'laptop'), requirement()));
        expect(ownership.expectedUses).toBe(24);
        expect(ownership.expectedUsageLabel).toContain('estimate');
    });

    it('generates a deterministic recommendation with structured reasons and savings', () => {
        const candidates = mockAccessOptions.filter((option) => option.itemId === 'projector');
        const ranked = rankAccessOptions(candidates, requirement());
        const ownership = analyzeOwnership(requirement(), ranked);
        const result = generateRecommendation(requirement(), ranked, ownership);
        expect(result.recommendedOption).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
        expect(result.reasonCodes.length).toBeGreaterThan(0);
        expect(result.estimatedSavings).toBeGreaterThan(0);
    });

    it('does not select a capability-incompatible high-score option', () => {
        const candidates = mockAccessOptions.filter((option) => option.itemId === 'projector').slice(0, 2).map((option, index) => ({ ...option, id: `capability-${index}`, capabilities: index === 0 ? ['VGA'] : ['HDMI', '3000 lumens'], totalCost: index === 0 ? 0 : 700 }));
        const required = requirement({ requiredCapabilities: ['HDMI'] });
        const ranked = rankAccessOptions(candidates, required);
        const ownership = analyzeOwnership(required, ranked);
        const result = generateRecommendation(required, ranked, ownership);
        expect(result.recommendedOption.capabilities).toContain('HDMI');
    });

    it('produces deterministic explanation text from reason codes', () => {
        const explanation = deterministicExplanation({ item: 'projector', purpose: 'presentation', recommendationType: 'borrow', accessScore: 90, estimatedSavings: 28000, reasonCodes: ['one_time_use', 'nearby'], usage: { duration: '5 hours', frequency: 'one-time', expectedUses: 1 } });
        expect(explanation).toContain('borrow');
        expect(explanation).toContain('one-time');
        expect(explanation).toContain('28,000');
    });
});