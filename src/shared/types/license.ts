export interface License {
  key: string;
  email: string;
  purchaseDate: Date;
  monthsPaid: number;
  totalPaid: number;
  isUnlocked: boolean; // true after 10 months or upfront purchase
  lastPaymentDate?: Date;
  status: 'active' | 'cancelled' | 'expired' | 'unlocked';
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: License;
  reason?: string;
}

export interface LicenseStatus {
  hasProAccess: boolean;
  isPermanent: boolean;
  monthsPaid: number;
  monthsRemaining: number;
  progress: number; // 0-100
  message: string;
}
