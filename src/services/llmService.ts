import type { UserRequirement } from '../../shared/types/requirements';

type AnalyzeResponse = { success: true; data: UserRequirement } | { success: false; error?: string };

export async function analyzeUserNeed(userInput: string): Promise<UserRequirement> {
    try {
        const response = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: userInput }),
        });
        const payload = await response.json() as AnalyzeResponse;
        if (!response.ok || !payload.success) throw new Error(payload.success ? 'We could not understand that request.' : payload.error ?? 'We could not understand that request.');
        return payload.data;
    } catch (error) {
        if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
        throw new Error('We could not reach the assistant. Please try again.');
    }
}