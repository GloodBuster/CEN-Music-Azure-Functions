export interface UserResponse {
  user: User;
}

export interface User {
  id: number;
  fullname: string;
  email: string;
  created_at: string;
}
