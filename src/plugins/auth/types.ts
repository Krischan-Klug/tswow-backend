export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
}

export interface VerifyPasswordParams {
  username: string;
  password: string;
}

export interface Account {
  id: number;
  username: string;
  email: string;
}

export interface VerifyPasswordResult {
  ok: boolean;
  account?: Account;
}

