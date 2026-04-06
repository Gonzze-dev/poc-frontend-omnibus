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

export interface ForgotPasswordRequest {
  email: string;
}

/** Respuesta normalizada de POST /api/auth/forgot-password */
export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  password: string;
}

/** Respuesta normalizada de GET /api/auth/validate-recovery-token */
export interface ValidateRecoveryTokenResponse {
  valid: boolean;
  expiresAt: string | null;
}

/** Respuesta de POST /api/auth/reset-password */
export interface ResetPasswordResponse {
  message: string;
}
