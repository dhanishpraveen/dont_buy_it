import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CircleDollarSign,
    MapPin,
    Pencil,
    ShieldCheck,
    Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from '../lib/listingFormat';
import { getAvailabilityDates } from '../lib/dateAvailability';
import { cacheKeys, cacheTtl } from '../lib/localStorageCache';
import { useCachedResource } from '../hooks/useCachedResource';
import { getListing, type ListingView } from '../services/listingService';
import { getUserTrustSummary, type TrustSummary } from '../services/trustService';

const methodLabel: Record<ListingView['accessType'], string> = {
    borrow: 'Borrow',
    rent: 'Rent',
    'buy-used': 'Buy used',
    'buy-new': 'Buy new',
};

const statusLabel: Record<ListingView['status'], string> = {
    draft: 'Draft',
    active: 'Published',
    paused: 'Paused',
    unavailable: 'Unavailable',
    sold: 'Sold',
    archived: 'Archived',
    closed: 'Closed',
};

function dateLabel(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatCondition(value: string): string {
    return value
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function LiveListingDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [ownerTrust, setOwnerTrust] = useState<TrustSummary | null>(null);
    const { data: listing, loading, refreshing, error } = useCachedResource(
        cacheKeys.listing(id ?? 'missing', user?.id),
        cacheTtl.listingDetails,
        () => {
            if (!id) throw new Error('Listing not found.');
            return getListing(id);
        },
    );

    useEffect(() => {
        if (!listing?.owner.id) {
            setOwnerTrust(null);
            return;
        }
        let isMounted = true;
        void getUserTrustSummary(listing.owner.id).then((summary) => {
            if (isMounted) setOwnerTrust(summary);
        });
        return () => {
            isMounted = false;
        };
    }, [listing?.owner.id]);

    useEffect(() => {
        if (listing?.item.images.length) {
            setSelectedImage(listing.item.images[0]);
        }
    }, [listing?.item.images]);

    const availabilityDates = useMemo(
        () => getAvailabilityDates(listing?.availableFrom ?? null, listing?.availableUntil ?? null),
        [listing?.availableFrom, listing?.availableUntil],
    );

    if (loading) {
        return (
            <div className="py-20 text-center text-sm text-muted" role="status">
                Loading listing...
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="py-20 text-center">
                <h1 className="font-display text-3xl font-semibold text-ink">
                    Listing not found
                </h1>
                <p className="mt-2 text-sm text-muted">
                    {error ?? 'It may have been archived or is no longer available.'}
                </p>
                <Link
                    to="/browse"
                    className="mt-4 inline-block text-sm font-semibold text-bark underline"
                >
                    Back to browse
                </Link>
            </div>
        );
    }

    const isOwner = Boolean(user && listing.owner.id && user.id === listing.owner.id);
    const canRequest =
        !isOwner &&
        listing.status === 'active' &&
        listing.availability !== 'unavailable';
    const hasImages = listing.item.images.length > 0;
    const summaryAvailability =
        listing.availableFrom || listing.availableUntil
            ? [dateLabel(listing.availableFrom), dateLabel(listing.availableUntil)]
                .filter(Boolean)
                .join(' → ')
            : 'Flexible timing';
    return (
        <div className="mx-auto max-w-6xl pb-12">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                        {selectedImage ? (
                            <img
                                src={selectedImage}
                                alt={listing.item.name}
                                className="aspect-[4/3] w-full object-cover"
                            />
                        ) : (
                            <div className="flex aspect-[4/3] items-center justify-center bg-sage-soft text-sm text-muted">
                                No image added
                            </div>
                        )}
                    </div>

                    {hasImages && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {listing.item.images.map((image, index) => (
                                <button
                                    key={`${image}-${index}`}
                                    type="button"
                                    onClick={() => setSelectedImage(image)}
                                    className={`h-20 w-20 overflow-hidden rounded-control border transition ${selectedImage === image
                                        ? 'border-bark ring-2 ring-sage-soft'
                                        : 'border-line hover:border-sage'
                                        }`}
                                >
                                    <img src={image} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {refreshing ? (
                        <p className="text-xs text-muted" role="status">
                            Refreshing listing...
                        </p>
                    ) : null}
                    {error ? (
                        <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-800" role="status">
                            Showing saved listing data. {error}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-sage-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sage">
                            {methodLabel[listing.accessType]}
                        </span>
                        <span className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                            {statusLabel[listing.status]}
                        </span>
                    </div>

                    <div>
                        <h1 className="font-display text-4xl font-semibold leading-tight text-ink">
                            {listing.title || listing.item.name}
                        </h1>
                        {listing.title && listing.title !== listing.item.name ? (
                            <p className="mt-2 text-sm font-semibold text-muted">
                                Item: {listing.item.name}
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-card border border-line bg-surface p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                                    Access method
                                </p>
                                <p className="mt-2 font-display text-3xl font-semibold text-bark">
                                    {formatListingPrice(listing)}
                                </p>
                            </div>
                            {listing.deposit ? (
                                <div className="rounded-control border border-line bg-white px-3 py-2 text-sm text-muted">
                                    Deposit: {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: listing.currency ?? 'INR',
                                    }).format(listing.deposit)}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-3 text-sm text-muted">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-sage" />
                            <span>
                                {listing.location}
                                {typeof listing.distanceKm === 'number'
                                    ? ` · Approx. ${listing.distanceKm.toFixed(1)} km away`
                                    : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-sage" />
                            <span>{formatCondition(listing.item.condition)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-sage" />
                            <span>{summaryAvailability}</span>
                        </div>
                    </div>

                    {isOwner ? (
                        <Link to={`/listings/${listing.id}/edit`}>
                            <Button className="w-full" variant="secondary">
                                <Pencil size={16} />
                                Edit listing
                            </Button>
                        </Link>
                    ) : null}

                    {canRequest ? (
                        <Link to={`/request-access/${listing.id}`}>
                            <Button className="w-full">
                                {listing.accessType === 'borrow'
                                    ? 'Request to borrow'
                                    : listing.accessType === 'rent'
                                        ? 'Request to rent'
                                        : 'Request to buy'}
                            </Button>
                        </Link>
                    ) : (
                        <div className="rounded-control border border-line bg-sage-soft px-4 py-3 text-sm font-semibold text-ink">
                            {isOwner ? 'Your listing' : 'This listing is not currently requestable.'}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <div className="flex items-center gap-2 text-sage">
                        <CheckCircle2 size={18} />
                        <p className="text-xs font-bold uppercase tracking-[0.18em]">
                            Availability
                        </p>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                        When this item is available
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-muted">
                        {availabilityDates.length ? (
                            <div className="flex flex-wrap gap-2">
                                {availabilityDates.slice(0, 10).map((item) => (
                                    <span
                                        key={item}
                                        className="rounded-full border border-sage bg-sage-soft px-2.5 py-1 font-medium text-ink"
                                    >
                                        {dateLabel(item)}
                                    </span>
                                ))}
                                {availabilityDates.length > 10 ? (
                                    <span className="rounded-full border border-line bg-white px-2.5 py-1 text-muted">
                                        +{availabilityDates.length - 10} more dates
                                    </span>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-muted">
                                Availability details are not yet published for this listing.
                            </p>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-2 text-sage">
                        <CircleDollarSign size={18} />
                        <p className="text-xs font-bold uppercase tracking-[0.18em]">
                            Item overview
                        </p>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-muted">
                        <div className="flex justify-between gap-4 border-b border-line pb-2">
                            <span>Category</span>
                            <span className="font-semibold text-ink">{listing.item.category}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-line pb-2">
                            <span>Condition</span>
                            <span className="font-semibold text-ink">
                                {formatCondition(listing.item.condition)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-line pb-2">
                            <span>Access</span>
                            <span className="font-semibold text-ink">
                                {methodLabel[listing.accessType]}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-line pb-2">
                            <span>Price</span>
                            <span className="font-semibold text-ink">
                                {formatListingPrice(listing)}
                            </span>
                        </div>
                        {listing.item.capabilities?.length ? (
                            <div className="pt-2">
                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                                    Relevant details
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {listing.item.capabilities.map((capability) => (
                                        <span
                                            key={capability}
                                            className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink"
                                        >
                                            {capability}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </Card>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                        Description
                    </p>
                    <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted">
                        {listing.item.description || 'No description provided yet.'}
                    </p>
                    {listing.notes ? (
                        <div className="mt-6 rounded-control border border-line bg-sage-soft p-3 text-sm text-muted">
                            <span className="font-semibold text-ink">Notes:</span> {listing.notes}
                        </div>
                    ) : null}
                </Card>

                <Card className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                        Owner & trust
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-soft font-display text-lg font-semibold text-bark">
                            {listing.owner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-display text-xl font-semibold text-ink">
                                {listing.owner.name}
                            </p>
                            <p className="text-sm text-muted">
                                {ownerTrust?.level ?? 'New member'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-control border border-line bg-surface p-4">
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-muted">Reviewed</span>
                            <span className="font-semibold text-ink">
                                {ownerTrust ? `${ownerTrust.reviewCount} reviews` : 'No reviews yet'}
                            </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                            <span className="text-muted">Trust</span>
                            <span className="inline-flex items-center gap-2 font-semibold text-ink">
                                <Star size={14} className="fill-current text-sage" />
                                {ownerTrust && ownerTrust.score !== null
                                    ? `${ownerTrust.score}/100`
                                    : 'New member'}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
