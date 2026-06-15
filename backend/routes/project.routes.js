import express from 'express';
import Project from '../models/Project.js';
import Specification from '../models/Specification.js';

const router = express.Router();

// Create Project (from Wizard step 1-4)
router.post('/', async (req, res) => {
  try {
    const { name, description, domain, complexity, actors, features, entities, userId } = req.body;

    if (!name || !description || !domain || !complexity) {
      return res.status(400).json({
        error: 'Missing required project fields: name, description, domain, complexity'
      });
    }

    const project = await Project.create({
      name,
      description,
      domain,
      complexity,
      actors: actors || [],
      features: features || [],
      entities: entities || [],
      userId: userId || null
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully from wizard input',
      project
    });
  } catch (err) {
    console.error('Project creation failed:', err);
    return res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

// List Projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, projects });
  } catch (err) {
    console.error('Fetch projects failed:', err);
    return res.status(500).json({ error: 'Fetch projects failed', details: err.message });
  }
});

// Get Project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check for associated specification
    const specification = await Specification.findOne({
      where: { projectId: project.id }
    });

    return res.json({
      success: true,
      project,
      specification
    });
  } catch (err) {
    console.error('Fetch project failed:', err);
    return res.status(500).json({ error: 'Fetch project failed', details: err.message });
  }
});

export default router;
