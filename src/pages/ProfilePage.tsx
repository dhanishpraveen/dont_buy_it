import { Check, MapPin, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [location, setLocation] = useState(user?.location ?? '');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    if (!user) return null;

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        try { await updateProfile({ name, phone, location }); setEditing(false); setSaved(true); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'We could not update your profile.'); }
    };

    return <div className="mx-auto max-w-4xl"><div className="flex flex-col gap-4 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Your account</p><h1 className="mt-2 font-display text-4xl font-semibold text-ink">Profile</h1><p className="mt-2 text-sm leading-6 text-muted">Manage the profile details used across your access journey.</p></div><Button variant="secondary" onClick={() => { setEditing(!editing); setSaved(false); }}>{editing ? 'Cancel' : 'Edit profile'}</Button></div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]"><Card className="p-6 sm:p-8">{editing ? <form onSubmit={save} className="grid gap-4"><Input label="Name" id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required /><Input label="Phone" id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /><Input label="Location" id="profile-location" value={location} onChange={(event) => setLocation(event.target.value)} /><p className="text-xs leading-5 text-muted">Use an approximate location for resource discovery. Exact private addresses are not shown publicly.</p>{error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}<Button type="submit">Save changes <Check size={17} /></Button></form> : <dl className="grid gap-6 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Name</dt><dd className="mt-1 font-display text-xl font-semibold text-ink">{user.name}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Email</dt><dd className="mt-1 text-sm font-semibold text-ink">{user.email}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Phone</dt><dd className="mt-1 text-sm text-ink">{user.phone || 'Not added'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Location</dt><dd className="mt-1 flex items-center gap-1 text-sm text-ink">{user.location || 'Not added'}{user.location ? <MapPin size={15} className="text-sage" /> : null}</dd></div></dl>}{saved ? <p className="mt-5 text-sm font-semibold text-sage" role="status">Profile updated.</p> : null}</Card><Card className="p-6"><div className="flex items-center gap-2 text-sage"><ShieldCheck size={20} /><h2 className="font-display text-xl font-semibold text-ink">Trust summary</h2></div><p className="mt-3 text-sm leading-6 text-muted">Your trust history will grow from completed exchanges and reviews.</p><dl className="mt-6 grid gap-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">Trust score</dt><dd className="font-semibold text-ink">{user.trustSummary.score ? `${user.trustSummary.score.toFixed(1)}/5` : 'Not rated yet'}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Completed exchanges</dt><dd className="font-semibold text-ink">{user.trustSummary.completedExchanges}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Reviews</dt><dd className="font-semibold text-ink">{user.trustSummary.reviewCount}</dd></div></dl></Card></div>
    </div>;
}
