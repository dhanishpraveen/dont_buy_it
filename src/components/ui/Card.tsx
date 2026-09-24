import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
};

export function Card({ className = '', children, ...props }: CardProps) {
    return (
        <div className={`rounded-card border border-line bg-surface ${className}`} {...props}>
            {children}
        </div>
    );
}