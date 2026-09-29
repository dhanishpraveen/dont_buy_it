import { getSupabaseUserClient } from '../config/supabase.js';
import type { SupabaseRequestUser } from '../types/auth.js';

type SupabaseProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    location_area: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    created_at: string;
    updated_at: string;
};

export async function resolveSupabaseUser(accessToken: string): Promise<SupabaseRequestUser | null> {
    const client = getSupabaseUserClient(accessToken);
    const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !user) return null;

    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id,full_name,email,phone,avatar_url,location_area,email_verified_at,phone_verified_at,created_at,updated_at')
        .eq('id', user.id)
        .maybeSingle();
    if (profileError) throw new Error('Unable to load the authenticated profile.');

    const savedProfile = profile as SupabaseProfile | null;
    const emailVerified = Boolean(user.email_confirmed_at);
    const metadata = user.user_metadata ?? {};
    const now = new Date().toISOString();

    return {
        id: user.id,
        name: savedProfile?.full_name || (typeof metadata.full_name === 'string' ? metadata.full_name : 'User'),
        email: savedProfile?.email || user.email || '',
        phone: savedProfile?.phone || user.phone || (typeof metadata.phone === 'string' ? metadata.phone : undefined),
        profileImage: savedProfile?.avatar_url ?? undefined,
        location: savedProfile?.location_area ?? undefined,
        approximateLocation: savedProfile?.location_area ?? undefined,
        verificationStatus: emailVerified ? 'verified' : 'pending',
        trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 },
        createdAt: savedProfile?.created_at ?? user.created_at ?? now,
        updatedAt: savedProfile?.updated_at ?? now,
        emailVerified,
    };
}
