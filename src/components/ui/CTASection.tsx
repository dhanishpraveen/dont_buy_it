import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export function CTASection({ title = 'Have something useful to share?', description = 'List it for your neighbors and keep a good thing in motion.' }: { title?: string; description?: string }) {
    return <section className="overflow-hidden rounded-card bg-bark px-6 py-10 text-surface sm:px-10"><div className="max-w-xl"><p className="font-handwritten text-2xl text-sage-soft">Keep it moving</p><h2 className="mt-2 font-display text-3xl font-semibold leading-tight">{title}</h2><p className="mt-3 max-w-md text-sm leading-6 text-surface/75">{description}</p><Link to="/listings"><Button variant="secondary" className="mt-6">List an item <ArrowUpRight size={16} /></Button></Link></div></section>;
}