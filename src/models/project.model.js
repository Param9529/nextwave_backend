const prisma = require('../config/db.config');

class ProjectModel {
  async createProject(data) {
    return prisma.project.create({ data });
  }

  async findById(id) {
    return prisma.project.findUnique({ where: { id } });
  }

  async findByOrganization(orgId) {
    return prisma.project.findMany({ where: { orgId } });
  }
}

module.exports = new ProjectModel();
