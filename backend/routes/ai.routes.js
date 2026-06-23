import express from "express";
import plantumlEncoder from "plantuml-encoder";
import { llm } from "../ai/llmClient.js";
import { validateSchema } from "../middleware/validation.middleware.js";
import {
  aiTestSchema,
  aiDiagramSchema,
  aiGenerateErSchema,
  aiGenerateUseCaseSchema,
  aiGenerateClassSchema
} from "../middleware/schemas.js";

const router = express.Router();

function validatePlantUML(puml) {
  if (!puml) return "Empty diagram";

  if (!puml.includes("@startuml")) return "Missing @startuml";
  if (!puml.includes("@enduml")) return "Missing @enduml";

  // very basic safety check
  if (puml.length < 10) return "Diagram too short";

  return null;
}

router.post("/test", validateSchema(aiTestSchema), async (req, res) => {
  try {
    const { message } = req.body;

    const response = await llm.chat.completions.create({
      model: "qwen2.5-3b-instruct",
      messages: [
        {
          role: "system",
          content: "You are a strict software engineering assistant. Return short answers."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.2
    });

    res.json({
      result: response.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "AI request failed"
    });
  }
});

router.post("/diagram", validateSchema(aiDiagramSchema), async (req, res) => {
  try {
    let { diagram } = req.body;

    /**
     * 1. Validate input first (already passed schema validation)
     */
    const validationError = validatePlantUML(diagram);

    if (validationError) {
      return res.status(400).json({
        error: "Invalid PlantUML",
        details: validationError
      });
    }

    /**
     * 2. Normalize (optional cleanup)
     */
    diagram = diagram.trim();

    /**
     * 3. Encode safely
     */
    const encoded = plantumlEncoder.encode(diagram);

    const url = `http://www.plantuml.com/plantuml/png/${encoded}`;

    /**
     * 4. Return structured response (better for frontend)
     */
    return res.json({
      success: true,
      url,
      type: "plantuml_png"
    });

  } catch (err) {
    console.error("PlantUML encoding failed:", err);

    return res.status(500).json({
      error: "PlantUML encoding failed"
    });
  }
});

router.post("/generate-ER-code", validateSchema(aiGenerateErSchema), async (req, res) => {
  try {
    const { entities, attributes, relationships, type = "er" } = req.body;

    /**
     * 1. Build strict prompt
     */
    const prompt = `
You are a STRICT PlantUML generator for ER diagrams ONLY.

You must follow syntax exactly. Do NOT use class diagrams. Do NOT use inheritance.

INPUT DATA
Entities:
${JSON.stringify(entities)}

Attributes:
${JSON.stringify(attributes || [])}

Relationships:
${JSON.stringify(relationships || [])}

ER DIAGRAM RULES (MANDATORY)
- Use ONLY "entity" blocks
- Use ONLY these relations:
  1:N → ||--o{
  N:M → }o--o{
  1:1 → ||--||
- NEVER use class diagram syntax
- NO explanations, NO markdown

ONE-SHOT EXAMPLE:

INPUT:
Entities: ["User", "Order"]
Relationships: [{"from":"User","to":"Order","type":"1:N","label":"places"}]

OUTPUT:
@startuml
entity User {
  id : int
}

entity Order {
  id : int
}

User ||--o{ Order : places
@enduml

NOW GENERATE FOR GIVEN INPUT

Return ONLY valid PlantUML code.
`;

    /**
     * 2. Call LM Studio (Qwen)
     */
    const response = await llm.chat.completions.create({
      model: "qwen2.5-3b-instruct",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
        You are NOT a designer.
        You are NOT allowed to choose diagram style.

        You ONLY convert structured data into PlantUML ER syntax.

        If you deviate, output is invalid.
        `
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let puml = response.choices[0].message.content;

    /**
     * 3. Validate output
     */
    const error = validatePlantUML(puml);

    if (error) {
      return res.status(500).json({
        error: "Invalid PlantUML generated",
        details: error,
        raw: puml
      });
    }

    /**
     * 4. Return raw PUML (encoding happens elsewhere)
     */
    return res.json({
      success: true,
      type,
      plantuml: puml
    });

  } catch (err) {
    console.error("UML generation failed:", err);

    return res.status(500).json({
      error: "UML generation failed"
    });
  }
});

router.post("/generate-usecase-code", validateSchema(aiGenerateUseCaseSchema), async (req, res) => {
  try {
    const { actors, useCases, relationships, type = "usecase" } = req.body;

    /**
     * 1. Build strict prompt
     */
    const prompt = `
You are a STRICT PlantUML generator for Use Case diagrams ONLY.

You must follow syntax exactly. Do NOT use class or ER diagrams.

INPUT DATA
Actors:
${JSON.stringify(actors)}

Use Cases:
${JSON.stringify(useCases)}

Relationships:
${JSON.stringify(relationships || [])}

USE CASE DIAGRAM RULES (MANDATORY)
- Declare actors using the syntax: actor "Actor Name" as ActorAlias
- Declare use cases using the syntax: usecase "Use Case Name" as UCAlias
- Link actors to use cases using standard arrows: ActorAlias --> UCAlias
- Link use cases to other use cases with relationship stereotypes like <<include>> or <<extend>>: UCAlias1 ..> UCAlias2 : <<include>> or UCAlias1 ..> UCAlias2 : <<extend>>
- Do NOT use colons in actor/usecase aliases.
- NO explanations, NO markdown.

ONE-SHOT EXAMPLE:

INPUT:
Actors: ["Customer", "Clerk"]
Use Cases: ["Checkout", "Log Transaction"]
Relationships: [
  {"from": "Customer", "to": "Checkout"},
  {"from": "Checkout", "to": "Log Transaction", "type": "include"}
]

OUTPUT:
@startuml
left to right direction
actor "Customer" as Customer
actor "Clerk" as Clerk

usecase "Checkout" as Checkout
usecase "Log Transaction" as LogTransaction

Customer --> Checkout
Checkout ..> LogTransaction : <<include>>
@enduml

NOW GENERATE FOR GIVEN INPUT

Return ONLY valid PlantUML code.
`;

    /**
     * 2. Call LM Studio (Qwen)
     */
    const response = await llm.chat.completions.create({
      model: "qwen2.5-3b-instruct",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
        You are NOT a designer.
        You are NOT allowed to choose diagram style.

        You ONLY convert structured data into PlantUML Use Case syntax.

        If you deviate, output is invalid.
        `
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let puml = response.choices[0].message.content;

    /**
     * 3. Validate output
     */
    const error = validatePlantUML(puml);

    if (error) {
      return res.status(500).json({
        error: "Invalid PlantUML generated",
        details: error,
        raw: puml
      });
    }

    /**
     * 4. Return raw PUML
     */
    return res.json({
      success: true,
      type,
      plantuml: puml
    });

  } catch (err) {
    console.error("UML generation failed:", err);

    return res.status(500).json({
      error: "UML generation failed"
    });
  }
});

router.post("/generate-class-code", validateSchema(aiGenerateClassSchema), async (req, res) => {
  try {
    const { classes, relationships, type = "class" } = req.body;

    /**
     * 1. Build strict prompt
     */
    const prompt = `
You are a STRICT PlantUML generator for Class diagrams ONLY.

You must follow syntax exactly. Do NOT use ER or Use Case diagrams.

INPUT DATA
Classes:
${JSON.stringify(classes)}

Relationships:
${JSON.stringify(relationships || [])}

CLASS DIAGRAM RULES (MANDATORY)
- Declare classes with class ClassName { ... } syntax.
- Declare attributes as fieldName : type.
- Declare methods as methodName().
- Use ONLY standard relationships:
  - Inheritance: SuperClass <|-- SubClass
  - Association: ClassA --> ClassB
  - Aggregation: ClassA o-- ClassB
  - Composition: ClassA *-- ClassB
- NO explanations, NO markdown.

ONE-SHOT EXAMPLE:

INPUT:
Classes: [
  {
    "name": "User",
    "attributes": ["id : int", "name : string"],
    "methods": ["login() : void"]
  },
  {
    "name": "Admin",
    "attributes": ["adminLevel : int"]
  }
]
Relationships: [
  {"from": "User", "to": "Admin", "type": "inheritance"}
]

OUTPUT:
@startuml
class User {
  id : int
  name : string
  login() : void
}

class Admin {
  adminLevel : int
}

User <|-- Admin
@enduml

NOW GENERATE FOR GIVEN INPUT

Return ONLY valid PlantUML code.
`;

    /**
     * 2. Call LM Studio (Qwen)
     */
    const response = await llm.chat.completions.create({
      model: "qwen2.5-3b-instruct",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
        You are NOT a designer.
        You are NOT allowed to choose diagram style.

        You ONLY convert structured data into PlantUML Class syntax.

        If you deviate, output is invalid.
        `
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let puml = response.choices[0].message.content;

    /**
     * 3. Validate output
     */
    const error = validatePlantUML(puml);

    if (error) {
      return res.status(500).json({
        error: "Invalid PlantUML generated",
        details: error,
        raw: puml
      });
    }

    /**
     * 4. Return raw PUML
     */
    return res.json({
      success: true,
      type,
      plantuml: puml
    });

  } catch (err) {
    console.error("UML generation failed:", err);

    return res.status(500).json({
      error: "UML generation failed"
    });
  }
});

export default router;