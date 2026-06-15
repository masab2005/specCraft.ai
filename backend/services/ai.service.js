import { llm } from '../ai/llmClient.js';

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

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You are a database design assistant that outputs strictly valid JSON and nothing else."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  try {
    return parseJSONFromResponse(content);
  } catch (err) {
    console.error("Failed to parse attributes JSON from response:", content);
    throw new Error("Failed to generate valid JSON attributes: " + err.message);
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

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You are a system architecture design assistant that outputs strictly valid JSON and nothing else."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  try {
    const parsed = parseJSONFromResponse(content);
    return parsed.relationships || [];
  } catch (err) {
    console.error("Failed to parse relationships JSON from response:", content);
    throw new Error("Failed to generate valid JSON relationships: " + err.message);
  }
}
