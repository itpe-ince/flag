import { Router } from 'express';
import { flagService, cdnService } from '../services';

const router = Router();

/**
 * GET /api/flags/preload
 * Get preload URLs for upcoming flag images
 */
router.get('/preload', async (req, res) => {
  try {
    const { exclude, count = 5 } = req.query;
    
    // Parse exclude codes from query parameter
    const excludeCodes = exclude 
      ? (typeof exclude === 'string' ? exclude.split(',') : [])
      : [];
    
    const preloadCount = Math.min(parseInt(count as string) || 5, 10); // Max 10 preloads
    
    const preloadUrls = await flagService.getPreloadUrls(excludeCodes, preloadCount);
    
    res.json({
      success: true,
      data: {
        urls: preloadUrls,
        count: preloadUrls.length,
        cdnInfo: cdnService.getCDNInfo()
      }
    });
  } catch (error) {
    console.error('Error getting preload URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preload URLs'
    });
  }
});

/**
 * GET /api/flags/cdn-info
 * Get CDN configuration information
 */
router.get('/cdn-info', (req, res) => {
  try {
    const cdnInfo = cdnService.getCDNInfo();
    
    res.json({
      success: true,
      data: cdnInfo
    });
  } catch (error) {
    console.error('Error getting CDN info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN information'
    });
  }
});

/**
 * GET /api/flags/validate-cdn
 * Validate CDN accessibility
 */
router.get('/validate-cdn', async (req, res) => {
  try {
    const isAccessible = await cdnService.validateCDNAccess();
    
    res.json({
      success: true,
      data: {
        accessible: isAccessible,
        cdnInfo: cdnService.getCDNInfo()
      }
    });
  } catch (error) {
    console.error('Error validating CDN:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate CDN'
    });
  }
});

export default router;