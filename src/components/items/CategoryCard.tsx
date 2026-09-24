import { ArrowUpRight, BookOpen, Camera, Dumbbell, Hammer, Home, LampDesk, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

const icons = { Tools: Hammer, Books: BookOpen, Electronics: Camera, 'Outdoor & Sports': Dumbbell, Furniture: LampDesk, 'Home & Kitchen': Home, Other: MoreHorizontal };

export function CategoryCard({ name, count }: { name: string; count: number }) {
    const Icon = icons[name as keyof typeof icons] ?? MoreHorizontal;
    return <Link to={`/browse?category=${encodeURIComponent(name)}`} className="group flex min-w-[150px] flex-1 items-center justify-between rounded-card border border-line bg-surface p-4 transition-colors hover:border-sage hover:bg-sage-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"><span><span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-sage"><Icon size={18} /></span><span className="block text-sm font-semibold text-ink">{name}</span><span className="mt-1 block text-xs text-muted">{count} items</span></span><ArrowUpRight size={16} className="self-start text-muted opacity-0 transition-opacity group-hover:opacity-100" /></Link>;
}