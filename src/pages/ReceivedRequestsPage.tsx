import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifecycleRequestCard } from '../components/items/LifecycleRequestCard';
import { Card } from '../components/ui/Card';
import type { AccessRequestRecord } from '../../shared/types/lifecycle';
import { decideRequest, getReceivedRequests } from '../services/accessRequestService';

export function ReceivedRequestsPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getReceivedRequests().then((data) => { if (active) setRequests(data); })
            .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'We could not load requests received.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const decide = async (request: AccessRequestRecord, decision: 'ACCEPT' | 'REJECT') => {
        setBusyId(request.id);
        setError(null);
        try {
            const result = await decideRequest(request.id, decision);
            if (decision === 'ACCEPT' && result.exchangeId) {
                navigate(`/exchanges/${result.exchangeId}`);
                return;
            }
            setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED', exchangeId: result.exchangeId } : item));
        } catch (decisionError) {
            setError(decisionError instanceof Error ? decisionError.message : 'We could not process this request.');
        } finally { setBusyId(null); }
    };

    return <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Owner activity</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">Requests received</h1><p className="mt-2 text-sm text-muted">Review requests for listings you have published.</p></div><Link to="/requests" className="text-sm font-semibold text-bark hover:underline">My requests</Link></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        {loading ? <div className="py-20 text-center text-sm text-muted" role="status">Loading requests received...</div> : requests.length ? <div className="mt-6 grid gap-4">{requests.map((request) => <LifecycleRequestCard key={request.id} request={request} mode="received" busy={busyId === request.id} onAccept={() => void decide(request, 'ACCEPT')} onReject={() => void decide(request, 'REJECT')} />)}</div> : <Card className="mt-6 p-10 text-center"><h2 className="font-display text-2xl font-semibold text-ink">No access requests yet.</h2><p className="mt-2 text-sm text-muted">Requests for your active listings will appear here.</p></Card>}
    </div>;
}