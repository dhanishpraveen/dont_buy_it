import {
    ArrowLeft,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import {
    formatFullDate,
    getAvailabilityDates,
    getMonthGrid,
    type DateRangeSelection,
} from '../lib/dateAvailability';
import { formatListingPrice } from '../lib/listingFormat';
import type { ListingView } from '../services/listingService';
import { getListing } from '../services/listingService';
import { createRequest } from '../services/accessRequestService';

function todayKeyForLocal(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function RequestAccessPage() {
    const { listingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [listing, setListing] = useState<ListingView | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [calendarTarget, setCalendarTarget] = useState<'start' | 'end' | null>(null);
    const [selection, setSelection] = useState<DateRangeSelection>({
        start: null,
        end: null,
    });
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        if (!listingId) {
            setLoading(false);
            return;
        }

        getListing(listingId)
            .then((result) => {
                if (active) {
                    setListing(result);
                    if (result.availableFrom) {
                        setCalendarMonth(new Date(result.availableFrom));
                    }
                }
            })
            .catch(() => {
                if (active) setError('This listing is no longer available.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [listingId]);

    const needsDates = listing?.accessType === 'borrow' || listing?.accessType === 'rent';
    const isOwner = Boolean(user && listing && user.id === listing.owner.id);
    const available = Boolean(
        listing && listing.status === 'active' && listing.availability !== 'unavailable',
    );
    const availabilityDates = useMemo(
        () =>
            listing
                ? getAvailabilityDates(listing.availableFrom, listing.availableUntil).filter(
                    (date) => date >= todayKeyForLocal(),
                )
                : [],
        [listing],
    );
    const monthCells = useMemo(() => {
        const cells = getMonthGrid(calendarMonth, availabilityDates, selection);
        const from = listing?.availableFrom?.slice(0, 10) ?? null;
        const until = listing?.availableUntil?.slice(0, 10) ?? null;
        return cells.map((cell) => ({
            ...cell,
            available: (!from || cell.key >= from) && (!until || cell.key <= until),
        }));
    }, [calendarMonth, availabilityDates, listing?.availableFrom, listing?.availableUntil, selection]);

    useEffect(() => {
        if (!calendarTarget) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!datePickerRef.current?.contains(event.target as Node)) {
                setCalendarTarget(null);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setCalendarTarget(null);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [calendarTarget]);

    const handleDateClick = (value: string) => {
        const cell = monthCells.find((item) => item.key === value);
        if (!needsDates || !cell?.available || cell.past) return;

        if (calendarTarget === 'start') {
            setSelection({
                start: value,
                end: selection.end && selection.end < value ? null : selection.end,
            });
        } else if (calendarTarget === 'end' && selection.start && value >= selection.start) {
            setSelection({ start: selection.start, end: value });
        }
        setCalendarTarget(null);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!listingId || !listing) return;
        if (isOwner) {
            setError("You can't request your own listing.");
            return;
        }
        if (!available) {
            setError('This listing is no longer available.');
            return;
        }

        if (needsDates) {
            if (!selection.start || !selection.end) {
                setError('Choose both a start and end date.');
                return;
            }
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const start = new Date(`${selection.start}T00:00:00`);
            const end = new Date(`${selection.end}T23:59:59`);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                setError('Choose valid dates.');
                return;
            }
            if (selection.end < selection.start) {
                setError('The end date cannot be before the start date.');
                return;
            }
            if (selection.start < todayKey) {
                setError('Choose a date that is not in the past.');
                return;
            }
            if (![selection.start, selection.end].every((date) => {
                const from = listing.availableFrom?.slice(0, 10);
                const until = listing.availableUntil?.slice(0, 10);
                return (!from || date >= from) && (!until || date <= until);
            })) {
                setError('Choose dates within the listing availability.');
                return;
            }
        }

        setSubmitting(true);
        setError(null);

        try {
            const result = await createRequest({
                listingId,
                requestedFrom: needsDates && selection.start
                    ? new Date(`${selection.start}T${selection.start === todayKeyForLocal() ? new Date().toTimeString().slice(0, 8) : '00:00:00'}`).toISOString()
                    : null,
                requestedUntil: needsDates && selection.end
                    ? new Date(`${selection.end}T23:59:59`).toISOString()
                    : null,
                message: message.trim() || null,
            });
            navigate(`/requests/${result.id}`);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : 'We could not send your request. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

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
                <Link to="/browse" className="mt-4 inline-block text-sm font-semibold text-bark underline">
                    Back to browse
                </Link>
            </div>
        );
    }

    const canSelectDate = (cellKey: string, target: 'start' | 'end') => {
        const cell = monthCells.find((item) => item.key === cellKey);
        return Boolean(
            cell?.inMonth &&
            cell.available &&
            !cell.past &&
            (target !== 'end' || !selection.start || cellKey >= selection.start),
        );
    };

    const setPickerTarget = (target: 'start' | 'end') => {
        if (target === 'end' && !selection.start) return;
        const selectedDate = selection[target] ?? (target === 'end'
            ? selection.start
            : listing.availableFrom?.slice(0, 10));
        const firstValidDate = selectedDate && selectedDate >= todayKeyForLocal()
            ? selectedDate
            : todayKeyForLocal();
        setCalendarMonth(new Date(`${firstValidDate}T12:00:00`));
        setCalendarTarget(calendarTarget === target ? null : target);
    };

    return (
        <div className="mx-auto max-w-5xl pb-12">
            <Link
                to={`/listing/${listing.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"
            >
                <ArrowLeft size={16} />
                Back to listing
            </Link>

            <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">
                    Request access
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="font-display text-3xl font-semibold text-ink">
                        {listing.title || listing.item.name}
                    </h1>
                    <span className="text-sm font-semibold text-muted">
                        {listing.accessType === 'borrow' ? 'Borrow' : listing.accessType === 'rent' ? 'Rent' : 'Buy'}
                    </span>
                </div>
                <p className="mt-1 text-sm text-muted">{listing.location} · {formatListingPrice(listing)}</p>
            </div>

            <Card className="mt-4 flex items-center gap-3 p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-canvas">
                    {listing.item.images[0] ? (
                        <img src={listing.item.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : null}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-ink">{listing.item.name}</p>
                    {listing.deposit ? (
                        <p className="mt-1 text-xs text-muted">
                            Deposit {listing.currency ?? 'INR'} {listing.deposit.toFixed(2)}
                        </p>
                    ) : null}
                </div>
            </Card>

            <Card className="mt-4 p-4 sm:p-6">
                <form onSubmit={submit} className="space-y-5">
                    {needsDates ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-ink">Available dates</p>
                                {availabilityDates.length > 0 ? (
                                    availabilityDates.length <= 4 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {availabilityDates.map((date) => (
                                                <span key={date} className="rounded-full border border-line bg-sage-soft px-2.5 py-1 text-xs font-medium text-ink">
                                                    {formatFullDate(date)}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-sm text-muted">
                                            Available on {availabilityDates.length} dates · Choose dates below
                                        </p>
                                    )
                                ) : (
                                    <p className="mt-1 text-sm text-muted">
                                        {listing.availableFrom || listing.availableUntil
                                            ? 'Availability has no complete date range; dates follow the owner’s published bound.'
                                            : 'No date limits are set by the owner.'}
                                    </p>
                                )}
                            </div>

                            <div ref={datePickerRef} className="grid gap-4 sm:grid-cols-2">
                                {(['start', 'end'] as const).map((target) => {
                                    const selected = selection[target];
                                    const label = target === 'start' ? 'Start date' : 'End date';
                                    const isOpen = calendarTarget === target;
                                    const isDisabled = target === 'end' && !selection.start;
                                    return (
                                        <div key={target} className="relative">
                                            <label className="mb-2 block text-sm font-semibold text-ink">{label}</label>
                                            <button
                                                type="button"
                                                disabled={isDisabled}
                                                aria-expanded={isOpen}
                                                aria-haspopup="dialog"
                                                onClick={() => setPickerTarget(target)}
                                                className="flex h-11 w-full items-center justify-between rounded-control border border-line bg-white px-3 text-left text-sm text-ink outline-none transition hover:border-sage focus:border-sage disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted"
                                            >
                                                <span className={selected ? 'font-medium' : 'text-muted'}>
                                                    {selected ? formatFullDate(selected) : `Select ${target} date`}
                                                </span>
                                                <CalendarDays size={16} className="shrink-0 text-sage" />
                                            </button>
                                            {isOpen ? (
                                                <div role="dialog" aria-label={`${label} calendar`} className="absolute left-0 top-full z-20 mt-2 w-full min-w-[min(20rem,calc(100vw-3rem))] rounded-card border border-line bg-surface p-3 shadow-soft">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded-control border border-line bg-white p-2 text-muted hover:text-bark" aria-label="Previous month">
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <p className="font-display text-base font-semibold text-ink">
                                                            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarMonth)}
                                                        </p>
                                                        <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-control border border-line bg-white p-2 text-muted hover:text-bark" aria-label="Next month">
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted">
                                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
                                                    </div>
                                                    <div className="mt-2 grid grid-cols-7 gap-1">
                                                        {monthCells.map((cell) => {
                                                            const selectable = canSelectDate(cell.key, target);
                                                            const isSelected = selected === cell.key;
                                                            return (
                                                                <button
                                                                    key={cell.key}
                                                                    type="button"
                                                                    disabled={!selectable}
                                                                    onClick={() => handleDateClick(cell.key)}
                                                                    aria-pressed={isSelected}
                                                                    aria-label={formatFullDate(cell.key)}
                                                                    className={`flex aspect-square min-w-0 items-center justify-center rounded-control text-xs font-semibold transition ${!cell.inMonth ? 'text-transparent' : isSelected ? 'bg-bark text-white' : selectable ? 'bg-sage-soft text-ink hover:bg-sage hover:text-white' : 'cursor-not-allowed text-muted opacity-35'}`}
                                                                >
                                                                    {cell.date.getDate()}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            {selection.start && selection.end ? (
                                <p className="text-xs text-muted">
                                    Requested period: {formatFullDate(selection.start)} – {formatFullDate(selection.end)}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-muted">
                            The owner will coordinate handover details after accepting your request.
                        </p>
                    )}

                    <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-ink">
                            Message <span className="font-normal text-muted">(optional)</span>
                        </span>
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            maxLength={2000}
                            rows={3}
                            placeholder="Share any context or pickup details with the owner."
                            className="w-full rounded-control border border-line bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-sage"
                        />
                    </label>

                    {error ? (
                        <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">
                            {error}
                        </p>
                    ) : null}

                    {isOwner ? (
                        <p className="text-sm font-semibold text-red-800" role="alert">
                            You can't request your own listing.
                        </p>
                    ) : null}

                    {!available ? (
                        <p className="text-sm font-semibold text-red-800" role="alert">
                            This listing is no longer available.
                        </p>
                    ) : null}

                    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                        <Link to={`/listing/${listing.id}`} className="rounded-control px-4 py-2.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink">
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            disabled={
                                submitting ||
                                isOwner ||
                                !available ||
                                (needsDates && (!selection.start || !selection.end))
                            }
                        >
                            {submitting ? (
                                <>
                                    <LoaderCircle size={16} className="animate-spin" />
                                    Sending request...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Request access
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
