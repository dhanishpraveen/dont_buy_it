import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRequirement } from '../../shared/types/requirements';
import { mockAccessOptions } from '../../shared/data/mockAccessOptions';
import { buildDecisionResult } from './decisionService';

const requirement: UserRequirement = {
    item: 'projector',
    purpose: 'college presentation',
    duration: '5 hours',
    frequency: 'one-time',
    date: 'tomorrow',
    location: null,
    urgency: 'high',
    budget: null,
    requiredCapabilities: [],
};

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/resources/match')) {
            return {
                ok: true,
                json: async () => ({ success: true, data: mockAccessOptions.filter((option) => option.itemId === 'projector') }),
            } as Response;
        }

        if (url.includes('/api/ai/explain')) {
            return {
                ok: true,
                text: async () => JSON.stringify({ success: true, data: { explanation: 'Deterministic recommendation selected borrow for this use case.', source: 'fallback' } }),
            } as Response;
        }

        throw new Error(`Unexpected fetch in test: ${url}`);
    }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('buildDecisionResult', () => {
    it('creates one authoritative decision result from the existing pipeline', async () => {
        const result = await buildDecisionResult(requirement, 'gemini');

        expect(result.aiSource).toBe('gemini');
        expect(result.requirement).toEqual(requirement);
        expect(result.accessOptions.length).toBeGreaterThan(0);
        expect(result.scoredOptions.length).toBeGreaterThan(0);
        expect(result.ownershipAnalysis.expectedUses).toBeGreaterThan(0);
        expect(result.recommendation.recommendationType).toBeTruthy();
        expect(result.explanation).toBeTruthy();
    });
});
