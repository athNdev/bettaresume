declare global {
    namespace NodeJS {
        interface ProcessEnv {
            CLERK_SECRET_KEY: string;
            CLERK_PUBLISHABLE_KEY: string;
            LOCAL_DB_PATH: string;
            CLOUDFLARE_ACCOUNT_ID: string;
            CLOUDFLARE_DATABASE_ID: string;
            CLOUDFLARE_D1_KEY: string;
        }
    }
}

export {};
