import Database from 'better-sqlite3';
import { env } from "@/env";
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from "../../generated/prisma";

const dbPath = env.DATABASE_URL.replace(/^file:/, '')

const adapter = new PrismaBetterSqlite3({
	url: dbPath
});

export const db = new PrismaClient({ adapter });
