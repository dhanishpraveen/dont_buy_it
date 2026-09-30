import { createClient } from "@supabase/supabase-js";

export type ProjectorDemoListing = {
  title: string;
  itemName: string;
  brand: string;
  model: string;
  ownerName: "Dhanish" | "Sharun";
  accessType: "BORROW" | "RENT" | "BUY_USED" | "BUY_NEW";
  price: number;
  priceUnit: "free" | "per-day" | "one-time";
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR" | "WELL_LOVED";
  availabilityStatus: "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
  availableFrom: string | null;
  availableUntil: string | null;
  locationArea: string;
  location: string;
  description: string;
  images: string[];
  specifications: string[];
};

export const projectorDemoListings: ProjectorDemoListing[] = [
  {
    title: "Epson Projector X1",
    itemName: "Epson Projector X1",
    brand: "Epson",
    model: "X1",
    ownerName: "Dhanish",
    accessType: "BORROW",
    price: 0,
    priceUnit: "free",
    condition: "GOOD",
    availabilityStatus: "AVAILABLE",
    availableFrom: "2026-10-01T00:00:00.000Z",
    availableUntil: null,
    locationArea: "Adyar, Chennai",
    location: "SRID=4326;POINT(80.2522 13.0104)",
    description:
      "Reliable Epson projector suitable for college presentations, seminars and short events. Available for borrowing from a nearby campus user.",
    images: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    ],
    specifications: ["HDMI", "Portable", "Bright display", "Short-event ready"],
  },
  {
    title: "BenQ Projector",
    itemName: "BenQ Projector",
    brand: "BenQ",
    model: "CP120",
    ownerName: "Sharun",
    accessType: "RENT",
    price: 400,
    priceUnit: "per-day",
    condition: "LIKE_NEW",
    availabilityStatus: "AVAILABLE",
    availableFrom: "2026-10-01T00:00:00.000Z",
    availableUntil: null,
    locationArea: "Guindy, Chennai",
    location: "SRID=4326;POINT(80.2209 13.0091)",
    description:
      "Bright BenQ projector suitable for presentations, workshops and small events. Available for daily rental.",
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    ],
    specifications: ["HDMI", "Daily rental", "Bright output", "Workshop ready"],
  },
  {
    title: "ViewSonic Projector",
    itemName: "ViewSonic Projector",
    brand: "ViewSonic",
    model: "M1 Plus",
    ownerName: "Dhanish",
    accessType: "BUY_USED",
    price: 8000,
    priceUnit: "one-time",
    condition: "GOOD",
    availabilityStatus: "AVAILABLE",
    availableFrom: null,
    availableUntil: null,
    locationArea: "T Nagar, Chennai",
    location: "SRID=4326;POINT(80.2327 13.0406)",
    description:
      "Used ViewSonic projector in good working condition. Suitable for repeated presentations and regular academic use.",
    images: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    ],
    specifications: ["Used but tested", "Portable", "Presentation ready"],
  },
  {
    title: "Epson Projector",
    itemName: "Epson Projector",
    brand: "Epson",
    model: "EB-X06",
    ownerName: "Dhanish",
    accessType: "BUY_NEW",
    price: 24000,
    priceUnit: "one-time",
    condition: "NEW",
    availabilityStatus: "AVAILABLE",
    availableFrom: null,
    availableUntil: null,
    locationArea: "Anna Nagar, Chennai",
    location: "SRID=4326;POINT(80.2108 13.0886)",
    description:
      "New Epson projector suitable for frequent long-term use, presentations, classrooms and events.",
    images: [
      "https://images.unsplash.com/photo-1527212986661-9ed0e5ebf8d2?auto=format&fit=crop&w=900&q=80",
    ],
    specifications: [
      "New unit",
      "Long-term use",
      "Classroom ready",
      "Warranty included",
    ],
  },
  {
    title: "Wanbo Mini Projector",
    itemName: "Wanbo Mini Projector",
    brand: "Wanbo",
    model: "Mini",
    ownerName: "Sharun",
    accessType: "RENT",
    price: 250,
    priceUnit: "per-day",
    condition: "GOOD",
    availabilityStatus: "AVAILABLE",
    availableFrom: "2026-10-01T00:00:00.000Z",
    availableUntil: null,
    locationArea: "Velachery, Chennai",
    location: "SRID=4326;POINT(80.2168 12.9754)",
    description:
      "Compact portable projector available for short events and presentations. Convenient nearby rental option.",
    images: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
    ],
    specifications: ["Portable", "Compact", "Short event use", "Easy to carry"],
  },
];

async function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and a Supabase service key are required to seed the demo projector listings.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function getProfileIdByName(
  supabase: Awaited<ReturnType<typeof getSupabaseServiceClient>>,
  fullName: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", fullName)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`Profile not found for ${fullName}.`);
  }

  return data.id as string;
}

async function ensureItem(
  supabase: Awaited<ReturnType<typeof getSupabaseServiceClient>>,
  ownerId: string,
  listing: ProjectorDemoListing,
) {
  const { data: existing, error: findError } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", listing.itemName)
    .maybeSingle();

  if (findError) throw findError;

  const payload = {
    owner_id: ownerId,
    name: listing.itemName,
    description: listing.description,
    category: "Electronics",
    brand: listing.brand,
    model: listing.model,
    condition: listing.condition,
    images: listing.images,
    specifications: listing.specifications,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("items")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("items")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id as string;
}

async function ensureListing(
  supabase: Awaited<ReturnType<typeof getSupabaseServiceClient>>,
  itemId: string,
  ownerId: string,
  listing: ProjectorDemoListing,
) {
  const { data: existing, error: findError } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("title", listing.title)
    .maybeSingle();

  if (findError) throw findError;

  const payload = {
    item_id: itemId,
    owner_id: ownerId,
    access_type: listing.accessType,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    deposit: 0,
    currency: "INR",
    condition: listing.condition,
    availability_status: listing.availabilityStatus,
    available_from: listing.availableFrom,
    available_until: listing.availableUntil,
    location_area: listing.locationArea,
    location: listing.location,
    status: "ACTIVE",
    price_unit: listing.priceUnit,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("listings")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id as string;
}

export async function seedSupabaseProjectorDemo() {
  const supabase = await getSupabaseServiceClient();
  const targetTitles = new Set(
    projectorDemoListings.map((listing) => listing.title),
  );

  const { data: listedProjectors, error: listError } = await supabase
    .from("listings")
    .select("id, title")
    .or("title.ilike.%projector%");

  if (listError) throw listError;

  for (const listing of listedProjectors ?? []) {
    if (!targetTitles.has(listing.title)) {
      const { error: deleteError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listing.id);
      if (deleteError) throw deleteError;
    }
  }

  const { data: projectorItems, error: itemListError } = await supabase
    .from("items")
    .select("id, name")
    .or("name.ilike.%projector%");

  if (itemListError) throw itemListError;

  const targetItemNames = new Set(
    projectorDemoListings.map((listing) => listing.itemName),
  );
  for (const item of projectorItems ?? []) {
    if (!targetItemNames.has(item.name)) {
      const { error: deleteItemError } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);
      if (deleteItemError) throw deleteItemError;
    }
  }

  const profileCache = new Map<string, string>();

  for (const listing of projectorDemoListings) {
    const ownerId =
      profileCache.get(listing.ownerName) ??
      (await getProfileIdByName(supabase, listing.ownerName));
    profileCache.set(listing.ownerName, ownerId);

    const itemId = await ensureItem(supabase, ownerId, listing);
    await ensureListing(supabase, itemId, ownerId, listing);
  }

  console.log(
    "[DB] Seeded five projector demo listings for the Supabase project.",
  );
}
