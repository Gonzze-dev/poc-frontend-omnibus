export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserTerminalRef {
  uuid: string;
  name: string;
}

/** Perfil devuelto por GET /api/users/me (forma variable según rol). */
export interface UserMe {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  dni: string;
  rol: string;
  created_at?: string;
  updated_at?: string;
  terminals?: UserTerminalRef[];
}

export interface User {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  dni: string;
  rol: string;
  created_at?: string;
  updated_at?: string;
  terminals?: UserTerminalRef[];
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
