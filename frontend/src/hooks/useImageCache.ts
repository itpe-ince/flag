import { useState, useEffect, useCallback } from 'react';
import { cacheService, CacheStatus, PreloadOptions } from '../services/cache-service';

export interface UseImageCacheReturn {
  cacheStatus: CacheStatus;
  isLoading: boolean;
  preloadFlags: (options?: PreloadOptions) => Promise<string[]>;
  clearCache: () => Promise<void>;
  validateCDN: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for managing image caching functionality
 */
export const useImageCache = (): UseImageCacheReturn => {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    flagImages: 0,
    apiResponses: 0,
    staticAssets: 0,
    totalCached: 0,
    serviceWorkerActive: false
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Refresh cache status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const status = await cacheService.getCacheStatus();
      setCacheStatus(status);
    } catch (error) {
      console.error('Failed to refresh cache status:', error);
    }
  }, []);

  /**
   * Preload flag images
   */
  const preloadFlags = useCallback(async (options?: PreloadOptions): Promise<string[]> => {
    setIsLoading(true);
    try {
      const urls = await cacheService.preloadFlags(options);
      await refreshStatus(); // Update status after preloading
      return urls;
    } catch (error) {
      console.error('Failed to preload flags:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Clear flag cache
   */
  const clearCache = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await cacheService.clearFlagCache();
      await refreshStatus(); // Update status after clearing
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Validate CDN accessibility
   */
  const validateCDN = useCallback(async (): Promise<boolean> => {
    try {
      return await cacheService.validateCDN();
    } catch (error) {
      console.error('Failed to validate CDN:', error);
      return false;
    }
  }, []);

  // Initialize cache service and get initial status
  useEffect(() => {
    const initializeCache = async () => {
      setIsLoading(true);
      try {
        await cacheService.initialize();
        await refreshStatus();
      } catch (error) {
        console.error('Failed to initialize cache service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCache();
  }, [refreshStatus]);

  return {
    cacheStatus,
    isLoading,
    preloadFlags,
    clearCache,
    validateCDN,
    refreshStatus
  };
};