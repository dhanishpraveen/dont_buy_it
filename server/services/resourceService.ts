import type { AccessOption } from '../../shared/types/accessOptions.js';
import type { UserRequirement } from '../../shared/types/requirements.js';
import { mockAccessOptions } from '../../shared/data/mockAccessOptions.js';
import { getDatabaseMode } from '../config/database.js';
import { findMatchingResources } from '../repositories/resourceRepository.js';
import { listPublishedListings, listingToAccessOption } from './listingService.js';

const itemAliases: Record<string, string[]> = {
    projector: ['projector', 'presentation', 'display'],
    laptop: ['laptop', 'computer', 'notebook'],
    camera: ['camera', 'photography', 'photo'],
    'camping-equipment': ['camp', 'camping', 'tent', 'outdoor'],
    drill: ['drill', 'holes', 'repair'],
    'ergonomic-chair': ['chair', 'desk', 'office', 'ergonomic'],
};

const normalize = (value: string) => value.toLowerCase().trim();

function matchesItem(option: AccessOption, requestedItem: string): boolean {
    const query = normalize(requestedItem);
    const aliases = Object.entries(itemAliases).find(([, values]) => values.some((value) => query.includes(value)))?.[0];
    if (aliases) return option.itemId === aliases;
    return `${option.itemId} ${option.title} ${option.category}`.toLowerCase().includes(query);
}

function matchesCapabilities(option: AccessOption, requiredCapabilities: string[]): boolean {
    if (!requiredCapabilities.length) return true;
    return requiredCapabilities.some((required) => {
        const requiredWords = normalize(required).split(/\s+/).filter((word) => word.length > 3);
        return option.capabilities.some((capability) => requiredWords.some((word) => normalize(capability).includes(word)));
    });
}

function matchesLocation(option: AccessOption, location: string | null): boolean {
    if (!location || ['nearby', 'close', 'local'].some((term) => normalize(location).includes(term))) return true;
    const requested = normalize(location);
    return option.location.toLowerCase().includes(requested) || requested.includes('chennai') && option.location.toLowerCase().includes('chennai');
}

function matchesDate(option: AccessOption, date: string | null): boolean {
    if (!date || option.availability === 'partially-available') return true;
    if (!option.availableFrom) return true;
    const requested = normalize(date);
    const available = normalize(option.availableFrom);
    if (requested.includes('tomorrow')) return available.includes('tomorrow') || available.includes('today');
    if (requested.includes('today')) return available.includes('today');
    return true;
}

export function getAccessOptions(requirement: UserRequirement): AccessOption[] {
    if (!requirement.item?.trim()) return [];
    return mockAccessOptions.filter((option) => option.availability !== 'unavailable' && matchesItem(option, requirement.item ?? '') && matchesCapabilities(option, requirement.requiredCapabilities) && matchesLocation(option, requirement.location) && matchesDate(option, requirement.date));
}

export async function getAccessOptionsForRequest(requirement: UserRequirement): Promise<AccessOption[]> {
    if (getDatabaseMode() === 'mongo') return findMatchingResources(requirement);
    const demoOptions = getAccessOptions(requirement);
    const userOptions = (await listPublishedListings()).map(listingToAccessOption).filter((option) => option.availability !== 'unavailable' && matchesItem(option, requirement.item ?? '') && matchesCapabilities(option, requirement.requiredCapabilities) && matchesLocation(option, requirement.location) && matchesDate(option, requirement.date));
    return [...demoOptions, ...userOptions];
}

export function getAllMockAccessOptions(): AccessOption[] {
    return mockAccessOptions.filter((option) => option.availability !== 'unavailable');
}