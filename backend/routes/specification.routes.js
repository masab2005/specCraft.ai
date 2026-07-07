import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateAttributes, generateRelationships } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { idParamSchema, projectIdParamSchema, updateSpecificationSchema } from '../middleware/schemas.js';

const router = express.Router();

// Apply requireAuth middleware to all specification endpoints
router.use(requireAuth);

// Helper to validate and clean AI-generated or manually edited master JSON
function validateAndCleanMasterJson(projectEntities, masterJson) {
  const cleanedAttributes = {};

  // Build lowercase lookup Map for O(1) checks
  const entityMap = new Map();
  projectEntities.forEach(e => {
    entityMap.set(e.trim().toLowerCase(), e);
  });

  // 1. Clean attributes
  if (masterJson.attributes && typeof masterJson.attributes === 'object') {
    Object.keys(masterJson.attributes).forEach(entityName => {
      const matchedEntity = entityMap.get(entityName.trim().toLowerCase());
      if (matchedEntity) {
        const attrs = masterJson.attributes[entityName];
        if (Array.isArray(attrs)) {
          const uniqueAttrs = [...new Set(attrs.map(a => String(a).trim()))].filter(Boolean);
          cleanedAttributes[matchedEntity] = uniqueAttrs;
        }
      }
    });
  }

  projectEntities.forEach(entity => {
    if (!cleanedAttributes[entity]) {
      cleanedAttributes[entity] = [];
    }
  });

  // 2. Clean relationships
  let cleanedRelationships = [];
  if (Array.isArray(masterJson.relationships)) {
    const validTypes = new Set(['one-to-one', 'one-to-many', 'many-to-many']);
    cleanedRelationships = masterJson.relationships
      .filter(rel => {
        if (!rel || typeof rel !== 'object') return false;
        const source = String(rel.source || '').trim().toLowerCase();
        const target = String(rel.target || '').trim().toLowerCase();
        const type = String(rel.type || '').trim().toLowerCase();

        const sourceExists = entityMap.has(source);
        const targetExists = entityMap.has(target);
        const typeIsValid = validTypes.has(type);

        return sourceExists && targetExists && typeIsValid;
      })
      .map(rel => {
        const sourceEntity = entityMap.get(String(rel.source).trim().toLowerCase());
        const targetEntity = entityMap.get(String(rel.target).trim().toLowerCase());
        return {
          source: sourceEntity,
          target: targetEntity,
          type: String(rel.type).trim().toLowerCase(),
          label: String(rel.label || 'relates to').trim()
        };
      });
  }

  masterJson.attributes = cleanedAttributes;
  masterJson.relationships = cleanedRelationships;
  return masterJson;
}

// Helper to run specification generation
async function generateAndSaveSpec(project) {
  const attributes = await generateAttributes(project.entities, project.description, project.name);
  const relationships = await generateRelationships(project.entities, project.description);

  let masterJson = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      domain: project.domain,
      complexity: project.complexity
    },
    actors: project.actors,
    features: project.features,
    entities: project.entities,
    attributes: attributes,
    relationships: relationships
  };

  masterJson = validateAndCleanMasterJson(project.entities, masterJson);

  const { data: spec, error: upsertError } = await supabase
    .from('specifications')
    .upsert({
      projectId: project.id,
      masterJson,
      approvalStatus: 'pending',
      updatedAt: new Date().toISOString()
    }, { onConflict: 'projectId' })
    .select()
    .single();

  if (upsertError) throw new Error(upsertError.message);

  return spec;
}

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: 'AI generation rate limit exceeded. Please wait a moment before trying again.'
});

// Generate Specification
router.post('/projects/:projectId/specification/generate', validateSchema(projectIdParamSchema), aiLimiter, async (req, res) => {
  try {
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.projectId)
      .single();

    if (pError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    const spec = await generateAndSaveSpec(project);

    return res.status(200).json({
      success: true,
      message: 'Master specification generated successfully',
      specification: spec
    });
  } catch (err) {
    console.error('Specification generation failed:', err);
    return res.status(500).json({ error: 'Specification generation failed' });
  }
});

// PUT /api/specifications/:id (Manual Edit Route)
router.put('/:id', validateSchema(updateSpecificationSchema), async (req, res) => {
  try {
    const { masterJson } = req.body;

    const { data: specWithProject, error: fetchError } = await supabase
      .from('specifications')
      .select('*, project:projects!inner(*)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !specWithProject) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const project = specWithProject.project;

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    delete masterJson.diagrams;
    const cleanedMasterJson = validateAndCleanMasterJson(project.entities, masterJson);

    const { data: spec, error } = await supabase
      .from('specifications')
      .update({
        masterJson: cleanedMasterJson,
        approvalStatus: 'pending',
        srsMarkdown: null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      message: 'Specification updated manually',
      specification: spec
    });
  } catch (err) {
    console.error('Failed to update specification manually:', err);
    return res.status(500).json({ error: 'Update failed' });
  }
});

// Approve Specification
router.post('/:id/approve', validateSchema(idParamSchema), async (req, res) => {
  try {
    const { data: specWithProject, error: fetchError } = await supabase
      .from('specifications')
      .select('*, project:projects!inner(*)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !specWithProject) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Verify ownership of the associated project
    if (specWithProject.project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    const { data: spec, error } = await supabase
      .from('specifications')
      .update({
        approvalStatus: 'approved',
        updatedAt: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      message: 'Specification approved successfully',
      specification: spec
    });
  } catch (err) {
    console.error('Approval failed:', err);
    return res.status(500).json({ error: 'Approval failed' });
  }
});

// Regenerate Specification
router.post('/:id/regenerate', validateSchema(idParamSchema), async (req, res) => {
  try {
    const { data: specWithProject, error: fetchError } = await supabase
      .from('specifications')
      .select('*, project:projects!inner(*)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !specWithProject) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Verify ownership
    if (specWithProject.project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    const updatedSpec = await generateAndSaveSpec(specWithProject.project);

    return res.json({
      success: true,
      message: 'Specification regenerated successfully',
      specification: updatedSpec
    });
  } catch (err) {
    console.error('Regeneration failed:', err);
    return res.status(500).json({ error: 'Regeneration failed' });
  }
});

export default router;
