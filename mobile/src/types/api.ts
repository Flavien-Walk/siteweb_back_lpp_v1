/**
 * Types API
 * Extraits de services/api.ts
 */

export interface ReponseAPI<T = unknown> {
  succes: boolean;
  message?: string;
  data?: T;
  erreurs?: Record<string, string>;
  gamification?: any;
}

export type AccountRestrictionType = 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED';

export interface AccountRestrictionInfo {
  type: AccountRestrictionType;
  message: string;
  reason?: string;
  suspendedUntil?: string;
}
