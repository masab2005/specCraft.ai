import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateAttributes, generateRelationships } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply requireAuth middleware to all specification endpoints
router.use(requireAuth);

// Helper to validate and clean AI-generated or manually edited master JSON
function validateAndCleanMasterJson(projectEntities, masterJson) {
  const cleanedAttributes = {};

  // 1. Clean attributes
  if (masterJson.attributes && typeof masterJson.attributes === 'object') {
    Object.keys(masterJson.attributes).forEach(entityName => {
      const matchedEntity = projectEntities.find(
        e => e.trim().toLowerCase() === entityName.trim().toLowerCase()
      );
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
    cleanedRelationships = masterJson.relationships
      .filter(rel => {
        if (!rel || typeof rel !== 'object') return false;
        const source = String(rel.source || '').trim();
        const target = String(rel.target || '').trim();
        const type = String(rel.type || '').trim().toLowerCase();

        const sourceExists = projectEntities.some(
          e => e.trim().toLowerCase() === source.toLowerCase()
        );
        const targetExists = projectEntities.some(
          e => e.trim().toLowerCase() === target.toLowerCase()
        );

        const validTypes = ['one-to-one', 'one-to-many', 'many-to-many'];
        const typeIsValid = validTypes.includes(type);

        return sourceExists && targetExists && typeIsValid;
      })
      .map(rel => {
        const sourceEntity = projectEntities.find(
          e => e.trim().toLowerCase() === String(rel.source).trim().toLowerCase()
        );
        const targetEntity = projectEntities.find(
          e => e.trim().toLowerCase() === String(rel.target).trim().toLowerCase()
        );
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

  const { data: existingSpec, error: fetchError } = await supabase
    .from('specifications')
    .select('*')
    .eq('projectId', project.id)
    .maybeSingle();

  let spec;
  if (existingSpec) {
    const { data: updatedSpec, error: updateError } = await supabase
      .from('specifications')
      .update({
        masterJson,
        approvalStatus: 'pending',
        updatedAt: new Date().toISOString()
      })
      .eq('projectId', project.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    spec = updatedSpec;
  } else {
    const { data: newSpec, error: insertError } = await supabase
      .from('specifications')
      .insert({
        projectId: project.id,
        masterJson,
        approvalStatus: 'pending'
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    spec = newSpec;
  }

  return spec;
}

// Generate Specification
router.post('/projects/:projectId/specification/generate', async (req, res) => {
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
    return res.status(500).json({ error: 'Specification generation failed', details: err.message });
  }
});

// PUT /api/specifications/:id (Manual Edit Route)
router.put('/:id', async (req, res) => {
  try {
    const { masterJson } = req.body;
    if (!masterJson) {
      return res.status(400).json({ error: 'masterJson is required in request body' });
    }

    const { data: existingSpec, error: fetchError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingSpec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', existingSpec.projectId)
      .single();

    if (pError || !project) {
      return res.status(404).json({ error: 'Associated project not found' });
    }

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
    return res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// Approve Specification
router.post('/:id/approve', async (req, res) => {
  try {
    const { data: existingSpec, error: fetchError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingSpec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Verify ownership of the associated project
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', existingSpec.projectId)
      .single();

    if (pError || !project || project.userId !== req.user.id) {
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
    return res.status(500).json({ error: 'Approval failed', details: err.message });
  }
});

// Regenerate Specification
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { data: spec, error: sError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (sError || !spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', spec.projectId)
      .single();

    if (pError || !project) {
      return res.status(404).json({ error: 'Associated project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    const updatedSpec = await generateAndSaveSpec(project);

    return res.json({
      success: true,
      message: 'Specification regenerated successfully',
      specification: updatedSpec
    });
  } catch (err) {
    console.error('Regeneration failed:', err);
    return res.status(500).json({ error: 'Regeneration failed', details: err.message });
  }
});

export default router;
