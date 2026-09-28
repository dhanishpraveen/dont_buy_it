import { describe, expect, it } from 'vitest';
import { getAccessOptions } from './resourceService.js';
import { listingToAccessOption } from './listingService.js';
import { findNearbyResources } from '../repositories/resourceRepository.js';
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

    it('calculates real distance for listing-derived access options', () => {
        const option = listingToAccessOption({
            id: 'listing-1',
            owner: { id: 'owner-1', name: 'Aditi', trustScore: 4.8 },
            item: { name: 'Portable projector', description: 'Bright and compact projector.', category: 'Electronics', images: ['https://example.com/projector.jpg'], condition: 'Good', capabilities: ['HDMI', 'display presentation slides'] },
            accessType: 'borrow',
            price: 0,
            priceUnit: 'free',
            availability: 'available',
            availableFrom: 'tomorrow',
            availableUntil: null,
            location: 'Adyar, Chennai',
            locationCoordinates: { latitude: 13.0678, longitude: 80.2376 },
            status: 'active',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { latitude: 13.0762, longitude: 80.2607 });

        expect(option.distanceKm).toBeGreaterThan(0);
        expect(option.distanceKm).toBeLessThan(30);
    });

    it('applies category filtering in nearby resource queries', async () => {
        const options = await findNearbyResources({ latitude: 13.0678, longitude: 80.2376 }, 25, { category: 'Electronics', limit: 10 });
        expect(options.length).toBeGreaterThan(0);
        expect(options.every((option) => option.category.toLowerCase() === 'electronics')).toBe(true);
    });
});