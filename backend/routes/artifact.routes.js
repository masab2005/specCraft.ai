import express from 'express';
import Specification from '../models/Specification.js';
import { generateUseCasePuml, generateErPuml, generateClassPuml, encodePumlToUrl } from '../services/diagram.service.js';
import { generateSrsCore, generateSrsNfr, generateSrsOverview, assembleSrs } from '../services/srs.service.js';
import { compileMarkdownToPdfStream } from '../utils/pdfCompiler.js';

const router = express.Router();

// Generate and get diagrams URLs
router.get('/:id/diagrams', async (req, res) => {
  try {
    const spec = await Specification.findByPk(req.params.id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const master = spec.masterJson;

    // Generate PlantUML syntaxes via AI and encode them in parallel
    const [ucPuml, erPuml, classPuml] = await Promise.all([
      generateUseCasePuml(master.actors, master.features),
      generateErPuml(master.entities, master.attributes, master.relationships),
      generateClassPuml(master.entities, master.attributes, master.relationships)
    ]);

    return res.json({
      success: true,
      diagrams: {
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
      }
    });
  } catch (err) {
    console.error('Failed to generate diagram URLs:', err);
    return res.status(500).json({ error: 'Failed to generate diagram URLs', details: err.message });
  }
});

// Generate and download SRS Document
router.get('/:id/srs', async (req, res) => {
  try {
    const spec = await Specification.findByPk(req.params.id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
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

      const [core, nfr, overview] = await Promise.all([
        generateSrsCore(projectName, description, master.actors, master.features),
        generateSrsNfr(domain, complexity),
        generateSrsOverview(projectName)
      ]);

      markdown = assembleSrs(projectName, core, nfr, overview);

      // Cache it in the database
      spec.srsMarkdown = markdown;
      await spec.save();
    }

    const format = req.query.format || 'pdf';

    if (format === 'markdown') {
      return res.json({
        success: true,
        markdown
      });
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="srs_${spec.id}.pdf"`);
      
      const pdfStream = compileMarkdownToPdfStream(markdown);
      pdfStream.pipe(res);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use pdf or markdown.' });
    }
  } catch (err) {
    console.error('SRS artifact generation failed:', err);
    return res.status(500).json({ error: 'SRS artifact generation failed', details: err.message });
  }
});

export default router;
