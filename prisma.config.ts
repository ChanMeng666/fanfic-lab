// FanFic Lab - Prisma Configuration
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use pooled URL for queries
    url: process.env["DATABASE_URL"],
  },
});
