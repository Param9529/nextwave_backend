import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  earlyAccess: true,
  migrate: {
    databaseUrl: process.env.DATABASE_URL,
  },
});
