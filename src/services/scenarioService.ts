import type { AccessMethod } from '../../shared/types/accessOptions';
import type { OwnershipAnalysis, RecommendationResult } from '../../shared/types/recommendation';
import type { UserRequirement } from '../../shared/types/requirements';
import type { Scenario, ScenarioComparisonResult, ScenarioStatus } from '../../shared/types/scenario';
import type { ScoredAccessOption } from '../../shared/types/scoring';
import { analyzeUserNeed } from './llmService';
import { getAccessOptions } from './resourceService';
import { rankAccessOptions } from './scoringEngine';
import { analyzeOwnership } from './ownershipAnalyzer';
import { generateRecommendation } from './recommendationEngine';

export const PRESET_SCENARIOS = [
    {
        id: 'one-time-presentation',
        name: 'One-Time Presentation',
        description: 'Use: Once',
        inputText: "I need a projector tomorrow for 5 hours for my college presentation. I probably won't use it again.",
    },
    {
        id: 'three-day-event',
        name: 'Three-Day College Event',
        description: 'Use: Three days',
        inputText: 'I need a projector for three days for a college event next week.',
    },
    {
        id: 'frequent-long-term',
        name: 'Frequent Long-Term Use',
        description: 'Use: Every week for a year',
        inputText: 'I need a projector every week for the next year for regular presentations.',
    },
] as const;

export function createScenario(definition: Pick<Scenario, 'id' | 'name' | 'description' | 'inputText'>): Scenario {
    return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        inputText: definition.inputText,
        status: 'idle',
    };
}

export async function runScenario(scenario: Scenario): Promise<Scenario> {
    if (!scenario.inputText?.trim()) {
        return { ...scenario, status: 'error', error: 'Add a scenario description to analyze it.' };
    }

    const processing: Scenario = { ...scenario, status: 'processing', error: undefined };

    try {
        const { requirement } = await analyzeUserNeed(scenario.inputText);
        if (!requirement.item) {
            return { ...processing, requirement, status: 'error', error: 'The requirement is incomplete. Please provide a clear item and context.' };
        }

        const options = await getAccessOptions(requirement);
        const scoredOptions = rankAccessOptions(options, requirement);
        const ownershipAnalysis = analyzeOwnership(requirement, scoredOptions);
        const recommendation = generateRecommendation(requirement, scoredOptions, ownershipAnalysis);

        return {
            ...processing,
            requirement,
            recommendation,
            scoredOptions,
            ownershipAnalysis,
            status: 'completed',
        };
    } catch (error) {
        return {
            ...processing,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to analyze this scenario.',
        };
    }
}

function scenarioSummary(scenario: Scenario): string {
    if (!scenario.requirement) return 'No requirement available.';
    const requirement = scenario.requirement;
    const parts = [requirement.item ?? 'Unknown item', requirement.duration ?? 'Unspecified duration', requirement.frequency ?? 'Unspecified usage'];
    return parts.join(' • ');
}

function requirementDifferenceLabel(name: string, previous: string | null, next: string | null): string | null {
    if (!previous || !next || previous === next) return null;
    return `${name} changed from ${previous} to ${next}.`;
}

function formatAccessMethod(method: AccessMethod | 'unknown' | undefined): string {
    if (!method || method === 'unknown') return 'Unknown';
    return method.replace('-', ' ');
}

export async function compareScenarios(scenarios: Scenario[]): Promise<ScenarioComparisonResult> {
    const processed = await Promise.all(scenarios.map((scenario) => runScenario(scenario)));
    const completed = processed.filter((scenario) => scenario.status === 'completed' && scenario.requirement && scenario.recommendation);

    if (!completed.length) {
        return {
            scenarios: processed,
            changedFactors: [],
            recommendationChanged: false,
            accessMethodChanges: [],
            scoreChanges: [],
            costChanges: [],
            ownershipChanges: [],
            explanationData: {
                summary: 'Add at least two scenarios to compare how the decision changes.',
                detail: 'Each scenario needs a valid requirement and a recommendation to be compared.',
            },
        };
    }

    const primary = completed[0];
    const changedFactors: string[] = [];

    for (const scenario of completed.slice(1)) {
        const previous = primary.requirement;
        const current = scenario.requirement;
        const fields: Array<[string, string | null, string | null]> = [
            ['Duration', previous?.duration ?? null, current?.duration ?? null],
            ['Usage frequency', previous?.frequency ?? null, current?.frequency ?? null],
            ['Date', previous?.date ?? null, current?.date ?? null],
            ['Budget', previous?.budget !== null && previous?.budget !== undefined ? `₹${previous.budget}` : null, current?.budget !== null && current?.budget !== undefined ? `₹${current.budget}` : null],
            ['Location', previous?.location ?? null, current?.location ?? null],
            ['Urgency', previous?.urgency ?? null, current?.urgency ?? null],
        ];

        for (const [label, before, after] of fields) {
            const labelText = requirementDifferenceLabel(label, before, after);
            if (labelText) changedFactors.push(labelText);
        }

        if ((previous?.requiredCapabilities ?? []).join(',') !== (current?.requiredCapabilities ?? []).join(',')) {
            changedFactors.push('Required capabilities changed.');
        }
    }

    const accessMethodChanges = [] as ScenarioComparisonResult['accessMethodChanges'];
    for (let index = 1; index < completed.length; index += 1) {
        const previous = completed[0];
        const current = completed[index];
        const from = previous.recommendation?.recommendationType ?? 'unknown';
        const to = current.recommendation?.recommendationType ?? 'unknown';
        if (from !== to) {
            accessMethodChanges.push({ scenarioA: previous.id, scenarioB: current.id, from: formatAccessMethod(from), to: formatAccessMethod(to) });
        }
    }

    const recommendationChanged = accessMethodChanges.length > 0 || completed.some((scenario, index) => index > 0 && completed[0].recommendation?.accessScore !== scenario.recommendation?.accessScore);

    const scoreChanges: ScenarioComparisonResult['scoreChanges'] = completed.map((scenario) => ({
        scenarioId: scenario.id,
        score: scenario.recommendation?.accessScore ?? null,
    }));

    const costChanges: ScenarioComparisonResult['costChanges'] = completed.map((scenario) => ({
        scenarioId: scenario.id,
        cost: scenario.recommendation?.recommendedOption.totalCost ?? null,
    }));

    const ownershipChanges: ScenarioComparisonResult['ownershipChanges'] = completed.map((scenario) => ({
        scenarioId: scenario.id,
        ownershipCostPerUse: scenario.ownershipAnalysis?.ownershipCostPerUse ?? null,
    }));

    const firstSummary = primary.recommendation ? `${formatAccessMethod(primary.recommendation.recommendationType)} at ${Math.round(primary.recommendation.accessScore)}/100` : 'No recommendation';
    const secondSummary = completed[1]?.recommendation ? `${formatAccessMethod(completed[1].recommendation.recommendationType)} at ${Math.round(completed[1].recommendation.accessScore)}/100` : 'No recommendation';

    const explanationData = recommendationChanged
        ? {
            summary: 'The recommendation changed when the context changed.',
            detail: `The first scenario led to ${firstSummary}. The next scenario led to ${secondSummary}. The comparison is based on requirement differences, score changes, and ownership economics, not on a hardcoded rule.`,
        }
        : {
            summary: 'The recommended access method remained the same.',
            detail: 'The available options and usage economics stayed similar enough that the recommendation did not materially change.',
        };

    return {
        scenarios: processed,
        changedFactors,
        recommendationChanged,
        accessMethodChanges,
        scoreChanges,
        costChanges,
        ownershipChanges,
        explanationData: {
            summary: explanationData.summary,
            detail: explanationData.detail,
        },
    };
}

export function createScenarioComparisonSummary(scenarios: Scenario[]): string {
    return scenarios.filter((scenario) => scenario.status === 'completed').map(scenarioSummary).join(' | ');
}
