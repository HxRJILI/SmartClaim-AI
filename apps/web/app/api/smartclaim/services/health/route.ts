// apps/web/app/api/smartclaim/services/health/route.ts
import { NextResponse } from 'next/server';

/**
 * Service configuration for health checks
 * These are accessed from the server-side to avoid CORS issues
 */
const SERVICES = [
  { name: 'Extractor', url: process.env.EXTRACTOR_URL || 'http://localhost:8000', port: 8000 },
  { name: 'Classifier (LLM)', url: process.env.CLASSIFIER_URL || 'http://localhost:8001', port: 8001 },
  { name: 'Chat', url: process.env.CHAT_URL || 'http://localhost:8002', port: 8002 },
  { name: 'Transcriber (ASR)', url: process.env.TRANSCRIBER_URL || 'http://localhost:8003', port: 8003 },
  { name: 'RAG', url: process.env.RAG_URL || 'http://localhost:8004', port: 8004 },
  { name: 'LVM (Vision)', url: process.env.LVM_URL || 'http://localhost:8005', port: 8005 },
  { name: 'Aggregator', url: process.env.AGGREGATOR_URL || 'http://localhost:8006', port: 8006 },
  { name: 'SLA Predictor', url: process.env.SLA_URL || 'http://localhost:8007', port: 8007 },
];

interface ServiceHealthResult {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy';
  version?: string;
  error?: string;
}

/**
 * GET /api/smartclaim/services/health
 * 
 * Server-side health check for all Python microservices.
 * This avoids CORS issues by making requests from the server.
 */
export async function GET() {
  const results: ServiceHealthResult[] = await Promise.all(
    SERVICES.map(async (service) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${service.url}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            name: service.name,
            url: service.url,
            status: 'unhealthy' as const,
            error: `HTTP ${response.status}`,
          };
        }

        const data = await response.json();
        return {
          name: service.name,
          url: service.url,
          status: data.status === 'healthy' ? 'healthy' as const : 'unhealthy' as const,
          version: data.version,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          name: service.name,
          url: service.url,
          status: 'unhealthy' as const,
          error: errorMessage.includes('abort') ? 'Timeout' : errorMessage,
        };
      }
    })
  );

  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const totalServices = results.length;

  return NextResponse.json({
    summary: {
      healthy: healthyCount,
      total: totalServices,
      allHealthy: healthyCount === totalServices,
    },
    services: results,
    timestamp: new Date().toISOString(),
  });
}
