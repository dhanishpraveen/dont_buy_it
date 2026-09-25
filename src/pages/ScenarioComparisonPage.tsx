import { ArrowRight, BarChart3, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PRESET_SCENARIOS, compareScenarios, createScenario, runScenario } from '../services/scenarioService';
import type { Scenario, ScenarioComparisonResult } from '../../shared/types/scenario';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function money(value: number | null | undefined) {
    if (value === null || value === undefined) return 'Not available';
    return currency.format(value);
}

export function ScenarioComparisonPage() {
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState<string[]>(['one-time-presentation', 'three-day-event']);
    const [customInput, setCustomInput] = useState('');
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [comparison, setComparison] = useState<ScenarioComparisonResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedPresets = useMemo(() => PRESET_SCENARIOS.filter((preset) => selectedIds.includes(preset.id)), [selectedIds]);

    const toggleScenario = (id: string) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const runSelectedComparison = async () => {
        if (!selectedPresets.length) {
            setError('Select at least two scenarios to compare.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const results = await Promise.all(selectedPresets.map((preset) => runScenario(createScenario(preset))));
            const nextComparison = await compareScenarios(results);
            setScenarios(results);
            setComparison(nextComparison);
        } catch {
            setError('Unable to analyze these scenarios right now.');
        } finally {
            setLoading(false);
        }
    };

    const handleCustomScenario = async () => {
        const input = customInput.trim();
        if (!input) {
            setError('Add a custom scenario to compare.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const customScenario = createScenario({
                id: `custom-${Date.now()}`,
                name: 'Custom Scenario',
                description: 'User-defined comparison',
                inputText: input,
            });
            const result = await runScenario(customScenario);
            const nextScenarios = [...scenarios, result];
            setScenarios(nextScenarios);
            setComparison(await compareScenarios(nextScenarios));
            setCustomInput('');
        } catch {
            setError('Unable to analyze this custom scenario.');
        } finally {
            setLoading(false);
        }
    };

    return <div className="mx-auto max-w-6xl">
        <section className="rounded-card bg-sage-soft px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sage"><Sparkles size={21} /></span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">What if your need changes?</p>
                        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">WHAT IF YOUR NEED CHANGES?</h1>
                        <p className="mt-3 text-base leading-7 text-muted">See how the best way to access something changes when your situation changes.</p>
                    </div>
                </div>
                <Button onClick={() => navigate('/ai-assistant')} variant="secondary">Back to AI Assistant</Button>
            </div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PRESET_SCENARIOS.map((preset) => {
                const active = selectedIds.includes(preset.id);
                return <button key={preset.id} type="button" onClick={() => toggleScenario(preset.id)} className={`rounded-card border p-5 text-left transition-colors ${active ? 'border-sage bg-sage-soft shadow' : 'border-line bg-surface hover:border-sage'}`}>
                    <div className="flex items-center justify-between gap-3"><Badge tone={active ? 'sage' : 'brown'}>{preset.name}</Badge>{active ? <span className="text-xs font-semibold text-sage">Selected</span> : null}</div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">{preset.description}</p>
                    <p className="mt-3 text-sm leading-6 text-muted">{preset.inputText}</p>
                </button>;
            })}
        </div>

        <div className="mt-8 rounded-card border border-line bg-surface p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <label className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Custom scenario</span>
                    <textarea value={customInput} onChange={(event) => setCustomInput(event.target.value)} placeholder="I need a projector every weekend for the next six months." className="mt-2 min-h-28 w-full resize-y rounded-card border border-line bg-canvas p-3 text-sm leading-6 text-ink outline-none focus:border-sage" />
                </label>
                <div className="flex gap-3">
                    <Button onClick={runSelectedComparison} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze selected scenarios'}<ArrowRight size={16} /></Button>
                    <Button onClick={handleCustomScenario} disabled={loading}>Analyze custom scenario</Button>
                </div>
            </div>
            {error ? <p className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
            {loading ? <div className="mt-4 flex items-center gap-3 rounded-card border border-line bg-canvas px-4 py-3 text-sm text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-sage" />Analyzing your scenarios...</div> : null}
        </div>

        {comparison ? <div className="mt-10">
            <div className="mb-6 flex items-center gap-2 text-sage"><BarChart3 size={18} /><p className="text-xs font-bold uppercase tracking-[0.18em]">How the decision changes</p></div>
            <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-canvas text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-4 py-3">Scenario</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Recommended</th><th className="px-4 py-3">Access score</th><th className="px-4 py-3">Estimated cost</th></tr></thead>
                    <tbody>{comparison.scenarios.filter((scenario) => scenario.status === 'completed').map((scenario) => <tr key={scenario.id} className="border-t border-line"><td className="px-4 py-4 font-semibold text-ink">{scenario.name}</td><td className="px-4 py-4 text-muted">{scenario.requirement?.frequency ?? 'Unknown'}</td><td className="px-4 py-4 text-ink">{scenario.recommendation ? scenario.recommendation.recommendationType.replace('-', ' ') : 'Unknown'}</td><td className="px-4 py-4 text-bark font-semibold">{scenario.recommendation ? `${Math.round(scenario.recommendation.accessScore)}/100` : 'N/A'}</td><td className="px-4 py-4 text-muted">{money(scenario.recommendation?.recommendedOption.totalCost ?? null)}</td></tr>)}</tbody>
                </table>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                    <h3 className="font-display text-2xl font-semibold text-ink">What changed?</h3>
                    {comparison.changedFactors.length ? <ul className="mt-4 grid gap-2 text-sm text-muted">{comparison.changedFactors.map((factor) => <li key={factor} className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-sage" />{factor}</li>)}</ul> : <p className="mt-4 text-sm text-muted">The scenarios were similar enough that the compared details did not meaningfully change.</p>}
                </Card>
                <Card className="p-5">
                    <h3 className="font-display text-2xl font-semibold text-ink">Why did the recommendation change?</h3>
                    <p className="mt-4 text-sm leading-6 text-muted">{comparison.explanationData.detail}</p>
                </Card>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {comparison.scenarios.filter((scenario) => scenario.status === 'completed').map((scenario) => <Card key={scenario.id} className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl font-semibold text-ink">{scenario.name}</h3>{scenario.recommendation ? <Badge tone="sage">{scenario.recommendation.recommendationType.replace('-', ' ')}</Badge> : null}</div><p className="mt-3 text-sm text-muted">{scenarioSummary(scenario)}</p><dl className="mt-4 grid gap-3 text-sm text-muted"><div><dt className="text-xs uppercase tracking-[0.14em] text-muted">Requirement</dt><dd className="mt-1 font-semibold text-ink">{scenario.requirement?.item ?? 'Unknown item'}</dd></div><div><dt className="text-xs uppercase tracking-[0.14em] text-muted">Access score</dt><dd className="mt-1 font-semibold text-bark">{scenario.recommendation ? `${Math.round(scenario.recommendation.accessScore)}/100` : 'N/A'}</dd></div><div><dt className="text-xs uppercase tracking-[0.14em] text-muted">Estimated cost</dt><dd className="mt-1 font-semibold text-ink">{money(scenario.recommendation?.recommendedOption.totalCost ?? null)}</dd></div><div><dt className="text-xs uppercase tracking-[0.14em] text-muted">Ownership cost per use</dt><dd className="mt-1 font-semibold text-ink">{money(scenario.ownershipAnalysis?.ownershipCostPerUse ?? null)}</dd></div></dl><div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Key reasons</p><ul className="mt-2 grid gap-2 text-sm text-muted">{scenario.recommendation?.reasonCodes.map((reason) => <li key={reason} className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-sage" />{reason.replace('_', ' ')}</li>) ?? <li>No reasons available.</li>}</ul></div></Card>)}
            </div>
        </div> : null}
    </div>;
}

function scenarioSummary(scenario: Scenario): string {
    if (!scenario.requirement) return 'Requirement unavailable.';
    const requirement = scenario.requirement;
    return `${requirement.item ?? 'Unknown'} • ${requirement.duration ?? 'Unspecified duration'} • ${requirement.frequency ?? 'Unspecified usage'}`;
}
