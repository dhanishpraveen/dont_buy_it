import { ArrowRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiveListingCard } from '../components/items/LiveListingCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { getMyListings, getPublishedListings, type ListingView } from '../services/listingService';

export function LiveDashboardPage() {
    const { user } = useAuth();
    const [myListings, setMyListings] = useState<ListingView[]>([]);
    const [recentListings, setRecentListings] = useState<ListingView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        Promise.all([getMyListings(), getPublishedListings({ sort: 'newest' })])
            .then(([mine, recent]) => {
                if (!active) return;
                setMyListings(mine);
                setRecentListings(recent.slice(0, 3));
            })
            .catch(() => { if (active) setError('We could not load your dashboard. Please try again.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const activeCount = myListings.filter((listing) => listing.status === 'active').length;
    return <div className="space-y-10">
        <section className="flex flex-col gap-6 rounded-card bg-sage-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div><p className="font-handwritten text-2xl text-sage">Good to see you, {user?.name ?? 'there'}</p><h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">What can we help you access?</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Find something useful nearby, or share an item that is ready for its next use.</p></div>
            <Link to="/add-item"><Button><Plus size={17} />Create listing</Button></Link>
        </section>
        {error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        <section className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5"><p className="text-sm font-semibold text-muted">My listings</p><p className="mt-2 font-display text-3xl font-semibold text-ink">{loading ? '...' : myListings.length}</p><Link to="/listings" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bark">Manage listings <ArrowRight size={15} /></Link></Card>
            <Card className="p-5"><p className="text-sm font-semibold text-muted">Active listings</p><p className="mt-2 font-display text-3xl font-semibold text-ink">{loading ? '...' : activeCount}</p><p className="mt-3 text-sm text-muted">Available to the community</p></Card>
        </section>
        <section>
            <SectionHeader title="Recently listed" description="Current offers from your community." action={<Link to="/browse" className="inline-flex items-center gap-1 text-sm font-semibold text-bark hover:text-ink">Browse all <ArrowRight size={15} /></Link>} />
            {loading ? <div className="py-12 text-center text-sm text-muted" role="status">Loading listings...</div> : recentListings.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{recentListings.map((listing) => <LiveListingCard key={listing.id} listing={listing} />)}</div> : <Card className="p-8 text-center"><h2 className="font-display text-xl font-semibold text-ink">No resources found.</h2><p className="mt-2 text-sm text-muted">New community listings will appear here.</p><Link to="/add-item"><Button className="mt-5"><Plus size={16} />Create listing</Button></Link></Card>}
        </section>
    </div>;
}