import { llm } from '../ai/llmClient.js';
import plantumlEncoder from 'plantuml-encoder';

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
5. NO explanations, NO markdown. Start with @startuml and end with @enduml.

NOW GENERATE:
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanPumlCode(response.choices[0].message.content);
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
1. Use ONLY "entity" blocks with attributes inside.
2. Use ONLY these relation types:
   1:N -> ||--o{
   N:M -> }o--o{
   1:1 -> ||--||
3. NO explanations, NO markdown. Start with @startuml and end with @enduml.

NOW GENERATE:
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanPumlCode(response.choices[0].message.content);
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
1. Declare classes with class ClassName { ... } syntax.
2. Declare attributes as fieldName : type.
3. Use ONLY standard relationships:
   Inheritance: SuperClass <|-- SubClass
   Association: ClassA --> ClassB
   Aggregation: ClassA o-- ClassB
   Composition: ClassA *-- ClassB
4. NO explanations, NO markdown. Start with @startuml and end with @enduml.

NOW GENERATE:
`;

  const response = await llm.chat.completions.create({
    model: "qwen2.5-3b-instruct",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanPumlCode(response.choices[0].message.content);
}

export function encodePumlToUrl(puml) {
  const encoded = plantumlEncoder.encode(puml);
  return `http://www.plantuml.com/plantuml/png/${encoded}`;
}
