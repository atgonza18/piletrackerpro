import { supabase } from './supabase';

// Types for admin service
export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  account_type: 'epc' | 'owner';
  created_at: string;
  email_confirmed: boolean;
  is_super_admin: boolean;
  projects: {
    project_id: string;
    project_name: string;
    role: string;
    is_owner: boolean;
  }[];
}

export interface AdminProject {
  id: string;
  project_name: string;
  project_location: string;
  total_project_piles: number;
  tracker_system: string;
  geotech_company: string;
  embedment_tolerance: number;
  created_at: string;
  user_count: number;
}

export interface CreateUserParams {
  email: string;
  first_name?: string;
  last_name?: string;
  account_type?: 'epc' | 'owner';
}

export interface CreateUserResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  temporaryPassword: string;
}

export interface CreateProjectParams {
  project_name: string;
  project_location: string;
  total_project_piles?: number;
  tracker_system?: string;
  geotech_company?: string;
  role?: string;
  embedment_tolerance?: number;
}

export interface AssignUserParams {
  user_id: string;
  project_id: string;
  role: string;
  is_owner?: boolean;
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

// Helper for API calls
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const response = await fetch(`/api/admin/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export const adminService = {
  // Check if current user is super admin
  async checkSuperAdmin(): Promise<{ isSuperAdmin: boolean; userId: string }> {
    return adminFetch('check-super-admin');
  },

  // Create a new user
  async createUser(params: CreateUserParams): Promise<CreateUserResult> {
    return adminFetch('create-user', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Create a new project
  async createProject(params: CreateProjectParams): Promise<{ success: boolean; project: AdminProject }> {
    return adminFetch('create-project', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Assign user to project
  async assignUserToProject(params: AssignUserParams): Promise<{ success: boolean; assignment: unknown; updated?: boolean }> {
    return adminFetch('assign-user-to-project', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Remove user from project
  async removeUserFromProject(params: { user_id: string; project_id: string }): Promise<{ success: boolean; message: string }> {
    return adminFetch('remove-user-from-project', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // List all users
  async listUsers(page = 1, perPage = 50): Promise<{ users: AdminUser[]; total: number }> {
    return adminFetch(`list-users?page=${page}&perPage=${perPage}`);
  },

  // List all projects
  async listProjects(): Promise<{ projects: AdminProject[] }> {
    return adminFetch('list-projects');
  },

  // Grant super admin to user
  async grantSuperAdmin(user_id: string): Promise<{ success: boolean; superAdmin: unknown }> {
    return adminFetch('grant-super-admin', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  // Revoke super admin from user
  async revokeSuperAdmin(user_id: string): Promise<{ success: boolean; message: string }> {
    return adminFetch('revoke-super-admin', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  // Delete user completely from the system
  async deleteUser(user_id: string): Promise<{ success: boolean; message: string }> {
    return adminFetch('delete-user', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  // Get piles for a project (super admin only)
  async getPiles(projectId: string, page = 0, pageSize = 1000): Promise<{
    piles: any[];
    count: number;
    page: number;
    pageSize: number;
  }> {
    return adminFetch(`get-piles?projectId=${projectId}&page=${page}&pageSize=${pageSize}`);
  },

  // Get pile count for a project (super admin only)
  async getPileCount(projectId: string): Promise<{ count: number }> {
    return adminFetch(`get-piles?projectId=${projectId}&countOnly=true`);
  },

  // Get project data for super admin viewing
  async getProjectData(projectId: string): Promise<{
    project: {
      id: string;
      project_name: string;
      project_location: string;
      total_project_piles: number;
      tracker_system: string;
      geotech_company: string;
      embedment_tolerance?: number;
      daily_pile_goal?: number;
      location_lat?: number;
      location_lng?: number;
      created_at: string;
      updated_at: string;
    };
    statistics: {
      totalPiles: number;
      accepted: number;
      refusals: number;
      pending: number;
      completionPercent: number;
    };
    blockData: { name: string; count: number }[];
    weeklyTimelineData: { name: string; piles: number }[];
    monthlyTimelineData: { name: string; piles: number }[];
  }> {
    return adminFetch(`get-project-data?projectId=${projectId}`);
  },
};
