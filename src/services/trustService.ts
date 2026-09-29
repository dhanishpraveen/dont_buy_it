import { supabase } from "../lib/supabase";

export type TrustLevel =
  | "New member"
  | "Developing"
  | "Trusted"
  | "Highly trusted";

export type TrustSummary = {
  userId: string;
  score: number | null;
  level: TrustLevel;
  completedExchanges: number;
  successfulReturns: number;
  reviewCount: number;
  averageRating: number | null;
  cancellationCount: number;
  emailVerified: boolean;
  memberSince: string | null;
};

type TrustFormulaInput = {
  emailVerified: boolean;
  accountAgeDays: number;
  completedExchanges: number;
  successfulReturns: number;
  reviewCount: number;
  averageRating: number | null;
  cancellationCount: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function calculateTrustScore(input: TrustFormulaInput): number | null {
  const hasHistory =
    input.completedExchanges > 0 ||
    input.successfulReturns > 0 ||
    (input.reviewCount > 0 && input.averageRating !== null);

  if (!hasHistory) {
    return null;
  }

  let score = 0;

  if (input.emailVerified) {
    score += 18;
  }

  score += Math.min(input.accountAgeDays / 90, 1) * 12;
  score += Math.min(input.completedExchanges, 12) * 3.5;
  score += Math.min(input.successfulReturns, 8) * 2.5;

  if (input.reviewCount > 0 && input.averageRating !== null) {
    score += (Math.min(input.averageRating, 5) / 5) * 25;
  }

  score -= Math.min(input.cancellationCount, 8) * 4;

  return clamp(Math.round(score), 0, 100);
}

export function getTrustLevel({
  score,
  completedExchanges,
  successfulReturns,
  reviewCount,
}: Pick<
  TrustSummary,
  "score" | "completedExchanges" | "successfulReturns" | "reviewCount"
>): TrustLevel {
  if (
    score === null ||
    (completedExchanges === 0 && successfulReturns === 0 && reviewCount === 0)
  ) {
    return "New member";
  }

  if (score < 60) {
    return "Developing";
  }

  if (score < 85) {
    return "Trusted";
  }

  return "Highly trusted";
}

export async function getUserTrustSummary(
  userId: string | null | undefined,
): Promise<TrustSummary | null> {
  if (!userId) {
    return null;
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, created_at, email_verified_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    const { data: exchangeRows } = await supabase
      .from("exchanges")
      .select("owner_id, borrower_id, status, return_confirmed_at")
      .order("created_at", { ascending: false });

    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("reviewee_id, rating")
      .order("created_at", { ascending: false });

    const completedExchanges =
      exchangeRows?.filter(
        (row) =>
          (row.owner_id === userId || row.borrower_id === userId) &&
          row.status === "COMPLETED",
      ).length ?? 0;

    const successfulReturns =
      exchangeRows?.filter(
        (row) =>
          (row.owner_id === userId || row.borrower_id === userId) &&
          row.return_confirmed_at !== null &&
          row.status === "COMPLETED",
      ).length ?? 0;

    const cancellationCount =
      exchangeRows?.filter(
        (row) =>
          (row.owner_id === userId || row.borrower_id === userId) &&
          row.status === "CANCELLED",
      ).length ?? 0;

    const reviewItems =
      reviewRows?.filter((row) => row.reviewee_id === userId) ?? [];
    const reviewCount = reviewItems.length;
    const averageRating = reviewCount
      ? reviewItems.reduce((total, row) => total + Number(row.rating), 0) /
        reviewCount
      : null;

    const createdAt = profile.created_at ? new Date(profile.created_at) : null;
    const accountAgeDays = createdAt
      ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000))
      : 0;
    const emailVerified = Boolean(profile.email_verified_at);
    const score = calculateTrustScore({
      emailVerified,
      accountAgeDays,
      completedExchanges,
      successfulReturns,
      reviewCount,
      averageRating,
      cancellationCount,
    });

    return {
      userId,
      score,
      level: getTrustLevel({
        score,
        completedExchanges,
        successfulReturns,
        reviewCount,
      }),
      completedExchanges,
      successfulReturns,
      reviewCount,
      averageRating,
      cancellationCount,
      emailVerified,
      memberSince: profile.created_at ?? null,
    };
  } catch {
    return null;
  }
}

export async function getPublicTrustProfiles(
  userIds: string[],
): Promise<Record<string, TrustSummary>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) {
    return {};
  }

  try {
    const [profileResult, reviewResult, exchangeResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, created_at, email_verified_at")
        .in("id", ids),
      supabase.from("reviews").select("reviewee_id, rating"),
      supabase
        .from("exchanges")
        .select("owner_id, borrower_id, status, return_confirmed_at"),
    ]);

    const profiles = profileResult.data ?? [];
    const reviews = reviewResult.data ?? [];
    const exchanges = exchangeResult.data ?? [];

    return profiles.reduce<Record<string, TrustSummary>>(
      (accumulator, profile) => {
        const userId = String(profile.id);
        const reviewItems = reviews.filter((row) => row.reviewee_id === userId);
        const completedExchanges =
          exchanges.filter(
            (row) =>
              (row.owner_id === userId || row.borrower_id === userId) &&
              row.status === "COMPLETED",
          ).length ?? 0;
        const successfulReturns =
          exchanges.filter(
            (row) =>
              (row.owner_id === userId || row.borrower_id === userId) &&
              row.return_confirmed_at !== null &&
              row.status === "COMPLETED",
          ).length ?? 0;
        const cancellationCount =
          exchanges.filter(
            (row) =>
              (row.owner_id === userId || row.borrower_id === userId) &&
              row.status === "CANCELLED",
          ).length ?? 0;
        const reviewCount = reviewItems.length;
        const averageRating = reviewCount
          ? reviewItems.reduce((total, row) => total + Number(row.rating), 0) /
            reviewCount
          : null;
        const createdAt = profile.created_at
          ? new Date(profile.created_at)
          : null;
        const accountAgeDays = createdAt
          ? Math.max(
              0,
              Math.floor((Date.now() - createdAt.getTime()) / 86400000),
            )
          : 0;
        const emailVerified = Boolean(profile.email_verified_at);
        const score = calculateTrustScore({
          emailVerified,
          accountAgeDays,
          completedExchanges,
          successfulReturns,
          reviewCount,
          averageRating,
          cancellationCount,
        });

        accumulator[userId] = {
          userId,
          score,
          level: getTrustLevel({
            score,
            completedExchanges,
            successfulReturns,
            reviewCount,
          }),
          completedExchanges,
          successfulReturns,
          reviewCount,
          averageRating,
          cancellationCount,
          emailVerified,
          memberSince: profile.created_at ?? null,
        };

        return accumulator;
      },
      {},
    );
  } catch {
    return {};
  }
}
