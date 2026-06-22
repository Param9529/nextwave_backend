const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');

const app = express();
const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    code: "NOT_FOUND",
    message: "Resource not found"
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong!"
  });
});

module.exports = app;
