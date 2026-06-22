const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');

router.use(verifyToken);

router.get('/', projectController.getProjects);
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), projectController.createProject);

module.exports = router;
