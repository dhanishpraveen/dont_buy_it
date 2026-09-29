import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { clearPrivateCache } from '../lib/localStorageCache';
import { getUserTrustSummary, type TrustLevel } from '../services/trustService';

type ProfileRow = {
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

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    location?: string;
    approximateLocation?: string;
    emailVerified: boolean;
    verificationStatus: 'unverified' | 'pending' | 'verified';
    trustSummary: {
        score: number | null;
        level: TrustLevel;
        completedExchanges: number;
        successfulReturns: number;
        reviewCount: number;
        averageRating: number | null;
    };
    createdAt: string;
    updatedAt: string;
};

type EditableProfile = Partial<Pick<AuthUser, 'name' | 'profileImage' | 'location' | 'approximateLocation'>>;
type VerificationStatus = 'EMAIL_UNVERIFIED' | 'EMAIL_VERIFIED';

type AuthContextValue = {
    user: AuthUser | null;
    session: Session | null;
    loading: boolean;
    authError: string | null;
    isAuthenticated: boolean;
    isEmailVerified: boolean;
    verificationStatus: VerificationStatus;
    signIn: (email: string, password: string) => Promise<AuthUser>;
    signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
    refreshSession: () => Promise<void>;
    verifyEmail: () => Promise<void>;
    resendEmailVerification: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    sendPasswordRecovery: (email: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
    updateProfile: (input: EditableProfile) => Promise<AuthUser>;
};

const profileColumns = 'id,full_name,email,phone,avatar_url,location_area,email_verified_at,phone_verified_at,created_at,updated_at';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function friendlyAuthError(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes('user already registered') || normalized.includes('already been registered')) return 'An account with this email already exists.';
    if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('short') || normalized.includes('at least'))) return 'Choose a stronger password with at least 8 characters.';
    if (normalized.includes('email not confirmed')) return 'Please verify your email before signing in.';
    if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) return 'Email or password is incorrect.';
    if (normalized.includes('rate limit') || normalized.includes('too many requests')) return 'Too many attempts. Please wait a little and try again.';
    if (normalized.includes('fetch') || normalized.includes('network')) return 'Unable to connect right now. Please try again.';
    return 'Something went wrong. Please try again.';
}

function requireSupabaseConfig(): void {
    if (!hasSupabaseConfig) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
}

export function mapSupabaseProfile(
    profile: ProfileRow,
    authUser: User,
    trustSummary?: Awaited<ReturnType<typeof getUserTrustSummary>>,
): AuthUser {
    const emailVerified = Boolean(authUser.email_confirmed_at || profile.email_verified_at);
    const resolvedTrust = trustSummary ?? {
        userId: profile.id,
        score: null,
        level: 'New member',
        completedExchanges: 0,
        successfulReturns: 0,
        reviewCount: 0,
        averageRating: null,
        emailVerified,
        memberSince: profile.created_at ?? null,
        cancellationCount: 0,
    };

    return {
        id: profile.id,
        name: profile.full_name || 'User',
        email: profile.email || authUser.email || '',
        phone: profile.phone || authUser.phone || undefined,
        profileImage: profile.avatar_url || undefined,
        location: profile.location_area || undefined,
        approximateLocation: profile.location_area || undefined,
        emailVerified,
        verificationStatus: emailVerified ? 'verified' : 'pending',
        trustSummary: {
            score: resolvedTrust.score,
            level: resolvedTrust.level,
            completedExchanges: resolvedTrust.completedExchanges,
            successfulReturns: resolvedTrust.successfulReturns,
            reviewCount: resolvedTrust.reviewCount,
            averageRating: resolvedTrust.averageRating,
        },
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
    };
}

async function loadProfile(authUser: User): Promise<AuthUser> {
    const { data, error } = await supabase.from('profiles').select(profileColumns).eq('id', authUser.id).maybeSingle();
    if (error) throw new Error('Unable to load your profile. Please try again.');
    if (!data) throw new Error('Your profile is still being prepared. Please try again shortly.');
    const trustSummary = await getUserTrustSummary(authUser.id);
    return mapSupabaseProfile(data as ProfileRow, authUser, trustSummary);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const hydrateSession = useCallback(async (nextSession: Session | null) => {
        setSession(nextSession);
        if (!nextSession) {
            setUser(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            setUser(await loadProfile(nextSession.user));
            setAuthError(null);
        } catch (error) {
            setUser(null);
            setAuthError(error instanceof Error ? error.message : 'Unable to load your profile.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!hasSupabaseConfig) {
            setAuthError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
            setLoading(false);
            return;
        }

        let mounted = true;
        let revision = 0;
        const applySession = async (nextSession: Session | null) => {
            const currentRevision = ++revision;
            if (!mounted) return;
            await hydrateSession(nextSession);
            if (!mounted || currentRevision !== revision) return;
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            window.setTimeout(() => { void applySession(nextSession); }, 0);
        });
        void supabase.auth.getSession().then(({ data, error }) => {
            if (error) throw error;
            return applySession(data.session);
        }).catch(() => {
            if (mounted) {
                setUser(null);
                setSession(null);
                setAuthError('Unable to restore your session. Please sign in again.');
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [hydrateSession]);

    const isEmailVerified = Boolean(user?.emailVerified);
    const verificationStatus: VerificationStatus = isEmailVerified ? 'EMAIL_VERIFIED' : 'EMAIL_UNVERIFIED';

    const value = useMemo<AuthContextValue>(() => ({
        user,
        session,
        loading,
        authError,
        isAuthenticated: Boolean(session && user && isEmailVerified),
        isEmailVerified,
        verificationStatus,
        signIn: async (email, password) => {
            requireSupabaseConfig();
            const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (error) throw new Error(friendlyAuthError(error.message));
            if (!data.session || !data.user) throw new Error('Unable to create your session. Please try again.');
            const profile = await loadProfile(data.user);
            setSession(data.session);
            setUser(profile);
            setAuthError(null);
            return profile;
        },
        signUp: async ({ name, email, password }) => {
            requireSupabaseConfig();
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { emailRedirectTo: `${window.location.origin}/verify-otp`, data: { full_name: name.trim() } },
            });
            if (error) throw new Error(friendlyAuthError(error.message));
            if (!data.user) throw new Error('Unable to create your account. Please try again.');
            setAuthError(null);
            if (data.session) await hydrateSession(data.session);
        },
        refreshSession: async () => {
            requireSupabaseConfig();
            const { data, error } = await supabase.auth.getSession();
            if (error) throw new Error(friendlyAuthError(error.message));
            await hydrateSession(data.session);
        },
        verifyEmail: async () => {
            requireSupabaseConfig();
            const { data, error } = await supabase.auth.getSession();
            if (error) throw new Error(friendlyAuthError(error.message));
            if (!data.session) throw new Error('Open the verification link from your email, then return here.');
            await hydrateSession(data.session);
        },
        resendEmailVerification: async (email) => {
            requireSupabaseConfig();
            const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/verify-otp` } });
            if (error) throw new Error(friendlyAuthError(error.message));
        },
        signOut: async () => {
            requireSupabaseConfig();
            const { error } = await supabase.auth.signOut();
            if (error) throw new Error(friendlyAuthError(error.message));
            setSession(null);
            setUser(null);
            setAuthError(null);
            clearPrivateCache();
        },
        sendPasswordRecovery: async (email) => {
            requireSupabaseConfig();
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
            if (error) throw new Error(friendlyAuthError(error.message));
        },
        updatePassword: async (password) => {
            requireSupabaseConfig();
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw new Error(friendlyAuthError(error.message));
        },
        updateProfile: async (input) => {
            requireSupabaseConfig();
            if (!user) throw new Error('Sign in to update your profile.');
            const updates = {
                ...(input.name !== undefined ? { full_name: input.name.trim() } : {}),
                ...(input.profileImage !== undefined ? { avatar_url: input.profileImage.trim() } : {}),
                ...(input.location !== undefined || input.approximateLocation !== undefined ? { location_area: (input.approximateLocation ?? input.location)?.trim() ?? null } : {}),
            };
            const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select(profileColumns).single();
            if (error) throw new Error(friendlyAuthError(error.message));
            const updatedTrust = await getUserTrustSummary(user.id);
            const updated = mapSupabaseProfile(data as ProfileRow, session!.user, updatedTrust);
            setUser(updated);
            return updated;
        },
    }), [authError, hydrateSession, isEmailVerified, loading, session, user, verificationStatus]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
