export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  dni: string;
  rol: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
