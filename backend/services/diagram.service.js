import { DEFAULT_MODEL, createChatCompletionWithRetry } from '../ai/llmClient.js';
import plantumlEncoder from 'plantuml-encoder';

// Prompt Versions
const USECASE_PROMPT_VERSION = "USECASE_V1";
const ER_PROMPT_VERSION = "ER_V1";
const CLASS_PROMPT_VERSION = "CLASS_V1";

// Helper to strip any markdown wrappers around the PlantUML code
function cleanPumlCode(code) {
  let clean = code.trim();
  if (clean.includes('@startuml') && clean.includes('@enduml')) {
    // Extract everything from @startuml to @enduml
    const startIdx = clean.indexOf('@startuml');
    const endIdx = clean.indexOf('@enduml') + 8;
    clean = clean.substring(startIdx, endIdx);
  }
  return clean;
}

// Lightweight semantic validator for PlantUML code
function validateDiagramPuml(puml, type, allowedElements) {
  const clean = puml.trim();
  if (!clean.includes('@startuml')) return "Missing '@startuml' tag";
  if (!clean.includes('@enduml')) return "Missing '@enduml' tag";
  if (clean.length < 15) return "Diagram content is too short";

  const lines = clean.split('\n');
  const declaredAliases = new Set();
  const declaredNames = new Set();
  const duplicateAliases = [];

  // Parse lines for declarations
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("'") || line.startsWith('@')) continue;

    // Matches: actor "Patient" as patient OR actor patient
    let actorMatch = line.match(/^actor\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))(?:\s+as\s+([a-zA-Z0-9_-]+))?/i);
    if (actorMatch) {
      const name = actorMatch[1] || actorMatch[2];
      const alias = actorMatch[3] || name;
      if (declaredAliases.has(alias)) {
        duplicateAliases.push(alias);
      }
      declaredAliases.add(alias);
      declaredNames.add(name);
      continue;
    }

    // Matches: usecase "Book Appointment" as UC1 OR usecase UC1
    let ucMatch = line.match(/^usecase\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))(?:\s+as\s+([a-zA-Z0-9_-]+))?/i);
    if (ucMatch) {
      const name = ucMatch[1] || ucMatch[2];
      const alias = ucMatch[3] || name;
      if (declaredAliases.has(alias)) {
        duplicateAliases.push(alias);
      }
      declaredAliases.add(alias);
      declaredNames.add(name);
      continue;
    }

    // Matches: entity "User" OR entity User OR class User OR class "User"
    let classMatch = line.match(/^(?:entity|class)\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))/i);
    if (classMatch) {
      const name = classMatch[1] || classMatch[2];
      if (declaredAliases.has(name)) {
        duplicateAliases.push(name);
      }
      declaredAliases.add(name);
      declaredNames.add(name);
      continue;
    }
  }

  // 1. Check duplicate aliases
  if (duplicateAliases.length > 0) {
    return `Duplicate element alias(es) found: ${duplicateAliases.join(', ')}`;
  }

  // 2. Validate that all declared names exist in allowed list (ignoring case)
  const allowedEntities = new Set((allowedElements.entities || []).map(e => e.toLowerCase().trim()));
  const allowedActors = new Set((allowedElements.actors || []).map(e => e.toLowerCase().trim()));
  const allowedFeatures = new Set((allowedElements.features || allowedElements.useCases || []).map(e => e.toLowerCase().trim()));

  for (const name of declaredNames) {
    const lowerName = name.toLowerCase().trim();
    if (type === 'er' || type === 'class') {
      if (!allowedEntities.has(lowerName)) {
        return `Declared entity/class "${name}" does not exist in the project specification.`;
      }
    } else if (type === 'usecase') {
      if (!allowedActors.has(lowerName) && !allowedFeatures.has(lowerName)) {
        return `Declared actor/usecase "${name}" does not exist in the project specification.`;
      }
    }
  }

  // 3. Validate relationships reference only declared aliases
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("'") || line.startsWith('@')) continue;

    // Matches relationship lines containing connectors
    const relMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(?:-->|<-|--|\|\|--o\{|\}o--o\{|\|\|--\|\||<\|--|o--|\*--)\s*([a-zA-Z0-9_-]+)/);
    if (relMatch) {
      const [, source, target] = relMatch;
      if (!declaredAliases.has(source)) {
        return `Relationship references undeclared element alias: "${source}"`;
      }
      if (!declaredAliases.has(target)) {
        return `Relationship references undeclared element alias: "${target}"`;
      }
    }
  }

  return null; // Valid
}

// Self-correcting LLM execution loop with validation and error-feedback retries
async function executeLlmWithValidation(prompt, type, allowedElements, systemContent, version) {
  let currentPrompt = prompt;
  const maxRetries = 2; // Max 2 retries (3 attempts total)

  for (let i = 0; i <= maxRetries; i++) {
    const chars = currentPrompt.length;
    const response = await createChatCompletionWithRetry({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: currentPrompt }
      ]
    }, { version, chars });

    const puml = cleanPumlCode(response.choices[0].message.content);
    const error = validateDiagramPuml(puml, type, allowedElements);

    if (!error) {
      return puml;
    }

    console.warn(`[DIAGRAM VALIDATION FAILURE] Version: ${version} | Attempt: ${i + 1}/${maxRetries + 1} | Error: ${error}`);

    if (i < maxRetries) {
      currentPrompt = `${prompt}

CRITICAL CORRECTION REQUIRED:
Your previous output failed validation with the following error:
"${error}"

Please regenerate the PlantUML diagram code to correct this error. Ensure all declared elements exist in the lists provided, no aliases are duplicated, and all relationships reference valid declared aliases. Return ONLY valid PlantUML code.`;
    } else {
      return puml; // Fallback to last output on complete failure
    }
  }
}

export async function generateUseCasePuml(actors, features) {
  const prompt = `
You are a STRICT PlantUML generator for Use Case diagrams ONLY.
You must follow syntax exactly. Do NOT output class or ER diagrams.

INPUT:
Actors: ${JSON.stringify(actors)}
Features: ${JSON.stringify(features)}

USE CASE DIAGRAM RULES:
1. Declare actors using: actor "Actor Name" as ActorAlias
2. Declare use cases using: usecase "Use Case Name" as UCAlias
3. Connect actors to use cases using standard arrows: ActorAlias --> UCAlias
4. Keep it clean and simple. Do NOT use colons in aliases.
5. Wrap use cases inside a rectangle representing the system boundary.
6. NO explanations, NO markdown wrappers (like \`\`\`puml). Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
left to right direction
actor "Patient" as patient
actor "Doctor" as doctor

rectangle "Clinic System" {
  usecase "Book Appointment" as UC1
  usecase "Verify Insurance" as UC2
  usecase "Write Prescription" as UC3
  
  UC1 ..> UC2 : <<include>>
}

patient --> UC1
doctor --> UC3
@enduml

NOW GENERATE:
`;

  return executeLlmWithValidation(
    prompt,
    'usecase',
    { actors, features },
    "You are a STRICT PlantUML generator for Use Case diagrams ONLY.",
    USECASE_PROMPT_VERSION
  );
}

export async function generateErPuml(entities, attributes, relationships) {
  const prompt = `
You are a STRICT PlantUML generator for ER diagrams ONLY.
You must follow syntax exactly. Do NOT use class diagrams.

INPUT:
Entities: ${JSON.stringify(entities)}
Attributes: ${JSON.stringify(attributes)}
Relationships: ${JSON.stringify(relationships)}

ER DIAGRAM RULES:
1. Use ONLY "entity" blocks with attributes defined INSIDE curly braces { ... }. 
2. Never declare attributes in parentheses. Always define attributes inside the curly braces of the entity block.
3. Format each attribute inside curly braces as: attributeName : type
4. Use [PK] and [FK] labels to denote Primary and Foreign keys.
5. Use ONLY these relation types:
   - One-to-Many: EntityA ||--o{ EntityB : "label"
   - Many-to-Many: EntityA }o--o{ EntityB : "label"
   - One-to-One: EntityA ||--|| EntityB : "label"
6. NO explanations, NO markdown wrappers. Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
entity "User" {
  * userId : Integer [PK]
  email : String
}

entity "RiderProfile" {
  * riderId : Integer [PK]
  userId : Integer [FK]
  rating : Float
}

entity "Trip" {
  * tripId : Integer [PK]
  riderId : Integer [FK]
  destination : String
}

entity "PromoCode" {
  * codeId : Integer [PK]
  code : String
}

User ||--|| RiderProfile : "has"
RiderProfile ||--o{ Trip : "requests"
RiderProfile }o--o{ PromoCode : "applies"
@enduml

NOW GENERATE:
`;

  return executeLlmWithValidation(
    prompt,
    'er',
    { entities },
    "You are a STRICT PlantUML generator for ER diagrams ONLY.",
    ER_PROMPT_VERSION
  );
}

export async function generateClassPuml(entities, attributes, relationships) {
  const prompt = `
You are a STRICT PlantUML generator for Class diagrams ONLY.
You must follow syntax exactly. Do NOT use ER or Use Case diagrams.

INPUT:
Entities: ${JSON.stringify(entities)}
Attributes: ${JSON.stringify(attributes)}
Relationships: ${JSON.stringify(relationships)}

CLASS DIAGRAM RULES:
1. Declare classes with class ClassName { ... } syntax. Always define attributes inside the curly braces.
2. Declare attributes as fieldName : type. Use - for private, + for public fields.
3. Show relevant methods inside class definitions if applicable.
4. Use ONLY standard relationships:
   Inheritance: SuperClass <|-- SubClass
   Association: ClassA --> ClassB : "label"
   Aggregation: ClassA o-- ClassB : "label"
   Composition: ClassA *-- ClassB : "label"
5. NO explanations, NO markdown wrappers. Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
class User {
  - userId : Integer
  + email : String
  + login() : Boolean
}

class Driver {
  + licenseNumber : String
  + verifyLicense() : Boolean
}

class Vehicle {
  + vehicleId : Integer
  + model : String
}

User <|-- Driver : "extends"
Driver --> Vehicle : "drives"
@enduml

NOW GENERATE:
`;

  return executeLlmWithValidation(
    prompt,
    'class',
    { entities },
    "You are a STRICT PlantUML generator for Class diagrams ONLY.",
    CLASS_PROMPT_VERSION
  );
}

export function encodePumlToUrl(puml) {
  const encoded = plantumlEncoder.encode(puml);
  return `http://www.plantuml.com/plantuml/png/${encoded}`;
}
