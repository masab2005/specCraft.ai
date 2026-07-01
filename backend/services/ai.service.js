import { DEFAULT_MODEL, createChatCompletionWithRetry } from '../ai/llmClient.js';
import { z } from 'zod';

// Prompt Versions
const ATTRIBUTES_PROMPT_VERSION = "ATTRIBUTES_V1";
const RELATIONSHIPS_PROMPT_VERSION = "RELATIONSHIPS_V1";

// Zod Structural Schemas
const attributesSchema = z.record(z.string(), z.array(z.string()));
const relationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  label: z.string()
});
const relationshipsSchema = z.array(relationshipSchema);

function parseJSONFromResponse(text) {
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```[a-zA-Z]*\s*/, "");
    cleanText = cleanText.replace(/\s*```$/, "");
  }
  return JSON.parse(cleanText.trim());
}

export async function generateAttributes(entities, description, projectName) {
  const prompt = `
You are an expert database architect. You return ONLY valid JSON output containing attributes.
Do NOT write markdown, explanations, or any text other than the JSON object.

INPUT DATA:
Project Name: ${projectName}
Project Description: ${description}
Entities: ${JSON.stringify(entities)}

ATTRIBUTES GENERATION RULES:
1. Generate exactly 3 relevant attributes for each entity.
2. The attributes must be formatted as camelCase strings.
3. Return ONLY a single JSON object where the keys are the exact entity names, and the values are arrays of strings.

EXAMPLE FORMAT (FOLLOW EXACTLY):
{
  "Patient": ["patientId", "fullName", "dateOfBirth"],
  "Doctor": ["doctorId", "specialty", "licenseNumber"]
}

NOW GENERATE:
`;

  let currentPrompt = prompt;
  const maxRetries = 2;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await createChatCompletionWithRetry({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a database design assistant that outputs strictly valid JSON and nothing else."
          },
          {
            role: "user",
            content: currentPrompt
          }
        ]
      }, { version: ATTRIBUTES_PROMPT_VERSION, chars: currentPrompt.length });

      const content = response.choices[0].message.content;
      const parsed = parseJSONFromResponse(content);

      // Zod Structural Validation
      attributesSchema.parse(parsed);

      return parsed;
    } catch (err) {
      console.warn(`[JSON VALIDATION FAILURE] Version: ${ATTRIBUTES_PROMPT_VERSION} | Attempt: ${i + 1}/${maxRetries + 1} | Error: ${err.message}`);

      if (i < maxRetries) {
        currentPrompt = `${prompt}

CRITICAL CORRECTION REQUIRED:
Your previous output failed JSON parsing or schema validation with the following error:
"${err.message}"

Please correct the format and output strictly valid JSON conforming to the structural schema: record of string arrays. Do not include markdown wraps or explanations.`;
      } else {
        throw new Error("Failed to generate valid JSON attributes: " + err.message);
      }
    }
  }
}

export async function generateRelationships(entities, description) {
  const prompt = `
You are an expert system analyst. You return ONLY valid JSON output containing entity relationships.
Do NOT write markdown, explanations, or any text other than the JSON object.

INPUT DATA:
Entities: ${JSON.stringify(entities)}
Project Description: ${description}

RELATIONSHIPS RULES:
1. Identify how the entities relate to each other.
2. The relationships list can be empty if entities do not relate.
3. Use ONLY these relation types: "one-to-one", "one-to-many", "many-to-many".
4. Return ONLY a single JSON object containing a "relationships" array.

EXAMPLE FORMAT (FOLLOW EXACTLY):
{
  "relationships": [
    {
      "source": "Patient",
      "target": "Appointment",
      "type": "one-to-many",
      "label": "schedules"
    }
  ]
}

NOW GENERATE:
`;

  let currentPrompt = prompt;
  const maxRetries = 2;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await createChatCompletionWithRetry({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a system architecture design assistant that outputs strictly valid JSON and nothing else."
          },
          {
            role: "user",
            content: currentPrompt
          }
        ]
      }, { version: RELATIONSHIPS_PROMPT_VERSION, chars: currentPrompt.length });

      const content = response.choices[0].message.content;
      const parsed = parseJSONFromResponse(content);

      // Zod Structural Validation
      relationshipsSchema.parse(parsed.relationships || []);

      return parsed.relationships || [];
    } catch (err) {
      console.warn(`[JSON VALIDATION FAILURE] Version: ${RELATIONSHIPS_PROMPT_VERSION} | Attempt: ${i + 1}/${maxRetries + 1} | Error: ${err.message}`);

      if (i < maxRetries) {
        currentPrompt = `${prompt}

CRITICAL CORRECTION REQUIRED:
Your previous output failed JSON parsing or schema validation with the following error:
"${err.message}"

Please correct the format and output strictly valid JSON conforming to the structural schema. Ensure the root object has a "relationships" array where each relationship contains: source, target, type (one-of: one-to-one, one-to-many, many-to-many), and label. Do not include markdown wraps or explanations.`;
      } else {
        throw new Error("Failed to generate valid JSON relationships: " + err.message);
      }
    }
  }
}
