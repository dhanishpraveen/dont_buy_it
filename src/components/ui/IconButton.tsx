import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    children: ReactNode;
};

export function IconButton({ label, className = '', children, ...props }: IconButtonProps) {
    return (
        <button
            aria-label={label}
            title={label}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}