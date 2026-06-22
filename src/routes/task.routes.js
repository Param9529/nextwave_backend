const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');

router.use(verifyToken);

router.get('/', taskController.getTasks);
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), taskController.deleteTask);

module.exports = router;
