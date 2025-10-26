/**
 * Cache Service for Flag Guessing Game
 * Manages image preloading, service worker communication, and fallback handling
 */

export interface CacheStatus {
  flagImages: number;
  apiResponses: number;
  staticAssets: number;
  totalCached: number;
  serviceWorkerActive: boolean;
}

export interface PreloadOptions {
  excludeCodes?: string[];
  count?: number;
}

class CacheService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private preloadedImages: Set<string> = new Set();
  private fallbackImages: Map<string, string> = new Map();
  
  /**
   * Initialize the cache service and register service worker
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }
    
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      
      // Listen for service worker updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });
      
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }
  
  /**
   * Preload flag images for upcoming questions
   */
  async preloadFlags(options: PreloadOptions = {}): Promise<string[]> {
    try {
      // Get preload URLs from API
      const response = await fetch(`/api/flags/preload?${new URLSearchParams({
        exclude: options.excludeCodes?.join(',') || '',
        count: (options.count || 5).toString()
      })}`);
      
      if (!response.ok) {
        throw new Error('Failed to get preload URLs');
      }
      
      const data = await response.json();
      const urls: string[] = data.data.urls;
      
      // Preload via service worker if available
      if (this.serviceWorkerRegistration?.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'PRELOAD_FLAGS',
          data: { urls }
        });
      }
      
      // Also preload via browser cache
      await this.browserPreload(urls);
      
      // Track preloaded images
      urls.forEach(url => this.preloadedImages.add(url));
      
      return urls;
    } catch (error) {
      console.error('Failed to preload flags:', error);
      return [];
    }
  }
  
  /**
   * Preload images using browser's native preloading
   */
  private async browserPreload(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't fail the whole batch
        img.src = url;
      });
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  /**
   * Create a cached image element with fallback handling
   */
  createCachedImage(src: string, alt: string = ''): HTMLImageElement {
    const img = new Image();
    img.alt = alt;
    
    // Set up error handling with fallback
    img.onerror = () => {
      console.warn('Failed to load image:', src);
      this.handleImageError(img, src);
    };
    
    img.src = src;
    return img;
  }
  
  /**
   * Handle image loading errors with fallback strategies
   */
  private handleImageError(img: HTMLImageElement, originalSrc: string): void {
    // Try fallback URL if available
    const fallbackSrc = this.fallbackImages.get(originalSrc);
    if (fallbackSrc && img.src !== fallbackSrc) {
      img.src = fallbackSrc;
      return;
    }
    
    // Try alternative CDN format
    if (originalSrc.includes('flagcdn.com')) {
      const countryCode = this.extractCountryCode(originalSrc);
      if (countryCode) {
        const alternativeUrl = `https://flagcdn.com/w160/${countryCode}.png`;
        if (img.src !== alternativeUrl) {
          this.fallbackImages.set(originalSrc, alternativeUrl);
          img.src = alternativeUrl;
          return;
        }
      }
    }
    
    // Final fallback: placeholder
    this.setPlaceholderImage(img);
  }
  
  /**
   * Extract country code from flag URL
   */
  private extractCountryCode(url: string): string | null {
    const match = url.match(/\/([a-z]{2})\.png$/i);
    return match ? match[1].toLowerCase() : null;
  }
  
  /**
   * Set placeholder image for failed loads
   */
  private setPlaceholderImage(img: HTMLImageElement): void {
    // Create a simple SVG placeholder
    const placeholder = `data:image/svg+xml;base64,${btoa(`
      <svg width="320" height="213" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#666">
          Flag not available
        </text>
      </svg>
    `)}`;
    
    img.src = placeholder;
  }
  
  /**
   * Get cache status from service worker
   */
  async getCacheStatus(): Promise<CacheStatus> {
    const defaultStatus: CacheStatus = {
      flagImages: 0,
      apiResponses: 0,
      staticAssets: 0,
      totalCached: 0,
      serviceWorkerActive: false
    };
    
    if (!this.serviceWorkerRegistration?.active) {
      return defaultStatus;
    }
    
    try {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const status = event.data;
          resolve({
            ...status,
            serviceWorkerActive: true
          });
        };
        
        this.serviceWorkerRegistration!.active!.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(defaultStatus), 5000);
      });
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return defaultStatus;
    }
  }
  
  /**
   * Clear flag image cache
   */
  async clearFlagCache(): Promise<void> {
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'CLEAR_FLAG_CACHE'
      });
    }
    
    this.preloadedImages.clear();
    this.fallbackImages.clear();
  }
  
  /**
   * Check if an image is preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedImages.has(url);
  }
  
  /**
   * Get preloaded image count
   */
  getPreloadedCount(): number {
    return this.preloadedImages.size;
  }
  
  /**
   * Validate CDN accessibility
   */
  async validateCDN(): Promise<boolean> {
    try {
      const response = await fetch('/api/flags/validate-cdn');
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.data.accessible;
    } catch (error) {
      console.error('CDN validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();