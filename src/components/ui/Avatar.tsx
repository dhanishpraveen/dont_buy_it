type AvatarProps = {
    initials: string;
    size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

export function Avatar({ initials, size = 'md' }: AvatarProps) {
    return (
        <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sage-soft font-semibold text-sage ${sizeClasses[size]}`} aria-label={`Avatar for ${initials}`}>
            {initials}
        </span>
    );
}