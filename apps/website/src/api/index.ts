// Main API Export File
import { healthApi } from './health';
import { knowledgeApi } from './knowledge';

// Export API functions
export { healthApi } from './health';
export { knowledgeApi } from './knowledge';
export { API_CONFIG, ApiError, httpClient } from './config';

// Combined API object for convenience
export const api = {
  health: healthApi,
  knowledge: knowledgeApi,
};

// Default export
export default api;

// Note: Import types directly from individual modules:
// import type { HealthResponse } from './api/health';
// import type { Knowledge, QueryResult } from './api/knowledge';