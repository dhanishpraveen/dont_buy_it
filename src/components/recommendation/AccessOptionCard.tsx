import { CalendarDays, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import type { AccessMethod, AccessOption } from '../../../shared/types/accessOptions';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { StatusBadge } from '../items/StatusBadge';

const methodLabels: Record<AccessMethod, string> = { borrow: 'Borrow', rent: 'Rent', 'buy-used': 'Buy Used', 'buy-new': 'Buy New' };
const methodStyles: Record<AccessMethod, string> = { borrow: 'bg-sage-soft text-sage', rent: 'bg-bark/10 text-bark', 'buy-used': 'bg-canvas text-muted', 'buy-new': 'bg-ink/10 text-ink' };
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function priceLabel(option: AccessOption) {
    if (option.totalCost === 0) return 'Free to borrow';
    const unit = option.priceUnit === 'per-day' ? ' / day' : option.priceUnit === 'per-week' ? ' / week' : '';
    return `${currency.format(option.price)}${unit}`;
}

export function AccessOptionCard({ option }: { option: AccessOption }) {
    return <Card className="overflow-hidden"><div className="grid sm:grid-cols-[150px_minmax(0,1fr)]"><div className="aspect-[4/3] bg-canvas sm:aspect-auto"><img src={option.image} alt={option.title} className="h-full w-full object-cover" /></div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${methodStyles[option.accessMethod]}`}>{methodLabels[option.accessMethod]}</span><h3 className="mt-3 font-display text-xl font-semibold text-ink">{option.title}</h3></div><div className="text-right"><p className="text-lg font-bold text-bark">{priceLabel(option)}</p>{option.totalCost > 0 && option.priceUnit !== 'one-time' ? <p className="mt-1 text-xs text-muted">Est. total {currency.format(option.totalCost)}</p> : null}</div></div><p className="mt-2 text-sm leading-6 text-muted">{option.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{option.distanceKm} km away</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{option.availableFrom ?? 'Date flexible'}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} />{option.condition}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><div className="flex items-center gap-2"><Avatar initials={option.provider.initials} size="sm" /><div><p className="text-xs font-semibold text-ink">{option.provider.name}</p><p className="text-xs text-muted">Trust {option.trustScore.toFixed(1)} / 5</p></div></div><div className="flex flex-wrap items-center gap-3"><StatusBadge availability={option.availability === 'partially-available' ? 'Coming soon' : option.availability === 'available' ? 'Available' : 'Borrowed'} /><span className="inline-flex items-center gap-1 text-xs text-sage"><Sparkles size={13} />{option.capabilities[0]}</span></div></div></div></div></Card>;
}