import { prisma } from "../../../src/database/prisma.js";

class C2GenericRepository {
  constructor(private readonly db: typeof prisma) {}
  list() { return this.db.cloudUsageEvent.findMany({}); }
}

function construct<T>(Repository: new (db: typeof prisma) => T): T {
  return new Repository(prisma);
}

export function run() { return construct(C2GenericRepository).list(); }
