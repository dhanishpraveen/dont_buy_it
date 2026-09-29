import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    location?: string;
    approximateLocation?: string;
    verificationStatus: 'unverified' | 'pending' | 'verified';
    trustSummary: { score: number; completedExchanges: number; reviewCount: number };
    createdAt: string;
    updatedAt: string;
};

type AuthContextValue = {
    user: AuthUser | null;
    session: unknown | null;
    loading: boolean;
    verificationStatus: 'EMAIL_UNVERIFIED' | 'PHONE_UNVERIFIED' | 'PARTIALLY_VERIFIED' | 'FULLY_VERIFIED';
    login: (email: string, password: string) => Promise<AuthUser>;
    register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<AuthUser>;
    verifyOtp: (phone: string, token: string) => Promise<void>;
    resendOtp: (phone: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (input: Partial<Pick<AuthUser, 'name' | 'phone' | 'profileImage' | 'location' | 'approximateLocation'>>) => Promise<AuthUser>;
};

type ApiResponse = { success: true; data: AuthUser } | { success: false; error?: string };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(value: Partial<AuthUser> & { id?: string; email?: string; name?: string }): AuthUser | null {
    if (!value || !value.id || !value.email) return null;
    return {
        id: String(value.id),
        name: String(value.name ?? 'User'),
        email: String(value.email),
        phone: typeof value.phone === 'string' ? value.phone : undefined,
        profileImage: typeof value.profileImage === 'string' ? value.profileImage : undefined,
        location: typeof value.location === 'string' ? value.location : undefined,
        approximateLocation: typeof value.approximateLocation === 'string' ? value.approximateLocation : undefined,
        verificationStatus: value.verificationStatus === 'pending' || value.verificationStatus === 'verified' ? value.verificationStatus : 'unverified',
        trustSummary: {
            score: typeof value.trustSummary?.score === 'number' ? value.trustSummary.score : 0,
            completedExchanges: typeof value.trustSummary?.completedExchanges === 'number' ? value.trustSummary.completedExchanges : 0,
            reviewCount: typeof value.trustSummary?.reviewCount === 'number' ? value.trustSummary.reviewCount : 0,
        },
        createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    };
}

function mapSupabaseUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
    if (!user || !user.email) return null;
    const metadata = user.user_metadata ?? {};
    return toAuthUser({
        id: user.id,
        name: typeof metadata.full_name === 'string' ? metadata.full_name : typeof metadata.name === 'string' ? metadata.name : 'User',
        email: user.email,
        phone: typeof metadata.phone === 'string' ? metadata.phone : undefined,
        location: typeof metadata.location === 'string' ? metadata.location : undefined,
        approximateLocation: typeof metadata.approximate_location === 'string' ? metadata.approximate_location : undefined,
        verificationStatus: 'verified',
        trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
}

async function request(path: string, options: RequestInit = {}): Promise<AuthUser> {
    const response = await fetch(`/api/auth${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
    const payload = await response.json() as ApiResponse;
    if (!response.ok || !payload.success) throw new Error(payload.success ? 'Authentication request failed.' : payload.error ?? 'Authentication request failed.');
    return payload.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<unknown | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const resolveSession = async () => {
            if (hasSupabaseConfig) {
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();
                if (!isMounted) return;
                if (error) {
                    setUser(null);
                    setSession(null);
                    setLoading(false);
                    return;
                }
                setSession(currentSession);
                setUser(mapSupabaseUser(currentSession?.user ?? null));
                setLoading(false);
                return;
            }

            try {
                const nextUser = await request('/me');
                if (isMounted) {
                    setUser(nextUser);
                    setSession({ mode: 'mock' });
                }
            } catch {
                if (isMounted) {
                    setUser(null);
                    setSession(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void resolveSession();

        if (hasSupabaseConfig) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
                if (!isMounted) return;
                setSession(currentSession);
                setUser(mapSupabaseUser(currentSession?.user ?? null));
                setLoading(false);
            });

            return () => {
                isMounted = false;
                subscription.unsubscribe();
            };
        }

        return () => {
            isMounted = false;
        };
    }, []);

    const verificationStatus: AuthContextValue['verificationStatus'] = user?.verificationStatus === 'verified' ? 'FULLY_VERIFIED' : user ? 'PARTIALLY_VERIFIED' : 'EMAIL_UNVERIFIED';

    const value = useMemo<AuthContextValue>(() => ({
        user,
        session,
        loading,
        verificationStatus,
        login: async (email, password) => {
            if (hasSupabaseConfig) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw new Error(error.message.includes('Email not confirmed') ? 'Please verify your email before signing in.' : 'Invalid email or password.');
                const nextUser = mapSupabaseUser(data.user);
                if (!nextUser) throw new Error('Unable to load your account.');
                setUser(nextUser);
                setSession(data.session ?? null);
                return nextUser;
            }
            const nextUser = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            setUser(nextUser); setSession({ mode: 'mock' }); return nextUser;
        },
        register: async (input) => {
            if (hasSupabaseConfig) {
                const { data, error } = await supabase.auth.signUp({
                    email: input.email,
                    password: input.password,
                    options: {
                        data: {
                            full_name: input.name,
                            phone: input.phone ?? '',
                        },
                    },
                });
                if (error) throw new Error(error.message || 'Unable to create your account. Please try again.');
                const nextUser = mapSupabaseUser(data.user);
                if (!nextUser) throw new Error('Please check your verification email and complete the sign-in flow.');
                setUser(nextUser);
                setSession(data.session ?? null);
                return nextUser;
            }
            const nextUser = await request('/register', { method: 'POST', body: JSON.stringify(input) });
            setUser(nextUser); setSession({ mode: 'mock' }); return nextUser;
        },
        verifyOtp: async (phone, token) => {
            if (hasSupabaseConfig) {
                const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
                if (error) throw new Error(error.message || 'The verification code is incorrect or expired.');
                return;
            }
            if (!token || token.length < 6) throw new Error('The verification code is incorrect or expired.');
        },
        resendOtp: async (phone) => {
            if (hasSupabaseConfig) {
                const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
                if (error) throw new Error(error.message || 'We could not resend the code.');
                return;
            }
            if (!phone) throw new Error('A phone number is required to resend the code.');
        },
        logout: async () => {
            if (hasSupabaseConfig) {
                const { error } = await supabase.auth.signOut();
                if (error) throw new Error(error.message || 'Unable to sign out right now.');
            } else {
                await request('/logout', { method: 'POST' }).catch(() => undefined);
            }
            setUser(null); setSession(null);
        },
        updateProfile: async (input) => {
            if (hasSupabaseConfig) {
                const updates = {
                    name: input.name,
                    phone: input.phone,
                    location: input.location,
                    approximate_location: input.approximateLocation,
                };
                const { error: userError } = await supabase.auth.updateUser({ data: updates });
                if (userError) throw new Error(userError.message || 'We could not update your profile.');
                const localUser = user ? { ...user, ...input, updatedAt: new Date().toISOString() } : null;
                if (localUser) setUser(localUser);
                return localUser ?? user ?? toAuthUser({ id: 'supabase-user', name: 'User', email: '', verificationStatus: 'verified', trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })!;
            }
            const nextUser = await request('/me', { method: 'PATCH', body: JSON.stringify(input) });
            setUser(nextUser); return nextUser;
        },
    }), [loading, session, user, verificationStatus]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
