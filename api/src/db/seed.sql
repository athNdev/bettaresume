-- Seed data for local development

-- Clean up existing data. Order matters: revisions and placements reference the
-- resumes and library items below, and SQLite enforces those foreign keys.
DELETE FROM "resume_revisions";
DELETE FROM "Section";
DELETE FROM "Resume";
DELETE FROM "content_items";
DELETE FROM "User";

-- Create a test user
INSERT INTO "User" (id, email, name, emailVerified, createdAt, updatedAt)
VALUES (
    'user-1',
    'demo@bettaresume.com',
    'Demo User',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    'academic',
    '["ivy-league", "consulting"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER),
    '{"personalInfo":{"fullName":"James Smith","email":"james.smith@harvard.edu","phone":"+1 (617) 555-0142","location":"Cambridge, MA","linkedin":"linkedin.com/in/jamessmith","github":"github.com/jamessmith","professionalTitle":"MPhil Candidate, Applied Mathematics","photoUrl":""},"settings":{"fontFamily":"Times New Roman","fontSize":11,"lineHeight":1.15,"margins":{"top":36,"right":36,"bottom":36,"left":36},"sectionSpacing":"compact","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#1e293b","heading":"#0f172a","background":"#ffffff","accent":"#334155","divider":"#e2e8f0"},"pageSize":"Letter","fontScale":1,"typography":{"name":24,"title":14,"sectionHeading":14,"itemTitle":12,"body":11,"small":9},"dateFormat":"MMM YYYY","accentStyle":"underline"}}'
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
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
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

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
    'resume-2',
    'user-1',
    'Senior Software Engineer — Platform & Reliability',
    'base',
    'standard',
    '["backend","platform","sre"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER),
    '{"personalInfo":{"fullName":"Avery Chen","email":"avery.chen@example.com","phone":"+61 400 000 001","location":"Melbourne, VIC","linkedin":"linkedin.com/in/averychen","github":"github.com/averychen","website":"averychen.dev","portfolio":"","professionalTitle":"Senior Software Engineer","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"},"pageSize":"Letter","fontScale":1,"typography":{"name":24,"title":14,"sectionHeading":14,"itemTitle":12,"body":11,"small":9},"dateFormat":"MMM YYYY","accentStyle":"underline"}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-personal',
    'resume-2',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Avery Chen","email":"avery.chen@example.com","phone":"+61 400 000 001","location":"Melbourne, VIC","linkedin":"linkedin.com/in/averychen","github":"github.com/averychen","website":"averychen.dev"}}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-summary',
    'resume-2',
    'summary',
    1,
    1,
    '{"title":"Summary","html":"<p>Senior backend engineer with distributed-systems experience. Led large migrations, improved reliability, and built high-throughput pipelines with strong observability.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-exp',
    'resume-2',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp2-1","company":"Nimbus Cloud","position":"Staff Platform Engineer","location":"Remote","startDate":"2022-02","endDate":"","current":true,"description":"Owned reliability initiatives and service platform evolution.","highlights":["Improved availability by introducing SLOs and error budgets","Reduced incident volume by building runbooks and automated alert tuning","Implemented idempotent event ingestion and replay mechanisms","Cut p95 latency via caching and query optimization","Standardized service templates and golden paths to speed delivery","Led postmortems and cross-team remediation plans"],"technologies":["TypeScript","Go","PostgreSQL","Redis","Kubernetes"]},{"id":"exp2-2","company":"Finly","position":"Senior Software Engineer","location":"Sydney, NSW","startDate":"2019-01","endDate":"2022-01","current":false,"description":"Built payment workflows and ledger services with auditability.","highlights":["Migrated core ledger queries and improved performance significantly","Introduced outbox pattern for reliable event publishing","Built reconciliation dashboards with anomaly detection","Created data access layer conventions and testing patterns","Improved deployment reliability by adding health checks and rollbacks","Partnered with risk teams on compliance requirements"],"technologies":["Node.js","TypeScript","PostgreSQL","Redis"]},{"id":"exp2-3","company":"Atlas Pay","position":"Software Engineer","location":"Melbourne, VIC","startDate":"2016-02","endDate":"2018-12","current":false,"description":"Worked on backend APIs and data processing.","highlights":["Built REST APIs and background workers for settlement","Improved observability by adding structured logging","Introduced CI checks and faster build pipelines","Implemented pagination, filtering, and caching patterns","Reduced manual ops work with automation scripts","Supported on-call rotations and incident response"],"technologies":["JavaScript","PostgreSQL","Docker"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-skills',
    'resume-2',
    'skills',
    3,
    1,
    '{"title":"Skills","data":[{"id":"sc2-1","name":"Backend & Systems","skills":[{"id":"sk2-1","name":"TypeScript","level":"expert"},{"id":"sk2-2","name":"Go","level":"advanced"},{"id":"sk2-3","name":"PostgreSQL","level":"expert"},{"id":"sk2-4","name":"Redis","level":"advanced"}]},{"id":"sc2-2","name":"Infra & Observability","skills":[{"id":"sk2-5","name":"Kubernetes","level":"advanced"},{"id":"sk2-6","name":"Docker","level":"advanced"},{"id":"sk2-7","name":"CI/CD","level":"advanced"},{"id":"sk2-8","name":"Monitoring","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-proj',
    'resume-2',
    'projects',
    4,
    1,
    '{"title":"Projects","data":[{"id":"pr2-1","name":"Edge Log Processor","description":"Streaming processor for edge deployments with durable queues and replay.","url":"","technologies":["Rust","SQLite"],"highlights":["Designed plugin model for transforms and sinks","Built replay tooling for incident recovery","Added end-to-end tests for reliability" ]},{"id":"pr2-2","name":"Service Template Generator","description":"CLI to bootstrap services with observability and best practices.","url":"","technologies":["TypeScript"],"highlights":["Standardized telemetry and health endpoints","Reduced time-to-first-deploy for new services","Provided guardrails for config and secrets" ]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

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
    'resume-3',
    'user-1',
    'Product Engineer — Full Stack',
    'base',
    'standard',
    '["frontend","fullstack","product"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER),
    '{"personalInfo":{"fullName":"Sam Rivera","email":"sam.rivera@example.com","phone":"+61 400 000 002","location":"Sydney, NSW","linkedin":"linkedin.com/in/samrivera","github":"github.com/samrivera","website":"","portfolio":"","professionalTitle":"Product Engineer","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"},"pageSize":"Letter","fontScale":1,"typography":{"name":24,"title":14,"sectionHeading":14,"itemTitle":12,"body":11,"small":9},"dateFormat":"MMM YYYY","accentStyle":"underline"}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-personal',
    'resume-3',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Sam Rivera","email":"sam.rivera@example.com","phone":"+61 400 000 002","location":"Sydney, NSW","linkedin":"linkedin.com/in/samrivera","github":"github.com/samrivera"}}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-summary',
    'resume-3',
    'summary',
    1,
    1,
    '{"title":"Profile","html":"<p>Full-stack product engineer focused on UX, performance, and reliable delivery. Comfortable owning features end-to-end from discovery to launch.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-exp',
    'resume-3',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp3-1","company":"Betta Labs","position":"Product Engineer","location":"Sydney, NSW","startDate":"2023-01","endDate":"","current":true,"description":"Shipped customer-facing features and internal tooling.","highlights":["Improved Core Web Vitals through code-splitting and caching","Built a design system and standardized component patterns","Reduced form errors by adding validation and inline guidance","Created analytics dashboards for feature adoption","Improved onboarding funnel and reduced drop-off","Collaborated with design and support to prioritize fixes"],"technologies":["Next.js","TypeScript","tRPC","PostgreSQL"]},{"id":"exp3-2","company":"FlowCRM","position":"Full Stack Developer","location":"Remote","startDate":"2021-04","endDate":"2022-12","current":false,"description":"Built workflow automation and integrations.","highlights":["Implemented webhook-based integrations and retries","Built role-based access control flows","Reduced API errors by improving validation and rate-limits","Implemented optimistic updates for a faster UI","Added tests and CI checks for stability","Partnered with CS to debug production issues"],"technologies":["React","TypeScript","Node.js"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-proj',
    'resume-3',
    'projects',
    3,
    1,
    '{"title":"Projects","data":[{"id":"pr3-1","name":"Resume Builder UI","description":"Editor interface with live preview and autosave.","url":"","technologies":["React","TypeScript"],"highlights":["Implemented sections manager UX","Added debounced autosave and retries","Improved accessibility for forms" ]},{"id":"pr3-2","name":"Experiment Framework","description":"Lightweight feature flags and A/B testing utilities.","url":"","technologies":["TypeScript"],"highlights":["Added consistent event tracking","Built admin UI for toggles","Standardized experiment analysis exports" ]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-skills',
    'resume-3',
    'skills',
    4,
    1,
    '{"title":"Skills","data":[{"id":"sc3-1","name":"Frontend","skills":[{"id":"sk3-1","name":"React","level":"expert"},{"id":"sk3-2","name":"Next.js","level":"advanced"},{"id":"sk3-3","name":"TypeScript","level":"expert"}]},{"id":"sc3-2","name":"Backend","skills":[{"id":"sk3-4","name":"Node.js","level":"advanced"},{"id":"sk3-5","name":"PostgreSQL","level":"advanced"},{"id":"sk3-6","name":"REST APIs","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

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
    'resume-4',
    'user-1',
    'Consulting — Strategy & Operations',
    'base',
    'graduate',
    '["consulting","strategy","ops"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER),
    '{"personalInfo":{"fullName":"Jordan Patel","email":"jordan.patel@example.com","phone":"+61 400 000 003","location":"Brisbane, QLD","linkedin":"linkedin.com/in/jordanpatel","github":"","website":"","portfolio":"","professionalTitle":"Consultant","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"},"pageSize":"Letter","fontScale":1,"typography":{"name":24,"title":14,"sectionHeading":14,"itemTitle":12,"body":11,"small":9},"dateFormat":"MMM YYYY","accentStyle":"underline"}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-personal',
    'resume-4',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Jordan Patel","email":"jordan.patel@example.com","phone":"+61 400 000 003","location":"Brisbane, QLD","linkedin":"linkedin.com/in/jordanpatel"}}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-summary',
    'resume-4',
    'summary',
    1,
    1,
    '{"title":"Profile","html":"<p>Consultant delivering cost transformation, operating model design, and analytics-driven decision support. Strong stakeholder management and executive communication.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-exp',
    'resume-4',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp4-1","company":"Northbridge Consulting","position":"Senior Consultant","location":"Brisbane, QLD","startDate":"2021-03","endDate":"","current":true,"description":"Led workstreams across transformation programs and built executive-ready deliverables.","highlights":["Built savings roadmap with quantified benefits and risks","Created KPI framework and weekly exec dashboard","Facilitated workshops to define target operating model and RACI","Produced board-ready narrative and supporting analysis","Managed stakeholders across finance, ops, and tech","Improved governance cadence and decision logs"],"technologies":["Excel","PowerPoint","SQL"]},{"id":"exp4-2","company":"Crescent Retail","position":"Consultant","location":"Sydney, NSW","startDate":"2019-02","endDate":"2021-02","current":false,"description":"Supported growth strategy and operational performance initiatives.","highlights":["Modeled store-level profitability drivers and scenarios","Designed metrics for supply chain performance","Built reporting packs used by regional leadership","Conducted customer research and synthesized findings","Supported program management for multi-site rollout","Created training materials for new processes"],"technologies":["Excel","PowerPoint"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-skills',
    'resume-4',
    'skills',
    3,
    1,
    '{"title":"Skills","data":[{"id":"sc4-1","name":"Strategy & Ops","skills":[{"id":"sk4-1","name":"Operating Model","level":"advanced"},{"id":"sk4-2","name":"Cost Transformation","level":"advanced"},{"id":"sk4-3","name":"Stakeholder Management","level":"expert"}]},{"id":"sc4-2","name":"Analytics","skills":[{"id":"sk4-4","name":"SQL","level":"advanced"},{"id":"sk4-5","name":"Financial Modeling","level":"advanced"},{"id":"sk4-6","name":"Dashboarding","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
);

-- ============================================
-- SHOWCASE — a complete, fictional example resume
-- ============================================
--
-- Priya Raman is a FICTIONAL persona. Nothing here describes a real
-- person, employer or publication. The record exists so the app has one
-- document that exercises every feature, and so a reviewer can see what
-- "done" looks like. `docs/SHOWCASE.md` explains how to keep it current.
--
-- The `showcase` tag is the UI contract: the dashboard badge and the
-- "View the example" entry point both key off it.

-- Content library: one item placed (and diverged in the variant), one unplaced
-- so the library's "additions" offer has something to show.
INSERT INTO "content_items" (id, userId, type, title, payload, archivedAt, createdAt, updatedAt)
VALUES (
    'showcase-item-projects',
    'user-1',
    'projects',
    'Ledger replay toolkit',
    '{"title":"Projects","data":[{"id":"showcase-proj-ledger-replay","name":"Ledger replay toolkit","description":"Open-source CLI that replays ledger events into a scratch database.","role":"Maintainer","technologies":["Go","SQLite"],"url":"https://github.com/priyaraman/ledger-replay","github":"https://github.com/priyaraman/ledger-replay","startDate":"2023-02","endDate":"","current":true,"highlights":["Replays 30 days of ledger events in under four minutes."]}]}',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - 172800
);

INSERT INTO "content_items" (id, userId, type, title, payload, archivedAt, createdAt, updatedAt)
VALUES (
    'showcase-item-skills',
    'user-1',
    'skills',
    'Reliability & operations skills',
    '{"title":"Reliability & operations","data":[{"id":"showcase-lib-skill-reliability","name":"Reliability","order":0,"skills":[{"id":"showcase-lib-skill-slo","name":"SLO design","level":"expert"},{"id":"showcase-lib-skill-oncall","name":"On-call leadership","level":"advanced"},{"id":"showcase-lib-skill-postmortem","name":"Postmortem facilitation","level":"advanced"}]}]}',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - 172800
);

-- The one-pager (compact template, page target 1).
INSERT INTO "Resume" (
    id, userId, name, variationType, baseResumeId, domain, template, tags,
    isArchived, metadata, createdAt, updatedAt
)
VALUES (
    'showcase-base',
    'user-1',
    'Showcase — One-pager (Priya Raman)',
    'base',
    NULL,
    'Payments platform',
    'compact',
    '["showcase","platform","payments"]',
    0,
    '{"personalInfo":{"fullName":"Priya Raman","email":"priya.raman@example.com","phone":"+61 400 000 018","location":"Melbourne, VIC","linkedin":"linkedin.com/in/priyaraman","github":"github.com/priyaraman","website":"priyaraman.dev","portfolio":"","professionalTitle":"Staff Software Engineer, Payments Platform","photoUrl":""},"settings":{"pageSize":"A4","margins":{"top":36,"right":36,"bottom":36,"left":36},"fontScale":1,"typography":{"name":18,"title":11,"sectionHeading":11,"itemTitle":10.5,"body":10.5,"small":9.5},"lineHeight":1.2,"fontFamily":"Inter","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"},"sectionSpacing":"compact","dateFormat":"MMM YYYY","accentStyle":"underline","pageTarget":1},"exportHistory":[{"id":"showcase-export-1","format":"pdf","timestamp":"2026-08-20T04:12:00.000Z","fileName":"Priya-Raman-Staff-Platform-Engineer.pdf","fileSize":84211}],"jobTarget":{"title":"Staff Platform Engineer","company":"Northwind Payments","description":"Own the payments platform''s reliability and developer experience. You will lead cross-team design, set SLOs, and build the tooling that lets product teams ship safely. Experience with Go, Kubernetes and PostgreSQL required.","keywords":["Go","Kubernetes","PostgreSQL","payments","distributed systems","SLO","Terraform","incident response","mentoring"],"url":"https://northwind-payments.example/jobs/staff-platform-engineer","addedAt":"2026-09-14T09:00:00.000Z"}}',
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-personal',
    'showcase-base',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Priya Raman","email":"priya.raman@example.com","phone":"+61 400 000 018","location":"Melbourne, VIC","linkedin":"linkedin.com/in/priyaraman","github":"github.com/priyaraman","website":"priyaraman.dev","portfolio":"","professionalTitle":"Staff Software Engineer, Payments Platform","photoUrl":""}}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-summary',
    'showcase-base',
    'summary',
    1,
    1,
    '{"title":"Summary","html":"<p>Staff software engineer who builds <strong>payment infrastructure</strong> that other teams rely on. I led a ledger rewrite that settles <em>AUD 4.2 billion</em> a year, cut p99 latency by <strong>38%</strong>, and write at <a href=\"https://priyaraman.dev/writing\">priyaraman.dev</a>.</p>","json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Staff software engineer who builds "},{"type":"text","text":"payment infrastructure","marks":[{"type":"bold"}]},{"type":"text","text":" that other teams rely on. I led a ledger rewrite that settles "},{"type":"text","text":"AUD 4.2 billion","marks":[{"type":"italic"}]},{"type":"text","text":" a year, cut p99 latency by "},{"type":"text","text":"38%","marks":[{"type":"bold"}]},{"type":"text","text":", and write at "},{"type":"text","text":"priyaraman.dev","marks":[{"type":"link","attrs":{"href":"https://priyaraman.dev/writing"}}]},{"type":"text","text":"."}]}]}}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-experience',
    'showcase-base',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"showcase-exp-meridian","company":"Meridian Pay","position":"Staff Software Engineer","startDate":"2022-02","endDate":"","current":true,"location":"Melbourne, VIC","locationType":"hybrid","employmentType":"full-time","description":"","highlights":["Rewrote the ledger posting path in Go, cutting p99 latency from 240 ms to 149 ms.","Migrated settlement to events; reconciled all AUD 4.2B of annual volume.","Cut settlement compute spend 22% (AUD 310k/year) with queue-depth autoscaling."],"technologies":["Go","TypeScript","PostgreSQL","Kafka","Kubernetes"]},{"id":"showcase-exp-ardent","company":"Ardent Cloud","position":"Senior Software Engineer","startDate":"2019-01","endDate":"2022-01","current":false,"location":"Sydney, NSW","locationType":"onsite","employmentType":"full-time","description":"","highlights":["Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.","Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks."],"technologies":["Kotlin","AWS","Terraform","PostgreSQL"]}]}',
    '{"keepTogether":"always","entries":{"showcase-exp-ardent":"never"}}',
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-education',
    'showcase-base',
    'education',
    3,
    1,
    '{"title":"Education","data":[{"id":"showcase-edu-unimelb","institution":"University of Melbourne","degree":"Bachelor of Science (Honours)","field":"Computer Science","startDate":"2013-02","graduationDate":"2016-11","endDate":"2016-11","current":false,"gpa":"3.8","maxGpa":"4.0","location":"Melbourne, VIC","achievements":["First Class Honours"],"coursework":[],"honors":[]}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-skills',
    'showcase-base',
    'skills',
    4,
    1,
    '{"title":"Skills","data":[{"id":"showcase-skill-languages","name":"Languages","order":0,"skills":[{"id":"showcase-skill-go","name":"Go","level":"expert"},{"id":"showcase-skill-ts","name":"TypeScript","level":"expert"},{"id":"showcase-skill-python","name":"Python","level":"advanced"},{"id":"showcase-skill-sql","name":"SQL","level":"advanced"}]},{"id":"showcase-skill-platform","name":"Platform","order":1,"skills":[{"id":"showcase-skill-postgres","name":"PostgreSQL","level":"expert"},{"id":"showcase-skill-kafka","name":"Kafka","level":"advanced"},{"id":"showcase-skill-k8s","name":"Kubernetes","level":"advanced"},{"id":"showcase-skill-terraform","name":"Terraform","level":"advanced"}]}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-projects',
    'showcase-base',
    'projects',
    5,
    1,
    '{"title":"Projects","data":[{"id":"showcase-proj-ledger-replay","name":"Ledger replay toolkit","description":"Open-source CLI that replays ledger events into a scratch database.","role":"Maintainer","technologies":["Go","SQLite"],"url":"https://github.com/priyaraman/ledger-replay","github":"https://github.com/priyaraman/ledger-replay","startDate":"2023-02","endDate":"","current":true,"highlights":["Replays 30 days of ledger events in under four minutes."]}]}',
    NULL,
    'showcase-item-projects',
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-certifications',
    'showcase-base',
    'certifications',
    6,
    0,
    '{"title":"Certifications","data":[{"id":"showcase-cert-aws","name":"AWS Certified Solutions Architect – Professional","issuer":"Amazon Web Services","date":"2024-03","expirationDate":"2027-03","noExpiration":false,"credentialId":"AWS-PSA-2024-0118","url":"https://www.credly.com/badges/example","description":""},{"id":"showcase-cert-cka","name":"Certified Kubernetes Administrator","issuer":"Cloud Native Computing Foundation","date":"2024-07","expirationDate":"2027-07","noExpiration":false,"credentialId":"CKA-2024-7741","url":"https://www.credly.com/badges/example-cka","description":""}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-awards',
    'showcase-base',
    'awards',
    7,
    0,
    '{"title":"Awards","data":[{"id":"showcase-award-excellence","title":"Engineering Excellence Award","issuer":"Meridian Pay","date":"2024-11","description":""}]}',
    '{"spacing":"compact"}',
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-languages',
    'showcase-base',
    'languages',
    8,
    1,
    '{"title":"Languages","data":[{"id":"showcase-lang-english","name":"English","proficiency":"native","certification":"Native speaker"},{"id":"showcase-lang-tamil","name":"Tamil","proficiency":"fluent","certification":"Native speaker"}]}',
    '{"keepSectionTogether":true}',
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-publications',
    'showcase-base',
    'publications',
    9,
    0,
    '{"title":"Publications & talks","data":[{"id":"showcase-pub-reconciliation","title":"Reconciling money at scale","publisher":"priyaraman.dev","date":"2024-09","authors":["Priya Raman"],"url":"https://priyaraman.dev/writing/ledger-reconciliation"},{"id":"showcase-pub-contract-tests","title":"Contract tests for payment APIs","publisher":"priyaraman.dev","date":"2023-04","authors":["Priya Raman"],"url":"https://priyaraman.dev/writing/contract-tests"}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-volunteer',
    'showcase-base',
    'volunteer',
    10,
    0,
    '{"title":"Volunteer","data":[{"id":"showcase-vol-codefuture","organization":"Code the Future","role":"Mentor","startDate":"2020-03","endDate":"","current":true,"location":"Melbourne, VIC","cause":"STEM education","description":"","highlights":["Mentored 18 students across four cohorts."]}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-references',
    'showcase-base',
    'references',
    11,
    0,
    '{"title":"References","data":[{"id":"showcase-ref-shah","name":"Dr. Anika Shah","position":"Engineering Director","company":"Meridian Pay","relationship":"Manager","email":"anika.shah@example.com","phone":"+61 400 000 019","linkedin":"https://www.linkedin.com/in/anikashah","isHidden":false},{"id":"showcase-ref-lee","name":"Marcus Lee","position":"Chief Technology Officer","company":"Ardent Cloud","relationship":"Former manager","email":"marcus.lee@example.com","phone":"+61 400 000 020","linkedin":"https://www.linkedin.com/in/marcuslee","isHidden":true}]}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-base-custom',
    'showcase-base',
    'custom',
    12,
    0,
    '{"title":"Writing & Speaking","html":"<p>Talks and writing about payment systems, reliability and on-call.</p><ul><li><strong>Reconciling money at scale</strong> — meetup talk, 2024</li><li><em>Contract tests for payment APIs</em> — meetup talk, 2023</li><li>Maintainer of <a href=\"https://github.com/priyaraman/ledger-replay\">ledger-replay</a></li></ul>","json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Talks and writing about payment systems, reliability and on-call."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Reconciling money at scale","marks":[{"type":"bold"}]},{"type":"text","text":" — meetup talk, 2024"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Contract tests for payment APIs","marks":[{"type":"italic"}]},{"type":"text","text":" — meetup talk, 2023"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Maintainer of "},{"type":"text","text":"ledger-replay","marks":[{"type":"link","attrs":{"href":"https://github.com/priyaraman/ledger-replay"}}]}]}]}]}]}}',
    NULL,
    NULL,
    NULL,
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 7776000,
    CAST(strftime('%s', 'now') AS INTEGER) - -120
);

-- The two-page full CV (academic template, page target 2). Seven sections
-- have been taken over; the rest still follow the one-pager.
INSERT INTO "Resume" (
    id, userId, name, variationType, baseResumeId, domain, template, tags,
    isArchived, metadata, createdAt, updatedAt
)
VALUES (
    'showcase-variant',
    'user-1',
    'Showcase — Full CV (Priya Raman)',
    'variation',
    'showcase-base',
    'Payments platform',
    'academic',
    '["showcase","academic","payments"]',
    0,
    '{"personalInfo":{"fullName":"Priya Raman","email":"priya.raman@example.com","phone":"+61 400 000 018","location":"Melbourne, VIC","linkedin":"linkedin.com/in/priyaraman","github":"github.com/priyaraman","website":"priyaraman.dev","portfolio":"","professionalTitle":"Staff Software Engineer, Payments Platform","photoUrl":""},"settings":{"pageSize":"A4","margins":{"top":54,"right":54,"bottom":54,"left":54},"fontScale":1,"typography":{"name":18,"title":11,"sectionHeading":11,"itemTitle":10.5,"body":10.5,"small":9.5},"lineHeight":1.2,"fontFamily":"Times New Roman","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"},"sectionSpacing":"normal","dateFormat":"MMMM YYYY","accentStyle":"none","pageTarget":2},"exportHistory":[{"id":"showcase-export-2","format":"pdf","timestamp":"2026-09-30T02:40:00.000Z","fileName":"Priya-Raman-Full-CV.pdf","fileSize":96104}],"jobTarget":{"title":"Principal Engineer, Payments","company":"Southern Cross Bank","description":"Set the technical direction for a core payments estate. You will own ledger and settlement architecture, regulatory reporting trade-offs, and the engineering standards across four teams.","keywords":["payments","ledger","distributed systems","event sourcing","Go","regulatory reporting","technical strategy"],"url":"https://southern-cross.example/jobs/principal-payments","addedAt":"2026-09-28T09:00:00.000Z"}}',
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-personal',
    'showcase-variant',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Priya Raman","email":"priya.raman@example.com","phone":"+61 400 000 018","location":"Melbourne, VIC","linkedin":"linkedin.com/in/priyaraman","github":"github.com/priyaraman","website":"priyaraman.dev","portfolio":"","professionalTitle":"Staff Software Engineer, Payments Platform","photoUrl":""}}',
    NULL,
    NULL,
    'showcase-base-personal',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-summary',
    'showcase-variant',
    'summary',
    1,
    1,
    '{"title":"Profile","html":"<p>Engineer and maintainer working on <strong>payment infrastructure</strong> and <em>reliability practice</em>. Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about <a href=\"https://priyaraman.dev/writing\">reconciliation</a> and incident response.</p>","json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Engineer and maintainer working on "},{"type":"text","text":"payment infrastructure","marks":[{"type":"bold"}]},{"type":"text","text":" and "},{"type":"text","text":"reliability practice","marks":[{"type":"italic"}]},{"type":"text","text":". Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about "},{"type":"text","text":"reconciliation","marks":[{"type":"link","attrs":{"href":"https://priyaraman.dev/writing"}}]},{"type":"text","text":" and incident response."}]}]}}',
    NULL,
    NULL,
    'showcase-base-summary',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-experience',
    'showcase-variant',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"showcase-exp-meridian","company":"Meridian Pay","position":"Staff Software Engineer","startDate":"2022-02","endDate":"","current":true,"location":"Melbourne, VIC","locationType":"hybrid","employmentType":"full-time","description":"Payments platform serving 1,400 merchants across Australia and New Zealand.","highlights":["Rewrote the double-entry ledger''s posting path in Go, cutting p99 authorisation latency from 240 ms to 149 ms.","Led a six-engineer migration to event-sourced settlement; reconciled all AUD 4.2 billion of annual volume with no customer-visible incidents.","Cut settlement compute spend by 22% (AUD 310k a year) by right-sizing workers and autoscaling on queue depth.","Built a dispute-reconciliation service that flags merchant issues in under five minutes."],"technologies":["Go","TypeScript","PostgreSQL","Kafka","Kubernetes"]},{"id":"showcase-exp-ardent","company":"Ardent Cloud","position":"Senior Software Engineer","startDate":"2019-01","endDate":"2022-01","current":false,"location":"Sydney, NSW","locationType":"onsite","employmentType":"full-time","description":"Multi-tenant billing and invoicing for mid-market SaaS companies.","highlights":["Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.","Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.","Mentored four engineers; two were promoted within 18 months."],"technologies":["Kotlin","AWS","Terraform","PostgreSQL"]}]}',
    '{"keepTogether":"always"}',
    NULL,
    'showcase-base-experience',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-education',
    'showcase-variant',
    'education',
    3,
    1,
    '{"title":"Education","data":[{"id":"showcase-edu-unimelb","institution":"University of Melbourne","degree":"Bachelor of Science (Honours)","field":"Computer Science","startDate":"2013-02","graduationDate":"2016-11","endDate":"2016-11","current":false,"gpa":"3.8","maxGpa":"4.0","location":"Melbourne, VIC","achievements":["First Class Honours"],"coursework":[],"honors":[]}]}',
    '{"spacing":"spacious"}',
    NULL,
    'showcase-base-education',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-skills',
    'showcase-variant',
    'skills',
    4,
    1,
    '{"title":"Technical skills","data":[{"id":"showcase-vskill-systems","name":"Distributed systems","order":0,"skills":[{"id":"showcase-vskill-eventsourcing","name":"Event sourcing","level":"expert"},{"id":"showcase-vskill-reconciliation","name":"Reconciliation","level":"expert"},{"id":"showcase-vskill-slo","name":"SLO design","level":"advanced"}]},{"id":"showcase-vskill-tools","name":"Tools","order":1,"skills":[{"id":"showcase-vskill-go","name":"Go","level":"expert"},{"id":"showcase-vskill-postgres","name":"PostgreSQL","level":"expert"},{"id":"showcase-vskill-kafka","name":"Kafka","level":"advanced"},{"id":"showcase-vskill-k8s","name":"Kubernetes","level":"advanced"}]}]}',
    NULL,
    NULL,
    'showcase-base-skills',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-projects',
    'showcase-variant',
    'projects',
    6,
    1,
    '{"title":"Projects","data":[{"id":"showcase-proj-ledger-replay","name":"Ledger replay toolkit","description":"Open-source CLI that replays ledger events into a scratch database.","role":"Maintainer","technologies":["Go","SQLite"],"url":"https://github.com/priyaraman/ledger-replay","github":"https://github.com/priyaraman/ledger-replay","startDate":"2023-02","endDate":"","current":true,"highlights":["Replays 30 days of ledger events in under four minutes."]},{"id":"showcase-proj-runbook","name":"Runbook generator","description":"Generates on-call runbooks from service manifests and SLO definitions.","role":"Creator","technologies":["TypeScript","Kubernetes"],"url":"https://github.com/priyaraman/runbook-gen","github":"https://github.com/priyaraman/runbook-gen","startDate":"2021-06","endDate":"2022-01","current":false,"highlights":["Cut new-service onboarding from two weeks to three days."]}]}',
    NULL,
    'showcase-item-projects',
    'showcase-base-projects',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-certifications',
    'showcase-variant',
    'certifications',
    7,
    1,
    '{"title":"Certifications","data":[{"id":"showcase-cert-aws","name":"AWS Certified Solutions Architect – Professional","issuer":"Amazon Web Services","date":"2024-03","expirationDate":"2027-03","noExpiration":false,"credentialId":"AWS-PSA-2024-0118","url":"https://www.credly.com/badges/example","description":""},{"id":"showcase-cert-cka","name":"Certified Kubernetes Administrator","issuer":"Cloud Native Computing Foundation","date":"2024-07","expirationDate":"2027-07","noExpiration":false,"credentialId":"CKA-2024-7741","url":"https://www.credly.com/badges/example-cka","description":""}]}',
    NULL,
    NULL,
    'showcase-base-certifications',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-awards',
    'showcase-variant',
    'awards',
    8,
    1,
    '{"title":"Awards","data":[{"id":"showcase-award-excellence","title":"Engineering Excellence Award","issuer":"Meridian Pay","date":"2024-11","description":""}]}',
    '{"spacing":"compact"}',
    NULL,
    'showcase-base-awards',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-languages',
    'showcase-variant',
    'languages',
    9,
    1,
    '{"title":"Languages","data":[{"id":"showcase-lang-english","name":"English","proficiency":"native","certification":"Native speaker"},{"id":"showcase-lang-tamil","name":"Tamil","proficiency":"fluent","certification":"Native speaker"}]}',
    '{"keepSectionTogether":true}',
    NULL,
    'showcase-base-languages',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-publications',
    'showcase-variant',
    'publications',
    5,
    1,
    '{"title":"Publications & talks","data":[{"id":"showcase-pub-reconciliation","title":"Reconciling money at scale","publisher":"priyaraman.dev","date":"2024-09","authors":["Priya Raman"],"url":"https://priyaraman.dev/writing/ledger-reconciliation"},{"id":"showcase-pub-contract-tests","title":"Contract tests for payment APIs","publisher":"priyaraman.dev","date":"2023-04","authors":["Priya Raman"],"url":"https://priyaraman.dev/writing/contract-tests"}]}',
    '{"pageBreakBefore":true}',
    NULL,
    'showcase-base-publications',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-volunteer',
    'showcase-variant',
    'volunteer',
    10,
    0,
    '{"title":"Volunteer","data":[{"id":"showcase-vol-codefuture","organization":"Code the Future","role":"Mentor","startDate":"2020-03","endDate":"","current":true,"location":"Melbourne, VIC","cause":"STEM education","description":"","highlights":["Mentored 18 students across four cohorts."]}]}',
    NULL,
    NULL,
    'showcase-base-volunteer',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-references',
    'showcase-variant',
    'references',
    11,
    0,
    '{"title":"References","data":[{"id":"showcase-ref-shah","name":"Dr. Anika Shah","position":"Engineering Director","company":"Meridian Pay","relationship":"Manager","email":"anika.shah@example.com","phone":"+61 400 000 019","linkedin":"https://www.linkedin.com/in/anikashah","isHidden":false},{"id":"showcase-ref-lee","name":"Marcus Lee","position":"Chief Technology Officer","company":"Ardent Cloud","relationship":"Former manager","email":"marcus.lee@example.com","phone":"+61 400 000 020","linkedin":"https://www.linkedin.com/in/marcuslee","isHidden":true}]}',
    NULL,
    NULL,
    'showcase-base-references',
    1,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)
VALUES (
    'showcase-var-custom',
    'showcase-variant',
    'custom',
    12,
    1,
    '{"title":"Teaching & Talks","html":"<p>Teaching and talks on distributed systems and payment reliability.</p><ul><li><strong>Guest lecture: Distributed Systems</strong> — University of Melbourne, 2024</li><li><em>Workshop: Contract tests in practice</em> — Melbourne meetup, 2023</li><li>Writing index at <a href=\"https://priyaraman.dev/writing\">priyaraman.dev</a></li></ul>","json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Teaching and talks on distributed systems and payment reliability."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Guest lecture: Distributed Systems","marks":[{"type":"bold"}]},{"type":"text","text":" — University of Melbourne, 2024"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Workshop: Contract tests in practice","marks":[{"type":"italic"}]},{"type":"text","text":" — Melbourne meetup, 2023"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Writing index at "},{"type":"text","text":"priyaraman.dev","marks":[{"type":"link","attrs":{"href":"https://priyaraman.dev/writing"}}]}]}]}]}]}}',
    NULL,
    NULL,
    'showcase-base-custom',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) - 2592000,
    CAST(strftime('%s', 'now') AS INTEGER) - -60
);

-- Revision history: three automatic snapshots and three named versions.
-- The newest snapshot is byte-identical to the live document, so its diff reads
-- "No differences" and Restore is correctly disabled.
INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-1',
    'showcase-base',
    1,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Backend engineer with payments and platform experience. Comfortable owning services end to end.</p>\"}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the ledger posting path in Go, cutting p99 latency from 240 ms to 168 ms.\",\"Led a six-engineer migration to event-sourced settlement.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null}]}',
    'seed-showcase-base-1',
    'First draft',
    CAST(strftime('%s', 'now') AS INTEGER) - 7689600
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-2',
    'showcase-base',
    2,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Backend engineer with payments and platform experience. Comfortable owning services end to end.</p>\"}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the ledger posting path in Go, cutting p99 latency from 240 ms to 168 ms.\",\"Led a six-engineer migration to event-sourced settlement.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-base-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Skills\",\"data\":[{\"id\":\"showcase-skill-languages\",\"name\":\"Languages\",\"order\":0,\"skills\":[{\"id\":\"showcase-skill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-skill-ts\",\"name\":\"TypeScript\",\"level\":\"expert\"},{\"id\":\"showcase-skill-python\",\"name\":\"Python\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-sql\",\"name\":\"SQL\",\"level\":\"advanced\"}]},{\"id\":\"showcase-skill-platform\",\"name\":\"Platform\",\"order\":1,\"skills\":[{\"id\":\"showcase-skill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-skill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-terraform\",\"name\":\"Terraform\",\"level\":\"advanced\"}]}]}","contentItemId":null}]}',
    'seed-showcase-base-2',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 5270400
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-3',
    'showcase-base',
    3,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1},\"exportHistory\":[{\"id\":\"showcase-export-1\",\"format\":\"pdf\",\"timestamp\":\"2026-08-20T04:12:00.000Z\",\"fileName\":\"Priya-Raman-Staff-Platform-Engineer.pdf\",\"fileSize\":84211}],\"jobTarget\":{\"title\":\"Staff Platform Engineer\",\"company\":\"Northwind Payments\",\"description\":\"Own the payments platform''s reliability and developer experience. You will lead cross-team design, set SLOs, and build the tooling that lets product teams ship safely. Experience with Go, Kubernetes and PostgreSQL required.\",\"keywords\":[\"Go\",\"Kubernetes\",\"PostgreSQL\",\"payments\",\"distributed systems\",\"SLO\",\"Terraform\",\"incident response\",\"mentoring\"],\"url\":\"https://northwind-payments.example/jobs/staff-platform-engineer\",\"addedAt\":\"2026-09-14T09:00:00.000Z\"}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Staff software engineer who builds <strong>payment infrastructure</strong> that other teams rely on. I led a ledger rewrite that settles <em>AUD 4.2 billion</em> a year, cut p99 latency by <strong>38%</strong>, and write at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a>.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Staff software engineer who builds \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" that other teams rely on. I led a ledger rewrite that settles \"},{\"type\":\"text\",\"text\":\"AUD 4.2 billion\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" a year, cut p99 latency by \"},{\"type\":\"text\",\"text\":\"38%\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\", and write at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\".\"}]}]}}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the ledger posting path in Go, cutting p99 latency from 240 ms to 168 ms.\",\"Led a six-engineer migration to event-sourced settlement.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-base-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Skills\",\"data\":[{\"id\":\"showcase-skill-languages\",\"name\":\"Languages\",\"order\":0,\"skills\":[{\"id\":\"showcase-skill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-skill-ts\",\"name\":\"TypeScript\",\"level\":\"expert\"},{\"id\":\"showcase-skill-python\",\"name\":\"Python\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-sql\",\"name\":\"SQL\",\"level\":\"advanced\"}]},{\"id\":\"showcase-skill-platform\",\"name\":\"Platform\",\"order\":1,\"skills\":[{\"id\":\"showcase-skill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-skill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-terraform\",\"name\":\"Terraform\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-base-projects","type":"projects","order":5,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-base-certifications","type":"certifications","order":6,"visible":false,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-awards","type":"awards","order":7,"visible":false,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-languages","type":"languages","order":8,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null}]}',
    'seed-showcase-base-3',
    'Before the ledger rewrite',
    CAST(strftime('%s', 'now') AS INTEGER) - 3801600
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-4',
    'showcase-base',
    4,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1},\"exportHistory\":[{\"id\":\"showcase-export-1\",\"format\":\"pdf\",\"timestamp\":\"2026-08-20T04:12:00.000Z\",\"fileName\":\"Priya-Raman-Staff-Platform-Engineer.pdf\",\"fileSize\":84211}],\"jobTarget\":{\"title\":\"Staff Platform Engineer\",\"company\":\"Northwind Payments\",\"description\":\"Own the payments platform''s reliability and developer experience. You will lead cross-team design, set SLOs, and build the tooling that lets product teams ship safely. Experience with Go, Kubernetes and PostgreSQL required.\",\"keywords\":[\"Go\",\"Kubernetes\",\"PostgreSQL\",\"payments\",\"distributed systems\",\"SLO\",\"Terraform\",\"incident response\",\"mentoring\"],\"url\":\"https://northwind-payments.example/jobs/staff-platform-engineer\",\"addedAt\":\"2026-09-14T09:00:00.000Z\"}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Staff software engineer who builds <strong>payment infrastructure</strong> that other teams rely on. I led a ledger rewrite that settles <em>AUD 4.2 billion</em> a year, cut p99 latency by <strong>38%</strong>, and write at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a>.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Staff software engineer who builds \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" that other teams rely on. I led a ledger rewrite that settles \"},{\"type\":\"text\",\"text\":\"AUD 4.2 billion\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" a year, cut p99 latency by \"},{\"type\":\"text\",\"text\":\"38%\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\", and write at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\".\"}]}]}}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the double-entry ledger''s posting path in Go, cutting p99 latency from 240 ms to 149 ms.\",\"Migrated settlement to events; reconciled all AUD 4.2B of annual volume.\",\"Cut settlement compute spend 18% by right-sizing workers.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-base-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Skills\",\"data\":[{\"id\":\"showcase-skill-languages\",\"name\":\"Languages\",\"order\":0,\"skills\":[{\"id\":\"showcase-skill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-skill-ts\",\"name\":\"TypeScript\",\"level\":\"expert\"},{\"id\":\"showcase-skill-python\",\"name\":\"Python\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-sql\",\"name\":\"SQL\",\"level\":\"advanced\"}]},{\"id\":\"showcase-skill-platform\",\"name\":\"Platform\",\"order\":1,\"skills\":[{\"id\":\"showcase-skill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-skill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-terraform\",\"name\":\"Terraform\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-base-projects","type":"projects","order":5,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-base-certifications","type":"certifications","order":6,"visible":false,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-awards","type":"awards","order":7,"visible":false,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-languages","type":"languages","order":8,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null},{"id":"showcase-base-publications","type":"publications","order":9,"visible":false,"content":"{\"title\":\"Publications & talks\",\"data\":[{\"id\":\"showcase-pub-reconciliation\",\"title\":\"Reconciling money at scale\",\"publisher\":\"priyaraman.dev\",\"date\":\"2024-09\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/ledger-reconciliation\"},{\"id\":\"showcase-pub-contract-tests\",\"title\":\"Contract tests for payment APIs\",\"publisher\":\"priyaraman.dev\",\"date\":\"2023-04\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/contract-tests\"}]}","contentItemId":null},{"id":"showcase-base-volunteer","type":"volunteer","order":10,"visible":false,"content":"{\"title\":\"Volunteer\",\"data\":[{\"id\":\"showcase-vol-codefuture\",\"organization\":\"Code the Future\",\"role\":\"Mentor\",\"startDate\":\"2020-03\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"cause\":\"STEM education\",\"description\":\"\",\"highlights\":[\"Mentored 18 students across four cohorts.\"]}]}","contentItemId":null},{"id":"showcase-base-references","type":"references","order":11,"visible":false,"content":"{\"title\":\"References\",\"data\":[{\"id\":\"showcase-ref-shah\",\"name\":\"Dr. Anika Shah\",\"position\":\"Engineering Director\",\"company\":\"Meridian Pay\",\"relationship\":\"Manager\",\"email\":\"anika.shah@example.com\",\"phone\":\"+61 400 000 019\",\"linkedin\":\"https://www.linkedin.com/in/anikashah\",\"isHidden\":false},{\"id\":\"showcase-ref-lee\",\"name\":\"Marcus Lee\",\"position\":\"Chief Technology Officer\",\"company\":\"Ardent Cloud\",\"relationship\":\"Former manager\",\"email\":\"marcus.lee@example.com\",\"phone\":\"+61 400 000 020\",\"linkedin\":\"https://www.linkedin.com/in/marcuslee\",\"isHidden\":true}]}","contentItemId":null},{"id":"showcase-base-custom","type":"custom","order":12,"visible":false,"content":"{\"title\":\"Writing & Speaking\",\"html\":\"<p>Talks and writing about payment systems, reliability and on-call.</p><ul><li><strong>Reconciling money at scale</strong> — meetup talk, 2024</li><li><em>Contract tests for payment APIs</em> — meetup talk, 2023</li><li>Maintainer of <a href=\\\"https://github.com/priyaraman/ledger-replay\\\">ledger-replay</a></li></ul>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Talks and writing about payment systems, reliability and on-call.\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Reconciling money at scale\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2024\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Contract tests for payment APIs\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2023\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Maintainer of \"},{\"type\":\"text\",\"text\":\"ledger-replay\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://github.com/priyaraman/ledger-replay\"}}]}]}]}]}]}}","contentItemId":null}]}',
    'seed-showcase-base-4',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 2505600
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-5',
    'showcase-base',
    5,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1},\"exportHistory\":[{\"id\":\"showcase-export-1\",\"format\":\"pdf\",\"timestamp\":\"2026-08-20T04:12:00.000Z\",\"fileName\":\"Priya-Raman-Staff-Platform-Engineer.pdf\",\"fileSize\":84211}],\"jobTarget\":{\"title\":\"Staff Platform Engineer\",\"company\":\"Northwind Payments\",\"description\":\"Own the payments platform''s reliability and developer experience. You will lead cross-team design, set SLOs, and build the tooling that lets product teams ship safely. Experience with Go, Kubernetes and PostgreSQL required.\",\"keywords\":[\"Go\",\"Kubernetes\",\"PostgreSQL\",\"payments\",\"distributed systems\",\"SLO\",\"Terraform\",\"incident response\",\"mentoring\"],\"url\":\"https://northwind-payments.example/jobs/staff-platform-engineer\",\"addedAt\":\"2026-09-14T09:00:00.000Z\"}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Staff software engineer who builds <strong>payment infrastructure</strong> that other teams rely on. I led a ledger rewrite that settles <em>AUD 4.2 billion</em> a year, cut p99 latency by <strong>38%</strong>, and write at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a>.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Staff software engineer who builds \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" that other teams rely on. I led a ledger rewrite that settles \"},{\"type\":\"text\",\"text\":\"AUD 4.2 billion\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" a year, cut p99 latency by \"},{\"type\":\"text\",\"text\":\"38%\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\", and write at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\".\"}]}]}}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the double-entry ledger''s posting path in Go, cutting p99 latency from 240 ms to 149 ms.\",\"Migrated settlement to events; reconciled all AUD 4.2B of annual volume.\",\"Cut settlement compute spend 18% by right-sizing workers.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-base-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Skills\",\"data\":[{\"id\":\"showcase-skill-languages\",\"name\":\"Languages\",\"order\":0,\"skills\":[{\"id\":\"showcase-skill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-skill-ts\",\"name\":\"TypeScript\",\"level\":\"expert\"},{\"id\":\"showcase-skill-python\",\"name\":\"Python\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-sql\",\"name\":\"SQL\",\"level\":\"advanced\"}]},{\"id\":\"showcase-skill-platform\",\"name\":\"Platform\",\"order\":1,\"skills\":[{\"id\":\"showcase-skill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-skill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-terraform\",\"name\":\"Terraform\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-base-projects","type":"projects","order":5,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-base-certifications","type":"certifications","order":6,"visible":false,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-awards","type":"awards","order":7,"visible":false,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-languages","type":"languages","order":8,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null},{"id":"showcase-base-publications","type":"publications","order":9,"visible":false,"content":"{\"title\":\"Publications & talks\",\"data\":[{\"id\":\"showcase-pub-reconciliation\",\"title\":\"Reconciling money at scale\",\"publisher\":\"priyaraman.dev\",\"date\":\"2024-09\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/ledger-reconciliation\"},{\"id\":\"showcase-pub-contract-tests\",\"title\":\"Contract tests for payment APIs\",\"publisher\":\"priyaraman.dev\",\"date\":\"2023-04\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/contract-tests\"}]}","contentItemId":null},{"id":"showcase-base-volunteer","type":"volunteer","order":10,"visible":false,"content":"{\"title\":\"Volunteer\",\"data\":[{\"id\":\"showcase-vol-codefuture\",\"organization\":\"Code the Future\",\"role\":\"Mentor\",\"startDate\":\"2020-03\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"cause\":\"STEM education\",\"description\":\"\",\"highlights\":[\"Mentored 18 students across four cohorts.\"]}]}","contentItemId":null},{"id":"showcase-base-references","type":"references","order":11,"visible":false,"content":"{\"title\":\"References\",\"data\":[{\"id\":\"showcase-ref-shah\",\"name\":\"Dr. Anika Shah\",\"position\":\"Engineering Director\",\"company\":\"Meridian Pay\",\"relationship\":\"Manager\",\"email\":\"anika.shah@example.com\",\"phone\":\"+61 400 000 019\",\"linkedin\":\"https://www.linkedin.com/in/anikashah\",\"isHidden\":false},{\"id\":\"showcase-ref-lee\",\"name\":\"Marcus Lee\",\"position\":\"Chief Technology Officer\",\"company\":\"Ardent Cloud\",\"relationship\":\"Former manager\",\"email\":\"marcus.lee@example.com\",\"phone\":\"+61 400 000 020\",\"linkedin\":\"https://www.linkedin.com/in/marcuslee\",\"isHidden\":true}]}","contentItemId":null},{"id":"showcase-base-custom","type":"custom","order":12,"visible":false,"content":"{\"title\":\"Writing & Speaking\",\"html\":\"<p>Talks and writing about payment systems, reliability and on-call.</p><ul><li><strong>Reconciling money at scale</strong> — meetup talk, 2024</li><li><em>Contract tests for payment APIs</em> — meetup talk, 2023</li><li>Maintainer of <a href=\\\"https://github.com/priyaraman/ledger-replay\\\">ledger-replay</a></li></ul>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Talks and writing about payment systems, reliability and on-call.\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Reconciling money at scale\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2024\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Contract tests for payment APIs\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2023\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Maintainer of \"},{\"type\":\"text\",\"text\":\"ledger-replay\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://github.com/priyaraman/ledger-replay\"}}]}]}]}]}]}}","contentItemId":null}]}',
    'seed-showcase-base-5',
    'Ready to send — one page',
    CAST(strftime('%s', 'now') AS INTEGER) - 604800
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-base-rev-6',
    'showcase-base',
    6,
    '{"name":"Showcase — One-pager (Priya Raman)","template":"compact","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":36,\"right\":36,\"bottom\":36,\"left\":36},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Inter\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"compact\",\"dateFormat\":\"MMM YYYY\",\"accentStyle\":\"underline\",\"pageTarget\":1},\"exportHistory\":[{\"id\":\"showcase-export-1\",\"format\":\"pdf\",\"timestamp\":\"2026-08-20T04:12:00.000Z\",\"fileName\":\"Priya-Raman-Staff-Platform-Engineer.pdf\",\"fileSize\":84211}],\"jobTarget\":{\"title\":\"Staff Platform Engineer\",\"company\":\"Northwind Payments\",\"description\":\"Own the payments platform''s reliability and developer experience. You will lead cross-team design, set SLOs, and build the tooling that lets product teams ship safely. Experience with Go, Kubernetes and PostgreSQL required.\",\"keywords\":[\"Go\",\"Kubernetes\",\"PostgreSQL\",\"payments\",\"distributed systems\",\"SLO\",\"Terraform\",\"incident response\",\"mentoring\"],\"url\":\"https://northwind-payments.example/jobs/staff-platform-engineer\",\"addedAt\":\"2026-09-14T09:00:00.000Z\"}}","sections":[{"id":"showcase-base-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-base-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Summary\",\"html\":\"<p>Staff software engineer who builds <strong>payment infrastructure</strong> that other teams rely on. I led a ledger rewrite that settles <em>AUD 4.2 billion</em> a year, cut p99 latency by <strong>38%</strong>, and write at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a>.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Staff software engineer who builds \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" that other teams rely on. I led a ledger rewrite that settles \"},{\"type\":\"text\",\"text\":\"AUD 4.2 billion\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" a year, cut p99 latency by \"},{\"type\":\"text\",\"text\":\"38%\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\", and write at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\".\"}]}]}}","contentItemId":null},{"id":"showcase-base-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Rewrote the ledger posting path in Go, cutting p99 latency from 240 ms to 149 ms.\",\"Migrated settlement to events; reconciled all AUD 4.2B of annual volume.\",\"Cut settlement compute spend 22% (AUD 310k/year) with queue-depth autoscaling.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-base-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-base-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Skills\",\"data\":[{\"id\":\"showcase-skill-languages\",\"name\":\"Languages\",\"order\":0,\"skills\":[{\"id\":\"showcase-skill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-skill-ts\",\"name\":\"TypeScript\",\"level\":\"expert\"},{\"id\":\"showcase-skill-python\",\"name\":\"Python\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-sql\",\"name\":\"SQL\",\"level\":\"advanced\"}]},{\"id\":\"showcase-skill-platform\",\"name\":\"Platform\",\"order\":1,\"skills\":[{\"id\":\"showcase-skill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-skill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"},{\"id\":\"showcase-skill-terraform\",\"name\":\"Terraform\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-base-projects","type":"projects","order":5,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-base-certifications","type":"certifications","order":6,"visible":false,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-awards","type":"awards","order":7,"visible":false,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-base-languages","type":"languages","order":8,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null},{"id":"showcase-base-publications","type":"publications","order":9,"visible":false,"content":"{\"title\":\"Publications & talks\",\"data\":[{\"id\":\"showcase-pub-reconciliation\",\"title\":\"Reconciling money at scale\",\"publisher\":\"priyaraman.dev\",\"date\":\"2024-09\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/ledger-reconciliation\"},{\"id\":\"showcase-pub-contract-tests\",\"title\":\"Contract tests for payment APIs\",\"publisher\":\"priyaraman.dev\",\"date\":\"2023-04\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/contract-tests\"}]}","contentItemId":null},{"id":"showcase-base-volunteer","type":"volunteer","order":10,"visible":false,"content":"{\"title\":\"Volunteer\",\"data\":[{\"id\":\"showcase-vol-codefuture\",\"organization\":\"Code the Future\",\"role\":\"Mentor\",\"startDate\":\"2020-03\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"cause\":\"STEM education\",\"description\":\"\",\"highlights\":[\"Mentored 18 students across four cohorts.\"]}]}","contentItemId":null},{"id":"showcase-base-references","type":"references","order":11,"visible":false,"content":"{\"title\":\"References\",\"data\":[{\"id\":\"showcase-ref-shah\",\"name\":\"Dr. Anika Shah\",\"position\":\"Engineering Director\",\"company\":\"Meridian Pay\",\"relationship\":\"Manager\",\"email\":\"anika.shah@example.com\",\"phone\":\"+61 400 000 019\",\"linkedin\":\"https://www.linkedin.com/in/anikashah\",\"isHidden\":false},{\"id\":\"showcase-ref-lee\",\"name\":\"Marcus Lee\",\"position\":\"Chief Technology Officer\",\"company\":\"Ardent Cloud\",\"relationship\":\"Former manager\",\"email\":\"marcus.lee@example.com\",\"phone\":\"+61 400 000 020\",\"linkedin\":\"https://www.linkedin.com/in/marcuslee\",\"isHidden\":true}]}","contentItemId":null},{"id":"showcase-base-custom","type":"custom","order":12,"visible":false,"content":"{\"title\":\"Writing & Speaking\",\"html\":\"<p>Talks and writing about payment systems, reliability and on-call.</p><ul><li><strong>Reconciling money at scale</strong> — meetup talk, 2024</li><li><em>Contract tests for payment APIs</em> — meetup talk, 2023</li><li>Maintainer of <a href=\\\"https://github.com/priyaraman/ledger-replay\\\">ledger-replay</a></li></ul>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Talks and writing about payment systems, reliability and on-call.\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Reconciling money at scale\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2024\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Contract tests for payment APIs\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" — meetup talk, 2023\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Maintainer of \"},{\"type\":\"text\",\"text\":\"ledger-replay\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://github.com/priyaraman/ledger-replay\"}}]}]}]}]}]}}","contentItemId":null}]}',
    'seed-showcase-base-6',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 172800
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-variant-rev-1',
    'showcase-variant',
    1,
    '{"name":"Showcase — Full CV (Priya Raman)","template":"academic","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":54,\"right\":54,\"bottom\":54,\"left\":54},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Times New Roman\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"normal\",\"dateFormat\":\"MMMM YYYY\",\"accentStyle\":\"none\",\"pageTarget\":2},\"exportHistory\":[{\"id\":\"showcase-export-2\",\"format\":\"pdf\",\"timestamp\":\"2026-09-30T02:40:00.000Z\",\"fileName\":\"Priya-Raman-Full-CV.pdf\",\"fileSize\":96104}],\"jobTarget\":{\"title\":\"Principal Engineer, Payments\",\"company\":\"Southern Cross Bank\",\"description\":\"Set the technical direction for a core payments estate. You will own ledger and settlement architecture, regulatory reporting trade-offs, and the engineering standards across four teams.\",\"keywords\":[\"payments\",\"ledger\",\"distributed systems\",\"event sourcing\",\"Go\",\"regulatory reporting\",\"technical strategy\"],\"url\":\"https://southern-cross.example/jobs/principal-payments\",\"addedAt\":\"2026-09-28T09:00:00.000Z\"}}","sections":[{"id":"showcase-var-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-var-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Profile\",\"html\":\"<p>Engineer and maintainer working on <strong>payment infrastructure</strong> and <em>reliability practice</em>. Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about <a href=\\\"https://priyaraman.dev/writing\\\">reconciliation</a> and incident response.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Engineer and maintainer working on \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" and \"},{\"type\":\"text\",\"text\":\"reliability practice\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\". Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about \"},{\"type\":\"text\",\"text\":\"reconciliation\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\" and incident response.\"}]}]}}","contentItemId":null},{"id":"showcase-var-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"Payments platform serving 1,400 merchants across Australia and New Zealand.\",\"highlights\":[\"Rewrote the double-entry ledger''s posting path in Go, cutting p99 authorisation latency from 240 ms to 149 ms.\",\"Led a six-engineer migration to event-sourced settlement; reconciled all AUD 4.2 billion of annual volume with no customer-visible incidents.\",\"Cut settlement compute spend by 22% (AUD 310k a year) by right-sizing workers and autoscaling on queue depth.\",\"Built a dispute-reconciliation service that flags merchant issues in under five minutes.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"Multi-tenant billing and invoicing for mid-market SaaS companies.\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\",\"Mentored four engineers; two were promoted within 18 months.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-var-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-var-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Technical skills\",\"data\":[{\"id\":\"showcase-vskill-systems\",\"name\":\"Distributed systems\",\"order\":0,\"skills\":[{\"id\":\"showcase-vskill-eventsourcing\",\"name\":\"Event sourcing\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-reconciliation\",\"name\":\"Reconciliation\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-slo\",\"name\":\"SLO design\",\"level\":\"advanced\"}]},{\"id\":\"showcase-vskill-tools\",\"name\":\"Tools\",\"order\":1,\"skills\":[{\"id\":\"showcase-vskill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-vskill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-var-projects","type":"projects","order":6,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]},{\"id\":\"showcase-proj-runbook\",\"name\":\"Runbook generator\",\"description\":\"Generates on-call runbooks from service manifests and SLO definitions.\",\"role\":\"Creator\",\"technologies\":[\"TypeScript\",\"Kubernetes\"],\"url\":\"https://github.com/priyaraman/runbook-gen\",\"github\":\"https://github.com/priyaraman/runbook-gen\",\"startDate\":\"2021-06\",\"endDate\":\"2022-01\",\"current\":false,\"highlights\":[\"Cut new-service onboarding from two weeks to three days.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-var-certifications","type":"certifications","order":7,"visible":true,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-var-awards","type":"awards","order":8,"visible":true,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-var-languages","type":"languages","order":9,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null},{"id":"showcase-var-publications","type":"publications","order":5,"visible":true,"content":"{\"title\":\"Publications & talks\",\"data\":[{\"id\":\"showcase-pub-reconciliation\",\"title\":\"Reconciling money at scale\",\"publisher\":\"priyaraman.dev\",\"date\":\"2024-09\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/ledger-reconciliation\"},{\"id\":\"showcase-pub-contract-tests\",\"title\":\"Contract tests for payment APIs\",\"publisher\":\"priyaraman.dev\",\"date\":\"2023-04\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/contract-tests\"}]}","contentItemId":null},{"id":"showcase-var-volunteer","type":"volunteer","order":10,"visible":false,"content":"{\"title\":\"Volunteer\",\"data\":[{\"id\":\"showcase-vol-codefuture\",\"organization\":\"Code the Future\",\"role\":\"Mentor\",\"startDate\":\"2020-03\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"cause\":\"STEM education\",\"description\":\"\",\"highlights\":[\"Mentored 18 students across four cohorts.\"]}]}","contentItemId":null},{"id":"showcase-var-references","type":"references","order":11,"visible":false,"content":"{\"title\":\"References\",\"data\":[{\"id\":\"showcase-ref-shah\",\"name\":\"Dr. Anika Shah\",\"position\":\"Engineering Director\",\"company\":\"Meridian Pay\",\"relationship\":\"Manager\",\"email\":\"anika.shah@example.com\",\"phone\":\"+61 400 000 019\",\"linkedin\":\"https://www.linkedin.com/in/anikashah\",\"isHidden\":false},{\"id\":\"showcase-ref-lee\",\"name\":\"Marcus Lee\",\"position\":\"Chief Technology Officer\",\"company\":\"Ardent Cloud\",\"relationship\":\"Former manager\",\"email\":\"marcus.lee@example.com\",\"phone\":\"+61 400 000 020\",\"linkedin\":\"https://www.linkedin.com/in/marcuslee\",\"isHidden\":true}]}","contentItemId":null},{"id":"showcase-var-custom","type":"custom","order":12,"visible":true,"content":"{\"title\":\"Teaching & Talks\",\"html\":\"<p>Teaching and talks on distributed systems and payment reliability.</p><ul><li><strong>Guest lecture: Distributed Systems</strong> — University of Melbourne, 2024</li><li><em>Workshop: Contract tests in practice</em> — Melbourne meetup, 2023</li><li>Writing index at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a></li></ul>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Teaching and talks on distributed systems and payment reliability.\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Guest lecture: Distributed Systems\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" — University of Melbourne, 2024\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Workshop: Contract tests in practice\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" — Melbourne meetup, 2023\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Writing index at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]}]}]}]}]}}","contentItemId":null}]}',
    'seed-showcase-variant-1',
    'Forked from the one-pager',
    CAST(strftime('%s', 'now') AS INTEGER) - 1036800
);

INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)
VALUES (
    'showcase-variant-rev-2',
    'showcase-variant',
    2,
    '{"name":"Showcase — Full CV (Priya Raman)","template":"academic","domain":"Payments platform","metadata":"{\"personalInfo\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"},\"settings\":{\"pageSize\":\"A4\",\"margins\":{\"top\":54,\"right\":54,\"bottom\":54,\"left\":54},\"fontScale\":1,\"typography\":{\"name\":18,\"title\":11,\"sectionHeading\":11,\"itemTitle\":10.5,\"body\":10.5,\"small\":9.5},\"lineHeight\":1.2,\"fontFamily\":\"Times New Roman\",\"colors\":{\"primary\":\"#1e293b\",\"secondary\":\"#64748b\",\"text\":\"#0f172a\",\"heading\":\"#0f172a\",\"background\":\"#ffffff\",\"accent\":\"#2563eb\",\"divider\":\"#e2e8f0\"},\"sectionSpacing\":\"normal\",\"dateFormat\":\"MMMM YYYY\",\"accentStyle\":\"none\",\"pageTarget\":2},\"exportHistory\":[{\"id\":\"showcase-export-2\",\"format\":\"pdf\",\"timestamp\":\"2026-09-30T02:40:00.000Z\",\"fileName\":\"Priya-Raman-Full-CV.pdf\",\"fileSize\":96104}],\"jobTarget\":{\"title\":\"Principal Engineer, Payments\",\"company\":\"Southern Cross Bank\",\"description\":\"Set the technical direction for a core payments estate. You will own ledger and settlement architecture, regulatory reporting trade-offs, and the engineering standards across four teams.\",\"keywords\":[\"payments\",\"ledger\",\"distributed systems\",\"event sourcing\",\"Go\",\"regulatory reporting\",\"technical strategy\"],\"url\":\"https://southern-cross.example/jobs/principal-payments\",\"addedAt\":\"2026-09-28T09:00:00.000Z\"}}","sections":[{"id":"showcase-var-personal","type":"personal-info","order":0,"visible":true,"content":"{\"title\":\"Contact\",\"data\":{\"fullName\":\"Priya Raman\",\"email\":\"priya.raman@example.com\",\"phone\":\"+61 400 000 018\",\"location\":\"Melbourne, VIC\",\"linkedin\":\"linkedin.com/in/priyaraman\",\"github\":\"github.com/priyaraman\",\"website\":\"priyaraman.dev\",\"portfolio\":\"\",\"professionalTitle\":\"Staff Software Engineer, Payments Platform\",\"photoUrl\":\"\"}}","contentItemId":null},{"id":"showcase-var-summary","type":"summary","order":1,"visible":true,"content":"{\"title\":\"Profile\",\"html\":\"<p>Engineer and maintainer working on <strong>payment infrastructure</strong> and <em>reliability practice</em>. Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about <a href=\\\"https://priyaraman.dev/writing\\\">reconciliation</a> and incident response.</p>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Engineer and maintainer working on \"},{\"type\":\"text\",\"text\":\"payment infrastructure\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" and \"},{\"type\":\"text\",\"text\":\"reliability practice\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\". Eight years across ledger systems, settlement and on-call, with open-source tools used outside the companies that funded them. I write and speak about \"},{\"type\":\"text\",\"text\":\"reconciliation\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]},{\"type\":\"text\",\"text\":\" and incident response.\"}]}]}}","contentItemId":null},{"id":"showcase-var-experience","type":"experience","order":2,"visible":true,"content":"{\"title\":\"Experience\",\"data\":[{\"id\":\"showcase-exp-meridian\",\"company\":\"Meridian Pay\",\"position\":\"Staff Software Engineer\",\"startDate\":\"2022-02\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"locationType\":\"hybrid\",\"employmentType\":\"full-time\",\"description\":\"Payments platform serving 1,400 merchants across Australia and New Zealand.\",\"highlights\":[\"Rewrote the double-entry ledger''s posting path in Go, cutting p99 authorisation latency from 240 ms to 149 ms.\",\"Led a six-engineer migration to event-sourced settlement; reconciled all AUD 4.2 billion of annual volume with no customer-visible incidents.\",\"Cut settlement compute spend by 22% (AUD 310k a year) by right-sizing workers and autoscaling on queue depth.\",\"Built a dispute-reconciliation service that flags merchant issues in under five minutes.\"],\"technologies\":[\"Go\",\"TypeScript\",\"PostgreSQL\",\"Kafka\",\"Kubernetes\"]},{\"id\":\"showcase-exp-ardent\",\"company\":\"Ardent Cloud\",\"position\":\"Senior Software Engineer\",\"startDate\":\"2019-01\",\"endDate\":\"2022-01\",\"current\":false,\"location\":\"Sydney, NSW\",\"locationType\":\"onsite\",\"employmentType\":\"full-time\",\"description\":\"Multi-tenant billing and invoicing for mid-market SaaS companies.\",\"highlights\":[\"Designed a billing pipeline issuing 2.3M invoices a month at a 0.02% error rate.\",\"Reduced incident MTTR from 54 to 18 minutes with SLOs and templated runbooks.\",\"Mentored four engineers; two were promoted within 18 months.\"],\"technologies\":[\"Kotlin\",\"AWS\",\"Terraform\",\"PostgreSQL\"]}]}","contentItemId":null},{"id":"showcase-var-education","type":"education","order":3,"visible":true,"content":"{\"title\":\"Education\",\"data\":[{\"id\":\"showcase-edu-unimelb\",\"institution\":\"University of Melbourne\",\"degree\":\"Bachelor of Science (Honours)\",\"field\":\"Computer Science\",\"startDate\":\"2013-02\",\"graduationDate\":\"2016-11\",\"endDate\":\"2016-11\",\"current\":false,\"gpa\":\"3.8\",\"maxGpa\":\"4.0\",\"location\":\"Melbourne, VIC\",\"achievements\":[\"First Class Honours\"],\"coursework\":[],\"honors\":[]}]}","contentItemId":null},{"id":"showcase-var-skills","type":"skills","order":4,"visible":true,"content":"{\"title\":\"Technical skills\",\"data\":[{\"id\":\"showcase-vskill-systems\",\"name\":\"Distributed systems\",\"order\":0,\"skills\":[{\"id\":\"showcase-vskill-eventsourcing\",\"name\":\"Event sourcing\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-reconciliation\",\"name\":\"Reconciliation\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-slo\",\"name\":\"SLO design\",\"level\":\"advanced\"}]},{\"id\":\"showcase-vskill-tools\",\"name\":\"Tools\",\"order\":1,\"skills\":[{\"id\":\"showcase-vskill-go\",\"name\":\"Go\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-postgres\",\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"id\":\"showcase-vskill-kafka\",\"name\":\"Kafka\",\"level\":\"advanced\"},{\"id\":\"showcase-vskill-k8s\",\"name\":\"Kubernetes\",\"level\":\"advanced\"}]}]}","contentItemId":null},{"id":"showcase-var-projects","type":"projects","order":6,"visible":true,"content":"{\"title\":\"Projects\",\"data\":[{\"id\":\"showcase-proj-ledger-replay\",\"name\":\"Ledger replay toolkit\",\"description\":\"Open-source CLI that replays ledger events into a scratch database.\",\"role\":\"Maintainer\",\"technologies\":[\"Go\",\"SQLite\"],\"url\":\"https://github.com/priyaraman/ledger-replay\",\"github\":\"https://github.com/priyaraman/ledger-replay\",\"startDate\":\"2023-02\",\"endDate\":\"\",\"current\":true,\"highlights\":[\"Replays 30 days of ledger events in under four minutes.\"]},{\"id\":\"showcase-proj-runbook\",\"name\":\"Runbook generator\",\"description\":\"Generates on-call runbooks from service manifests and SLO definitions.\",\"role\":\"Creator\",\"technologies\":[\"TypeScript\",\"Kubernetes\"],\"url\":\"https://github.com/priyaraman/runbook-gen\",\"github\":\"https://github.com/priyaraman/runbook-gen\",\"startDate\":\"2021-06\",\"endDate\":\"2022-01\",\"current\":false,\"highlights\":[\"Cut new-service onboarding from two weeks to three days.\"]}]}","contentItemId":"showcase-item-projects"},{"id":"showcase-var-certifications","type":"certifications","order":7,"visible":true,"content":"{\"title\":\"Certifications\",\"data\":[{\"id\":\"showcase-cert-aws\",\"name\":\"AWS Certified Solutions Architect – Professional\",\"issuer\":\"Amazon Web Services\",\"date\":\"2024-03\",\"expirationDate\":\"2027-03\",\"noExpiration\":false,\"credentialId\":\"AWS-PSA-2024-0118\",\"url\":\"https://www.credly.com/badges/example\",\"description\":\"\"},{\"id\":\"showcase-cert-cka\",\"name\":\"Certified Kubernetes Administrator\",\"issuer\":\"Cloud Native Computing Foundation\",\"date\":\"2024-07\",\"expirationDate\":\"2027-07\",\"noExpiration\":false,\"credentialId\":\"CKA-2024-7741\",\"url\":\"https://www.credly.com/badges/example-cka\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-var-awards","type":"awards","order":8,"visible":true,"content":"{\"title\":\"Awards\",\"data\":[{\"id\":\"showcase-award-excellence\",\"title\":\"Engineering Excellence Award\",\"issuer\":\"Meridian Pay\",\"date\":\"2024-11\",\"description\":\"\"}]}","contentItemId":null},{"id":"showcase-var-languages","type":"languages","order":9,"visible":true,"content":"{\"title\":\"Languages\",\"data\":[{\"id\":\"showcase-lang-english\",\"name\":\"English\",\"proficiency\":\"native\",\"certification\":\"Native speaker\"},{\"id\":\"showcase-lang-tamil\",\"name\":\"Tamil\",\"proficiency\":\"fluent\",\"certification\":\"Native speaker\"}]}","contentItemId":null},{"id":"showcase-var-publications","type":"publications","order":5,"visible":true,"content":"{\"title\":\"Publications & talks\",\"data\":[{\"id\":\"showcase-pub-reconciliation\",\"title\":\"Reconciling money at scale\",\"publisher\":\"priyaraman.dev\",\"date\":\"2024-09\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/ledger-reconciliation\"},{\"id\":\"showcase-pub-contract-tests\",\"title\":\"Contract tests for payment APIs\",\"publisher\":\"priyaraman.dev\",\"date\":\"2023-04\",\"authors\":[\"Priya Raman\"],\"url\":\"https://priyaraman.dev/writing/contract-tests\"}]}","contentItemId":null},{"id":"showcase-var-volunteer","type":"volunteer","order":10,"visible":false,"content":"{\"title\":\"Volunteer\",\"data\":[{\"id\":\"showcase-vol-codefuture\",\"organization\":\"Code the Future\",\"role\":\"Mentor\",\"startDate\":\"2020-03\",\"endDate\":\"\",\"current\":true,\"location\":\"Melbourne, VIC\",\"cause\":\"STEM education\",\"description\":\"\",\"highlights\":[\"Mentored 18 students across four cohorts.\"]}]}","contentItemId":null},{"id":"showcase-var-references","type":"references","order":11,"visible":false,"content":"{\"title\":\"References\",\"data\":[{\"id\":\"showcase-ref-shah\",\"name\":\"Dr. Anika Shah\",\"position\":\"Engineering Director\",\"company\":\"Meridian Pay\",\"relationship\":\"Manager\",\"email\":\"anika.shah@example.com\",\"phone\":\"+61 400 000 019\",\"linkedin\":\"https://www.linkedin.com/in/anikashah\",\"isHidden\":false},{\"id\":\"showcase-ref-lee\",\"name\":\"Marcus Lee\",\"position\":\"Chief Technology Officer\",\"company\":\"Ardent Cloud\",\"relationship\":\"Former manager\",\"email\":\"marcus.lee@example.com\",\"phone\":\"+61 400 000 020\",\"linkedin\":\"https://www.linkedin.com/in/marcuslee\",\"isHidden\":true}]}","contentItemId":null},{"id":"showcase-var-custom","type":"custom","order":12,"visible":true,"content":"{\"title\":\"Teaching & Talks\",\"html\":\"<p>Teaching and talks on distributed systems and payment reliability.</p><ul><li><strong>Guest lecture: Distributed Systems</strong> — University of Melbourne, 2024</li><li><em>Workshop: Contract tests in practice</em> — Melbourne meetup, 2023</li><li>Writing index at <a href=\\\"https://priyaraman.dev/writing\\\">priyaraman.dev</a></li></ul>\",\"json\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Teaching and talks on distributed systems and payment reliability.\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Guest lecture: Distributed Systems\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" — University of Melbourne, 2024\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Workshop: Contract tests in practice\",\"marks\":[{\"type\":\"italic\"}]},{\"type\":\"text\",\"text\":\" — Melbourne meetup, 2023\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Writing index at \"},{\"type\":\"text\",\"text\":\"priyaraman.dev\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://priyaraman.dev/writing\"}}]}]}]}]}]}}","contentItemId":null}]}',
    'seed-showcase-variant-2',
    NULL,
    CAST(strftime('%s', 'now') AS INTEGER) - 259200
);

