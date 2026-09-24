import type { ReactNode } from 'react';

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>{description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}</div>{action}</div>;
}