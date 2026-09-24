import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '../ui/IconButton';

export function ItemGallery({ name, images }: { name: string; images: string[] }) {
    const [active, setActive] = useState(0);
    const move = (direction: number) => setActive((current) => (current + direction + images.length) % images.length);
    return <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_88px]"><div className="relative aspect-[4/3] overflow-hidden rounded-card bg-canvas sm:aspect-auto sm:min-h-[440px]"><img src={images[active]} alt={`${name}, view ${active + 1}`} className="h-full w-full object-cover" />{images.length > 1 ? <div className="absolute bottom-4 right-4 flex gap-1 rounded-control bg-surface/90 p-1"><IconButton label="Previous image" onClick={() => move(-1)} className="h-8 w-8"><ChevronLeft size={16} /></IconButton><IconButton label="Next image" onClick={() => move(1)} className="h-8 w-8"><ChevronRight size={16} /></IconButton></div> : null}</div><div className="flex gap-3 overflow-x-auto sm:grid sm:grid-cols-1 sm:overflow-visible">{images.map((src, index) => <button key={`${src}-${index}`} onClick={() => setActive(index)} className={`aspect-square w-20 shrink-0 overflow-hidden rounded-control border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${index === active ? 'border-sage' : 'border-transparent'}`}><img src={src} alt={`${name} thumbnail ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div></div>;
}