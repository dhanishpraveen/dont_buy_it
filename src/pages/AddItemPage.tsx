import { ArrowLeft, Check, ImagePlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { createListing, getMyListings, updateListing, type ListingView } from '../services/listingService';

const categories = ['Tools', 'Electronics', 'Outdoor & Sports', 'Furniture', 'Home & Kitchen', 'Books', 'Other'];
const conditions = ['New', 'Like new', 'Good', 'Fair', 'Poor', 'Well loved'];

type FormState = { name: string; description: string; category: string; images: string; condition: string; capabilities: string; accessType: ListingView['accessType']; price: string; priceUnit: ListingView['priceUnit']; availability: ListingView['availability']; availableFrom: string; location: string; notes: string };
const blank: FormState = { name: '', description: '', category: 'Electronics', images: '', condition: 'Good', capabilities: '', accessType: 'borrow', price: '0', priceUnit: 'free', availability: 'available', availableFrom: '', location: '', notes: '' };

export function AddItemPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [form, setForm] = useState<FormState>(blank);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        getMyListings().then((listings) => {
            const listing = listings.find((candidate) => candidate.id === id);
            if (!listing) throw new Error('Listing not found.');
            setForm({ name: listing.item.name, description: listing.item.description, category: listing.item.category, images: listing.item.images.join(', '), condition: listing.item.condition, capabilities: listing.item.capabilities.join(', '), accessType: listing.accessType, price: String(listing.price), priceUnit: listing.priceUnit, availability: listing.availability, availableFrom: listing.availableFrom ?? '', location: listing.location, notes: listing.notes ?? '' });
        }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'We could not load this listing.')).finally(() => setLoading(false));
    }, [id]);

    const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const input = { name: form.name, description: form.description, category: form.category, images: form.images.split(',').map((value) => value.trim()).filter(Boolean), condition: form.condition, capabilities: form.capabilities.split(',').map((value) => value.trim()).filter(Boolean), accessType: form.accessType, price: Number(form.price), priceUnit: form.priceUnit, availability: form.availability, availableFrom: form.availableFrom || null, location: form.location, notes: form.notes };
            if (editing) await updateListing(id!, input);
            else await createListing(input);
            navigate('/listings');
        } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'We could not publish this listing.'); } finally { setSaving(false); }
    };

    if (loading) return <div className="py-20 text-center text-sm text-muted">Loading your listing...</div>;
    return <div className="mx-auto max-w-3xl"><Link to="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back to my listings</Link><div className="mt-6 border-b border-line pb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">{editing ? 'Edit listing' : 'Share something useful'}</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">{editing ? 'Update your listing' : 'Add an item'}</h1><p className="mt-2 text-sm leading-6 text-muted">Describe the item clearly and choose how your community can access it.</p></div><Card className="mt-8 p-6 sm:p-8"><form onSubmit={submit} className="grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><Input label="Item name" id="listing-name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Canon DSLR camera" required /><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Category</span><select value={form.category} onChange={(event) => update('category', event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sage">{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Description</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} className="min-h-32 w-full rounded-card border border-line bg-surface p-4 text-sm leading-6 text-ink outline-none focus:border-sage" placeholder="What is it useful for? What should someone know?" required /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><ImagePlus size={16} className="text-sage" />Image URLs</span><input value={form.images} onChange={(event) => update('images', event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sage" placeholder="Separate multiple URLs with commas" /></label><Input label="Capabilities / specifications" id="capabilities" value={form.capabilities} onChange={(event) => update('capabilities', event.target.value)} placeholder="HDMI, 3000 lumens" /></div><div className="grid gap-5 sm:grid-cols-3"><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Condition</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sage">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Access method</span><select value={form.accessType} onChange={(event) => { const accessType = event.target.value as FormState['accessType']; update('accessType', accessType); if (accessType === 'borrow') { update('price', '0'); update('priceUnit', 'free'); } }} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sage"><option value="borrow">Borrow</option><option value="rent">Rent</option><option value="buy-used">Buy used</option><option value="buy-new">Buy new</option></select></label><Input label="Price" id="price" type="number" min="0" step="1" value={form.price} onChange={(event) => update('price', event.target.value)} disabled={form.accessType === 'borrow'} required /></div><div className="grid gap-5 sm:grid-cols-3"><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Price unit</span><select value={form.priceUnit} onChange={(event) => update('priceUnit', event.target.value)} disabled={form.accessType === 'borrow'} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sage"><option value="free">Free</option><option value="per-day">Per day</option><option value="per-week">Per week</option><option value="one-time">One time</option></select></label><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Availability</span><select value={form.availability} onChange={(event) => update('availability', event.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sage"><option value="available">Available</option><option value="partially-available">Partially available</option><option value="unavailable">Unavailable</option></select></label><Input label="Available from" id="available-from" value={form.availableFrom} onChange={(event) => update('availableFrom', event.target.value)} placeholder="e.g. tomorrow" /></div><Input label="Approximate location" id="location" value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="e.g. Adyar, Chennai" required /><Input label="Notes (optional)" id="notes" value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Pickup details or helpful context" />{error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}<div className="flex flex-wrap gap-3 pt-2"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Publish listing'}{!saving ? <Check size={17} /> : null}</Button><Button type="button" variant="secondary" onClick={() => navigate('/listings')}>Cancel</Button></div></form></Card></div>;
}
