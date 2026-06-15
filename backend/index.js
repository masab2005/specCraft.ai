import express from 'express';
import dotenv from 'dotenv';
import sequelize from './config/database.js';

// Import Models
import User from './models/User.js';
import Project from './models/Project.js';
import Specification from './models/Specification.js';

// Import Routes
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import specificationRoutes from './routes/specification.routes.js';
import artifactRoutes from './routes/artifact.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Database Associations
User.hasMany(Project, { foreignKey: 'userId' });
Project.belongsTo(User, { foreignKey: 'userId' });

Project.hasOne(Specification, { foreignKey: 'projectId' });
Specification.belongsTo(Project, { foreignKey: 'projectId' });

// Sync Database
sequelize.sync({ alter: true })
  .then(() => {
    console.log('=========================================');
    console.log('  Database synchronized successfully');
    console.log('=========================================');
  })
  .catch((err) => {
    console.error('Database synchronization failed:', err);
  });

// Mount Routes
app.use('/api/auth', authRoutes);
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
