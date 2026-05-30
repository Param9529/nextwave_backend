const prisma = require('../config/db.config');

class OrganizationModel {
  async createOrganization(name) {
    return prisma.organization.create({
      data: { name }
    });
  }

  async findById(id) {
    return prisma.organization.findUnique({
      where: { id }
    });
  }
}

module.exports = new OrganizationModel();
