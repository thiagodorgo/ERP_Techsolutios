import { prisma } from "../../../src/database/prisma.js";

class C2UnionRepositoryA {
  constructor(private readonly db: typeof prisma) {}
  list() { return this.db.cloudUsageEvent.findMany({}); }
}

class C2UnionRepositoryB {
  constructor(private readonly db: typeof prisma) {}
  list() { return this.db.cloudUsageEvent.findMany({}); }
}

export function run(flag: boolean) {
  const Repository: typeof C2UnionRepositoryA | typeof C2UnionRepositoryB = flag
    ? C2UnionRepositoryA
    : C2UnionRepositoryB;
  return new Repository(prisma).list();
}
