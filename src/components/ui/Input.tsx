import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
};

export function Input({ label, id, className = '', ...props }: InputProps) {
    return (
        <label className="block">
            {label ? <span className="mb-2 block text-sm font-semibold text-ink">{label}</span> : null}
            <input
                id={id}
                className={`h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-sage focus:ring-2 focus:ring-sage/20 ${className}`}
                {...props}
            />
        </label>
    );
}