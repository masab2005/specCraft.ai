import express from 'express';
import Project from '../models/Project.js';
import Specification from '../models/Specification.js';
import { generateAttributes, generateRelationships } from '../services/ai.service.js';

const router = express.Router();

// Helper to run specification generation
async function generateAndSaveSpec(project) {
  // Run AI calls in parallel
  const [attributes, relationships] = await Promise.all([
    generateAttributes(project.entities, project.description, project.name),
    generateRelationships(project.entities, project.description)
  ]);

  const masterJson = {
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

  // Find existing specification or create new one
  let spec = await Specification.findOne({ where: { projectId: project.id } });
  if (spec) {
    spec.masterJson = masterJson;
    spec.approvalStatus = 'pending'; // Reset status to pending on regeneration
    await spec.save();
  } else {
    spec = await Specification.create({
      projectId: project.id,
      masterJson,
      approvalStatus: 'pending'
    });
  }

  return spec;
}

// Generate Specification
router.post('/projects/:projectId/specification/generate', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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

// Approve Specification
router.post('/:id/approve', async (req, res) => {
  try {
    const spec = await Specification.findByPk(req.params.id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    spec.approvalStatus = 'approved';
    await spec.save();

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
    const spec = await Specification.findByPk(req.params.id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const project = await Project.findByPk(spec.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Associated project not found' });
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
