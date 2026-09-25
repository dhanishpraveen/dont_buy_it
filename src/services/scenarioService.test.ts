import { afterEach, describe, expect, it, vi } from 'vitest';
import { compareScenarios, createScenario, runScenario } from './scenarioService';
import { mockAccessOptions } from '../data/mockAccessOptions';

const originalFetch = global.fetch;

const buildRequirement = (inputText: string) => {
    if (inputText.includes('every week')) {
        return {
            item: 'projector',
            purpose: 'regular presentations',
            duration: '1 year',
            frequency: 'weekly',
            date: 'next year',
            location: null,
            urgency: 'medium',
            budget: null,
            requiredCapabilities: [],
        };
    }
    return {
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
};

afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
});

describe('scenario service', () => {
    it('runs a one-time projector scenario and completes successfully', async () => {
        global.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            if (url.includes('/api/ai/analyze')) {
                return { ok: true, text: async () => JSON.stringify({ success: true, data: buildRequirement('I need a projector tomorrow for 5 hours for my college presentation. I probably won\'t use it again.'), source: 'gemini' }) } as Response;
            }
            if (url.includes('/api/resources/match')) {
                return { ok: true, json: async () => ({ success: true, data: mockAccessOptions.filter((option) => option.itemId === 'projector') }) } as Response;
            }
            throw new Error('Unexpected fetch in test');
        });

        const result = await runScenario(createScenario({ id: 'scenario-1', name: 'One-Time Presentation', description: 'Use: Once', inputText: "I need a projector tomorrow for 5 hours for my college presentation. I probably won't use it again." }));
        expect(result.status).toBe('completed');
        expect(result.requirement?.item).toBe('projector');
        expect(result.recommendation?.recommendedOption).toBeDefined();
    });

    it('compares two scenarios and detects a changed recommendation', async () => {
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const body = init && typeof init.body === 'string' ? JSON.parse(init.body) : {};
            const requirement = buildRequirement(body.text ?? '');
            if (url.includes('/api/ai/analyze')) {
                return { ok: true, text: async () => JSON.stringify({ success: true, data: requirement, source: 'gemini' }) } as Response;
            }
            if (url.includes('/api/resources/match')) {
                return { ok: true, json: async () => ({ success: true, data: mockAccessOptions.filter((option) => option.itemId === 'projector') }) } as Response;
            }
            throw new Error('Unexpected fetch in test');
        });

        const scenarios = [
            createScenario({ id: 'a', name: 'One-Time', description: 'One-time', inputText: "I need a projector tomorrow for 5 hours for my college presentation. I probably won't use it again." }),
            createScenario({ id: 'b', name: 'Frequent', description: 'Weekly long-term', inputText: 'I need a projector every week for the next year for regular presentations.' }),
        ];

        const comparison = await compareScenarios(scenarios);
        expect(comparison.scenarios.some((scenario) => scenario.status === 'completed')).toBe(true);
        expect(comparison.recommendationChanged || comparison.changedFactors.length > 0).toBe(true);
    });

    it('handles missing information gracefully', async () => {
        global.fetch = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ success: true, data: { item: null, purpose: 'presentation', duration: null, frequency: null, date: null, location: null, urgency: null, budget: null, requiredCapabilities: [] }, source: 'gemini' }) }) as Response);

        const result = await runScenario(createScenario({ id: 'missing', name: 'Missing info', description: 'Missing item', inputText: 'I need something for a presentation.' }));
        expect(result.status).toBe('error');
    });
});
