import { ArrowRight, Check, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequirement } from '../context/RequirementContext';
import { analyzeUserNeed } from '../services/llmService';
import { getAccessOptions } from '../services/resourceService';
import type { UserRequirement } from '../../shared/types/requirements';
import type { AccessMethod, AccessOption } from '../../shared/types/accessOptions';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Divider } from '../components/ui/Divider';
import { Badge } from '../components/ui/Badge';
import { AccessOptionCard } from '../components/recommendation/AccessOptionCard';

const examples = [
    "I need a projector for tomorrow's college event.",
    'I need a drill to make a few holes in my wall.',
    "I'm going camping for two days and need some equipment.",
];

type AssistantStatus = 'empty' | 'typing' | 'loading' | 'success' | 'error';

const displayValue = (value: string | null) => value ?? 'Not specified';
const titleCase = (value: string | null) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not specified';

function RequirementRow({ label, value }: { label: string; value: string }) {
    return <div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</dt><dd className="mt-1 font-display text-xl font-semibold text-ink">{value}</dd></div>;
}

function RequirementResult({ requirement, onContinue }: { requirement: UserRequirement; onContinue: () => void }) {
    return <Card className="mt-8 overflow-hidden"><div className="border-b border-line bg-sage-soft px-6 py-5 sm:px-8"><div className="flex items-center gap-2 text-sage"><Check size={18} /><p className="text-xs font-bold uppercase tracking-[0.18em]">Understanding your need</p></div><h2 className="mt-2 font-display text-3xl font-semibold text-ink">Here is what we heard.</h2></div><div className="p-6 sm:p-8"><dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><RequirementRow label="Item" value={titleCase(requirement.item)} /><RequirementRow label="Purpose" value={displayValue(requirement.purpose)} /><RequirementRow label="Duration" value={displayValue(requirement.duration)} /><RequirementRow label="Expected usage" value={displayValue(requirement.frequency)} /><RequirementRow label="Date" value={displayValue(requirement.date)} /><RequirementRow label="Urgency" value={titleCase(requirement.urgency)} /></dl><Divider className="my-7" /><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Required capabilities</p>{requirement.requiredCapabilities.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{requirement.requiredCapabilities.map((capability) => <li key={capability} className="flex items-start gap-2 text-sm text-ink"><Check size={16} className="mt-0.5 shrink-0 text-sage" />{capability}</li>)}</ul> : <p className="mt-3 text-sm text-muted">No specific capabilities were mentioned.</p>}</div><div className="mt-8 flex flex-wrap gap-3"><Button onClick={onContinue}>Find My Best Access Option <ArrowRight size={17} /></Button><Badge tone="sage">Requirement saved for the next step</Badge></div></div></Card>;
}

export function AIAssistantPage() {
    const navigate = useNavigate();
    const { requirement, setRequirement, clearRequirement } = useRequirement();
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<AssistantStatus>('empty');
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<AccessOption[]>([]);
    const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [optionsError, setOptionsError] = useState<string | null>(null);
    const [methodFilter, setMethodFilter] = useState<AccessMethod | 'all'>('all');
    const [sort, setSort] = useState<'price' | 'distance' | 'availability'>('price');

    const handleChange = (value: string) => { setInput(value); setError(null); setStatus(value.trim() ? 'typing' : 'empty'); };
    const handleAnalyze = async () => {
        const text = input.trim();
        if (!text) { setError('Tell us what you need before analyzing.'); setStatus('error'); return; }
        if (text.length > 1000) { setError('Please keep your request under 1,000 characters.'); setStatus('error'); return; }
        setStatus('loading'); setError(null); setOptions([]); setOptionsStatus('idle');
        try { setRequirement(await analyzeUserNeed(text)); setStatus('success'); } catch (analysisError) { setError(analysisError instanceof Error ? analysisError.message : 'We could not understand that request. Please try again.'); setStatus('error'); }
    };
    const handleContinue = async () => {
        if (!requirement) return;
        setOptionsStatus('loading'); setOptionsError(null); setMethodFilter('all');
        try { setOptions(await getAccessOptions(requirement)); setOptionsStatus('success'); } catch (retrievalError) { setOptionsError(retrievalError instanceof Error ? retrievalError.message : 'We could not retrieve access options.'); setOptionsStatus('error'); }
    };
    const handleClear = () => { setInput(''); clearRequirement(); setError(null); setStatus('empty'); setOptions([]); setOptionsStatus('idle'); setOptionsError(null); };

    return <div className="mx-auto max-w-4xl"><section className="rounded-card bg-sage-soft px-6 py-8 sm:px-10 sm:py-10"><div className="flex items-start gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sage"><Sparkles size={21} /></span><div><p className="font-handwritten text-2xl text-sage">A more thoughtful way to start</p><h1 className="mt-1 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">AI Access Assistant</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted">Tell us what you need. We’ll figure out how you can access it.</p></div></div></section><Card className="mt-6 p-5 sm:p-8"><div className="flex items-center gap-2"><Lightbulb size={18} className="text-sage" /><label htmlFor="need-input" className="text-sm font-bold text-ink">What are you looking for?</label></div><textarea id="need-input" value={input} maxLength={1000} onChange={(event) => handleChange(event.target.value)} placeholder="I need a projector tomorrow for 5 hours for a college presentation..." className="mt-4 min-h-44 w-full resize-y rounded-card border border-line bg-canvas p-4 text-base leading-7 text-ink outline-none placeholder:text-muted focus:border-sage focus:ring-2 focus:ring-sage/20" aria-describedby="need-help" /> <div className="mt-2 flex justify-between gap-4 text-xs text-muted"><span id="need-help">The more context you share, the better we can understand the need.</span><span className="shrink-0">{input.length}/1000</span></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={handleAnalyze} disabled={status === 'loading'}>{status === 'loading' ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/40 border-t-surface" />Understanding your request...</> : <>Analyze Need <ArrowRight size={17} /></>}</Button>{input ? <button onClick={handleClear} className="inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold text-muted hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"><RotateCcw size={16} />Clear</button> : null}</div>{error ? <p className="mt-4 rounded-control bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}</Card><div className="mt-8"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Try an example</p><div className="grid gap-3">{examples.map((example) => <button key={example} onClick={() => handleChange(example)} className="rounded-card border border-line bg-surface px-4 py-3 text-left text-sm leading-6 text-muted transition-colors hover:border-sage hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">“{example}”</button>)}</div></div>{status === 'success' && requirement ? <RequirementResult requirement={requirement} onContinue={handleContinue} /> : null}<CandidateOptions options={options} status={optionsStatus} error={optionsError} methodFilter={methodFilter} sort={sort} onMethodFilterChange={setMethodFilter} onSortChange={setSort} /></div>;
}

const accessMethodLabels: Record<AccessMethod | 'all', string> = { all: 'All', borrow: 'Borrow', rent: 'Rent', 'buy-used': 'Buy Used', 'buy-new': 'Buy New' };

function CandidateOptions({ options, status, error, methodFilter, sort, onMethodFilterChange, onSortChange }: { options: AccessOption[]; status: 'idle' | 'loading' | 'success' | 'error'; error: string | null; methodFilter: AccessMethod | 'all'; sort: 'price' | 'distance' | 'availability'; onMethodFilterChange: (method: AccessMethod | 'all') => void; onSortChange: (sort: 'price' | 'distance' | 'availability') => void }) {
    const visibleOptions = useMemo(() => [...options].filter((option) => methodFilter === 'all' || option.accessMethod === methodFilter).sort((left, right) => sort === 'price' ? left.totalCost - right.totalCost : sort === 'distance' ? left.distanceKm - right.distanceKm : Number(right.availability === 'available') - Number(left.availability === 'available')), [methodFilter, options, sort]);
    if (status === 'idle') return null;
    return <section className="mt-10" aria-live="polite"><div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Available access options</p><h2 className="mt-2 font-display text-3xl font-semibold text-ink">Ways to access what you need</h2><p className="mt-2 text-sm text-muted">These are candidates to compare. No option has been ranked or recommended.</p></div>{status === 'success' && options.length ? <label className="flex items-center gap-2 text-sm text-muted">Sort by<select value={sort} onChange={(event) => onSortChange(event.target.value as 'price' | 'distance' | 'availability')} className="h-10 rounded-control border border-line bg-surface px-3 font-semibold text-ink outline-none focus:border-sage"><option value="price">Price</option><option value="distance">Distance</option><option value="availability">Availability</option></select></label> : null}</div>{status === 'loading' ? <div className="mt-6 flex min-h-40 items-center justify-center rounded-card border border-line bg-surface text-sm text-muted" role="status"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-line border-t-sage" />Finding matching access options...</div> : null}{status === 'error' ? <div className="mt-6 rounded-card border border-line bg-surface px-6 py-10 text-center" role="alert"><h3 className="font-display text-xl font-semibold text-ink">We could not retrieve options.</h3><p className="mt-2 text-sm text-muted">{error}</p></div> : null}{status === 'success' ? <><div className="mt-5 flex flex-wrap gap-2">{(['all', 'borrow', 'rent', 'buy-used', 'buy-new'] as const).map((method) => <button key={method} onClick={() => onMethodFilterChange(method)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${methodFilter === method ? 'bg-bark text-surface' : 'bg-surface text-muted hover:bg-sage-soft hover:text-sage'}`}>{accessMethodLabels[method]}</button>)}</div>{visibleOptions.length ? <div className="mt-5 grid gap-4">{visibleOptions.map((option) => <AccessOptionCard key={option.id} option={option} />)}</div> : <div className="mt-5 rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center"><h3 className="font-display text-xl font-semibold text-ink">No matching access options found nearby.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Try modifying the item, location, date, or required capabilities to broaden the search.</p></div>}</> : null}</section>;
}