/** Body of GET /health. */
export interface HealthResponse {
  status: 'ok' | 'error';
  checks: {
    app: 'ok';
    database: 'ok' | 'unreachable';
  };
  uptimeSeconds: number;
  timestamp: string;
}
