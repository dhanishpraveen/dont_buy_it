import { ArrowLeft, ImagePlus, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
    getListing,
    createListing,
    updateListing,
    type ListingView,
} from "../services/listingService";

const categories = [
    "Tools",
    "Electronics",
    "Outdoor & Sports",
    "Furniture",
    "Home & Kitchen",
    "Books",
    "Other",
];
const conditions: ListingView["item"]["condition"][] = [
    "New",
    "Like new",
    "Good",
    "Fair",
    "Poor",
    "Well loved",
];
type FormState = {
    itemName: string;
    title: string;
    itemDescription: string;
    category: string;
    brand: string;
    model: string;
    images: string;
    capabilities: string;
    condition: ListingView["item"]["condition"];
    accessType: ListingView["accessType"];
    price: string;
    priceUnit: ListingView["priceUnit"];
    deposit: string;
    currency: string;
    availability: ListingView["availability"];
    availableFrom: string;
    availableUntil: string;
    location: string;
    latitude: string;
    longitude: string;
};
const blankForm: FormState = {
    itemName: "",
    title: "",
    itemDescription: "",
    category: "Electronics",
    brand: "",
    model: "",
    images: "",
    capabilities: "",
    condition: "Good",
    accessType: "borrow",
    price: "0",
    priceUnit: "free",
    deposit: "0",
    currency: "INR",
    availability: "available",
    availableFrom: "",
    availableUntil: "",
    location: "",
    latitude: "",
    longitude: "",
};

function dateTimeInput(value: string | null) {
    return value ? new Date(value).toISOString().slice(0, 16) : "";
}

export function LiveAddItemPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [form, setForm] = useState<FormState>(blankForm);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let active = true;
        getListing(id)
            .then((listing) => {
                if (!active) return;
                setForm({
                    ...blankForm,
                    itemName: listing.item.name,
                    title: listing.title ?? listing.item.name,
                    itemDescription: listing.item.description,
                    category: listing.item.category,
                    images: listing.item.images.join(", "),
                    capabilities: listing.item.capabilities.join(", "),
                    condition: listing.item.condition,
                    accessType: listing.accessType,
                    price: String(listing.price),
                    priceUnit: listing.priceUnit,
                    deposit: String(listing.deposit ?? 0),
                    currency: listing.currency ?? "INR",
                    availability: listing.availability,
                    availableFrom: dateTimeInput(listing.availableFrom),
                    availableUntil: dateTimeInput(listing.availableUntil),
                    location: listing.location,
                });
            })
            .catch(() => {
                if (active)
                    setError(
                        "We could not load this listing. It may have been removed or you may not own it.",
                    );
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [id]);

    const update = (field: keyof FormState, value: string) =>
        setForm((current) => {
            if (field === "accessType" && value === "borrow")
                return {
                    ...current,
                    accessType: "borrow",
                    price: "0",
                    priceUnit: "free",
                };
            if (field === "accessType" && value === "rent")
                return {
                    ...current,
                    accessType: "rent",
                    price: current.price === "0" ? "" : current.price,
                    priceUnit:
                        current.priceUnit === "free" ? "per-day" : current.priceUnit,
                };
            if (field === "accessType")
                return {
                    ...current,
                    accessType: value as ListingView["accessType"],
                    priceUnit: "one-time",
                };
            return { ...current, [field]: value };
        });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (
            (form.latitude && !form.longitude) ||
            (!form.latitude && form.longitude)
        ) {
            setError("Enter both coordinates or leave both blank.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const input = {
                name: form.itemName.trim(),
                title: form.title.trim(),
                description: form.itemDescription.trim(),
                category: form.category,
                brand: form.brand.trim() || undefined,
                model: form.model.trim() || undefined,
                images: form.images
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                capabilities: form.capabilities
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                condition: form.condition,
                accessType: form.accessType,
                price: Number(form.price),
                priceUnit: form.priceUnit,
                deposit: Number(form.deposit),
                currency: form.currency.trim().toUpperCase(),
                availability: form.availability,
                availableFrom: form.availableFrom
                    ? new Date(form.availableFrom).toISOString()
                    : null,
                availableUntil: form.availableUntil
                    ? new Date(form.availableUntil).toISOString()
                    : null,
                location: form.location.trim(),
                ...(form.latitude && form.longitude
                    ? {
                        latitude: Number(form.latitude),
                        longitude: Number(form.longitude),
                    }
                    : {}),
            };
            if (editing) await updateListing(id!, input);
            else await createListing(input);
            navigate("/listings");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "We could not save this listing. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="py-20 text-center text-sm text-muted" role="status">
                Loading your listing...
            </div>
        );

    return (
        <div className="mx-auto max-w-3xl">
            <Link
                to="/listings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"
            >
                <ArrowLeft size={16} />
                Back to my listings
            </Link>
            <div className="mt-6 border-b border-line pb-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">
                    {editing ? "Edit listing" : "Create listing"}
                </p>
                <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
                    {editing ? "Update your offer" : "Make an item available"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                    The item and its current offer are stored separately.
                </p>
            </div>
            {error ? (
                <p
                    className="mt-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    role="alert"
                >
                    {error}
                </p>
            ) : null}
            <Card className="mt-8 p-5 sm:p-8">
                <form onSubmit={submit} className="grid gap-8">
                    <fieldset className="grid gap-5">
                        <legend className="mb-4 font-display text-xl font-semibold text-ink">
                            Item details
                        </legend>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input
                                id="item-name"
                                label="Item name"
                                maxLength={160}
                                value={form.itemName}
                                onChange={(event) => update("itemName", event.target.value)}
                                required
                            />
                            <Input
                                id="listing-title"
                                label="Listing title"
                                maxLength={180}
                                value={form.title}
                                onChange={(event) => update("title", event.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Category
                                </span>
                                <select
                                    value={form.category}
                                    onChange={(event) => update("category", event.target.value)}
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                >
                                    {categories.map((category) => (
                                        <option key={category}>{category}</option>
                                    ))}
                                </select>
                            </label>
                            <Input
                                id="brand"
                                label="Brand"
                                maxLength={120}
                                value={form.brand}
                                onChange={(event) => update("brand", event.target.value)}
                            />
                            <Input
                                id="model"
                                label="Model"
                                maxLength={120}
                                value={form.model}
                                onChange={(event) => update("model", event.target.value)}
                            />
                        </div>
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-ink">
                                Item description
                            </span>
                            <textarea
                                value={form.itemDescription}
                                onChange={(event) =>
                                    update("itemDescription", event.target.value)
                                }
                                maxLength={4000}
                                className="min-h-28 w-full rounded-card border border-line bg-surface p-4 text-sm leading-6 text-ink outline-none focus:border-sage"
                                required
                            />
                        </label>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Condition
                                </span>
                                <select
                                    value={form.condition}
                                    onChange={(event) => update("condition", event.target.value)}
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                >
                                    {conditions.map((condition) => (
                                        <option key={condition}>{condition}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                                    <ImagePlus size={16} className="text-sage" />
                                    Image URLs
                                </span>
                                <input
                                    value={form.images}
                                    onChange={(event) => update("images", event.target.value)}
                                    placeholder="https://... (up to 6, comma-separated)"
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                />
                            </label>
                        </div>
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-ink">
                                Capabilities
                            </span>
                            <input
                                value={form.capabilities}
                                onChange={(event) => update("capabilities", event.target.value)}
                                placeholder="HDMI, 1080p (comma-separated)"
                                className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                            />
                        </label>
                    </fieldset>
                    <fieldset className="grid gap-5 border-t border-line pt-6">
                        <legend className="mb-4 font-display text-xl font-semibold text-ink">
                            Access offer
                        </legend>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Access type
                                </span>
                                <select
                                    value={form.accessType}
                                    onChange={(event) => update("accessType", event.target.value)}
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                >
                                    <option value="borrow">Borrow</option>
                                    <option value="rent">Rent</option>
                                    <option value="buy-used">Buy used</option>
                                    <option value="buy-new">Buy new</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Availability
                                </span>
                                <select
                                    value={form.availability}
                                    onChange={(event) =>
                                        update("availability", event.target.value)
                                    }
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                >
                                    <option value="available">Available</option>
                                    <option value="partially-available">
                                        Partially available
                                    </option>
                                    <option value="unavailable">Unavailable</option>
                                </select>
                            </label>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <Input
                                id="price"
                                label={`Price${form.accessType === "rent" ? " (rental)" : ""}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(event) => update("price", event.target.value)}
                                disabled={form.accessType === "borrow"}
                                required
                            />
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Price unit
                                </span>
                                <select
                                    value={form.priceUnit}
                                    onChange={(event) => update("priceUnit", event.target.value)}
                                    disabled={form.accessType !== "rent"}
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                >
                                    <option value="free">Free</option>
                                    <option value="per-day">Per day</option>
                                    <option value="per-week">Per week</option>
                                    <option value="one-time">One time</option>
                                </select>
                            </label>
                            <Input
                                id="deposit"
                                label="Deposit"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.deposit}
                                onChange={(event) => update("deposit", event.target.value)}
                            />
                        </div>
                        <div className="max-w-56">
                            <Input
                                id="currency"
                                label="Currency code"
                                maxLength={3}
                                value={form.currency}
                                onChange={(event) => update("currency", event.target.value)}
                            />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Available from
                                </span>
                                <input
                                    type="datetime-local"
                                    value={form.availableFrom}
                                    onChange={(event) =>
                                        update("availableFrom", event.target.value)
                                    }
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-ink">
                                    Available until
                                </span>
                                <input
                                    type="datetime-local"
                                    value={form.availableUntil}
                                    onChange={(event) =>
                                        update("availableUntil", event.target.value)
                                    }
                                    className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink"
                                />
                            </label>
                        </div>
                    </fieldset>
                    <fieldset className="grid gap-5 border-t border-line pt-6">
                        <legend className="mb-4 font-display text-xl font-semibold text-ink">
                            Approximate location
                        </legend>
                        <Input
                            id="location-area"
                            label="Area"
                            maxLength={160}
                            value={form.location}
                            onChange={(event) => update("location", event.target.value)}
                            placeholder="e.g. Adyar, Chennai"
                            required
                        />
                        <p className="text-xs leading-5 text-muted">
                            Coordinates are optional and used only for distance calculations.
                            They are never shown publicly.
                        </p>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input
                                id="latitude"
                                label="Latitude (optional)"
                                type="number"
                                min="-90"
                                max="90"
                                step="any"
                                value={form.latitude}
                                onChange={(event) => update("latitude", event.target.value)}
                            />
                            <Input
                                id="longitude"
                                label="Longitude (optional)"
                                type="number"
                                min="-180"
                                max="180"
                                step="any"
                                value={form.longitude}
                                onChange={(event) => update("longitude", event.target.value)}
                            />
                        </div>
                    </fieldset>
                    <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate("/listings")}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <LoaderCircle size={16} className="animate-spin" />
                                    Saving...
                                </>
                            ) : editing ? (
                                "Save changes"
                            ) : (
                                "Publish listing"
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
