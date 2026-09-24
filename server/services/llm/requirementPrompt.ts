export const requirementExtractionPrompt = `You extract structured requirements from a user's natural-language access request.

Return ONLY valid JSON with exactly these fields:
{
  "item": string | null,
  "purpose": string | null,
  "duration": string | null,
  "frequency": string | null,
  "date": string | null,
  "location": string | null,
  "urgency": "low" | "medium" | "high" | null,
  "budget": string | null,
  "requiredCapabilities": string[]
}

Extract only what the user said or what is a reasonable capability implied by the requested use. Use null when information is missing and an empty array when no capabilities can be inferred.
Do not recommend borrowing, renting, buying used, or buying new. Do not calculate scores. Do not invent availability, prices, distances, trust, savings, or listings.`;