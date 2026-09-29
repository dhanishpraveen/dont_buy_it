import { Archive, Edit3, Eye, Pause, Play, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LiveListingCard } from '../components/items/LiveListingCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { deleteListing, getMyListings, updateListing, type ListingView } from '../services/listingService';

const statusLabel: Record<ListingView['status'], string> = {
    draft: 'Draft', active: 'Active', paused: 'Paused', unavailable: 'Unavailable', sold: 'Sold', archived: 'Archived', closed: 'Archived',
};

export function LiveMyListingsPage() {
    const navigate = useNavigate();
    const [listings, setListings] = useState<ListingView[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getMyListings().then((result) => { if (active) setListings(result); })
            .catch(() => { if (active) setError('We could not load your listings. Please try again.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const changeStatus = async (listing: ListingView) => {
        setBusyId(listing.id);
        setError(null);
        try {
            const updated = await updateListing(listing.id, { status: listing.status === 'paused' ? 'active' : 'paused' });
            setListings((current) => current.map((item) => item.id === updated.id ? updated : item));
        } catch {
            setError('We could not update this listing. Please try again.');
        } finally {
            setBusyId(null);
        }
    };

    const archive = async (listing: ListingView) => {
        setBusyId(listing.id);
        setError(null);
        try {
            await deleteListing(listing.id);
            setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: 'archived' } : item));
        } catch {
            setError('We could not archive this listing. Please try again.');
        } finally {
            setBusyId(null);
        }
    };

    return <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Your contributions</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">My listings</h1><p className="mt-2 text-sm leading-6 text-muted">Manage the items you have made available to your community.</p></div><Button onClick={() => navigate('/add-item')}><Plus size={17} />Create listing</Button></div>
        {error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        {loading ? <div className="py-20 text-center text-sm text-muted" role="status">Loading your listings...</div> : listings.length === 0 ? <Card className="mt-8 p-10 text-center"><h2 className="font-display text-2xl font-semibold text-ink">You haven't listed anything yet.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Publish a real listing to make an item available to your community.</p><Button className="mt-6" onClick={() => navigate('/add-item')}><Plus size={17} />Create Listing</Button></Card> : <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => {
            const archived = listing.status === 'archived' || listing.status === 'closed' || listing.status === 'sold';
            const paused = listing.status === 'paused';
            const busy = busyId === listing.id;
            return <article key={listing.id} className="min-w-0"><LiveListingCard listing={listing} /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-muted">{statusLabel[listing.status]}</span><span className="text-xs text-muted">{listing.location}</span></div><div className="mt-3 flex flex-wrap gap-2"><Link to={`/listing/${listing.id}`}><Button variant="ghost" className="h-9 px-3"><Eye size={15} />View</Button></Link><Link to={`/listings/${listing.id}/edit`}><Button variant="secondary" className="h-9 px-3"><Edit3 size={15} />Edit</Button></Link>{!archived ? <><Button variant="outline" className="h-9 px-3" onClick={() => void changeStatus(listing)} disabled={busy}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? 'Reactivate' : 'Pause'}</Button><Button variant="ghost" className="h-9 px-3 text-red-700 hover:bg-red-50" onClick={() => void archive(listing)} disabled={busy}><Archive size={15} />Archive</Button></> : null}</div></article>;
        })}</div>}
    </div>;
}