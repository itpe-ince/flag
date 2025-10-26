import { Country } from '../types';

/**
 * Service for managing CDN integration and image optimization
 * Handles flag image URL generation and optimization
 */
export class CDNService {
  private readonly cdnBaseUrl: string;
  private readonly fallbackUrl: string;
  
  constructor() {
    this.cdnBaseUrl = process.env.CDN_BASE_URL || 'https://flagcdn.com/w320';
    this.fallbackUrl = 'https://flagcdn.com/w320'; // Fallback to flagcdn.com
  }
  
  /**
   * Generates optimized CDN URL for a flag image
   */
  generateFlagUrl(countryCode: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizeMap = {
      small: 'w160',
      medium: 'w320', 
      large: 'w640'
    };
    
    const sizePrefix = sizeMap[size];
    const code = countryCode.toLowerCase();
    
    // If using custom CDN, construct URL accordingly
    if (this.cdnBaseUrl !== this.fallbackUrl) {
      return `${this.cdnBaseUrl}/${code}.png`;
    }
    
    // Use flagcdn.com format
    return `${this.cdnBaseUrl.replace('w320', sizePrefix)}/${code}.png`;
  }
  
  /**
   * Generates multiple sizes for responsive images
   */
  generateResponsiveUrls(countryCode: string): {
    small: string;
    medium: string;
    large: string;
  } {
    return {
      small: this.generateFlagUrl(countryCode, 'small'),
      medium: this.generateFlagUrl(countryCode, 'medium'),
      large: this.generateFlagUrl(countryCode, 'large')
    };
  }
  
  /**
   * Updates country objects with CDN URLs
   */
  updateCountriesWithCDNUrls(countries: Country[]): Country[] {
    return countries.map(country => ({
      ...country,
      imageUrl: this.generateFlagUrl(country.code),
      // Add responsive URLs as additional property
      responsiveUrls: this.generateResponsiveUrls(country.code)
    }));
  }
  
  /**
   * Generates preload URLs for next questions
   */
  generatePreloadUrls(countries: Country[], count: number = 3): string[] {
    return countries
      .slice(0, count)
      .map(country => this.generateFlagUrl(country.code));
  }
  
  /**
   * Validates if CDN is accessible
   */
  async validateCDNAccess(): Promise<boolean> {
    try {
      // Test with a known flag (US)
      const testUrl = this.generateFlagUrl('US');
      const response = await fetch(testUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('CDN validation failed:', error);
      return false;
    }
  }
  
  /**
   * Gets CDN configuration info
   */
  getCDNInfo(): {
    baseUrl: string;
    fallbackUrl: string;
    isCustomCDN: boolean;
  } {
    return {
      baseUrl: this.cdnBaseUrl,
      fallbackUrl: this.fallbackUrl,
      isCustomCDN: this.cdnBaseUrl !== this.fallbackUrl
    };
  }
}

// Export singleton instance
export const cdnService = new CDNService();