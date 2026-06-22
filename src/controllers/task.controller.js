const taskModel = require('../models/task.model');
const projectModel = require('../models/project.model');
const userModel = require('../models/user.model');
const redis = require('../config/redis.config');

const CACHE_TTL = 300; // 5 minutes

const clearAssigneeCache = async (assigneeId) => {
  if (assigneeId) {
    const keys = await redis.keys(`tasks:${assigneeId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
};

const getTasks = async (req, res, next) => {
  try {
    const { status, priority, assigneeId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const filters = {
      orgId: req.user.orgId
    };

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    // Member can only see their own tasks
    if (req.user.role === 'MEMBER') {
      filters.assigneeId = req.user.id;
    } else if (assigneeId) {
      filters.assigneeId = assigneeId;
    }

    // Cache logic: only cache if it's filtered by assignee
    const cacheKey = filters.assigneeId ? `tasks:${filters.assigneeId}:${JSON.stringify(filters)}:${page}:${limit}` : null;

    if (cacheKey) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          status: 200,
          source: 'cache',
          data: JSON.parse(cachedData)
        });
      }
    }

    const { tasks, total } = await taskModel.listTasks(filters, skip, take);

    const responseData = {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    };

    if (cacheKey) {
      await redis.set(cacheKey, JSON.stringify(responseData), 'EX', CACHE_TTL);
    }

    res.status(200).json({
      status: 200,
      source: 'database',
      data: responseData
    });

  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, projectId, assigneeId, dueDate } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'title and projectId are required' });
    }

    const project = await projectModel.findById(projectId);
    if (!project || project.orgId !== req.user.orgId) {
      return res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Project not found' });
    }

    if (assigneeId) {
      const assignee = await userModel.findById(assigneeId);
      if (!assignee || assignee.orgId !== req.user.orgId) {
        return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Assignee not found in organization' });
      }
    }

    if (dueDate && new Date(dueDate) <= new Date()) {
       return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'dueDate must be a future date' });
    }

    const newTask = await taskModel.createTask({
      title,
      description,
      priority,
      projectId,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : null
    });

    if (assigneeId) {
      await clearAssigneeCache(assigneeId);
    }

    res.status(201).json({
      status: 201,
      data: newTask
    });
  } catch (error) {
    next(error);
  }
};

const isValidTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  if (newStatus === 'BLOCKED') return true; // Can be reached from any state
  
  const transitions = {
    'TODO': ['IN_PROGRESS'],
    'IN_PROGRESS': ['IN_REVIEW'],
    'IN_REVIEW': ['DONE'],
    'DONE': [],
    'BLOCKED': ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] // Can go back to active states
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, assigneeId, dueDate } = req.body;

    const task = await taskModel.findById(id);
    if (!task || task.project.orgId !== req.user.orgId) {
      return res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Task not found' });
    }

    // Role-based logic
    if (req.user.role === 'MEMBER') {
      if (task.assigneeId !== req.user.id) {
        return res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'You can only update tasks assigned to you' });
      }
      if (title || description || priority || assigneeId || dueDate) {
         return res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Members can only update task status' });
      }
    }

    if (status) {
      // Only assignee or MANAGER/ADMIN can advance status
      if (req.user.role === 'MEMBER' && task.assigneeId !== req.user.id) {
         return res.status(403).json({ status: 403, code: 'FORBIDDEN', message: 'Only the assignee can change the status' });
      }

      if (!isValidTransition(task.status, status)) {
        return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: `Invalid status transition from ${task.status} to ${status}` });
      }
    }

    if (assigneeId && assigneeId !== task.assigneeId) {
       const assignee = await userModel.findById(assigneeId);
       if (!assignee || assignee.orgId !== req.user.orgId) {
         return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Assignee not found in organization' });
       }
    }

    const dataToUpdate = {};
    if (title) dataToUpdate.title = title;
    if (description) dataToUpdate.description = description;
    if (priority) dataToUpdate.priority = priority;
    if (status) dataToUpdate.status = status;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = assigneeId;
    if (dueDate) {
       if (new Date(dueDate) <= new Date()) {
         return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'dueDate must be a future date' });
       }
       dataToUpdate.dueDate = new Date(dueDate);
    }

    const updatedTask = await taskModel.updateTask(id, dataToUpdate);

    // Invalidate cache for both old and new assignee
    if (task.assigneeId) await clearAssigneeCache(task.assigneeId);
    if (assigneeId && assigneeId !== task.assigneeId) await clearAssigneeCache(assigneeId);

    res.status(200).json({
      status: 200,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await taskModel.findById(id);
    if (!task || task.project.orgId !== req.user.orgId) {
      return res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Task not found' });
    }

    await taskModel.deleteTask(id);

    if (task.assigneeId) {
      await clearAssigneeCache(task.assigneeId);
    }

    res.status(200).json({
      status: 200,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
