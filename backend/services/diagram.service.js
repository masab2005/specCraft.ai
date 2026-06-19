import { DEFAULT_MODEL, createChatCompletionWithRetry } from '../ai/llmClient.js';
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

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
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

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
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

  const response = await createChatCompletionWithRetry({
    model: DEFAULT_MODEL,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  return cleanPumlCode(response.choices[0].message.content);
}

export function encodePumlToUrl(puml) {
  const encoded = plantumlEncoder.encode(puml);
  return `http://www.plantuml.com/plantuml/png/${encoded}`;
}
