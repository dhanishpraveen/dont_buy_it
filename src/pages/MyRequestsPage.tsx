import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifecycleRequestCard } from '../components/items/LifecycleRequestCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { AccessRequestRecord } from '../../shared/types/lifecycle';
import { cancelRequest, getMyRequests } from '../services/accessRequestService';

export function MyRequestsPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getMyRequests().then((data) => { if (active) setRequests(data); })
            .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'We could not load your requests.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const cancel = async (id: string) => {
        setBusyId(id);
        setError(null);
        try {
            await cancelRequest(id);
            setRequests((current) => current.map((request) => request.id === id ? { ...request, status: 'CANCELLED' } : request));
        } catch (cancelError) {
            setError(cancelError instanceof Error ? cancelError.message : 'We could not cancel this request.');
        } finally { setBusyId(null); }
    };

    return <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Your activity</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">My requests</h1><p className="mt-2 text-sm text-muted">Track requests you have sent to listing owners.</p></div><Link to="/requests/received" className="text-sm font-semibold text-bark hover:underline">Requests received</Link></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        {loading ? <div className="py-20 text-center text-sm text-muted" role="status">Loading your requests...</div> : requests.length ? <div className="mt-6 grid gap-4">{requests.map((request) => <LifecycleRequestCard key={request.id} request={request} mode="mine" busy={busyId === request.id} onCancel={() => void cancel(request.id)} />)}</div> : <Card className="mt-6 p-10 text-center"><h2 className="font-display text-2xl font-semibold text-ink">You haven't requested any resources yet.</h2><p className="mt-2 text-sm text-muted">Choose a listing to send an access request to its owner.</p><Button className="mt-5" onClick={() => navigate('/browse')}>Browse listings</Button></Card>}
    </div>;
}