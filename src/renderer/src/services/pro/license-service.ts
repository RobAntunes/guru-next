/**
 * License Service (Renderer)
 * Client-side license management
 */

import type { License, LicenseValidationResult } from '../../../../shared/types/license';

declare global {
  interface Window {
    api: any;
  }
}

class LicenseService {
  /**
   * Validate and save license
   */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    const result = await window.api.license.validate(licenseKey);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Get current license
   */
  async getLicense(): Promise<License | null> {
    const result = await window.api.license.get();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Remove license
   */
  async removeLicense(): Promise<void> {
    const result = await window.api.license.remove();
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Get current tier
   */
  async getTier(): Promise<'free' | 'pro' | 'team'> {
    const result = await window.api.license.getTier();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Check if feature is available
   */
  async hasFeature(feature: string): Promise<boolean> {
    const result = await window.api.license.hasFeature(feature);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Generate dev license (development only)
   */
  async generateDevLicense(email: string, tier: 'pro' | 'team'): Promise<string> {
    const result = await window.api.license.generateDev(email, tier);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export const licenseService = new LicenseService();
