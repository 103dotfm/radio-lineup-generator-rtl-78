
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
  password?: string; // Added optional password field for new user creation
}
