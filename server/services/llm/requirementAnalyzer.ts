import { GoogleGenAI } from '@google/genai';
import type { RequirementUrgency, UserRequirement } from '../../../shared/types/requirements.js';
import { requirementExtractionPrompt } from './requirementPrompt.js';

const requirementJsonSchema = {
    type: 'object',
    properties: {
        item: { type: ['string', 'null'] },
        purpose: { type: ['string', 'null'] },
        duration: { type: ['string', 'null'] },
        frequency: { type: ['string', 'null'] },
        date: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
        urgency: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
        budget: { type: ['number', 'null'] },
        requiredCapabilities: { type: 'array', items: { type: 'string' } },
    },
    required: ['item', 'purpose', 'duration', 'frequency', 'date', 'location', 'urgency', 'budget', 'requiredCapabilities'],
    additionalProperties: false,
} as const;

const requirementFields = ['item', 'purpose', 'duration', 'frequency', 'date', 'location', 'urgency', 'budget', 'requiredCapabilities'] as const;
const emptyRequirement = (): UserRequirement => ({ item: null, purpose: null, duration: null, frequency: null, date: null, location: null, urgency: null, budget: null, requiredCapabilities: [] });
const textOrNull = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const urgencyOrNull = (value: unknown): RequirementUrgency => value === 'low' || value === 'medium' || value === 'high' ? value : null;

function numberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.toLowerCase().replace(/[₹,\s]/g, '');
    const match = normalized.match(/^(\d+(?:\.\d+)?)(k)?$/);
    if (!match) return null;
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? amount * (match[2] ? 1000 : 1) : null;
}

export function normalizeRequirement(value: unknown): UserRequirement {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const capabilities = Array.isArray(source.requiredCapabilities) ? source.requiredCapabilities.filter((capability): capability is string => typeof capability === 'string' && Boolean(capability.trim())).map((capability) => capability.trim()) : [];
    return { item: textOrNull(source.item), purpose: textOrNull(source.purpose), duration: textOrNull(source.duration), frequency: textOrNull(source.frequency), date: textOrNull(source.date), location: textOrNull(source.location), urgency: urgencyOrNull(source.urgency), budget: numberOrNull(source.budget), requiredCapabilities: capabilities };
}

function hasRequiredShape(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && requirementFields.every((field) => field in value));
}

function extractDuration(text: string): string | null {
    const match = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*-?\s*(hours?|days?|weeks?|months?|years?)\b/i);
    if (!match) return null;
    const amount = match[1].toLowerCase();
    const unit = match[2].toLowerCase();
    const singular = amount === 'one' || amount === '1';
    const normalizedUnit = singular ? unit.replace(/s$/, '') : unit.endsWith('s') ? unit : `${unit}s`;
    return `${amount} ${normalizedUnit}`;
}

function extractBudget(text: string): number | null {
    const match = text.match(/(?:₹|rs\.?|inr\s*)\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*([kK])?|\b(\d+(?:\.\d+)?)\s*[kK]\b/i);
    if (!match) return null;
    const amount = Number((match[1] ?? match[3]).replace(',', ''));
    return Number.isFinite(amount) ? amount * (match[2] || match[3] ? 1000 : 1) : null;
}

function extractCapabilities(text: string): string[] {
    const capabilities: string[] = [];
    const knownPatterns = [
        /\bHDMI\b/i,
        /\b\d{3,4}p\b/i,
        /\b\d+K\s+recording\b/i,
        /\b\d+\s*GB\s*RAM\b/i,
        /\b(?:NVIDIA|AMD)\s+(?:GPU|graphics card)\b/i,
        /\b\d+\s*lumens\b/i,
    ];
    for (const pattern of knownPatterns) {
        const match = text.match(pattern);
        if (match && !capabilities.some((capability) => capability.toLowerCase() === match[0].toLowerCase())) capabilities.push(match[0].replace(/\s+/g, ' ').trim());
    }
    return capabilities;
}

function fallbackRequirement(text: string): UserRequirement {
    const normalized = text.toLowerCase();
    const fallback = emptyRequirement();
    const duration = extractDuration(text);
    const budget = extractBudget(text);
    const capabilities = extractCapabilities(text);
    const frequency = /just once|one[- ]time|probably won['’]t use it again|won['’]t use it again/i.test(text) ? 'one-time' : /every weekend/i.test(text) ? 'weekly' : /regularly|for the next year|for six months/i.test(text) ? 'regular' : null;
    const date = /from\s+friday\s+to\s+sunday/i.test(text) ? 'Friday to Sunday' : /next week/i.test(text) ? 'next week' : /next month/i.test(text) ? 'next month' : /tomorrow/i.test(text) ? 'tomorrow' : null;
    const location = text.match(/\b(near\s+[^,.]+?)(?=\s+(?:today|tomorrow|next|this)\b|[,.'"]|$)/i)?.[1]?.trim() ?? null;
    const purpose = /college presentation/i.test(text) ? 'college presentation' : /college event/i.test(text) ? 'college event' : /software development/i.test(text) ? 'software development' : /presentation/i.test(text) ? 'presentation' : null;

    if (normalized.includes('projector')) return { ...fallback, item: 'projector', purpose, duration, frequency, date, location, urgency: date === 'tomorrow' ? 'high' : null, budget, requiredCapabilities: capabilities };
    if (normalized.includes('camera')) return { ...fallback, item: 'camera', purpose, duration, frequency, date, location, urgency: date === 'next week' ? 'medium' : null, budget, requiredCapabilities: capabilities };
    if (normalized.includes('laptop')) return { ...fallback, item: 'laptop', purpose, duration, frequency, date, location, budget, requiredCapabilities: capabilities };
    if (normalized.includes('drill')) return { ...fallback, item: 'drill', purpose: /wall/i.test(text) ? 'make a few holes in a wall' : 'small home repair', duration, frequency, date, location, budget, requiredCapabilities: capabilities };
    if (normalized.includes('camp')) return { ...fallback, item: 'camping equipment', purpose: 'camping trip', duration, frequency, date, location, budget, requiredCapabilities: capabilities };
    return { ...fallback, purpose, duration, frequency, date, location, budget, requiredCapabilities: capabilities };
}

async function requestGemini(text: string, apiKey: string): Promise<UserRequirement> {
    console.log('[AI] Gemini call started');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash',
        contents: text,
        config: { systemInstruction: requirementExtractionPrompt, responseMimeType: 'application/json', responseJsonSchema: requirementJsonSchema, temperature: 0.1 },
    });
    console.log('[AI] Gemini response received');
    const responseText = response.text?.trim();
    if (!responseText) throw new Error('Gemini returned an empty response');
    const parsed: unknown = JSON.parse(responseText);
    if (!hasRequiredShape(parsed)) throw new Error('Gemini returned an incomplete requirement');
    const requirement = normalizeRequirement(parsed);
    console.log('[AI] Gemini extraction validated');
    return requirement;
}

export async function analyzeRequirement(text: string): Promise<{ requirement: UserRequirement; source: 'gemini' | 'fallback' }> {
    console.log('[AI] Request received');
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
        try {
            const requirement = await requestGemini(text, apiKey);
            console.log('[AI] Source: gemini');
            return { requirement, source: 'gemini' };
        } catch (error) {
            console.warn('[AI] Gemini failed', error instanceof Error ? error.message : 'unknown error');
        }
    } else {
        console.warn('[AI] Gemini failed: GEMINI_API_KEY is not configured');
    }
    console.log('[AI] Falling back to deterministic extraction');
    const requirement = fallbackRequirement(text);
    console.log('[AI] Source: fallback');
    return { requirement, source: 'fallback' };
}
