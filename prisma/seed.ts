import { env } from "@/env";
import { PrismaClient } from "~/generated/prisma";
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbPath = env.DATABASE_URL.replace(/^file:/, '')

const adapter = new PrismaBetterSqlite3({
    url: dbPath
});

export const db = new PrismaClient({ adapter });

async function main() {
    // Create test user
    const user = await db.user.upsert({
        where: { email: "dev@test.com" },
        update: {},
        create: {
            email: "dev@test.com",
            name: "Dev User",
        },
    });

    console.log("Created user:", user);

    // Create a session for the test user
    const sessionToken = "test-session-token-12345"; // Use a fixed token for easy testing
    const session = await db.session.upsert({
        where: { sessionToken },
        update: {
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
        create: {
            sessionToken,
            userId: user.id,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
    });

    console.log("Created session:", session);

    // Create test resume
    const resume = await db.resume.upsert({
        where: { id: "test-resume-1" },
        update: {},
        create: {
            id: "test-resume-1",
            userId: user.id,
            name: "My Test Resume",
            variationType: "base",
            template: "modern",
            tags: JSON.stringify(["developer", "fullstack"]),
        },
    });

    console.log("Created resume:", resume);

    // Create test section
    const section = await db.section.upsert({
        where: { id: "test-section-1" },
        update: {},
        create: {
            id: "test-section-1",
            resumeId: resume.id,
            type: "experience",
            order: 0,
            visible: true,
            content: JSON.stringify({
                company: "Test Corp",
                title: "Software Engineer",
                startDate: "2024-01",
            }),
        },
    });

    console.log("Created section:", section);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });