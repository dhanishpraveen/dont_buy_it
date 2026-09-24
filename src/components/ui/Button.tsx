import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-bark text-surface shadow-soft hover:bg-ink',
    secondary: 'bg-sage-soft text-ink hover:bg-sage hover:text-surface',
    ghost: 'text-muted hover:bg-sage-soft hover:text-ink',
    outline: 'border border-line bg-transparent text-ink hover:border-bark hover:text-bark',
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
    return (
        <button
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}