import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Cache the postgres client across HMR reloads in dev so we don't exhaust
 * the database connection slots. The cat_user role has limited connections;
 * Next.js re-evaluating server modules on every change otherwise leaks pools.
 */
const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
