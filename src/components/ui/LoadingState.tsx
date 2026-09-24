export function LoadingState({ label = 'Loading' }: { label?: string }) {
    return (
        <div className="flex min-h-56 items-center justify-center rounded-card border border-line bg-surface text-sm text-muted" role="status">
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-line border-t-sage" />
            {label}
        </div>
    );
}