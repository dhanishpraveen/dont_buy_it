import { Leaf, Users } from 'lucide-react';
import { Card } from './Card';

export function ImpactCard() {
    return <Card className="flex flex-col justify-between bg-sage-soft p-5 sm:flex-row sm:items-center"><div><p className="font-handwritten text-2xl text-sage">Small choices, shared impact</p><h2 className="mt-1 max-w-md font-display text-2xl font-semibold text-ink">Your community has kept 2,480 things in use.</h2></div><div className="mt-5 flex gap-5 text-sage sm:mt-0"><span><Users size={19} /><strong className="mt-1 block text-lg text-ink">348</strong><small className="text-xs text-muted">neighbors</small></span><span><Leaf size={19} /><strong className="mt-1 block text-lg text-ink">1.2t</strong><small className="text-xs text-muted">saved waste</small></span></div></Card>;
}