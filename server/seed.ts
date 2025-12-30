import { db, users, resumes, sections } from './db';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Create a sample user
  const userId = uuidv4();
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    email: 'alex.chen@example.com',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ Created user: alex.chen@example.com');

  // Create a sample resume
  const resumeId = 'resume-software-engineer-001';
  
  await db.insert(resumes).values({
    id: resumeId,
    userId: userId,
    name: 'Alex Chen - Senior Software Engineer',
    variationType: 'base',
    template: 'modern',
    tags: ['software', 'engineering', 'full-stack', 'react', 'node'],
    isArchived: false,
    createdAt: new Date('2025-10-15T08:30:00.000Z'),
    updatedAt: new Date('2025-12-20T14:25:00.000Z'),
  });
  console.log('✅ Created resume: Alex Chen - Senior Software Engineer');

  // Create sections
  const sampleSections = [
    {
      id: 'sec-personal-se-001',
      resumeId,
      type: 'personal-info',
      order: 0,
      visible: true,
      content: {
        title: 'Personal Information',
        data: {
          firstName: 'Alex',
          lastName: 'Chen',
          email: 'alex.chen@example.com',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA',
          linkedin: 'linkedin.com/in/alexchen',
          github: 'github.com/alexchen',
        },
      },
    },
    {
      id: 'sec-summary-se-001',
      resumeId,
      type: 'summary',
      order: 1,
      visible: true,
      content: {
        title: 'Professional Summary',
        data: {},
        html: '<p>Innovative <strong>Senior Software Engineer</strong> with 8+ years of experience building scalable web applications and leading cross-functional teams. Expert in React, Node.js, and cloud architecture with a proven track record of delivering high-impact projects that increased user engagement by 40% and reduced infrastructure costs by 35%.</p>',
      },
    },
    {
      id: 'sec-experience-se-001',
      resumeId,
      type: 'experience',
      order: 2,
      visible: true,
      content: {
        title: 'Professional Experience',
        data: [
          {
            id: 'exp-se-001',
            company: 'TechCorp Global',
            position: 'Senior Software Engineer',
            startDate: '2022-03-01',
            current: true,
            location: 'San Francisco, CA',
            locationType: 'hybrid',
            employmentType: 'full-time',
            description: 'Lead engineer for the platform team responsible for core infrastructure serving 10M+ users',
            highlights: [
              'Architected microservices migration improving system reliability from 99.5% to 99.99% uptime',
              'Led team of 5 engineers to deliver real-time collaboration feature increasing user engagement by 40%',
              'Reduced deployment time from 45 minutes to 5 minutes with CI/CD pipelines',
            ],
            technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Kubernetes'],
          },
          {
            id: 'exp-se-002',
            company: 'StartupXYZ',
            position: 'Full Stack Developer',
            startDate: '2019-06-01',
            endDate: '2022-02-28',
            current: false,
            location: 'Austin, TX',
            locationType: 'onsite',
            employmentType: 'full-time',
            description: 'Core developer for B2B SaaS platform in the fintech space',
            highlights: [
              'Built payment processing system handling $50M+ in annual transactions',
              'Developed analytics dashboard reducing customer support tickets by 30%',
            ],
            technologies: ['Vue.js', 'Python', 'Django', 'PostgreSQL', 'Stripe', 'Docker'],
          },
        ],
      },
    },
    {
      id: 'sec-education-se-001',
      resumeId,
      type: 'education',
      order: 3,
      visible: true,
      content: {
        title: 'Education',
        data: [
          {
            id: 'edu-se-001',
            institution: 'University of California, Berkeley',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            startDate: '2013-08-01',
            endDate: '2017-05-15',
            current: false,
            gpa: '3.8',
            maxGpa: '4.0',
            location: 'Berkeley, CA',
            achievements: ['Dean\'s List - 6 semesters', 'Undergraduate Research Assistant'],
            coursework: ['Data Structures', 'Algorithms', 'Operating Systems', 'Machine Learning'],
            honors: ['Cum Laude', 'Phi Beta Kappa'],
          },
        ],
      },
    },
    {
      id: 'sec-skills-se-001',
      resumeId,
      type: 'skills',
      order: 4,
      visible: true,
      content: {
        title: 'Technical Skills',
        data: [
          {
            id: 'skill-cat-se-001',
            name: 'Frontend',
            order: 0,
            skills: [
              { id: 'sk-se-001', name: 'React', level: 'expert', yearsOfExperience: 6 },
              { id: 'sk-se-002', name: 'TypeScript', level: 'expert', yearsOfExperience: 5 },
              { id: 'sk-se-003', name: 'Next.js', level: 'advanced', yearsOfExperience: 3 },
            ],
          },
          {
            id: 'skill-cat-se-002',
            name: 'Backend',
            order: 1,
            skills: [
              { id: 'sk-se-004', name: 'Node.js', level: 'expert', yearsOfExperience: 6 },
              { id: 'sk-se-005', name: 'Python', level: 'advanced', yearsOfExperience: 4 },
              { id: 'sk-se-006', name: 'PostgreSQL', level: 'expert', yearsOfExperience: 6 },
            ],
          },
          {
            id: 'skill-cat-se-003',
            name: 'DevOps & Cloud',
            order: 2,
            skills: [
              { id: 'sk-se-007', name: 'AWS', level: 'advanced', yearsOfExperience: 5 },
              { id: 'sk-se-008', name: 'Docker', level: 'advanced', yearsOfExperience: 4 },
              { id: 'sk-se-009', name: 'Kubernetes', level: 'intermediate', yearsOfExperience: 2 },
            ],
          },
        ],
      },
    },
    {
      id: 'sec-projects-se-001',
      resumeId,
      type: 'projects',
      order: 5,
      visible: true,
      content: {
        title: 'Notable Projects',
        data: [
          {
            id: 'proj-se-001',
            name: 'OpenSource Analytics Platform',
            description: 'Built an open-source web analytics platform as an alternative to Google Analytics',
            url: 'https://analytics-demo.example.com',
            github: 'https://github.com/alexchen/analytics',
            technologies: ['Next.js', 'PostgreSQL', 'Redis', 'Docker'],
            highlights: [
              '2,500+ GitHub stars',
              'Self-hostable with one-click deploy',
              'Privacy-focused, GDPR compliant',
            ],
          },
        ],
      },
    },
  ];

  for (const section of sampleSections) {
    await db.insert(sections).values({
      id: section.id,
      resumeId: section.resumeId,
      type: section.type,
      order: section.order,
      visible: section.visible,
      content: section.content,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Created section: ${section.type}`);
  }

  console.log('\n✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
