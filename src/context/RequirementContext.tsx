import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserRequirement } from '../../shared/types/requirements';

type RequirementContextValue = {
    requirement: UserRequirement | null;
    setRequirement: (requirement: UserRequirement) => void;
    clearRequirement: () => void;
};

const RequirementContext = createContext<RequirementContextValue | undefined>(undefined);

export function RequirementProvider({ children }: { children: ReactNode }) {
    const [requirement, setRequirement] = useState<UserRequirement | null>(null);
    const value = useMemo(() => ({ requirement, setRequirement, clearRequirement: () => setRequirement(null) }), [requirement]);
    return <RequirementContext.Provider value={value}>{children}</RequirementContext.Provider>;
}

export function useRequirement() {
    const context = useContext(RequirementContext);
    if (!context) throw new Error('useRequirement must be used inside RequirementProvider');
    return context;
}