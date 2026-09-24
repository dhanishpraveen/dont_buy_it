import { Star } from 'lucide-react';

export function TrustBadge({ score }: { score: number }) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-bark"><Star size={13} fill="currentColor" aria-hidden="true" />{score.toFixed(1)} trusted</span>;
}