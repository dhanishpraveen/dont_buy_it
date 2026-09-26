import { ArrowLeft, MapPin, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getListing, type ListingView } from '../services/listingService';

const methodLabel: Record<ListingView['accessType'], string> = { borrow: 'Borrow', rent: 'Rent', 'buy-used': 'Buy used', 'buy-new': 'Buy new' };

export function ListingDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState<ListingView | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (id) getListing(id).then(setListing).catch(() => setListing(null)).finally(() => setLoading(false)); }, [id]);
    if (loading) return <div className="py-20 text-center text-sm text-muted">Loading listing...</div>;
    if (!listing) return <div className="py-20 text-center"><h1 className="font-display text-3xl font-semibold text-ink">Listing not found</h1><Link to="/browse" className="mt-4 inline-block text-sm font-semibold text-bark underline">Back to browse</Link></div>;
    const image = listing.item.images[0];
    return <div className="mx-auto max-w-5xl"><button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back to browse</button><div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]"><div>{image ? <img src={image} alt={listing.item.name} className="aspect-[4/3] w-full rounded-card object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-sage-soft text-sm text-muted">No image added</div>}<div className="mt-6 flex flex-wrap gap-3">{listing.item.images.slice(1).map((src) => <img key={src} src={src} alt="" className="h-20 w-20 rounded-control object-cover" />)}</div></div><div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-sage">{methodLabel[listing.accessType]}</span><span className="text-sm font-semibold text-muted">{listing.status === 'active' ? 'Published' : listing.status}</span></div><h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink">{listing.item.name}</h1><p className="mt-4 text-base leading-7 text-muted">{listing.item.description}</p><div className="mt-6 grid gap-3 text-sm text-muted"><span className="flex items-center gap-2"><MapPin size={16} className="text-sage" />{listing.location}</span><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-sage" />{listing.item.condition}</span><span>Available from {listing.availableFrom ?? 'now'}</span></div><p className="mt-7 font-display text-2xl font-semibold text-bark">{listing.price === 0 ? 'Free to borrow' : `₹${listing.price.toLocaleString('en-IN')} ${listing.priceUnit === 'one-time' ? '' : `/ ${listing.priceUnit.replace('per-', '')}`}`}</p><Card className="mt-7 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Listed by</p><p className="mt-2 font-display text-xl font-semibold text-ink">{listing.owner.name}</p><p className="mt-1 text-sm text-muted">Trust score {listing.owner.trustScore ? `${listing.owner.trustScore.toFixed(1)}/5` : 'not rated yet'}</p></Card><Button className="mt-6" onClick={() => alert('Access requests will be added in a later phase.')}>Request access</Button></div></div></div>;
}
