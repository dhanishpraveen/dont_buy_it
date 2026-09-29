import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    formatAccessRequestStatus,
    type AccessRequestRecord,
} from '../../../shared/types/lifecycle';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type RequestCardProps = {
    request: AccessRequestRecord;
    mode: 'mine' | 'received';
    busy?: boolean;
    onAccept?: () => void;
    onReject?: () => void;
    onCancel?: () => void;
};

const accessLabels: Record<AccessRequestRecord['accessType'], string> = {
    BORROW: 'Borrow', RENT: 'Rent', BUY_USED: 'Buy used', BUY_NEW: 'Buy new',
};
const statusStyles: Record<AccessRequestRecord['status'], string> = {
    PENDING: 'bg-bark/10 text-bark', ACCEPTED: 'bg-sage-soft text-sage', REJECTED: 'bg-red-50 text-red-800', CANCELLED: 'bg-canvas text-muted', COMPLETED: 'bg-sage-soft text-sage',
};

function date(value: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function amount(request: AccessRequestRecord) {
    const price = request.offeredPrice ?? request.listing.price;
    if (price === 0) return 'Free to borrow';
    const currency = request.listing.currency || 'INR';
    let formatted: string;
    try { formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(price); }
    catch { formatted = `${currency} ${price.toFixed(2)}`; }
    const suffix = request.listing.priceUnit === 'per-day' ? ' per day' : request.listing.priceUnit === 'per-week' ? ' per week' : '';
    return `${formatted}${suffix}`;
}

export function LifecycleRequestCard({ request, mode, busy = false, onAccept, onReject, onCancel }: RequestCardProps) {
    const person = mode === 'mine' ? request.owner.name : request.requester.name;
    const from = date(request.requestedFrom);
    const until = date(request.requestedUntil);
    const hasExchange = Boolean(request.exchangeId);
    const startTime = request.requestedFrom ? Date.parse(request.requestedFrom) : Number.NaN;
    const periodExpired = mode === 'received' && request.status === 'PENDING' && Number.isFinite(startTime) && startTime <= Date.now();
    return <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><Link to={`/requests/${request.id}`} className="group inline-flex items-start gap-2 font-display text-xl font-semibold text-ink hover:text-bark"><span className="break-words">{request.listing.title || request.listing.itemName}</span><ArrowUpRight size={16} className="mt-1 shrink-0" /></Link><p className="mt-1 text-sm text-muted">{request.listing.itemName} · {accessLabels[request.accessType]}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[request.status]}`}>
                {formatAccessRequestStatus(request.status)}
            </span>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2"><span>{mode === 'mine' ? 'Owner' : 'Requester'}: {person}</span><span>{amount(request)}{request.depositAmount > 0 ? ` · Deposit ${request.listing.currency} ${request.depositAmount.toFixed(2)}` : ''}</span>{from || until ? <span className="inline-flex items-start gap-1.5 sm:col-span-2"><CalendarDays size={15} className="mt-0.5 shrink-0" />{from ?? 'Start flexible'} to {until ?? 'End flexible'}</span> : null}<span className="inline-flex items-center gap-1.5 sm:col-span-2"><MapPin size={15} />{request.listing.location}</span></div>
        {request.message ? <p className="mt-4 rounded-control bg-canvas px-3 py-2 text-sm leading-6 text-muted">{request.message}</p> : null}
        {periodExpired ? <p className="mt-4 text-sm font-semibold text-bark" role="status">This request period has already started. Ask the requester to cancel and submit new future dates.</p> : null}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Link to={`/requests/${request.id}`}><Button variant="secondary" className="h-9 px-3">View details</Button></Link>
            {mode === 'received' && request.status === 'PENDING' ? <><Button className="h-9 px-3" onClick={onAccept} disabled={busy || periodExpired}>{busy ? 'Processing...' : periodExpired ? 'Period started' : 'Accept'}</Button><Button variant="outline" className="h-9 px-3" onClick={onReject} disabled={busy}>Reject</Button></> : null}
            {mode === 'mine' && request.status === 'PENDING' ? <Button variant="outline" className="h-9 px-3" onClick={onCancel} disabled={busy}>{busy ? 'Cancelling...' : 'Cancel request'}</Button> : null}
            {(request.status === 'ACCEPTED' || request.status === 'COMPLETED') && hasExchange ? <Link to={`/exchanges/${request.exchangeId}`}><Button className="h-9 px-3">View exchange</Button></Link> : null}
        </div>
    </Card>;
}