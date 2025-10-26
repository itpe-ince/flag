import React, { useState, useEffect, useRef } from 'react';

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
}

/**
 * Enhanced image component with caching and fallback support
 */
const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  className = '',
  onLoad,
  onError,
  fallbackSrc,
  placeholder
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 2;

  // Reset state when src changes
  useEffect(() => {
    setImageState('loading');
    setCurrentSrc(src);
    setRetryCount(0);
  }, [src]);

  // Handle image load success
  const handleLoad = () => {
    setImageState('loaded');
    onLoad?.();
  };

  // Handle image load error with fallback strategies
  const handleError = () => {
    console.warn('Failed to load image:', currentSrc);
    
    // Try fallback strategies
    if (retryCount < maxRetries) {
      const nextSrc = getNextFallbackSrc(currentSrc, retryCount);
      if (nextSrc && nextSrc !== currentSrc) {
        setCurrentSrc(nextSrc);
        setRetryCount(prev => prev + 1);
        return;
      }
    }
    
    // All fallbacks failed
    setImageState('error');
    onError?.();
  };

  /**
   * Get next fallback source based on retry count
   */
  const getNextFallbackSrc = (originalSrc: string, retry: number): string | null => {
    // First retry: use provided fallback
    if (retry === 0 && fallbackSrc) {
      return fallbackSrc;
    }
    
    // Second retry: try different CDN size
    if (retry === 1 && originalSrc.includes('flagcdn.com')) {
      const countryCode = extractCountryCode(originalSrc);
      if (countryCode) {
        return `https://flagcdn.com/w160/${countryCode}.png`;
      }
    }
    
    return null;
  };

  /**
   * Extract country code from flag URL
   */
  const extractCountryCode = (url: string): string | null => {
    const match = url.match(/\/([a-z]{2})\.png$/i);
    return match ? match[1].toLowerCase() : null;
  };

  /**
   * Generate placeholder SVG
   */
  const generatePlaceholder = (): string => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="320" height="213" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">
          Flag Image
        </text>
        <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#adb5bd">
          Loading...
        </text>
      </svg>
    `)}`;
  };

  /**
   * Generate error placeholder SVG
   */
  const generateErrorPlaceholder = (): string => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="320" height="213" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8d7da" stroke="#f5c6cb" stroke-width="1"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#721c24">
          Flag Unavailable
        </text>
        <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#856404">
          Please try again
        </text>
      </svg>
    `)}`;
  };

  // Show custom placeholder while loading
  if (imageState === 'loading' && placeholder) {
    return <div className={className}>{placeholder}</div>;
  }

  // Show error state
  if (imageState === 'error') {
    return (
      <img
        ref={imgRef}
        src={generateErrorPlaceholder()}
        alt={`${alt} (unavailable)`}
        className={`${className} cached-image-error`}
      />
    );
  }

  return (
    <>
      {imageState === 'loading' && (
        <img
          src={generatePlaceholder()}
          alt={`${alt} (loading)`}
          className={`${className} cached-image-placeholder`}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} ${imageState === 'loaded' ? 'cached-image-loaded' : 'cached-image-loading'}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          display: imageState === 'loaded' ? 'block' : 'none'
        }}
      />
    </>
  );
};

export default CachedImage;