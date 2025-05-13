
export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  title?: string;
  is_admin: boolean;
  created_at?: string; // Making created_at optional in the interface
  avatar_url?: string;
}

// Create a separate interface that extends User for creating a new user
export interface NewUser extends Partial<User> {
  password: string;
}
