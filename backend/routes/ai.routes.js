import express from "express";
import plantumlEncoder from "plantuml-encoder";
import { DEFAULT_MODEL, createChatCompletionWithRetry } from "../ai/llmClient.js";
import { validateSchema } from "../middleware/validation.middleware.js";
import {
  aiTestSchema,
  aiDiagramSchema
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

    const response = await createChatCompletionWithRetry({
      model: DEFAULT_MODEL,
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

export default router;