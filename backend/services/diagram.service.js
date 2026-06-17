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
5. NO explanations, NO markdown wrappers (like \`\`\`puml). Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
left to right direction
actor "Customer" as customer
actor "Admin" as admin

usecase "Place Order" as UC1
usecase "Cancel Order" as UC2
usecase "Manage Inventory" as UC3

customer --> UC1
customer --> UC2
admin --> UC3
@enduml

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
1. Use ONLY "entity" blocks with attributes defined INSIDE curly braces { ... }. 
2. Never declare attributes in parentheses. Always define attributes inside the curly braces of the entity block.
3. Format each attribute inside curly braces as: attributeName : type
4. Use ONLY these relation types:
   - One-to-Many: EntityA ||--o{ EntityB : "label"
   - Many-to-Many: EntityA }o--o{ EntityB : "label"
   - One-to-One: EntityA ||--|| EntityB : "label"
5. NO explanations, NO markdown wrappers. Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
entity "Customer" {
  * customerId : Integer
  name : String
  email : String
}

entity "Order" {
  * orderId : Integer
  customerId : Integer
  orderDate : Date
}

Customer ||--o{ Order : "places"
@enduml

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
1. Declare classes with class ClassName { ... } syntax. Always define attributes inside the curly braces.
2. Declare attributes as fieldName : type.
3. Use ONLY standard relationships:
   Inheritance: SuperClass <|-- SubClass
   Association: ClassA --> ClassB : "label"
   Aggregation: ClassA o-- ClassB : "label"
   Composition: ClassA *-- ClassB : "label"
4. NO explanations, NO markdown wrappers. Start directly with @startuml and end with @enduml.

EXAMPLE:
@startuml
class Customer {
  customerId : Integer
  name : String
  email : String
}

class Order {
  orderId : Integer
  customerId : Integer
  orderDate : Date
}

Customer --> Order : "places"
@enduml

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
