import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
    tone?: 'sage' | 'neutral' | 'brown';
};

const toneClasses = {
    sage: 'bg-sage-soft text-sage',
    neutral: 'bg-canvas text-muted',
    brown: 'bg-bark/10 text-bark',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`} {...props}>
            {children}
        </span>
    );
}