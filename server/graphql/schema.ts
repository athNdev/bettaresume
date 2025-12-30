export const typeDefs = `
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String!
    resumes: [Resume!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Resume {
    id: ID!
    userId: ID!
    user: User!
    name: String!
    variationType: String!
    template: String!
    tags: [String!]!
    isArchived: Boolean!
    sections: [Section!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Section {
    id: ID!
    resumeId: ID!
    resume: Resume!
    type: String!
    order: Int!
    visible: Boolean!
    content: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Input types for mutations
  input CreateUserInput {
    email: String!
  }

  input UpdateUserInput {
    email: String
  }

  input CreateResumeInput {
    userId: ID!
    name: String!
    variationType: String
    template: String
    tags: [String!]
    isArchived: Boolean
  }

  input UpdateResumeInput {
    name: String
    variationType: String
    template: String
    tags: [String!]
    isArchived: Boolean
  }

  input CreateSectionInput {
    resumeId: ID!
    type: String!
    order: Int
    visible: Boolean
    content: JSON!
  }

  input UpdateSectionInput {
    type: String
    order: Int
    visible: Boolean
    content: JSON
  }

  # Queries
  type Query {
    # User queries
    user(id: ID!): User
    userByEmail(email: String!): User
    users: [User!]!

    # Resume queries
    resume(id: ID!): Resume
    resumes(userId: ID, isArchived: Boolean): [Resume!]!
    resumesByUser(userId: ID!): [Resume!]!

    # Section queries
    section(id: ID!): Section
    sectionsByResume(resumeId: ID!): [Section!]!
  }

  # Mutations
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Resume mutations
    createResume(input: CreateResumeInput!): Resume!
    updateResume(id: ID!, input: UpdateResumeInput!): Resume!
    deleteResume(id: ID!): Boolean!
    archiveResume(id: ID!): Resume!
    unarchiveResume(id: ID!): Resume!
    duplicateResume(id: ID!, newName: String!): Resume!

    # Section mutations
    createSection(input: CreateSectionInput!): Section!
    updateSection(id: ID!, input: UpdateSectionInput!): Section!
    deleteSection(id: ID!): Boolean!
    reorderSections(resumeId: ID!, sectionIds: [ID!]!): [Section!]!
  }
`;
