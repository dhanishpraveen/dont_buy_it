export type RequirementUrgency = 'low' | 'medium' | 'high' | null;

export type UserRequirement = {
    item: string | null;
    purpose: string | null;
    duration: string | null;
    frequency: string | null;
    date: string | null;
    location: string | null;
    urgency: RequirementUrgency;
    budget: number | null;
    requiredCapabilities: string[];
};