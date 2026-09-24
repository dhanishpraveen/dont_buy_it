import type { UserRequirement, RequirementUrgency } from '../../../shared/types/requirements.js';
import { requirementExtractionPrompt } from './requirementPrompt.js';

const emptyRequirement = (): UserRequirement => ({
    item: null,
    purpose: null,
    duration: null,
    frequency: null,
    date: null,
    location: null,
    urgency: null,
    budget: null,
    requiredCapabilities: [],
});

const textOrNull = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const urgencyOrNull = (value: unknown): RequirementUrgency => value === 'low' || value === 'medium' || value === 'high' ? value : null;

export function normalizeRequirement(value: unknown): UserRequirement {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const capabilities = Array.isArray(source.requiredCapabilities) ? source.requiredCapabilities.filter((capability): capability is string => typeof capability === 'string' && Boolean(capability.trim())).map((capability) => capability.trim()) : [];
    return {
        item: textOrNull(source.item),
        purpose: textOrNull(source.purpose),
        duration: textOrNull(source.duration),
        frequency: textOrNull(source.frequency),
        date: textOrNull(source.date),
        location: textOrNull(source.location),
        urgency: urgencyOrNull(source.urgency),
        budget: textOrNull(source.budget),
        requiredCapabilities: capabilities,
    };
}

function fallbackRequirement(text: string): UserRequirement {
    const normalized = text.toLowerCase();
    const fallback = emptyRequirement();

    if (normalized.includes('projector')) {
        return {
            ...fallback,
            item: 'projector',
            purpose: normalized.includes('presentation') ? 'college presentation' : 'event or presentation',
            duration: normalized.includes('two days') ? 'two days' : normalized.match(/\b\d+\s*(?:hour|hours|day|days)\b/)?.[0] ?? null,
            frequency: 'one-time',
            date: normalized.includes('tomorrow') ? 'tomorrow' : null,
            urgency: normalized.includes('tomorrow') ? 'high' : 'medium',
            requiredCapabilities: ['display presentation slides', 'project image/video'],
        };
    }

    if (normalized.includes('drill')) {
        return {
            ...fallback,
            item: 'drill',
            purpose: normalized.includes('wall') ? 'make a few holes in a wall' : 'small home repair',
            frequency: 'one-time',
            urgency: 'medium',
            requiredCapabilities: ['drill holes in common household materials'],
        };
    }

    if (normalized.includes('camp')) {
        return {
            ...fallback,
            item: 'camping equipment',
            purpose: 'camping trip',
            duration: normalized.match(/\b\d+\s*(?:hour|hours|day|days)\b/)?.[0] ?? null,
            frequency: 'one-time',
            urgency: 'medium',
            requiredCapabilities: ['sleep outdoors', 'carry essential camping gear'],
        };
    }

    return fallback;
}

async function requestGemini(text: string, apiKey: string): Promise<UserRequirement> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: requirementExtractionPrompt }] },
            contents: [{ parts: [{ text }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
    });
    if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
    const payload: unknown = await response.json();
    const candidateText = (((payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text) ?? '').trim();
    if (!candidateText) throw new Error('Gemini returned an empty response');
    return normalizeRequirement(JSON.parse(candidateText));
}

export async function analyzeRequirement(text: string): Promise<{ requirement: UserRequirement; source: 'gemini' | 'fallback' }> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
        try {
            return { requirement: await requestGemini(text, apiKey), source: 'gemini' };
        } catch (error) {
            console.warn('Gemini requirement extraction failed; using deterministic fallback.', error instanceof Error ? error.message : 'unknown error');
        }
    }
    return { requirement: fallbackRequirement(text), source: 'fallback' };
}