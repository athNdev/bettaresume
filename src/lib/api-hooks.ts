'use client';

import { useState, useCallback } from 'react';
import { apiRequest } from './graphql-client';
import * as queries from './graphql-queries';

// ============================================
// Types
// ============================================

export interface APIUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIResume {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  template: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: APISection[];
}

export interface APISection {
  id: string;
  resumeId: string;
  type: string;
  order: number;
  visible: boolean;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// User Hooks
// ============================================

export function useUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getUserByEmail = useCallback(async (email: string): Promise<APIUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ userByEmail: APIUser | null }>(
        queries.GET_USER_BY_EMAIL,
        { email }
      );
      return data.userByEmail;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (email: string): Promise<APIUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ createUser: APIUser }>(
        queries.CREATE_USER,
        { input: { email } }
      );
      return data.createUser;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create user'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrCreateUser = useCallback(async (email: string): Promise<APIUser | null> => {
    const existing = await getUserByEmail(email);
    if (existing) return existing;
    return createUser(email);
  }, [getUserByEmail, createUser]);

  return { getUserByEmail, createUser, getOrCreateUser, loading, error };
}

// ============================================
// Resume Hooks
// ============================================

export function useResumes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getResumes = useCallback(async (userId?: string, isArchived?: boolean): Promise<APIResume[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ resumes: APIResume[] }>(
        queries.GET_RESUMES,
        { userId, isArchived }
      );
      return data.resumes;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch resumes'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getResume = useCallback(async (id: string): Promise<APIResume | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ resume: APIResume | null }>(
        queries.GET_RESUME_WITH_SECTIONS,
        { id }
      );
      return data.resume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch resume'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createResume = useCallback(async (input: {
    userId: string;
    name: string;
    variationType?: string;
    template?: string;
    tags?: string[];
  }): Promise<APIResume | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ createResume: APIResume }>(
        queries.CREATE_RESUME,
        { input }
      );
      return data.createResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create resume'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateResume = useCallback(async (id: string, input: {
    name?: string;
    variationType?: string;
    template?: string;
    tags?: string[];
    isArchived?: boolean;
  }): Promise<APIResume | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ updateResume: APIResume }>(
        queries.UPDATE_RESUME,
        { id, input }
      );
      return data.updateResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update resume'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteResume = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ deleteResume: boolean }>(
        queries.DELETE_RESUME,
        { id }
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete resume'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveResume = useCallback(async (id: string): Promise<APIResume | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ archiveResume: APIResume }>(
        queries.ARCHIVE_RESUME,
        { id }
      );
      return data.archiveResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to archive resume'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateResume = useCallback(async (id: string, newName: string): Promise<APIResume | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ duplicateResume: APIResume }>(
        queries.DUPLICATE_RESUME,
        { id, newName }
      );
      return data.duplicateResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to duplicate resume'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getResumes,
    getResume,
    createResume,
    updateResume,
    deleteResume,
    archiveResume,
    duplicateResume,
    loading,
    error,
  };
}

// ============================================
// Section Hooks
// ============================================

export function useSections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSections = useCallback(async (resumeId: string): Promise<APISection[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ sectionsByResume: APISection[] }>(
        queries.GET_SECTIONS_BY_RESUME,
        { resumeId }
      );
      return data.sectionsByResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sections'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createSection = useCallback(async (input: {
    resumeId: string;
    type: string;
    order?: number;
    visible?: boolean;
    content: Record<string, unknown>;
  }): Promise<APISection | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ createSection: APISection }>(
        queries.CREATE_SECTION,
        { input }
      );
      return data.createSection;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create section'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSection = useCallback(async (id: string, input: {
    type?: string;
    order?: number;
    visible?: boolean;
    content?: Record<string, unknown>;
  }): Promise<APISection | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ updateSection: APISection }>(
        queries.UPDATE_SECTION,
        { id, input }
      );
      return data.updateSection;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update section'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSection = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ deleteSection: boolean }>(
        queries.DELETE_SECTION,
        { id }
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete section'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reorderSections = useCallback(async (resumeId: string, sectionIds: string[]): Promise<APISection[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ reorderSections: APISection[] }>(
        queries.REORDER_SECTIONS,
        { resumeId, sectionIds }
      );
      return data.reorderSections;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reorder sections'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    loading,
    error,
  };
}
