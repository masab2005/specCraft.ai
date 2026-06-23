import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateUseCasePuml, generateErPuml, generateClassPuml, encodePumlToUrl } from '../services/diagram.service.js';
import { generateSrsCore, generateSrsNfr, generateSrsOverview, assembleSrs } from '../services/srs.service.js';
import { compileMarkdownToPdfStream } from '../utils/pdfCompiler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { getDiagramsSchema, getSrsSchema } from '../middleware/schemas.js';

const router = express.Router();

// Apply requireAuth middleware to all artifact endpoints
router.use(requireAuth);

// Helper to convert readable stream to Buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'AI generation rate limit exceeded. Please wait a moment before trying again.'
});

// Generate and get diagrams URLs (supports optional ?type=er|class|usecase query param)
router.get('/:id/diagrams', validateSchema(getDiagramsSchema), aiLimiter, async (req, res) => {
  try {
    const { data: spec, error } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Verify ownership of the associated project
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', spec.projectId)
      .single();

    if (pError || !project || project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    // Only approved specifications can generate diagrams
    if (spec.approvalStatus !== 'approved') {
      return res.status(400).json({
        error: 'Specification must be approved before generating diagrams'
      });
    }

    const type = req.query.type; // er, class, usecase
    const master = spec.masterJson;

    if (type) {
      if (!master.diagrams || typeof master.diagrams !== 'object') {
        master.diagrams = {};
      }

      // Check if this specific diagram is cached
      if (master.diagrams[type] && typeof master.diagrams[type] === 'object') {
        return res.json({
          success: true,
          diagram: master.diagrams[type]
        });
      }

      // Generate only the requested diagram
      let puml;
      if (type === 'er') {
        puml = await generateErPuml(master.entities, master.attributes, master.relationships);
      } else if (type === 'class') {
        puml = await generateClassPuml(master.entities, master.attributes, master.relationships);
      } else if (type === 'usecase') {
        puml = await generateUseCasePuml(master.actors, master.features);
      }

      master.diagrams[type] = {
        plantuml: puml,
        url: encodePumlToUrl(puml)
      };

      const { error: updateError } = await supabase
        .from('specifications')
        .update({
          masterJson: master,
          updatedAt: new Date().toISOString()
        })
        .eq('id', spec.id);

      if (updateError) {
        console.error(`Failed to cache ${type} diagram in specifications:`, updateError);
      }

      return res.json({
        success: true,
        diagram: master.diagrams[type]
      });
    }

    // Return cached diagrams if they exist
    if (master.diagrams && typeof master.diagrams === 'object') {
      return res.json({
        success: true,
        diagrams: master.diagrams
      });
    }

    // Generate PlantUML syntaxes via AI sequentially to avoid concurrent rate limits
    const ucPuml = await generateUseCasePuml(master.actors, master.features);
    const erPuml = await generateErPuml(master.entities, master.attributes, master.relationships);
    const classPuml = await generateClassPuml(master.entities, master.attributes, master.relationships);

    const diagrams = {
      usecase: {
        plantuml: ucPuml,
        url: encodePumlToUrl(ucPuml)
      },
      er: {
        plantuml: erPuml,
        url: encodePumlToUrl(erPuml)
      },
      class: {
        plantuml: classPuml,
        url: encodePumlToUrl(classPuml)
      }
    };

    // Store generated diagrams in masterJson
    master.diagrams = diagrams;

    const { error: updateError } = await supabase
      .from('specifications')
      .update({
        masterJson: master,
        updatedAt: new Date().toISOString()
      })
      .eq('id', spec.id);

    if (updateError) {
      console.error('Failed to cache diagrams in specifications:', updateError);
    }

    return res.json({
      success: true,
      diagrams
    });
  } catch (err) {
    console.error('Failed to generate diagram URLs:', err);
    return res.status(500).json({ error: 'Failed to generate diagram URLs' });
  }
});

// Generate and download SRS Document
router.get('/:id/srs', validateSchema(getSrsSchema), aiLimiter, async (req, res) => {
  try {
    const { data: spec, error: specError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (specError || !spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Verify ownership of the associated project
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', spec.projectId)
      .single();

    if (pError || !project || project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You do not own this project' });
    }

    // Only approved specifications can generate artifacts
    if (spec.approvalStatus !== 'approved') {
      return res.status(400).json({
        error: 'Specification must be approved before generating artifacts'
      });
    }

    let markdown = spec.srsMarkdown;

    // Generate SRS text using AI if not already generated/cached
    if (!markdown) {
      const master = spec.masterJson;
      const projectName = master.project.name;
      const description = master.project.description;
      const domain = master.project.domain;
      const complexity = master.project.complexity;

      // Generate SRS sections sequentially to avoid concurrent rate limits
      const core = await generateSrsCore(projectName, description, master.actors, master.features);
      const nfr = await generateSrsNfr(domain, complexity);
      const overview = await generateSrsOverview(projectName);

      markdown = assembleSrs(projectName, core, nfr, overview);

      // Cache it in the database
      const { error: updateError } = await supabase
        .from('specifications')
        .update({
          srsMarkdown: markdown,
          updatedAt: new Date().toISOString()
        })
        .eq('id', spec.id);

      if (updateError) {
        console.error('Failed to cache SRS markdown:', updateError);
      }
    }

    const format = req.query.format || 'pdf';

    if (format === 'markdown') {
      return res.json({
        success: true,
        markdown
      });
    } else if (format === 'pdf') {
      const filePath = `srs_${spec.id}.pdf`;

      // Only read from storage if the specification already had a cached markdown (i.e. we didn't just regenerate it)
      if (spec.srsMarkdown) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('srs-documents')
          .download(filePath);

        if (fileData && !downloadError) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="srs_${spec.id}.pdf"`);
          return res.send(buffer);
        }
      }

      // Compile on-the-fly and upload to Supabase Storage if not exists
      const pdfStream = compileMarkdownToPdfStream(markdown);
      const buffer = await streamToBuffer(pdfStream);

      const { error: uploadError } = await supabase.storage
        .from('srs-documents')
        .upload(filePath, buffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload PDF to Supabase Storage:', uploadError);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="srs_${spec.id}.pdf"`);
      return res.send(buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use pdf or markdown.' });
    }
  } catch (err) {
    console.error('SRS artifact generation failed:', err);
    return res.status(500).json({ error: 'SRS artifact generation failed' });
  }
});

export default router;
