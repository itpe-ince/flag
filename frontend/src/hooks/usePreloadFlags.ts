import { useEffect, useCallback, useRef } from 'react';
import { useImageCache } from './useImageCache';
import { Question } from '../types';

export interface UsePreloadFlagsOptions {
  enabled?: boolean;
  preloadCount?: number;
  preloadDelay?: number;
}

/**
 * Hook for automatically preloading flag images during gameplay
 */
export const usePreloadFlags = (
  currentQuestion: Question | null,
  options: UsePreloadFlagsOptions = {}
) => {
  const {
    enabled = true,
    preloadCount = 5,
    preloadDelay = 1000
  } = options;

  const { preloadFlags } = useImageCache();
  const preloadTimeoutRef = useRef<NodeJS.Timeout>();
  const lastPreloadedQuestionRef = useRef<string | null>(null);

  /**
   * Preload flags excluding current question choices
   */
  const preloadUpcomingFlags = useCallback(async () => {
    if (!enabled || !currentQuestion) return;

    // Don't preload for the same question twice
    if (lastPreloadedQuestionRef.current === currentQuestion.id) return;

    try {
      // Get country codes from current question to exclude
      const excludeCodes = currentQuestion.choices.map(choice => choice.code);
      
      // Preload upcoming flags
      await preloadFlags({
        excludeCodes,
        count: preloadCount
      });

      lastPreloadedQuestionRef.current = currentQuestion.id;
      console.log('Preloaded flags for upcoming questions');
    } catch (error) {
      console.error('Failed to preload upcoming flags:', error);
    }
  }, [enabled, currentQuestion, preloadFlags, preloadCount]);

  /**
   * Trigger preloading with delay
   */
  const schedulePreload = useCallback(() => {
    // Clear existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Schedule new preload
    preloadTimeoutRef.current = setTimeout(() => {
      preloadUpcomingFlags();
    }, preloadDelay);
  }, [preloadUpcomingFlags, preloadDelay]);

  // Preload when question changes
  useEffect(() => {
    if (currentQuestion) {
      schedulePreload();
    }

    // Cleanup timeout on unmount
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentQuestion, schedulePreload]);

  return {
    preloadUpcomingFlags,
    schedulePreload
  };
};