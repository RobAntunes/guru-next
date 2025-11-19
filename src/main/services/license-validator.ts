/**
 * License Validator Service
 * Rent-to-own license validation for Guru Pro
 * - Pay $15/mo for 10 months = $150 total to own forever
 * - Integrates with Lemon Squeezy webhooks
 */

import { License, LicenseValidationResult, LicenseStatus } from '../../shared/types/license';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import { createHash, createHmac } from 'crypto';

class LicenseValidatorService {
  private readonly licenseFile: string;
  private cachedLicense: License | null = null;
  private readonly MONTHS_TO_UNLOCK = 10;
  private readonly PRICE_PER_MONTH = 15;

  constructor() {
    this.licenseFile = join(app.getPath('userData'), 'license.json');
  }

  /**
   * Validate a license key from Lemon Squeezy
   * Format: email|purchaseDate|monthsPaid|isUnlocked|signature
   */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    try {
      const parts = licenseKey.split('|');
      if (parts.length !== 5) {
        return {
          valid: false,
          reason: 'Invalid license key format'
        };
      }

      const [email, purchaseDateStr, monthsPaidStr, isUnlockedStr, signature] = parts;

      // Verify signature
      const expectedSignature = this.generateSignature(email, purchaseDateStr, monthsPaidStr, isUnlockedStr);
      if (signature !== expectedSignature) {
        return {
          valid: false,
          reason: 'Invalid license signature'
        };
      }

      const monthsPaid = parseInt(monthsPaidStr, 10);
      const isUnlocked = isUnlockedStr === 'true';
      const purchaseDate = new Date(purchaseDateStr);

      // Create license object
      const license: License = {
        key: licenseKey,
        email,
        purchaseDate,
        monthsPaid,
        totalPaid: monthsPaid * this.PRICE_PER_MONTH,
        isUnlocked: isUnlocked || monthsPaid >= this.MONTHS_TO_UNLOCK,
        status: isUnlocked || monthsPaid >= this.MONTHS_TO_UNLOCK ? 'unlocked' : 'active'
      };

      return {
        valid: true,
        license
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'License validation error'
      };
    }
  }

  /**
   * Save license to disk
   */
  async saveLicense(license: License): Promise<void> {
    await writeFile(this.licenseFile, JSON.stringify(license, null, 2));
    this.cachedLicense = license;
  }

  /**
   * Load license from disk
   */
  async loadLicense(): Promise<License | null> {
    try {
      if (this.cachedLicense) {
        return this.cachedLicense;
      }

      const data = await readFile(this.licenseFile, 'utf-8');
      const license = JSON.parse(data) as License;
      this.cachedLicense = license;
      return license;
    } catch (error) {
      // No license file exists
      return null;
    }
  }

  /**
   * Get license status with progress
   */
  async getLicenseStatus(): Promise<LicenseStatus> {
    const license = await this.loadLicense();

    if (!license) {
      return {
        hasProAccess: false,
        isPermanent: false,
        monthsPaid: 0,
        monthsRemaining: this.MONTHS_TO_UNLOCK,
        progress: 0,
        message: 'No license - Community Edition'
      };
    }

    const hasProAccess = license.status === 'active' || license.status === 'unlocked';
    const isPermanent = license.isUnlocked;
    const monthsRemaining = Math.max(0, this.MONTHS_TO_UNLOCK - license.monthsPaid);
    const progress = Math.min(100, (license.monthsPaid / this.MONTHS_TO_UNLOCK) * 100);

    let message = '';
    if (isPermanent) {
      message = '🎉 You own Guru Pro forever!';
    } else if (hasProAccess) {
      message = `${license.monthsPaid}/${this.MONTHS_TO_UNLOCK} months paid - $${monthsRemaining * this.PRICE_PER_MONTH} remaining to unlock`;
    } else {
      message = 'License inactive - Subscribe to continue';
    }

    return {
      hasProAccess,
      isPermanent,
      monthsPaid: license.monthsPaid,
      monthsRemaining,
      progress,
      message
    };
  }

  /**
   * Check if Pro features are available
   */
  async hasProAccess(): Promise<boolean> {
    const license = await this.loadLicense();
    if (!license) {
      return false;
    }

    // Pro access if actively paying OR permanently unlocked
    return license.status === 'active' || license.status === 'unlocked';
  }

  /**
   * Remove license
   */
  async removeLicense(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(this.licenseFile);
      this.cachedLicense = null;
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }

  /**
   * Generate signature for license validation
   * Uses HMAC-SHA256 with secret key
   */
  private generateSignature(...parts: string[]): string {
    const secret = process.env.GURU_LICENSE_SECRET || 'guru-pro-secret-key-change-in-production';
    const data = parts.join(':');
    return createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
  }

  /**
   * Generate a license key (for development/testing)
   */
  generateLicenseKey(email: string, monthsPaid: number = 0, isUnlocked: boolean = false): string {
    const purchaseDate = new Date().toISOString();
    const signature = this.generateSignature(email, purchaseDate, monthsPaid.toString(), isUnlocked.toString());
    return `${email}|${purchaseDate}|${monthsPaid}|${isUnlocked}|${signature}`;
  }

  /**
   * Update license from Lemon Squeezy webhook data
   */
  async updateLicenseFromWebhook(data: {
    email: string;
    monthsPaid: number;
    status: 'active' | 'cancelled' | 'expired';
  }): Promise<void> {
    const license = await this.loadLicense();

    if (!license || license.email !== data.email) {
      // Create new license
      const isUnlocked = data.monthsPaid >= this.MONTHS_TO_UNLOCK;
      const newLicense: License = {
        key: this.generateLicenseKey(data.email, data.monthsPaid, isUnlocked),
        email: data.email,
        purchaseDate: new Date(),
        monthsPaid: data.monthsPaid,
        totalPaid: data.monthsPaid * this.PRICE_PER_MONTH,
        isUnlocked,
        lastPaymentDate: new Date(),
        status: isUnlocked ? 'unlocked' : data.status
      };
      await this.saveLicense(newLicense);
    } else {
      // Update existing license
      const isUnlocked = license.isUnlocked || data.monthsPaid >= this.MONTHS_TO_UNLOCK;
      license.monthsPaid = data.monthsPaid;
      license.totalPaid = data.monthsPaid * this.PRICE_PER_MONTH;
      license.isUnlocked = isUnlocked;
      license.lastPaymentDate = new Date();
      license.status = isUnlocked ? 'unlocked' : data.status;

      // Regenerate key with updated data
      license.key = this.generateLicenseKey(license.email, license.monthsPaid, license.isUnlocked);

      await this.saveLicense(license);
    }
  }
}

export const licenseValidator = new LicenseValidatorService();
