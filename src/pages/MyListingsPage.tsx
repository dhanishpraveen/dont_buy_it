import { Edit3, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ListingCard } from '../components/items/ListingCard';
import { deleteListing, getMyListings, updateListing, type ListingView } from '../services/listingService';

export function MyListingsPage() {
    const navigate = useNavigate();
    const [listings, setListings] = useState<ListingView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const load = () => { setLoading(true); getMyListings().then(setListings).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'We could not load your listings.')).finally(() => setLoading(false)); };
    useEffect(load, []);
    const changeStatus = async (listing: ListingView) => { try { const updated = await updateListing(listing.id, { status: listing.status === 'paused' ? 'active' : 'paused' }); setListings((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (statusError) { setError(statusError instanceof Error ? statusError.message : 'We could not update this listing.'); } };
    const remove = async (listing: ListingView) => { try { await deleteListing(listing.id); setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: 'closed', availability: 'unavailable' } : item)); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'We could not remove this listing.'); } };
    return <div className="mx-auto max-w-6xl"><div className="flex flex-col gap-4 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Your contributions</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">My listings</h1><p className="mt-2 text-sm leading-6 text-muted">Keep useful things in motion by sharing what you already have.</p></div><Button onClick={() => navigate('/add-item')}><Plus size={17} />Add an item</Button></div>{error ? <p className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}{loading ? <div className="py-20 text-center text-sm text-muted">Loading your listings...</div> : listings.length === 0 ? <Card className="mt-8 p-10 text-center"><h2 className="font-display text-2xl font-semibold text-ink">Nothing listed yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Add an item when you have something useful to share, rent, or sell.</p><Button className="mt-6" onClick={() => navigate('/add-item')}><Plus size={17} />Add your first item</Button></Card> : <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <div key={listing.id} className="relative"><ListingCard listing={listing} /><div className="mt-3 flex flex-wrap gap-2"><Link to={`/listings/${listing.id}/edit`}><Button variant="secondary" className="h-9 px-3"><Edit3 size={15} />Edit</Button></Link>{listing.status !== 'closed' ? <Button variant="outline" className="h-9 px-3" onClick={() => void changeStatus(listing)}>{listing.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}{listing.status === 'paused' ? 'Publish' : 'Pause'}</Button> : null}<Button variant="ghost" className="h-9 px-3 text-red-700 hover:bg-red-50" onClick={() => void remove(listing)} disabled={listing.status === 'closed'}><Trash2 size={15} />Remove</Button></div></div>)}</div>}</div>;
}
