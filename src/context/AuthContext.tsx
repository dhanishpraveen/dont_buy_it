import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<AuthUser>;
    logout: () => Promise<void>;
    updateProfile: (input: Partial<Pick<AuthUser, 'name' | 'phone' | 'profileImage' | 'location' | 'approximateLocation'>>) => Promise<AuthUser>;
};

type ApiResponse = { success: true; data: AuthUser } | { success: false; error?: string };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function request(path: string, options: RequestInit = {}): Promise<AuthUser> {
    const response = await fetch(`/api/auth${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
    const payload = await response.json() as ApiResponse;
    if (!response.ok || !payload.success) throw new Error(payload.success ? 'Authentication request failed.' : payload.error ?? 'Authentication request failed.');
    return payload.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request('/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        loading,
        login: async (email, password) => { const nextUser = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(nextUser); return nextUser; },
        register: async (input) => { const nextUser = await request('/register', { method: 'POST', body: JSON.stringify(input) }); setUser(nextUser); return nextUser; },
        logout: async () => { await request('/logout', { method: 'POST' }).catch(() => undefined); setUser(null); },
        updateProfile: async (input) => { const nextUser = await request('/me', { method: 'PATCH', body: JSON.stringify(input) }); setUser(nextUser); return nextUser; },
    }), [loading, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
