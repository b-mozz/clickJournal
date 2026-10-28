// Re-exports the Prisma client and generated types.
// Apps and other packages import from @clickjournal/db, never from @prisma/client directly.
// The migration runner (applyMigrations) is available at @clickjournal/db/migrate.
export { prisma, LOCAL_DEV_URL } from "./client";
export { PrismaClient } from "./generated/prisma";