import type { ExplanationData, RecommendationExplanation } from '../../shared/types/recommendation';

type ExplanationResponse = { success: true; data: RecommendationExplanation } | { success: false; error?: string };

const reasonText: Record<string, string> = { one_time_use: 'It matches a one-time use pattern.', frequent_use: 'It fits the expected regular use pattern.', low_total_cost: 'It has the lowest modeled total cost.', low_cost_per_use: 'It has the lowest modeled cost per use.', nearby: 'It is nearby.', high_trust: 'The provider has a high trust score.', available: 'It is available when needed.', strong_capability_match: 'It matches the required capabilities.', within_budget: 'It is within the stated budget.', ownership_economical: 'Ownership is not necessary for this usage.', borrowing_available: 'A borrowing option is available.', rental_more_economical: 'Rental is more economical in this model.', used_purchase_more_economical: 'Used purchase is more economical in this model.', new_purchase_more_suitable: 'The new option has the strongest condition fit.' };

function fallbackExplanation(data: ExplanationData): RecommendationExplanation {
    const method = data.recommendationType.replace('buy-used', 'buy used').replace('buy-new', 'buy new');
    const reasons = data.reasonCodes.slice(0, 4).map((reason) => reasonText[reason] ?? reason).join(' ');
    const savings = data.estimatedSavings !== null ? ` Estimated savings are ₹${Math.round(data.estimatedSavings).toLocaleString('en-IN')}, based on the modeled usage.` : '';
    return { explanation: `The deterministic access score selected ${method} for ${data.item ?? 'this item'}. ${reasons || 'It had the strongest combined fit across the measured factors.'}${savings}`, source: 'fallback' };
}

export async function generateRecommendationExplanation(data: ExplanationData): Promise<RecommendationExplanation> {
    try {
        const response = await fetch('/api/ai/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
        const rawBody = await response.text();
        if (!rawBody.trim()) throw new Error(`The explanation service returned an empty response (${response.status}).`);
        const payload = JSON.parse(rawBody) as ExplanationResponse;
        if (!response.ok || !payload.success) throw new Error(payload.success ? 'We could not generate an explanation.' : payload.error ?? 'We could not generate an explanation.');
        return payload.data;
    } catch {
        return fallbackExplanation(data);
    }
}