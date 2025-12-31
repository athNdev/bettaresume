# BettaResume GraphQL Server

A Fastify-based GraphQL API server with SQLite database using Drizzle ORM.

## Setup

```bash
cd server

# Install dependencies
npm install

# Setup database (creates tables)
npm run db:setup

# Seed sample data
npm run seed

# Start development server
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm run db:setup` | Create database and tables |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run seed` | Seed database with sample data |

## Endpoints

- **GraphQL**: `http://localhost:4000/graphql`
- **GraphiQL IDE**: `http://localhost:4000/graphiql`
- **Health Check**: `http://localhost:4000/health`

## Example Queries

### Get all users
```graphql
query {
  users {
    id
    email
    resumes {
      id
      name
    }
  }
}
```

### Get resume with sections
```graphql
query {
  resume(id: "resume-software-engineer-001") {
    id
    name
    template
    tags
    sections {
      id
      type
      order
      content
    }
  }
}
```

### Create a user
```graphql
mutation {
  createUser(input: { email: "john@example.com" }) {
    id
    email
  }
}
```

### Create a resume
```graphql
mutation {
  createResume(input: {
    userId: "user-id-here"
    name: "My New Resume"
    template: "modern"
    tags: ["software", "frontend"]
  }) {
    id
    name
  }
}
```

### Update a section
```graphql
mutation {
  updateSection(
    id: "sec-personal-se-001"
    input: {
      content: {
        title: "Personal Information"
        data: {
          firstName: "Alex"
          lastName: "Chen"
          email: "alex@newdomain.com"
        }
      }
    }
  ) {
    id
    content
  }
}
```

## Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (UUID) |
| email | TEXT | Unique email address |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |

### Resumes Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key to users |
| name | TEXT | Resume name |
| variation_type | TEXT | 'base', 'software', etc. |
| template | TEXT | Template name |
| tags | TEXT (JSON) | Array of tags |
| is_archived | INTEGER | Boolean |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |

### Sections Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| resume_id | TEXT | Foreign key to resumes |
| type | TEXT | Section type |
| order | INTEGER | Display order |
| visible | INTEGER | Boolean |
| content | TEXT (JSON) | Section content |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |
