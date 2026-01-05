import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  entitiesApi,
  rulesApi,
  dataGenerationApi,
} from './client';
import {
  PrimaryKeyRule,
  FieldRule,
  DataGenerationRequest,
} from '../types';

// Entity Hooks
export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const response = await entitiesApi.getAll();
      return response.data;
    },
  });
};

export const useEntityStructure = (entityName: string | null) => {
  return useQuery({
    queryKey: ['entity', entityName],
    queryFn: async () => {
      if (!entityName) throw new Error('Entity name is required');
      const response = await entitiesApi.getStructure(entityName);
      return response.data;
    },
    enabled: !!entityName,
  });
};

export const useEntityGraph = (entityName: string | null, maxDepth: number = 2) => {
  return useQuery({
    queryKey: ['entityGraph', entityName, maxDepth],
    queryFn: async () => {
      if (!entityName) throw new Error('Entity name is required');
      const response = await entitiesApi.getGraph(entityName, maxDepth);
      return response.data;
    },
    enabled: !!entityName,
  });
};

export const useRelatedEntities = (entityName: string | null) => {
  return useQuery({
    queryKey: ['relatedEntities', entityName],
    queryFn: async () => {
      if (!entityName) throw new Error('Entity name is required');
      const response = await entitiesApi.getRelated(entityName);
      return response.data;
    },
    enabled: !!entityName,
  });
};

// Primary Key Rule Hooks
export const usePrimaryKeyRules = () => {
  return useQuery({
    queryKey: ['primaryKeyRules'],
    queryFn: async () => {
      const response = await rulesApi.getAllPrimaryKeyRules();
      return response.data;
    },
  });
};

export const useDefinePrimaryKeyRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rule: PrimaryKeyRule) => rulesApi.definePrimaryKeyRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primaryKeyRules'] });
    },
  });
};

export const useDeletePrimaryKeyRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (entityName: string) => rulesApi.deletePrimaryKeyRule(entityName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primaryKeyRules'] });
    },
  });
};

// Field Rule Hooks
export const useFieldRules = (entityName?: string) => {
  return useQuery({
    queryKey: entityName ? ['fieldRules', entityName] : ['fieldRules'],
    queryFn: async () => {
      const response = entityName 
        ? await rulesApi.getFieldRules(entityName)
        : await rulesApi.getAllFieldRules();
      return response.data;
    },
  });
};

export const useDefineFieldRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rule: FieldRule) => rulesApi.defineFieldRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fieldRules'] });
    },
  });
};

export const useDeleteFieldRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entityName, fieldName }: { entityName: string; fieldName: string }) =>
      rulesApi.deleteFieldRule(entityName, fieldName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fieldRules'] });
    },
  });
};

// Data Generation Hooks
export const useGenerateData = () => {
  return useMutation({
    mutationFn: (request: DataGenerationRequest) =>
      dataGenerationApi.generateData(request),
  });
};

export const useDownloadData = () => {
  return useMutation({
    mutationFn: async (request: DataGenerationRequest) => {
      const blob = await dataGenerationApi.downloadData(request);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `isa95-testdata-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

// Scenario Hooks
export const useScenarios = () => {
  return useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await dataGenerationApi.getAllScenarios();
      return response.data;
    },
  });
};

export const useScenario = (id: string | null) => {
  return useQuery({
    queryKey: ['scenario', id],
    queryFn: async () => {
      if (!id) throw new Error('Scenario ID is required');
      const response = await dataGenerationApi.getScenario(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useSaveScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenario: any) => dataGenerationApi.saveScenario(scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
};

export const useDeleteScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => dataGenerationApi.deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
};
