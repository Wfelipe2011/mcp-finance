export interface LoginRequest {
  email: string;
  appPassword: string;
}

export interface ExternalLoginRequest extends LoginRequest {
  customerEmail: string;
}

export interface LoginResponse {
  success: boolean;
  appSession?: string;
  message?: string;
  error?: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  appSession: string;
}

export interface SessionEntry {
  email: string;
  appSession: string;
  expiresAt: string; // ISO 8601
}
