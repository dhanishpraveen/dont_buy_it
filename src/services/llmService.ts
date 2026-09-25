import type { UserRequirement } from '../../shared/types/requirements';

export type AnalyzeSource = 'gemini' | 'fallback';
type AnalyzeResponse = { success: true; data: UserRequirement; source: AnalyzeSource; fallbackReason?: string } | { success: false; error?: string };

export async function analyzeUserNeed(userInput: string): Promise<{ requirement: UserRequirement; source: AnalyzeSource; fallbackReason?: string }> {
    try {
        const response = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: userInput }),
        });
        const rawBody = await response.text();
        if (!rawBody.trim()) throw new Error(`The analysis service returned an empty response (${response.status}).`);
        let payload: AnalyzeResponse;
        try {
            payload = JSON.parse(rawBody) as AnalyzeResponse;
        } catch {
            throw new Error(`The analysis service returned an invalid response (${response.status}).`);
        }
        if (!response.ok || !payload.success) throw new Error(payload.success ? 'We could not understand that request.' : payload.error ?? 'We could not understand that request.');
        return { requirement: payload.data, source: payload.source, fallbackReason: payload.fallbackReason };
    } catch (error) {
        if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
        throw new Error('We could not reach the assistant. Please try again.');
    }
}