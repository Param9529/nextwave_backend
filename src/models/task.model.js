const prisma = require('../config/db.config');

class TaskModel {
  async createTask(data) {
    return prisma.task.create({ data });
  }

  async findById(id) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true
      }
    });
  }

  async updateTask(id, data) {
    return prisma.task.update({
      where: { id },
      data
    });
  }

  async deleteTask(id) {
    return prisma.task.delete({
      where: { id }
    });
  }

  async listTasks(filters, skip, take) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.projectId) where.projectId = filters.projectId;
    // ensure tasks belong to user's org
    if (filters.orgId) {
      where.project = {
        orgId: filters.orgId
      };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } }
        }
      }),
      prisma.task.count({ where })
    ]);

    return { tasks, total };
  }
}

module.exports = new TaskModel();
