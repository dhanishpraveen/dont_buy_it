import { ArrowLeft, CalendarClock, LoaderCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from '../lib/listingFormat';
import type { ListingView } from '../services/listingService';
import { getListing } from '../services/listingService';
import { createRequest } from '../services/accessRequestService';

function localNow() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

export function RequestAccessPage() {
    const { listingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [listing, setListing] = useState<ListingView | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [requestedFrom, setRequestedFrom] = useState('');
    const [requestedUntil, setRequestedUntil] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!listingId) { setLoading(false); return; }
        getListing(listingId).then((result) => { if (active) setListing(result); })
            .catch(() => { if (active) setError('This listing is no longer available.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [listingId]);

    const needsDates = listing?.accessType === 'borrow' || listing?.accessType === 'rent';
    const isOwner = Boolean(user && listing && user.id === listing.owner.id);
    const available = Boolean(listing && listing.status === 'active' && listing.availability !== 'unavailable');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!listingId || !listing) return;
        if (isOwner) { setError("You can't request your own listing."); return; }
        if (!available) { setError('This listing is no longer available.'); return; }
        if (needsDates) {
            const from = Date.parse(requestedFrom);
            const until = Date.parse(requestedUntil);
            if (!Number.isFinite(from) || !Number.isFinite(until)) { setError('Choose a start and end date.'); return; }
            if (from < Date.now()) { setError('Choose a start date that is not in the past.'); return; }
            if (until <= from) { setError('The end date must be after the start date.'); return; }
        }
        setSubmitting(true);
        setError(null);
        try {
            const result = await createRequest({
                listingId,
                requestedFrom: needsDates ? new Date(requestedFrom).toISOString() : null,
                requestedUntil: needsDates ? new Date(requestedUntil).toISOString() : null,
                message: message.trim() || null,
            });
            navigate(`/requests/${result.id}`);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'We could not send your request. Please try again.');
        } finally { setSubmitting(false); }
    };

    if (loading) return <div className="py-20 text-center text-sm text-muted" role="status">Loading listing...</div>;
    if (!listing) return <div className="py-20 text-center"><h1 className="font-display text-3xl font-semibold text-ink">Listing not found</h1><Link to="/browse" className="mt-4 inline-block text-sm font-semibold text-bark underline">Back to browse</Link></div>;

    return <div className="mx-auto max-w-3xl">
        <Link to={`/listing/${listing.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back to listing</Link>
        <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Request access</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">{listing.accessType === 'borrow' ? 'Request to borrow' : listing.accessType === 'rent' ? 'Request to rent' : 'Request to buy'}</h1><p className="mt-2 text-sm text-muted">Your request will be sent to the listing owner. Nothing is confirmed until they respond.</p></div>
        <Card className="mt-6 flex gap-4 p-5"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-control bg-canvas">{listing.item.images[0] ? <img src={listing.item.images[0]} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><h2 className="font-display text-xl font-semibold text-ink">{listing.title || listing.item.name}</h2><p className="mt-1 text-sm text-muted">{listing.item.name} · {listing.location}</p><p className="mt-2 text-sm font-semibold text-bark">{formatListingPrice(listing)}</p>{listing.deposit ? <p className="text-xs text-muted">Deposit {listing.currency} {listing.deposit.toFixed(2)}</p> : null}</div></Card>
        <Card className="mt-5 p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5">
            {needsDates ? <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><CalendarClock size={16} className="text-sage" />Requested start</span><input type="datetime-local" min={localNow()} required value={requestedFrom} onChange={(event) => setRequestedFrom(event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink" /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Requested end</span><input type="datetime-local" min={requestedFrom || localNow()} required value={requestedUntil} onChange={(event) => setRequestedUntil(event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink" /></label></div> : <p className="text-sm text-muted">The owner will coordinate a safe handover after accepting your purchase request.</p>}
            <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Message <span className="font-normal text-muted">(optional)</span></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={4} placeholder="Share any useful context with the owner." className="w-full rounded-card border border-line bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-sage" /></label>
            {error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
            {isOwner ? <p className="text-sm font-semibold text-red-800" role="alert">You can't request your own listing.</p> : null}
            {!available ? <p className="text-sm font-semibold text-red-800" role="alert">This listing is no longer available.</p> : null}
            <div className="flex justify-end border-t border-line pt-5"><Button type="submit" disabled={submitting || isOwner || !available}>{submitting ? <><LoaderCircle size={16} className="animate-spin" />Sending request...</> : 'Send request'}</Button></div>
        </form></Card>
    </div>;
}