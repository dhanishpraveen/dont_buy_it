import { PackageOpen } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = { title: string; description: string; action?: ReactNode };

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage-soft text-sage"><PackageOpen size={22} /></span>
            <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}