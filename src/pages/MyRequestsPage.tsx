import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifecycleRequestCard } from '../components/items/LifecycleRequestCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useCachedResource } from '../hooks/useCachedResource';
import { cacheKeys, cacheTtl } from '../lib/localStorageCache';
import type { AccessRequestRecord } from '../../shared/types/lifecycle';
import { cancelRequest, getMyRequests } from '../services/accessRequestService';

export function MyRequestsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: requests = [], loading, refreshing, error, updateData } = useCachedResource(
        cacheKeys.requests(user?.id ?? 'signed-out', 'mine'),
        cacheTtl.requests,
        getMyRequests,
    );
    const [busyId, setBusyId] = useState<string | null>(null);

    const cancel = async (id: string) => {
        setBusyId(id);
        try {
            await cancelRequest(id);
            updateData((current) => current.map((request) => request.id === id ? { ...request, status: 'CANCELLED' } : request));
        } catch (cancelError) {
            // Keep the existing error surface while continuing to show cached content,
            // and rely on the shared cache hook for refresh-driven recovery.
            console.error(cancelError);
        } finally { setBusyId(null); }
    };

    return <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Your activity</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">My requests</h1><p className="mt-2 text-sm text-muted">Track requests you have sent to listing owners.</p></div><Link to="/requests/received" className="text-sm font-semibold text-bark hover:underline">Requests received</Link></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        {refreshing ? <p className="mt-4 text-xs text-muted" role="status">Refreshing your requests...</p> : null}
        {loading ? <div className="py-20 text-center text-sm text-muted" role="status">Loading your requests...</div> : requests.length ? <div className="mt-6 grid gap-4">{requests.map((request) => <LifecycleRequestCard key={request.id} request={request} mode="mine" busy={busyId === request.id} onCancel={() => void cancel(request.id)} />)}</div> : <Card className="mt-6 p-10 text-center"><h2 className="font-display text-2xl font-semibold text-ink">You haven't requested any resources yet.</h2><p className="mt-2 text-sm text-muted">Choose a listing to send an access request to its owner.</p><Button className="mt-5" onClick={() => navigate('/browse')}>Browse listings</Button></Card>}
    </div>;
}