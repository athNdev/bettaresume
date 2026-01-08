import { drizzle } from "drizzle-orm/d1";

export interface Env {
  bettaresume_d1: D1Database;
}

export default {
    async fetch(request: Request, env: Env) {
        const db = drizzle(env.bettaresume_d1);
    }
}
