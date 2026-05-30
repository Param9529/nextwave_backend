const prisma = require('../config/db.config');

class UserModel {
  async createUser(data) {
    return prisma.user.create({
      data
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        organization: true
      }
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        organization: true
      }
    });
  }
}

module.exports = new UserModel();
