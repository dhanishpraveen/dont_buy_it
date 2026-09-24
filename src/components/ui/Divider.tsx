type DividerProps = { className?: string };

export function Divider({ className = '' }: DividerProps) {
    return <div aria-hidden="true" className={`h-px w-full bg-line ${className}`} />;
}