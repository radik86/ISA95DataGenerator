import axios from 'axios';
import {
  EntityDefinition,
  DataGenerationRequest,
  DataGenerationResponse,
  PrimaryKeyRule,
  FieldRule,
  MappingFile,
} from '../types';

const API_BASE_URL = 'http://localhost:5237/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Entities API
export const entitiesApi = {
  getAll: () => apiClient.get<EntityDefinition[]>('/entities'),
  
  getStructure: (entityName: string) =>
    apiClient.get<EntityDefinition>(`/entities/${entityName}/structure`),
  
  getRelated: (entityName: string) =>
    apiClient.get<string[]>(`/entities/${entityName}/related`),
  
  getGraph: (entityName: string, maxDepth: number = 2) =>
    apiClient.get<Record<string, EntityDefinition>>(`/entities/${entityName}/graph`, {
      params: { maxDepth },
    }),
  
  reloadMetadata: () => apiClient.post('/entities/reload'),
};

// Rules API
export const rulesApi = {
  // Primary Key Rules
  definePrimaryKeyRule: (rule: PrimaryKeyRule) =>
    apiClient.post<void>('/rules/primary-key', rule),
  
  getPrimaryKeyRule: (entityName: string) =>
    apiClient.get<PrimaryKeyRule>(`/rules/primary-key/${entityName}`),
  
  getAllPrimaryKeyRules: () =>
    apiClient.get<PrimaryKeyRule[]>('/rules/primary-key'),
  
  deletePrimaryKeyRule: (entityName: string) =>
    apiClient.delete(`/rules/primary-key/${entityName}`),
  
  clearAllPrimaryKeyRules: () =>
    apiClient.delete('/rules/primary-key'),
  
  // Field Rules
  defineFieldRule: (rule: FieldRule) =>
    apiClient.post<void>('/rules/field', rule),
  
  getFieldRules: (entityName: string) =>
    apiClient.get<FieldRule[]>(`/rules/field/${entityName}`),
  
  getAllFieldRules: () =>
    apiClient.get<FieldRule[]>('/rules/field'),
  
  deleteFieldRule: (entityName: string, fieldName: string) =>
    apiClient.delete(`/rules/field/${entityName}/${fieldName}`),
  
  clearAllFieldRules: () =>
    apiClient.delete('/rules/field'),
};

// Data Generation API
export const dataGenerationApi = {
  generateData: (request: DataGenerationRequest) =>
    apiClient.post<DataGenerationResponse>('/datageneration/generate-data', request),
  
  generateMappingFile: (request: DataGenerationRequest) =>
    apiClient.post<MappingFile>('/datageneration/generate-mapping', request),
  
  downloadData: async (request: DataGenerationRequest): Promise<Blob> => {
    const response = await apiClient.post('/datageneration/download', request, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  // Scenarios
  getAllScenarios: () => apiClient.get('/scenarios'),
  
  getScenario: (id: string) => apiClient.get(`/scenarios/${id}`),
  
  saveScenario: (scenario: any) => {
    if (scenario.id) {
      return apiClient.put(`/scenarios/${scenario.id}`, scenario);
    }
    return apiClient.post('/scenarios', scenario);
  },
  
  deleteScenario: (id: string) => apiClient.delete(`/scenarios/${id}`),
};

export default apiClient;
