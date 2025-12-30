import { gql } from 'graphql-request';

// ============================================
// User Queries & Mutations
// ============================================

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    userByEmail(email: $email) {
      id
      email
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      createdAt
    }
  }
`;

// ============================================
// Resume Queries & Mutations
// ============================================

export const GET_RESUMES = gql`
  query GetResumes($userId: ID, $isArchived: Boolean) {
    resumes(userId: $userId, isArchived: $isArchived) {
      id
      userId
      name
      variationType
      template
      tags
      isArchived
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESUME = gql`
  query GetResume($id: ID!) {
    resume(id: $id) {
      id
      userId
      name
      variationType
      template
      tags
      isArchived
      createdAt
      updatedAt
      sections {
        id
        type
        order
        visible
        content
      }
    }
  }
`;

export const GET_RESUME_WITH_SECTIONS = gql`
  query GetResumeWithSections($id: ID!) {
    resume(id: $id) {
      id
      userId
      name
      variationType
      template
      tags
      isArchived
      createdAt
      updatedAt
      sections {
        id
        resumeId
        type
        order
        visible
        content
        createdAt
        updatedAt
      }
    }
  }
`;

export const CREATE_RESUME = gql`
  mutation CreateResume($input: CreateResumeInput!) {
    createResume(input: $input) {
      id
      userId
      name
      variationType
      template
      tags
      isArchived
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_RESUME = gql`
  mutation UpdateResume($id: ID!, $input: UpdateResumeInput!) {
    updateResume(id: $id, input: $input) {
      id
      name
      variationType
      template
      tags
      isArchived
      updatedAt
    }
  }
`;

export const DELETE_RESUME = gql`
  mutation DeleteResume($id: ID!) {
    deleteResume(id: $id)
  }
`;

export const ARCHIVE_RESUME = gql`
  mutation ArchiveResume($id: ID!) {
    archiveResume(id: $id) {
      id
      isArchived
      updatedAt
    }
  }
`;

export const UNARCHIVE_RESUME = gql`
  mutation UnarchiveResume($id: ID!) {
    unarchiveResume(id: $id) {
      id
      isArchived
      updatedAt
    }
  }
`;

export const DUPLICATE_RESUME = gql`
  mutation DuplicateResume($id: ID!, $newName: String!) {
    duplicateResume(id: $id, newName: $newName) {
      id
      name
      variationType
      template
      tags
      createdAt
      sections {
        id
        type
        order
        visible
        content
      }
    }
  }
`;

// ============================================
// Section Queries & Mutations
// ============================================

export const GET_SECTIONS_BY_RESUME = gql`
  query GetSectionsByResume($resumeId: ID!) {
    sectionsByResume(resumeId: $resumeId) {
      id
      resumeId
      type
      order
      visible
      content
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SECTION = gql`
  mutation CreateSection($input: CreateSectionInput!) {
    createSection(input: $input) {
      id
      resumeId
      type
      order
      visible
      content
      createdAt
    }
  }
`;

export const UPDATE_SECTION = gql`
  mutation UpdateSection($id: ID!, $input: UpdateSectionInput!) {
    updateSection(id: $id, input: $input) {
      id
      type
      order
      visible
      content
      updatedAt
    }
  }
`;

export const DELETE_SECTION = gql`
  mutation DeleteSection($id: ID!) {
    deleteSection(id: $id)
  }
`;

export const REORDER_SECTIONS = gql`
  mutation ReorderSections($resumeId: ID!, $sectionIds: [ID!]!) {
    reorderSections(resumeId: $resumeId, sectionIds: $sectionIds) {
      id
      order
    }
  }
`;
