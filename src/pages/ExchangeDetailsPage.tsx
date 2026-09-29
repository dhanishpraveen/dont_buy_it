import { ArrowLeft, CalendarClock, Check, Circle, LoaderCircle, MapPin, PackageCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import {
    formatExchangeStatus,
    type ExchangeRecord,
} from '../../shared/types/lifecycle';
import { performExchangeAction, getExchange, type ExchangeAction } from '../services/accessRequestService';
import { getUserTrustSummary, type TrustSummary } from '../services/trustService';
import { supabase } from '../lib/supabase';

const purchaseTypes = ['BUY_USED', 'BUY_NEW'];

function formatDate(value: string | null) {
    if (!value) return 'Not set';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function timeline(exchange: ExchangeRecord) {
    const purchase = purchaseTypes.includes(exchange.listing.accessType);
    const steps = purchase ? ['Request accepted', 'Handover', 'Completed'] : ['Request accepted', 'Handover', 'Received', 'In use', 'Return', 'Completed'];
    const index = purchase
        ? exchange.status === 'PENDING_HANDOVER' ? 0 : exchange.status === 'HANDED_OVER' ? 1 : exchange.status === 'COMPLETED' ? 2 : -1
        : exchange.status === 'PENDING_HANDOVER' ? 0 : exchange.status === 'HANDED_OVER' ? 1 : exchange.status === 'IN_USE' ? 3 : exchange.status === 'RETURN_PENDING' ? 4 : exchange.status === 'RETURNED' || exchange.status === 'COMPLETED' ? 5 : -1;
    return { steps, index };
}

export function ExchangeDetailsPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [exchange, setExchange] = useState<ExchangeRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [participantTrust, setParticipantTrust] = useState<Record<string, TrustSummary>>({});
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [existingReview, setExistingReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);

    const load = async (active: () => boolean = () => true) => {
        if (!id) { setExchange(null); setLoading(false); return; }
        try { const record = await getExchange(id); if (active()) setExchange(record); }
        catch (loadError) { if (active()) setError(loadError instanceof Error ? loadError.message : 'We could not load this exchange.'); }
        finally { if (active()) setLoading(false); }
    };
    useEffect(() => { let active = true; void load(() => active); return () => { active = false; }; }, [id]);

    useEffect(() => {
        if (!exchange || !user) {
            setParticipantTrust({});
            return;
        }

        let isMounted = true;
        void Promise.all([
            getUserTrustSummary(exchange.owner.id),
            getUserTrustSummary(exchange.requester.id),
        ]).then(([ownerTrust, requesterTrust]) => {
            if (!isMounted) return;
            const nextTrust: Record<string, TrustSummary> = {};
            if (ownerTrust) nextTrust[exchange.owner.id] = ownerTrust;
            if (requesterTrust) nextTrust[exchange.requester.id] = requesterTrust;
            setParticipantTrust(nextTrust);
        });

        if (exchange.status !== 'COMPLETED') {
            setExistingReview(null);
            return () => {
                isMounted = false;
            };
        }

        const revieweeId = user.id === exchange.owner.id ? exchange.requester.id : exchange.owner.id;
        void supabase
            .from('reviews')
            .select('id, rating, comment')
            .eq('exchange_id', exchange.id)
            .eq('reviewer_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!isMounted) return;
                if (error && error.code !== 'PGRST116') {
                    setReviewError(error.message);
                    return;
                }
                setExistingReview(data ?? null);
                if (data) {
                    setReviewRating(data.rating);
                    setReviewComment(data.comment ?? '');
                }
                if (!data && revieweeId) {
                    setReviewComment('');
                    setReviewRating(5);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [exchange?.id, exchange?.owner.id, exchange?.requester.id, exchange?.status, user?.id]);

    const act = async (action: ExchangeAction) => {
        if (!id) return;
        setBusy(true); setError(null);
        try { await performExchangeAction(id, action, notes); setNotes(''); await load(); }
        catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'We could not update this exchange.'); }
        finally { setBusy(false); }
    };

    if (loading) return <div className="py-20 text-center text-sm text-muted" role="status">Loading exchange...</div>;
    if (!exchange) return <div className="py-20 text-center"><h1 className="font-display text-3xl font-semibold text-ink">Exchange not found.</h1><p className="mt-2 text-sm text-muted">You may not have access to this exchange.</p><Link to="/requests" className="mt-4 inline-block text-sm font-semibold text-bark underline">Back to requests</Link></div>;

    const isOwner = user?.id === exchange.owner.id;
    const isRequester = user?.id === exchange.requester.id;
    const participantRevieweeId = user && (user.id === exchange.owner.id ? exchange.requester.id : user.id === exchange.requester.id ? exchange.owner.id : null);
    const isPurchase = purchaseTypes.includes(exchange.listing.accessType);
    const { steps, index: activeStep } = timeline(exchange);
    let action: ExchangeAction | null = null;
    let actionLabel = '';
    if (isOwner && exchange.status === 'PENDING_HANDOVER') { action = 'CONFIRM_HANDOVER'; actionLabel = 'Confirm handover'; }
    else if (isRequester && exchange.status === 'HANDED_OVER') { action = 'CONFIRM_RECEIPT'; actionLabel = isPurchase ? 'Confirm received and complete purchase' : 'Confirm received'; }
    else if (isRequester && !isPurchase && exchange.status === 'IN_USE') { action = 'REQUEST_RETURN'; actionLabel = 'Return item'; }
    else if (isOwner && !isPurchase && exchange.status === 'RETURN_PENDING') { action = 'CONFIRM_RETURN'; actionLabel = 'Confirm return'; }

    return <div className="mx-auto max-w-4xl">
        <Link to={`/requests/${exchange.accessRequestId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back to request</Link>
        <div className="mt-6 border-b border-line pb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Exchange</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-4xl font-semibold text-ink">{exchange.listing.title || exchange.listing.itemName}</h1><span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-sage">{formatExchangeStatus(exchange.status)}</span></div><p className="mt-2 text-sm text-muted">{exchange.listing.accessType.replace('_', ' ')} · Created {formatDate(exchange.createdAt)}</p></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        <Card className="mt-6 p-5 sm:p-7"><div className="flex items-start gap-4"><PackageCheck size={22} className="mt-1 shrink-0 text-sage" /><div className="min-w-0"><h2 className="font-display text-2xl font-semibold text-ink">{exchange.listing.itemName}</h2><p className="mt-2 text-sm leading-6 text-muted">{exchange.listing.description}</p><p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{exchange.listing.location}</p></div></div><div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Owner</p><p className="mt-1 text-sm font-semibold text-ink">{exchange.owner.name}</p>{participantTrust[exchange.owner.id] ? <p className="mt-2 text-xs text-muted">{participantTrust[exchange.owner.id].level} · {participantTrust[exchange.owner.id].score === null ? 'New member' : `${participantTrust[exchange.owner.id].score}/100`}</p> : <p className="mt-2 text-xs text-muted">Trust still loading</p>}</div><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Requester</p><p className="mt-1 text-sm font-semibold text-ink">{exchange.requester.name}</p>{participantTrust[exchange.requester.id] ? <p className="mt-2 text-xs text-muted">{participantTrust[exchange.requester.id].level} · {participantTrust[exchange.requester.id].score === null ? 'New member' : `${participantTrust[exchange.requester.id].score}/100`}</p> : <p className="mt-2 text-xs text-muted">Trust still loading</p>}</div><div className="inline-flex items-start gap-2 text-sm text-muted"><CalendarClock size={16} className="mt-0.5" />Expected return: {isPurchase ? 'Not applicable' : formatDate(exchange.expectedReturnAt)}</div><div className="text-sm text-muted">Status: <span className="font-semibold text-ink">{formatExchangeStatus(exchange.status)}</span></div></div></Card>
        <section className="mt-7"><h2 className="font-display text-2xl font-semibold text-ink">{isPurchase ? 'Purchase progress' : 'Access progress'}</h2><ol className="mt-4 grid gap-3 sm:grid-cols-2">{steps.map((step, stepIndex) => <li key={step} className={`flex items-center gap-3 rounded-card border px-4 py-3 ${stepIndex === activeStep ? 'border-sage bg-sage-soft text-ink' : stepIndex < activeStep ? 'border-line bg-surface text-muted' : 'border-line bg-canvas text-muted'}`} aria-current={stepIndex === activeStep ? 'step' : undefined}>{stepIndex < activeStep ? <Check size={17} className="shrink-0 text-sage" /> : <Circle size={17} className={`shrink-0 ${stepIndex === activeStep ? 'text-sage' : 'text-line'}`} />}<span className="text-sm font-semibold">{step}</span>{stepIndex === activeStep ? <span className="ml-auto text-xs font-bold uppercase text-sage">Current</span> : null}</li>)}</ol></section>
        <Card className="mt-6 p-5 sm:p-7"><h2 className="font-display text-xl font-semibold text-ink">Activity</h2><dl className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2"><div>Handover: {formatDate(exchange.handoverAt)}</div><div>Received: {formatDate(exchange.receivedAt)}</div>{!isPurchase ? <><div>Return started: {formatDate(exchange.returnedAt)}</div><div>Return confirmed: {formatDate(exchange.returnConfirmedAt)}</div></> : null}{exchange.handoverNotes ? <div className="sm:col-span-2">Handover note: {exchange.handoverNotes}</div> : null}{exchange.returnNotes ? <div className="sm:col-span-2">Return note: {exchange.returnNotes}</div> : null}</dl></Card>
        {exchange.status === 'COMPLETED' && participantRevieweeId && !existingReview ? <Card className="mt-6 p-5 sm:p-7"><h2 className="font-display text-xl font-semibold text-ink">Share your feedback</h2><p className="mt-2 text-sm text-muted">Only one review can be left for this exchange.</p><form onSubmit={async (event) => { event.preventDefault(); setReviewError(null); if (!user || !participantRevieweeId) return; const { error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: participantRevieweeId, exchange_id: exchange.id, rating: reviewRating, comment: reviewComment.trim() || null }); if (error) { setReviewError(error.message.includes('duplicate') ? 'You already submitted a review for this exchange.' : 'We could not save the review.'); return; } setExistingReview({ id: 'new', rating: reviewRating, comment: reviewComment.trim() || null }); setReviewComment(''); setReviewRating(5); }} className="mt-4 grid gap-4"><div><p className="mb-2 text-sm font-semibold text-ink">Rating</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setReviewRating(value)} className={`rounded-full border p-2 ${reviewRating >= value ? 'border-sage bg-sage-soft text-sage' : 'border-line bg-surface text-muted'}`} aria-label={`Rate ${value} out of 5`}><Star size={16} fill={reviewRating >= value ? 'currentColor' : 'none'} /></button>)}</div></div><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Comment</span><textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-card border border-line bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-sage" placeholder="Share what the exchange was like." /></label>{reviewError ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{reviewError}</p> : null}<div className="flex justify-end"><Button type="submit">Submit review</Button></div></form></Card> : null}
        {existingReview ? <Card className="mt-6 p-5 sm:p-7"><h2 className="font-display text-xl font-semibold text-ink">Your review</h2><div className="mt-3 flex items-center gap-2 text-sage">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} fill={value <= existingReview.rating ? 'currentColor' : 'none'} className={value <= existingReview.rating ? 'text-sage' : 'text-line'} />)}</div>{existingReview.comment ? <p className="mt-3 text-sm leading-6 text-muted">“{existingReview.comment}”</p> : <p className="mt-3 text-sm text-muted">Review submitted without a message.</p>}</Card> : null}
        {action ? <Card className="mt-6 p-5 sm:p-7"><form onSubmit={(event) => { event.preventDefault(); void act(action!); }} className="grid gap-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Note <span className="font-normal text-muted">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-card border border-line bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-sage" /></label><div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin" />Updating...</> : actionLabel}</Button></div></form></Card> : null}
    </div>;
}