import type { ListingView } from "../services/listingService";

export function formatListingPrice(
  listing: Pick<ListingView, "accessType" | "price" | "priceUnit" | "currency">,
): string {
  if (listing.accessType === "borrow" || listing.price === 0)
    return "Free to borrow";
  const currency = listing.currency ?? "INR";
  let amount: string;
  try {
    amount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(listing.price);
  } catch {
    amount = `${currency} ${listing.price.toFixed(2)}`;
  }
  const unit =
    listing.priceUnit === "per-day"
      ? "per day"
      : listing.priceUnit === "per-week"
        ? "per week"
        : "";
  return unit ? `${amount} ${unit}` : amount;
}
