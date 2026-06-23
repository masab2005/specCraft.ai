import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

// Import Routes
import projectRoutes from './routes/project.routes.js';
import specificationRoutes from './routes/specification.routes.js';
import artifactRoutes from './routes/artifact.routes.js';
import aiRoutes from './routes/ai.routes.js';

import { createRateLimiter } from './middleware/rateLimit.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Configure global rate limiter (100 requests per 15 mins)
const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Global rate limit exceeded. Please try again after 15 minutes.'
});

// Middleware for security, CORS, parsing JSON, and URL-encoded bodies
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter to all API endpoints
app.use('/api', globalRateLimiter);

// Mount Routes
app.use('/api/projects', projectRoutes);
app.use('/api/specifications', specificationRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/ai', aiRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to the specCraft_AI Backend API!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
