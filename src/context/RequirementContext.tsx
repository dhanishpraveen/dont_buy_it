import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DecisionResult } from '../../shared/types/recommendation';
import type { UserRequirement } from '../../shared/types/requirements';

type RequirementContextValue = {
    requirement: UserRequirement | null;
    decisionResult: DecisionResult | null;
    setRequirement: (requirement: UserRequirement) => void;
    setDecisionResult: (decisionResult: DecisionResult | null) => void;
    clearRequirement: () => void;
};

const RequirementContext = createContext<RequirementContextValue | undefined>(undefined);

export function RequirementProvider({ children }: { children: ReactNode }) {
    const [requirement, setRequirement] = useState<UserRequirement | null>(null);
    const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
    const value = useMemo(() => ({
        requirement,
        decisionResult,
        setRequirement,
        setDecisionResult,
        clearRequirement: () => {
            setRequirement(null);
            setDecisionResult(null);
        },
    }), [decisionResult, requirement]);
    return <RequirementContext.Provider value={value}>{children}</RequirementContext.Provider>;
}

export function useRequirement() {
    const context = useContext(RequirementContext);
    if (!context) throw new Error('useRequirement must be used inside RequirementProvider');
    return context;
}