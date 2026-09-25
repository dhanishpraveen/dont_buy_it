import { GoogleGenAI } from '@google/genai';
import type { ExplanationData, RecommendationExplanation, RecommendationReasonCode } from '../../../shared/types/recommendation.js';

const explanationPrompt = `You are the explanation layer for Don't Buy It.

The recommendation has already been calculated by a deterministic decision engine.
You MUST NOT change the recommendation or any numerical values.
You MUST NOT invent prices, availability, distances, trust scores, savings, capabilities, or other facts.
Explain why the deterministic system selected the supplied access option.
Use only the supplied information.
Be concise, clear, and understandable to a student.
Do not claim certainty about estimated financial outcomes.
Do not make additional recommendations.`;

const reasonText: Record<RecommendationReasonCode, string> = {
    one_time_use: 'It matches a one-time use pattern.',
    frequent_use: 'It fits the expected regular use pattern.',
    low_total_cost: 'It has the lowest modeled total cost among the available methods.',
    low_cost_per_use: 'It has the lowest modeled cost per use.',
    nearby: 'It is within the nearby distance range.',
    high_trust: 'The provider has a high trust score.',
    available: 'It is available for the requested timing.',
    strong_capability_match: 'Its capabilities closely match the stated requirements.',
    within_budget: 'Its modeled cost is within the stated budget.',
    ownership_economical: 'The modeled usage does not make ownership necessary.',
    borrowing_available: 'A borrowing option is available for this need.',
    rental_more_economical: 'Rental is modeled below the available purchase baseline for this usage.',
    used_purchase_more_economical: 'A used purchase is modeled as a more economical ownership path.',
    new_purchase_more_suitable: 'The new option provides the strongest modeled condition fit.',
};

export function deterministicExplanation(data: ExplanationData): string {
    const item = data.item ?? 'this item';
    const method = data.recommendationType.replace('buy-used', 'buy used').replace('buy-new', 'buy new');
    const reasons = data.reasonCodes.slice(0, 4).map((reason) => reasonText[reason]).join(' ');
    const savings = data.estimatedSavings !== null ? ` The estimated savings compared with the modeled new-purchase baseline are ₹${Math.round(data.estimatedSavings).toLocaleString('en-IN')}; this is an estimate based on the supplied usage.` : '';
    return `The deterministic access score selected ${method} for ${item}. ${reasons || 'It had the strongest combined fit across the measured factors.'}${savings}`;
}

export async function generateExplanation(data: ExplanationData): Promise<RecommendationExplanation> {
    const fallback = deterministicExplanation(data);
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const defaultModel = 'gemini-3.8-flash';
    const modelName = process.env.GEMINI_MODEL?.trim() || defaultModel;
    if (!apiKey) return { explanation: fallback, source: 'fallback' };
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: modelName, contents: JSON.stringify(data), config: { systemInstruction: explanationPrompt, temperature: 0.2 } });
        const explanation = response.text?.trim();
        if (!explanation) throw new Error('Gemini returned an empty explanation');
        return { explanation, source: 'gemini' };
    } catch (error) {
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown error';
        console.error('[AI] Explanation failed; using deterministic explanation.', { model: modelName, message });
        return { explanation: fallback, source: 'fallback' };
    }
}