export interface AppUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}