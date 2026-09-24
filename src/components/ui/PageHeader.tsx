import type { ReactNode } from 'react';

type PageHeaderProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sage">{eyebrow}</p> : null}
                <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{title}</h1>
                {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
            </div>
            {action}
        </header>
    );
}