import { prisma } from "../../../src/database/prisma.js";

class C2ReflectRepository {
  constructor(private readonly db: typeof prisma) {}
  list() { return this.db.cloudUsageEvent.findMany({}); }
}

export function run() {
  return (Reflect.construct(C2ReflectRepository, [prisma]) as C2ReflectRepository).list();
}
