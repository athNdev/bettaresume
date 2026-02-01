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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    'tech',
    '["backend","platform","sre"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    '{"personalInfo":{"fullName":"Avery Chen","email":"avery.chen@example.com","phone":"+61 400 000 001","location":"Melbourne, VIC","linkedin":"linkedin.com/in/averychen","github":"github.com/averychen","website":"averychen.dev","portfolio":"","professionalTitle":"Senior Software Engineer","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"}}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-personal',
    'resume-2',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Avery Chen","email":"avery.chen@example.com","phone":"+61 400 000 001","location":"Melbourne, VIC","linkedin":"linkedin.com/in/averychen","github":"github.com/averychen","website":"averychen.dev"}}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-summary',
    'resume-2',
    'summary',
    1,
    1,
    '{"title":"Summary","html":"<p>Senior backend engineer with distributed-systems experience. Led large migrations, improved reliability, and built high-throughput pipelines with strong observability.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-exp',
    'resume-2',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp2-1","company":"Nimbus Cloud","position":"Staff Platform Engineer","location":"Remote","startDate":"2022-02","endDate":"","current":true,"description":"Owned reliability initiatives and service platform evolution.","highlights":["Improved availability by introducing SLOs and error budgets","Reduced incident volume by building runbooks and automated alert tuning","Implemented idempotent event ingestion and replay mechanisms","Cut p95 latency via caching and query optimization","Standardized service templates and golden paths to speed delivery","Led postmortems and cross-team remediation plans"],"technologies":["TypeScript","Go","PostgreSQL","Redis","Kubernetes"]},{"id":"exp2-2","company":"Finly","position":"Senior Software Engineer","location":"Sydney, NSW","startDate":"2019-01","endDate":"2022-01","current":false,"description":"Built payment workflows and ledger services with auditability.","highlights":["Migrated core ledger queries and improved performance significantly","Introduced outbox pattern for reliable event publishing","Built reconciliation dashboards with anomaly detection","Created data access layer conventions and testing patterns","Improved deployment reliability by adding health checks and rollbacks","Partnered with risk teams on compliance requirements"],"technologies":["Node.js","TypeScript","PostgreSQL","Redis"]},{"id":"exp2-3","company":"Atlas Pay","position":"Software Engineer","location":"Melbourne, VIC","startDate":"2016-02","endDate":"2018-12","current":false,"description":"Worked on backend APIs and data processing.","highlights":["Built REST APIs and background workers for settlement","Improved observability by adding structured logging","Introduced CI checks and faster build pipelines","Implemented pagination, filtering, and caching patterns","Reduced manual ops work with automation scripts","Supported on-call rotations and incident response"],"technologies":["JavaScript","PostgreSQL","Docker"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-skills',
    'resume-2',
    'skills',
    3,
    1,
    '{"title":"Skills","data":[{"id":"sc2-1","name":"Backend & Systems","skills":[{"id":"sk2-1","name":"TypeScript","level":"expert"},{"id":"sk2-2","name":"Go","level":"advanced"},{"id":"sk2-3","name":"PostgreSQL","level":"expert"},{"id":"sk2-4","name":"Redis","level":"advanced"}]},{"id":"sc2-2","name":"Infra & Observability","skills":[{"id":"sk2-5","name":"Kubernetes","level":"advanced"},{"id":"sk2-6","name":"Docker","level":"advanced"},{"id":"sk2-7","name":"CI/CD","level":"advanced"},{"id":"sk2-8","name":"Monitoring","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec2-proj',
    'resume-2',
    'projects',
    4,
    1,
    '{"title":"Projects","data":[{"id":"pr2-1","name":"Edge Log Processor","description":"Streaming processor for edge deployments with durable queues and replay.","url":"","technologies":["Rust","SQLite"],"highlights":["Designed plugin model for transforms and sinks","Built replay tooling for incident recovery","Added end-to-end tests for reliability" ]},{"id":"pr2-2","name":"Service Template Generator","description":"CLI to bootstrap services with observability and best practices.","url":"","technologies":["TypeScript"],"highlights":["Standardized telemetry and health endpoints","Reduced time-to-first-deploy for new services","Provided guardrails for config and secrets" ]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    'modern',
    '["frontend","fullstack","product"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    '{"personalInfo":{"fullName":"Sam Rivera","email":"sam.rivera@example.com","phone":"+61 400 000 002","location":"Sydney, NSW","linkedin":"linkedin.com/in/samrivera","github":"github.com/samrivera","website":"","portfolio":"","professionalTitle":"Product Engineer","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"}}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-personal',
    'resume-3',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Sam Rivera","email":"sam.rivera@example.com","phone":"+61 400 000 002","location":"Sydney, NSW","linkedin":"linkedin.com/in/samrivera","github":"github.com/samrivera"}}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-summary',
    'resume-3',
    'summary',
    1,
    1,
    '{"title":"Profile","html":"<p>Full-stack product engineer focused on UX, performance, and reliable delivery. Comfortable owning features end-to-end from discovery to launch.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-exp',
    'resume-3',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp3-1","company":"Betta Labs","position":"Product Engineer","location":"Sydney, NSW","startDate":"2023-01","endDate":"","current":true,"description":"Shipped customer-facing features and internal tooling.","highlights":["Improved Core Web Vitals through code-splitting and caching","Built a design system and standardized component patterns","Reduced form errors by adding validation and inline guidance","Created analytics dashboards for feature adoption","Improved onboarding funnel and reduced drop-off","Collaborated with design and support to prioritize fixes"],"technologies":["Next.js","TypeScript","tRPC","PostgreSQL"]},{"id":"exp3-2","company":"FlowCRM","position":"Full Stack Developer","location":"Remote","startDate":"2021-04","endDate":"2022-12","current":false,"description":"Built workflow automation and integrations.","highlights":["Implemented webhook-based integrations and retries","Built role-based access control flows","Reduced API errors by improving validation and rate-limits","Implemented optimistic updates for a faster UI","Added tests and CI checks for stability","Partnered with CS to debug production issues"],"technologies":["React","TypeScript","Node.js"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-proj',
    'resume-3',
    'projects',
    3,
    1,
    '{"title":"Projects","data":[{"id":"pr3-1","name":"Resume Builder UI","description":"Editor interface with live preview and autosave.","url":"","technologies":["React","TypeScript"],"highlights":["Implemented sections manager UX","Added debounced autosave and retries","Improved accessibility for forms" ]},{"id":"pr3-2","name":"Experiment Framework","description":"Lightweight feature flags and A/B testing utilities.","url":"","technologies":["TypeScript"],"highlights":["Added consistent event tracking","Built admin UI for toggles","Standardized experiment analysis exports" ]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec3-skills',
    'resume-3',
    'skills',
    4,
    1,
    '{"title":"Skills","data":[{"id":"sc3-1","name":"Frontend","skills":[{"id":"sk3-1","name":"React","level":"expert"},{"id":"sk3-2","name":"Next.js","level":"advanced"},{"id":"sk3-3","name":"TypeScript","level":"expert"}]},{"id":"sc3-2","name":"Backend","skills":[{"id":"sk3-4","name":"Node.js","level":"advanced"},{"id":"sk3-5","name":"PostgreSQL","level":"advanced"},{"id":"sk3-6","name":"REST APIs","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
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
    'professional',
    '["consulting","strategy","ops"]',
    0,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    '{"personalInfo":{"fullName":"Jordan Patel","email":"jordan.patel@example.com","phone":"+61 400 000 003","location":"Brisbane, QLD","linkedin":"linkedin.com/in/jordanpatel","github":"","website":"","portfolio":"","professionalTitle":"Consultant","photoUrl":""},"settings":{"fontFamily":"Inter","fontSize":11,"lineHeight":1.4,"margins":{"top":40,"right":40,"bottom":40,"left":40},"sectionSpacing":"normal","colors":{"primary":"#1e293b","secondary":"#64748b","text":"#0f172a","heading":"#0f172a","background":"#ffffff","accent":"#2563eb","divider":"#e2e8f0"}}}'
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-personal',
    'resume-4',
    'personal-info',
    0,
    1,
    '{"title":"Contact","data":{"fullName":"Jordan Patel","email":"jordan.patel@example.com","phone":"+61 400 000 003","location":"Brisbane, QLD","linkedin":"linkedin.com/in/jordanpatel"}}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-summary',
    'resume-4',
    'summary',
    1,
    1,
    '{"title":"Profile","html":"<p>Consultant delivering cost transformation, operating model design, and analytics-driven decision support. Strong stakeholder management and executive communication.</p>"}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-exp',
    'resume-4',
    'experience',
    2,
    1,
    '{"title":"Experience","data":[{"id":"exp4-1","company":"Northbridge Consulting","position":"Senior Consultant","location":"Brisbane, QLD","startDate":"2021-03","endDate":"","current":true,"description":"Led workstreams across transformation programs and built executive-ready deliverables.","highlights":["Built savings roadmap with quantified benefits and risks","Created KPI framework and weekly exec dashboard","Facilitated workshops to define target operating model and RACI","Produced board-ready narrative and supporting analysis","Managed stakeholders across finance, ops, and tech","Improved governance cadence and decision logs"],"technologies":["Excel","PowerPoint","SQL"]},{"id":"exp4-2","company":"Crescent Retail","position":"Consultant","location":"Sydney, NSW","startDate":"2019-02","endDate":"2021-02","current":false,"description":"Supported growth strategy and operational performance initiatives.","highlights":["Modeled store-level profitability drivers and scenarios","Designed metrics for supply chain performance","Built reporting packs used by regional leadership","Conducted customer research and synthesized findings","Supported program management for multi-site rollout","Created training materials for new processes"],"technologies":["Excel","PowerPoint"]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO "Section" (id, resumeId, type, "order", visible, content, createdAt, updatedAt)
VALUES (
    'sec4-skills',
    'resume-4',
    'skills',
    3,
    1,
    '{"title":"Skills","data":[{"id":"sc4-1","name":"Strategy & Ops","skills":[{"id":"sk4-1","name":"Operating Model","level":"advanced"},{"id":"sk4-2","name":"Cost Transformation","level":"advanced"},{"id":"sk4-3","name":"Stakeholder Management","level":"expert"}]},{"id":"sc4-2","name":"Analytics","skills":[{"id":"sk4-4","name":"SQL","level":"advanced"},{"id":"sk4-5","name":"Financial Modeling","level":"advanced"},{"id":"sk4-6","name":"Dashboarding","level":"advanced"}]}]}',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

