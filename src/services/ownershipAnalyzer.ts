import type { AccessMethod } from '../../shared/types/accessOptions';
import type { UserRequirement } from '../../shared/types/requirements';
import type { OwnershipAnalysis, MethodEconomicComparison } from '../../shared/types/recommendation';
import type { ScoredAccessOption } from '../../shared/types/scoring';

const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
const numberOrNull = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

function parseCount(value: string | null): number | null {
    if (!value) return null;
    const match = value.toLowerCase().match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
    if (!match) return null;
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    return words[match[1]] ?? Number(match[1]);
}

export function estimateExpectedUses(requirement: UserRequirement): { count: number; label: string } {
    const frequency = requirement.frequency?.toLowerCase() ?? '';
    const duration = requirement.duration?.toLowerCase() ?? '';
    if (frequency.includes('one-time') || frequency.includes('once')) return { count: 1, label: '1 time' };
    const durationCount = parseCount(duration);
    if (frequency.includes('every week') || frequency.includes('weekly')) return { count: duration.includes('year') ? 52 : duration.includes('month') ? 26 : 52, label: 'Weekly estimate' };
    if (frequency.includes('every month') || frequency.includes('monthly')) return { count: durationCount ?? 12, label: 'Monthly estimate' };
    if (frequency.includes('regular') || frequency.includes('frequent')) return { count: duration.includes('year') ? 52 : duration.includes('month') ? Math.max(4, (durationCount ?? 6) * 4) : 24, label: 'Regular-use estimate' };
    if (duration.includes('year')) return { count: (durationCount ?? 1) * 12, label: 'Long-term estimate' };
    if (duration.includes('month')) return { count: (durationCount ?? 1) * 4, label: 'Monthly-use estimate' };
    return { count: 1, label: '1 time estimate' };
}

function optionCost(option: ScoredAccessOption, expectedUses: number): number | null {
    const cost = numberOrNull(option.totalCost);
    if (cost === null || cost < 0) return null;
    return option.accessMethod === 'rent' ? cost * expectedUses : cost;
}

export function analyzeOwnership(requirement: UserRequirement, options: ScoredAccessOption[]): OwnershipAnalysis {
    const expected = estimateExpectedUses(requirement);
    const purchaseOptions = options.filter((option) => option.accessMethod === 'buy-new' || option.accessMethod === 'buy-used');
    const newPurchase = purchaseOptions.find((option) => option.accessMethod === 'buy-new') ?? null;
    const usedPurchase = purchaseOptions.find((option) => option.accessMethod === 'buy-used') ?? null;
    const purchase = newPurchase ?? usedPurchase;
    const purchasePrice = purchase ? numberOrNull(purchase.totalCost) : null;
    const totalOwnershipCost = purchasePrice;
    const ownershipCostPerUse = totalOwnershipCost !== null ? totalOwnershipCost / Math.max(1, expected.count) : null;
    const rentalOptions = options.filter((option) => option.accessMethod === 'rent').map((option) => optionCost(option, expected.count)).filter((cost): cost is number => cost !== null);
    const borrowOptions = options.filter((option) => option.accessMethod === 'borrow').map((option) => optionCost(option, expected.count)).filter((cost): cost is number => cost !== null);
    const estimatedRentalCost = rentalOptions.length ? Math.min(...rentalOptions) : null;
    const borrowingCost = borrowOptions.length ? Math.min(...borrowOptions) : null;
    let ownershipNecessityScore = 50;
    if (expected.count <= 2) ownershipNecessityScore -= 30;
    if (expected.count >= 24) ownershipNecessityScore += 25;
    if (ownershipCostPerUse !== null && estimatedRentalCost !== null) {
        const rentalPerUse = estimatedRentalCost / Math.max(1, expected.count);
        if (ownershipCostPerUse <= rentalPerUse) ownershipNecessityScore += 25;
        if (ownershipCostPerUse > rentalPerUse * 2) ownershipNecessityScore -= 25;
    }
    if (borrowingCost !== null) ownershipNecessityScore -= 15;
    const comparison: MethodEconomicComparison[] = (['borrow', 'rent', 'buy-used', 'buy-new'] as const).map((accessMethod) => {
        const candidate = options.filter((option) => option.accessMethod === accessMethod).sort((left, right) => (optionCost(left, expected.count) ?? Number.POSITIVE_INFINITY) - (optionCost(right, expected.count) ?? Number.POSITIVE_INFINITY))[0];
        const totalCost = candidate ? optionCost(candidate, expected.count) : null;
        return { accessMethod, optionId: candidate?.id ?? null, totalCost, costPerUse: totalCost === null ? null : totalCost / Math.max(1, expected.count) };
    });
    return { expectedUses: expected.count, expectedUsageLabel: expected.label, purchasePrice, totalOwnershipCost, ownershipCostPerUse, estimatedRentalCost, borrowingCost, ownershipNecessityScore: clamp(ownershipNecessityScore), comparison, baselinePurchaseOptionId: purchase?.id ?? null };
}