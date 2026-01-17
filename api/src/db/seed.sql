-- Seed data for local development

-- Clean up existing data
DELETE FROM "Section";
DELETE FROM "Resume";
DELETE FROM "User";

-- Create a test user
INSERT INTO "User" (id, email, name, emailVerified, createdAt, updatedAt)
VALUES (
    'user-1',
    'demo@bettaresume.com',
    'Demo User',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- Create a main resume (Harvard Template)
INSERT INTO "Resume" (
    id, 
    userId, 
    name, 
    variationType, 
    template, 
    tags, 
    isArchived, 
    createdAt, 
    updatedAt,
    metadata
)
VALUES (
    'resume-1',
    'user-1',
    'Harvard Application',
    'base',
    'harvard',
    '["ivy-league", "consulting"]',
    0,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000,
    '{"settings":{"fontFamily":"Times New Roman","fontSize":11,"lineHeight":1.15,"margins":{"top":36,"right":36,"bottom":36,"left":36},"sectionSpacing":"compact","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#1e293b","heading":"#0f172a","background":"#ffffff","accent":"#334155","divider":"#e2e8f0"}}}'
);

-- 1. Personal Info Section
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-personal',
    'resume-1',
    'personal-info',
    0,
    1,
    '{"title":"Contact Information","data":{"fullName":"James Smith","email":"james.smith@harvard.edu","phone":"(617) 555-0123","location":"Cambridge, MA","linkedin":"linkedin.com/in/jamessmith","website":"jamessmith.com"}}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 2. Education Section (multiple entries)
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-edu',
    'resume-1',
    'education',
    1,
    1,
    '{"title":"Education","data":[{"id":"edu-1","institution":"Harvard University","degree":"Bachelor of Science in Computer Science","startDate":"2020-09","endDate":"2024-05","location":"Cambridge, MA","gpa":"3.9/4.0","achievements":["Dean''s List (All Semesters)","Teaching Assistant for CS50"]},{"id":"edu-2","institution":"Phillips Exeter Academy","degree":"High School Diploma","startDate":"2016-09","endDate":"2020-05","location":"Exeter, NH","gpa":"4.0/4.0","achievements":["Valedictorian","National Merit Scholar"]}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 3. Experience Section (multiple entries)
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-exp',
    'resume-1',
    'experience',
    2,
    1,
    '{"title":"Professional Experience","data":[{"id":"exp-1","company":"Google","position":"Software Engineering Intern","location":"Mountain View, CA","startDate":"2023-06","endDate":"2023-08","current":false,"description":"Worked on the Cloud team improving infrastructure scalability.","highlights":["Optimized database queries reducing latency by 40%","Implemented a new caching service using Redis","Collaborated with senior engineers to design new API endpoints"]},{"id":"exp-2","company":"StartUp Inc","position":"Full Stack Developer","location":"Boston, MA","startDate":"2022-06","endDate":"2022-08","current":false,"description":"Early stage startup focused on ed-tech.","highlights":["Built the MVP frontend using React and TypeScript","Integrated Stripe payment processing","Managed deployment pipeline using GitHub Actions"]}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 4. Skills Section (Categorized)
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-skills',
    'resume-1',
    'skills',
    3,
    1,
    '{"title":"Skills","data":[{"id":"skill-cat-1","name":"Programming","skills":[{"id":"s1","name":"TypeScript","level":"expert"},{"id":"s2","name":"Python","level":"advanced"},{"id":"s3","name":"Rust","level":"intermediate"}]},{"id":"skill-cat-2","name":"Technologies","skills":[{"id":"s4","name":"React","level":"expert"},{"id":"s5","name":"Next.js","level":"advanced"},{"id":"s6","name":"PostgreSQL","level":"advanced"},{"id":"s7","name":"Docker","level":"intermediate"}]}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 5. Projects Section
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-proj',
    'resume-1',
    'projects',
    4,
    1,
    '{"title":"Projects","data":[{"id":"proj-1","name":"BettaResume","description":"An open-source AI-powered resume builder.","url":"github.com/bettaresume","technologies":["Next.js","tRPC","TailwindCSS"],"highlights":["Developed drag-and-drop interface for resume sections","Implemented real-time PDF preview generation","Integrated AI suggestions for bullet points"]},{"id":"proj-2","name":"Algorithmic Trading Bot","description":"Automated cryptocurrency trading bot.","technologies":["Python","Pandas","Binance API"],"highlights":["Achieved 15% monthly ROI in backtesting","Deployed on AWS Lambda for 24/7 operation"]}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 6. Awards Section
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-awards',
    'resume-1',
    'awards',
    5,
    1,
    '{"title":"Honors & Awards","data":[{"id":"award-1","title":"HackMIT Winner","issuer":"MIT","date":"2023-09","description":"First place out of 1000+ participants for best use of AI."},{"id":"award-2","title":"Research Grant","issuer":"National Science Foundation","date":"2022-05","description":"$5000 grant for undergraduate research in distributed systems."}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 7. Certifications
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-certs',
    'resume-1',
    'certifications',
    6,
    1,
    '{"title":"Certifications","data":[{"id":"cert-1","name":"AWS Certified Solutions Architect","issuer":"Amazon Web Services","date":"2023-01","expirationDate":"2026-01"}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 8. Languages
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-lang',
    'resume-1',
    'languages',
    7,
    1,
    '{"title":"Languages","data":[{"id":"lang-1","name":"English","proficiency":"Native"},{"id":"lang-2","name":"Spanish","proficiency":"Professional Working Proficiency"}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 9. Publications
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-pubs',
    'resume-1',
    'publications',
    8,
    1,
    '{"title":"Publications","data":[{"id":"pub-1","title":"Optimizing Neural Networks for Edge Devices","publisher":"IEEE Conference on Computer Vision","date":"2023-12","authors":["J. Smith","A. Johnson"],"link":"https://ieee.org/paper/123"}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 10. Volunteer
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-vol',
    'resume-1',
    'volunteer',
    9,
    1,
    '{"title":"Volunteer Experience","data":[{"id":"vol-1","organization":"Code for Good","role":"Mentor","startDate":"2021-01","current":true,"description":"Teaching coding skills to underrepresented high school students.","highlights":["Mentored 20+ students directly","Developed curriculum for Intro to Python course"]}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 11. References
INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec-ref',
    'resume-1',
    'references',
    10,
    1,
    '{"title":"References","data":[{"id":"ref-1","name":"Dr. Alan Turing","position":"Professor","company":"Harvard University","email":"aturing@harvard.edu","phone":"(617) 555-9876","relationship":"Research Advisor"}]}',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);
