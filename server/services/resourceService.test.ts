import { describe, expect, it } from 'vitest';
import { getAccessOptions } from './resourceService.js';
import type { UserRequirement } from '../../shared/types/requirements.js';

const requirement = (overrides: Partial<UserRequirement> = {}): UserRequirement => ({
    item: 'projector',
    purpose: 'college presentation',
    duration: '5 hours',
    frequency: 'one-time',
    date: 'tomorrow',
    location: null,
    urgency: 'high',
    budget: null,
    requiredCapabilities: ['display presentation slides'],
    ...overrides,
});

describe('getAccessOptions', () => {
    it('returns all four access methods for the projector scenario', () => {
        const options = getAccessOptions(requirement());
        expect(new Set(options.map((option) => option.accessMethod))).toEqual(new Set(['borrow', 'rent', 'buy-used', 'buy-new']));
    });

    it('matches laptop and camera requirements independently', () => {
        expect(getAccessOptions(requirement({ item: 'laptop', requiredCapabilities: ['run presentation software'] })).length).toBeGreaterThan(0);
        expect(getAccessOptions(requirement({ item: 'camera', requiredCapabilities: ['capture still photos'] })).length).toBeGreaterThan(0);
    });

    it('filters incompatible capabilities and locations', () => {
        expect(getAccessOptions(requirement({ requiredCapabilities: ['3D print metal parts'] }))).toEqual([]);
        expect(getAccessOptions(requirement({ location: 'Bengaluru' }))).toEqual([]);
    });

    it('excludes explicitly unavailable resources', () => {
        const options = getAccessOptions(requirement({ item: 'chair', requiredCapabilities: ['support focused desk work'] }));
        expect(options.every((option) => option.availability !== 'unavailable')).toBe(true);
        expect(options.some((option) => option.accessMethod === 'borrow')).toBe(true);
    });
});