import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function poolConfig(): PoolConfig {
  const max = Number(process.env.PG_POOL_MAX ?? 10);
  return {
    connectionString: process.env.DATABASE_URL,
    max: Number.isFinite(max) && max > 0 ? max : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

function createPrismaClient() {
  const pool = new Pool(poolConfig());
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
