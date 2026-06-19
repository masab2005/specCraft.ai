import { DEFAULT_MODEL, createChatCompletionWithRetry } from '../ai/llmClient.js';

// Helper to strip reasoning/thought process blocks from the output
function cleanThoughtProcess(text) {
  if (!text) return '';
  let clean = text.trim();
  // Remove <thought>...</thought> blocks
  clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  // Remove any unclosed or dangling <thought> block
  clean = clean.replace(/<thought>[\s\S]*/gi, '');
  return clean.trim();
}

export async function generateSrsCore(projectName, description, actors, features) {
  const prompt = `
Generate a highly concise software requirements document section containing:
1. Introduction (max 2-3 sentences)
2. Scope (max 2-3 sentences)
3. Functional Requirements (brief bulleted list of 1-sentence requirements)

For the project: ${projectName}
Project Description: ${description}
Actors: ${JSON.stringify(actors)}
Features: ${JSON.stringify(features)}

Guidelines:
- Keep the total output brief and under 150 words.
- Use simple, direct bullet points instead of long paragraphs.
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanThoughtProcess(response.choices[0].message.content);
}

export async function generateSrsNfr(domain, complexity) {
  const prompt = `
Generate a highly concise "Non-Functional Requirements" section (covering Performance, Security, Usability, Reliability, and Scalability).

System Domain: ${domain}
System Complexity: ${complexity}

Guidelines:
- Provide exactly 1-2 bullet points per category.
- Keep descriptions to 1-2 sentences maximum.
- Keep the total output brief and under 150 words.
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanThoughtProcess(response.choices[0].message.content);
}

export async function generateSrsOverview(projectName) {
  const prompt = `
Generate a highly concise software requirements section containing:
1. System Overview (max 3 sentences)
2. Assumptions (max 3 bullet points)
3. Constraints (max 3 bullet points)

For the project: ${projectName}

Guidelines:
- Keep the total output brief and under 150 words.
- Use simple, direct bullet points instead of long paragraphs.
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanThoughtProcess(response.choices[0].message.content);
}

export function assembleSrs(projectName, core, nfr, overview) {
  return `# Software Requirements Specification (SRS)
## Project: ${projectName}

${overview}

---

${core}

---

${nfr}
`;
}
