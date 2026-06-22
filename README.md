# Team Task Tracker API

This is a REST API for a team-based task tracker with authentication, role-based access control, Redis caching, and containerized deployment using Docker.

## Setup Instructions

1. Ensure you have Docker and Docker Compose installed on your machine.
2. Clone the repository and navigate to the root directory.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. The server will start on `http://localhost:5000`.

## Features
- **Authentication**: JWT-based authentication with Access and Refresh tokens.
- **Role-Based Access Control**: `ADMIN`, `MANAGER`, and `MEMBER` roles.
- **Task Management**: CRUD operations with enforced state transitions (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE`, and `BLOCKED` accessible from any state).
- **Caching**: Redis caching for filtered task lists to optimize database queries.

## Database Design & Decisions
We are using PostgreSQL with Prisma ORM.

### Schema Decisions
1. **Relationships**: 
   - `User` belongs to `Organization`.
   - `Project` belongs to `Organization`.
   - `Task` belongs to `Project` and is optionally assigned to `User`.
   This ensures we can easily filter tasks down to an organization level.
2. **Indexing**: 
   - We added indexes on `status`, `assigneeId`, and `dueDate` inside the `Task` model. 
   - **Why?** Because the task list endpoint explicitly supports filtering by `status` and `assignee`, and sorting by `dueDate` is a very common access pattern for a task tracker. Adding indexes drastically improves the query performance for the paginated listing endpoint.

## Caching Strategy and Invalidation
- **Caching Target**: We cache the Task List endpoint specifically when tasks are fetched with an `assigneeId` filter (since this is one of the most frequently requested specific queries by users to see "their" tasks).
- **TTL**: We use a short TTL of 5 minutes (300s) to avoid stale data, but since we handle cache invalidation, data is usually fresh.
- **Invalidation Strategy**: Whenever a task is created, updated, or deleted, we invalidate the cache matching the assignee(s) of the affected task (`tasks:<assigneeId>:*`). If a task's assignee changes, we invalidate the cache for BOTH the old and the new assignee.

## What I would improve/add given more time
1. **Unit and Integration Testing**: Write automated tests using Jest and Supertest to verify the RBAC logic and cache invalidation.
2. **Refresh Token Rotation Strategy**: Currently, the refresh token endpoint isn't fully robust with blacklisting or reuse detection. I would implement a token whitelist/blacklist in Redis.
3. **Advanced Analytics Endpoint**: Aggregating overdue tasks using SQL Window functions or advanced Prisma aggregations.
4. **Rate Limiting**: Add global and endpoint-specific rate limiting (using Redis) to prevent brute force or abuse.
5. **Real-time Notifications**: Integrate WebSockets (Socket.IO) or SSE to stream status updates to assigned users live.
