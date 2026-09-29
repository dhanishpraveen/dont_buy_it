import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import type { AccessRequestRecord } from '../../shared/types/lifecycle';
import { cancelRequest, decideRequest, getRequest } from '../services/accessRequestService';

const accessLabels: Record<AccessRequestRecord['accessType'], string> = { BORROW: 'Borrow', RENT: 'Rent', BUY_USED: 'Buy used', BUY_NEW: 'Buy new' };

function date(value: string | null) {
    if (!value) return 'Not specified';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function requestPrice(request: AccessRequestRecord) {
    const value = request.offeredPrice ?? request.listing.price;
    if (value === 0) return 'Free to borrow';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: request.listing.currency || 'INR' }).format(value); }
    catch { return `${request.listing.currency} ${value.toFixed(2)}`; }
}

export function RequestDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [record, setRecord] = useState<AccessRequestRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async (active: () => boolean = () => true) => {
        if (!id) { setRecord(null); setLoading(false); return; }
        try { const result = await getRequest(id); if (active()) setRecord(result); }
        catch (loadError) { if (active()) setError(loadError instanceof Error ? loadError.message : 'We could not load this request.'); }
        finally { if (active()) setLoading(false); }
    };

    useEffect(() => {
        let active = true;
        void load(() => active);
        return () => { active = false; };
    }, [id]);

    const isOwner = Boolean(user && record?.owner.id === user.id);
    const isRequester = Boolean(user && record?.requester.id === user.id);
    const updateDecision = async (decision: 'ACCEPT' | 'REJECT') => {
        if (!id) return;
        setBusy(true); setError(null);
        try {
            const result = await decideRequest(id, decision);
            if (decision === 'ACCEPT' && result.exchangeId) { navigate(`/exchanges/${result.exchangeId}`); return; }
            await load();
        } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'We could not process this request.'); }
        finally { setBusy(false); }
    };
    const cancel = async () => {
        if (!id) return;
        setBusy(true); setError(null);
        try { await cancelRequest(id); await load(); }
        catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'We could not cancel this request.'); }
        finally { setBusy(false); }
    };

    if (loading) return <div className="py-20 text-center text-sm text-muted" role="status">Loading request...</div>;
    if (!record) return <div className="py-20 text-center"><h1 className="font-display text-3xl font-semibold text-ink">Request not found.</h1><p className="mt-2 text-sm text-muted">You may not have access to this request.</p><Link to="/requests" className="mt-4 inline-block text-sm font-semibold text-bark underline">Back to requests</Link></div>;

    return <div className="mx-auto max-w-3xl">
        <Link to={isOwner ? '/requests/received' : '/requests'} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back to requests</Link>
        <div className="mt-6 border-b border-line pb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Request details</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-4xl font-semibold text-ink">{record.listing.title || record.listing.itemName}</h1><span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-sage">{record.status}</span></div><p className="mt-2 text-sm text-muted">{accessLabels[record.accessType]} · Submitted {date(record.createdAt)}</p></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        <Card className="mt-6 p-5 sm:p-7"><h2 className="font-display text-2xl font-semibold text-ink">Listing</h2><p className="mt-2 text-sm font-semibold text-ink">{record.listing.itemName}</p><p className="mt-1 text-sm leading-6 text-muted">{record.listing.description}</p><p className="mt-3 text-sm font-semibold text-bark">{requestPrice(record)}{record.depositAmount ? ` · Deposit ${record.listing.currency} ${record.depositAmount.toFixed(2)}` : ''}</p><p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{record.listing.location}</p><Link to={`/listing/${record.listing.id}`} className="mt-4 flex items-center gap-1 text-sm font-semibold text-bark">Open listing <ArrowUpRight size={15} /></Link></Card>
        <Card className="mt-4 p-5 sm:p-7"><h2 className="font-display text-2xl font-semibold text-ink">People and schedule</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Requester</dt><dd className="mt-1 text-sm font-semibold text-ink">{record.requester.name}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Owner</dt><dd className="mt-1 text-sm font-semibold text-ink">{record.owner.name}</dd></div><div className="inline-flex items-start gap-2 text-sm text-muted sm:col-span-2"><CalendarDays size={16} className="mt-0.5" />{date(record.requestedFrom)} to {date(record.requestedUntil)}</div></dl>{record.message ? <p className="mt-5 rounded-control bg-canvas px-3 py-3 text-sm leading-6 text-muted">{record.message}</p> : null}</Card>
        <div className="mt-5 flex flex-wrap gap-3">
            {isOwner && record.status === 'PENDING' ? <><Button onClick={() => void updateDecision('ACCEPT')} disabled={busy}>{busy ? 'Processing...' : 'Accept request'}</Button><Button variant="outline" onClick={() => void updateDecision('REJECT')} disabled={busy}>Reject</Button></> : null}
            {isRequester && record.status === 'PENDING' ? <Button variant="outline" onClick={() => void cancel()} disabled={busy}>{busy ? 'Cancelling...' : 'Cancel request'}</Button> : null}
            {record.exchangeId && (record.status === 'ACCEPTED' || record.status === 'COMPLETED') ? <Link to={`/exchanges/${record.exchangeId}`}><Button>View exchange</Button></Link> : null}
        </div>
    </div>;
}