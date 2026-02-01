import { type AnyD1Database, type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

/**
 * Creates a Drizzle database instance from a D1 binding
 */
export function createDb(d1: AnyD1Database): Database {
	return drizzle(d1, { schema });
}

// Re-export schema for convenience
export * from "./schema";
