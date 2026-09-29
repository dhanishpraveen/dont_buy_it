export type SupabaseRequestUser = {
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
    emailVerified: boolean;
    phoneVerified?: boolean;
};
