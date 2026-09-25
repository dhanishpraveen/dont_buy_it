import 'dotenv/config';
import express from 'express';
import { analyzeRequirement } from './services/llm/requirementAnalyzer.js';
import { getAccessOptions } from './services/resourceService.js';
import type { UserRequirement } from '../shared/types/requirements.js';
import type { ExplanationData } from '../shared/types/recommendation.js';
import { generateExplanation } from './services/llm/explanationGenerator.js';

const app = express();
const port = 3000;

if (process.env.PORT && Number(process.env.PORT) !== port) {
  throw new Error('The backend must run on PORT=3000.');
}

app.use(express.json());

app.post('/api/ai/analyze', async (request, response) => {
  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
  if (!text) {
    response.status(400).json({ success: false, error: 'Tell us what you need before analyzing.' });
    return;
  }
  if (text.length > 1000) {
    response.status(400).json({ success: false, error: 'Please keep your request under 1,000 characters.' });
    return;
  }

  try {
    const result = await analyzeRequirement(text);
    response.json({ success: true, data: result.requirement, source: result.source, fallbackReason: result.fallbackReason });
  } catch {
    response.status(500).json({ success: false, error: 'We could not understand that request. Please try again.' });
  }
});

app.post('/api/resources/match', (request, response) => {
  const requirement = request.body?.requirement as UserRequirement | undefined;
  if (!requirement || typeof requirement !== 'object') {
    response.status(400).json({ success: false, error: 'A structured requirement is required.' });
    return;
  }
  try {
    response.json({ success: true, data: getAccessOptions(requirement) });
  } catch {
    response.status(500).json({ success: false, error: 'We could not retrieve matching access options.' });
  }
});

app.post('/api/ai/explain', async (request, response) => {
  const data = request.body?.data as ExplanationData | undefined;
  if (!data || typeof data !== 'object') {
    response.status(400).json({ success: false, error: 'Deterministic explanation data is required.' });
    return;
  }
  try {
    response.json({ success: true, data: await generateExplanation(data) });
  } catch {
    response.status(500).json({ success: false, error: 'We could not generate an explanation.' });
  }
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: "don't-buy-it-api" });
});

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 500;
  response.status(status).json({ success: false, error: 'The API could not process that request.' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

export { app };