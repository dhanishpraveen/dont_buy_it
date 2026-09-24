import 'dotenv/config';
import express from 'express';
import { analyzeRequirement } from './services/llm/requirementAnalyzer.js';
import { getAccessOptions } from './services/resourceService.js';
import type { UserRequirement } from '../shared/types/requirements.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

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
    response.json({ success: true, data: result.requirement, source: result.source });
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

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: "don't-buy-it-api" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

export { app };