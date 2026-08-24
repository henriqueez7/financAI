import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("A variável DATABASE_URL não foi definida.");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

export const prisma = new PrismaClient({
  adapter,
});