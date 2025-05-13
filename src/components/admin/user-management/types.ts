
export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  title?: string;
  is_admin: boolean;
  created_at?: string;
  avatar_url?: string;
  password?: string; // Add password for user creation
}
