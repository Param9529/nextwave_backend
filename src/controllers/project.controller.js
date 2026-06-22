const projectModel = require('../models/project.model');

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'name is required' });
    }

    const project = await projectModel.createProject({
      name,
      description,
      orgId: req.user.orgId
    });

    res.status(201).json({
      status: 201,
      data: project
    });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const projects = await projectModel.findByOrganization(req.user.orgId);
    res.status(200).json({
      status: 200,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects
};
