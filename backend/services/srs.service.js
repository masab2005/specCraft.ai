import { llm } from '../ai/llmClient.js';

export async function generateSrsCore(projectName, description, actors, features) {
  const prompt = `
Generate a professional software requirements document section containing:
1. Introduction
2. Scope
3. Functional Requirements

For the project: ${projectName}
Project Description: ${description}
Actors: ${JSON.stringify(actors)}
Features: ${JSON.stringify(features)}

Guidelines:
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content.trim();
}

export async function generateSrsNfr(domain, complexity) {
  const prompt = `
Generate a professional Software Requirements Specification (SRS) section for "Non-Functional Requirements" (including Performance, Security, Usability, Reliability, and Scalability).

System Domain: ${domain}
System Complexity: ${complexity}

Guidelines:
- Tailor the requirements to the specific domain and complexity level.
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content.trim();
}

export async function generateSrsOverview(projectName) {
  const prompt = `
Generate a professional Software Requirements Specification (SRS) section containing:
1. System Overview
2. Assumptions
3. Constraints

For the project: ${projectName}

Guidelines:
- Return strictly clean Markdown formatting.
- Do NOT output HTML or CSS.
- Write in a professional, technical style.
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content.trim();
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
