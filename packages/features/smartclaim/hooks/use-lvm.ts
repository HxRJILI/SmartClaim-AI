/**
 * useLVM Hook
 * 
 * React hook for interacting with the Vision Language Model (LVM) service.
 * Provides image analysis capabilities for the SmartClaim frontend.
 */

import { useState, useCallback } from 'react';

/**
 * Metadata for image analysis context
 */
export interface LVMImageMetadata {
  source?: string;
  location?: string;
  department?: string;
  timestamp?: string;
  reported_issue?: string;
  ticket_id?: string;
  user_id?: string;
}

/**
 * Issue hypothesis from LVM analysis
 */
export interface LVMIssueHypothesis {
  issue_type: 
    | 'safety' 
    | 'maintenance' 
    | 'quality' 
    | 'IT' 
    | 'logistics' 
    | 'HR' 
    | 'legal' 
    | 'finance' 
    | 'unknown';
  confidence: number;
}

/**
 * LVM analysis result
 */
export interface LVMAnalysisResult {
  visual_summary: string;
  detected_objects: string[];
  scene_type: 'industrial' | 'office' | 'warehouse' | 'transport' | 'outdoor' | 'unknown';
  potential_issue_detected: boolean;
  issue_hypotheses: LVMIssueHypothesis[];
  visual_severity_hint: 'low' | 'medium' | 'high' | 'critical';
  image_quality: 'clear' | 'blurry' | 'dark' | 'obstructed';
  requires_human_review: boolean;
  processing_time_ms: number;
  model_version: string;
  raw_confidence?: number;
  error?: string;
}

/**
 * Hook state
 */
interface UseLVMState {
  isAnalyzing: boolean;
  result: LVMAnalysisResult | null;
  error: string | null;
}

/**
 * Hook return type
 */
interface UseLVMReturn extends UseLVMState {
  analyzeImage: (imageUrl: string, metadata?: LVMImageMetadata) => Promise<LVMAnalysisResult | null>;
  analyzeImageFile: (file: File, metadata?: LVMImageMetadata) => Promise<LVMAnalysisResult | null>;
  reset: () => void;
  isHealthy: () => Promise<boolean>;
}

/**
 * Convert a File to a base64 data URI
 */
async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * useLVM Hook
 * 
 * @example
 * ```tsx
 * const { analyzeImage, isAnalyzing, result, error } = useLVM();
 * 
 * const handleAnalyze = async () => {
 *   const result = await analyzeImage(imageUrl, {
 *     location: 'Factory Floor B',
 *     department: 'Maintenance'
 *   });
 *   
 *   if (result?.potential_issue_detected) {
 *     console.log('Issue detected:', result.issue_hypotheses);
 *   }
 * };
 * ```
 */
export function useLVM(): UseLVMReturn {
  const [state, setState] = useState<UseLVMState>({
    isAnalyzing: false,
    result: null,
    error: null,
  });

  /**
   * Analyze an image by URL
   */
  const analyzeImage = useCallback(async (
    imageUrl: string,
    metadata?: LVMImageMetadata
  ): Promise<LVMAnalysisResult | null> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const response = await fetch('/api/smartclaim/lvm/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${response.status}`);
      }

      const result: LVMAnalysisResult = await response.json();
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        result,
        error: result.error || null,
      }));

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Analyze an image from a File object
   */
  const analyzeImageFile = useCallback(async (
    file: File,
    metadata?: LVMImageMetadata
  ): Promise<LVMAnalysisResult | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setState(prev => ({
        ...prev,
        error: 'Invalid file type. Please provide an image file.',
      }));
      return null;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setState(prev => ({
        ...prev,
        error: 'File too large. Maximum size is 10MB.',
      }));
      return null;
    }

    try {
      // Convert file to data URI
      const dataUri = await fileToDataUri(file);
      
      // Analyze using the data URI
      return await analyzeImage(dataUri, {
        ...metadata,
        source: metadata?.source || `file:${file.name}`,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image file';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return null;
    }
  }, [analyzeImage]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      result: null,
      error: null,
    });
  }, []);

  /**
   * Check if the LVM service is healthy
   */
  const isHealthy = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/smartclaim/lvm/analyze', {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    analyzeImage,
    analyzeImageFile,
    reset,
    isHealthy,
  };
}

/**
 * Get severity badge color based on severity hint
 */
export function getSeverityColor(severity: LVMAnalysisResult['visual_severity_hint']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-black';
    case 'low':
    default:
      return 'bg-green-500 text-white';
  }
}

/**
 * Get issue type badge color
 */
export function getIssueTypeColor(issueType: LVMIssueHypothesis['issue_type']): string {
  switch (issueType) {
    case 'safety':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'quality':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'IT':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'logistics':
      return 'bg-teal-100 text-teal-800 border-teal-300';
    case 'HR':
      return 'bg-pink-100 text-pink-800 border-pink-300';
    case 'legal':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'finance':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'unknown':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export default useLVM;
