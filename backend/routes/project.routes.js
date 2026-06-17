import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply requireAuth middleware to all project endpoints
router.use(requireAuth);

// Create Project (from Wizard step 1-4)
router.post('/', async (req, res) => {
  try {
    const { name, description, domain, complexity, actors, features, entities } = req.body;

    if (!name || !description || !domain || !complexity) {
      return res.status(400).json({
        error: 'Missing required project fields: name, description, domain, complexity'
      });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        domain,
        complexity,
        actors: actors || [],
        features: features || [],
        entities: entities || [],
        userId: req.user.id // Bind to authenticated user ID
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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

// List Projects (Filtered by active User ID)
router.get('/', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('userId', req.user.id) // Only fetch projects owned by this user
      .order('createdAt', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, projects });
  } catch (err) {
    console.error('Fetch projects failed:', err);
    return res.status(500).json({ error: 'Fetch projects failed', details: err.message });
  }
});

// Get Project by ID (With ownership validation)
router.get('/:id', async (req, res) => {
  try {
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (pError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    // Check for associated specification
    const { data: specification, error: sError } = await supabase
      .from('specifications')
      .select('*')
      .eq('projectId', project.id)
      .maybeSingle();

    return res.json({
      success: true,
      project,
      specification: specification || null
    });
  } catch (err) {
    console.error('Fetch project failed:', err);
    return res.status(500).json({ error: 'Fetch project failed', details: err.message });
  }
});

// Delete Project (With ownership validation & CASCADE deletion of specifications)
router.delete('/:id', async (req, res) => {
  try {
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (pError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    // Delete associated specifications first to prevent constraint violations
    const { error: specDeleteError } = await supabase
      .from('specifications')
      .delete()
      .eq('projectId', project.id);

    if (specDeleteError) {
      console.error('Failed to delete associated specifications:', specDeleteError);
      return res.status(400).json({ error: specDeleteError.message });
    }

    // Delete the project itself
    const { error: projectDeleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (projectDeleteError) {
      console.error('Failed to delete project:', projectDeleteError);
      return res.status(400).json({ error: projectDeleteError.message });
    }

    return res.json({
      success: true,
      message: 'Project and associated specifications deleted successfully'
    });
  } catch (err) {
    console.error('Delete project failed:', err);
    return res.status(500).json({ error: 'Delete project failed', details: err.message });
  }
});

export default router;
