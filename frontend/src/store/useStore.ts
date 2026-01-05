import { create } from 'zustand';
import { PrimaryKeyRule, FieldRule } from '../types';

interface AppState {
  // Selected entities
  selectedEntity: string | null;
  selectedEntities: string[];
  
  // Primary Key Rules
  primaryKeyRules: PrimaryKeyRule[];
  
  // Field Rules
  fieldRules: FieldRule[];
  
  // Actions
  setSelectedEntity: (entityName: string | null) => void;
  setSelectedEntities: (entityNames: string[]) => void;
  toggleEntitySelection: (entityName: string) => void;
  
  addPrimaryKeyRule: (rule: PrimaryKeyRule) => void;
  removePrimaryKeyRule: (entityName: string) => void;
  clearPrimaryKeyRules: () => void;
  
  addFieldRule: (rule: FieldRule) => void;
  removeFieldRule: (entityName: string, fieldName: string) => void;
  clearFieldRules: () => void;
  
  getFieldRulesForEntity: (entityName: string) => FieldRule[];
  getPrimaryKeyRuleForEntity: (entityName: string) => PrimaryKeyRule | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  selectedEntity: null,
  selectedEntities: [],
  primaryKeyRules: [],
  fieldRules: [],
  
  setSelectedEntity: (entityName) =>
    set({ selectedEntity: entityName }),
  
  setSelectedEntities: (entityNames) =>
    set({ selectedEntities: entityNames }),
  
  toggleEntitySelection: (entityName) =>
    set((state) => ({
      selectedEntities: state.selectedEntities.includes(entityName)
        ? state.selectedEntities.filter((e) => e !== entityName)
        : [...state.selectedEntities, entityName],
    })),
  
  addPrimaryKeyRule: (rule) =>
    set((state) => ({
      primaryKeyRules: [
        ...state.primaryKeyRules.filter((r) => r.entityName !== rule.entityName),
        rule,
      ],
    })),
  
  removePrimaryKeyRule: (entityName) =>
    set((state) => ({
      primaryKeyRules: state.primaryKeyRules.filter((r) => r.entityName !== entityName),
    })),
  
  clearPrimaryKeyRules: () =>
    set({ primaryKeyRules: [] }),
  
  addFieldRule: (rule) =>
    set((state) => ({
      fieldRules: [
        ...state.fieldRules.filter(
          (r) => !(r.entityName === rule.entityName && r.fieldName === rule.fieldName)
        ),
        rule,
      ],
    })),
  
  removeFieldRule: (entityName, fieldName) =>
    set((state) => ({
      fieldRules: state.fieldRules.filter(
        (r) => !(r.entityName === entityName && r.fieldName === fieldName)
      ),
    })),
  
  clearFieldRules: () =>
    set({ fieldRules: [] }),
  
  getFieldRulesForEntity: (entityName) =>
    get().fieldRules.filter((r) => r.entityName === entityName),
  
  getPrimaryKeyRuleForEntity: (entityName) =>
    get().primaryKeyRules.find((r) => r.entityName === entityName),
}));
