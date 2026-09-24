import type { AccessOption } from '../../shared/types/accessOptions';
import type { UserRequirement } from '../../shared/types/requirements';

type ResourceResponse = { success: true; data: AccessOption[] } | { success: false; error?: string };

export async function getAccessOptions(requirement: UserRequirement): Promise<AccessOption[]> {
    try {
        const response = await fetch('/api/resources/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirement }),
        });
        const payload = await response.json() as ResourceResponse;
        if (!response.ok || !payload.success) throw new Error(payload.success ? 'We could not retrieve access options.' : payload.error ?? 'We could not retrieve access options.');
        return payload.data;
    } catch (error) {
        if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
        throw new Error('We could not reach the access options service. Please try again.');
    }
}