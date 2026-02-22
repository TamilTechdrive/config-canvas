import type { ConfigNodeType } from './configTypes';

export interface ConnectionRule {
  id: string;
  sourceType: ConfigNodeType;
  targetType: ConfigNodeType;
  allowed: boolean;
  reason: string;
}

export interface DependencySuggestion {
  type: ConfigNodeType;
  label: string;
  reason: string;
  required: boolean;
}

// Valid parent→child connections
export const CONNECTION_RULES: ConnectionRule[] = [
  { id: 'c_m', sourceType: 'container', targetType: 'module', allowed: true, reason: 'Containers hold modules' },
  { id: 'm_g', sourceType: 'module', targetType: 'group', allowed: true, reason: 'Modules hold groups' },
  { id: 'g_o', sourceType: 'group', targetType: 'option', allowed: true, reason: 'Groups hold options' },
];

// What each node type needs
export const DEPENDENCY_RULES: Record<ConfigNodeType, DependencySuggestion[]> = {
  container: [
    { type: 'module', label: 'Add Module', reason: 'Containers need at least one module', required: true },
  ],
  module: [
    { type: 'group', label: 'Add Group', reason: 'Modules need at least one group', required: true },
  ],
  group: [
    { type: 'option', label: 'Add Option', reason: 'Groups should contain options', required: true },
    { type: 'option', label: 'Add Toggle', reason: 'Consider adding a toggle option', required: false },
  ],
  option: [],
};

export const validateConnection = (
  sourceType: ConfigNodeType,
  targetType: ConfigNodeType
): { valid: boolean; message: string } => {
  const rule = CONNECTION_RULES.find(
    (r) => r.sourceType === sourceType && r.targetType === targetType
  );

  if (rule?.allowed) {
    return { valid: true, message: rule.reason };
  }

  // Check reverse (child→parent is wrong direction)
  const reverse = CONNECTION_RULES.find(
    (r) => r.sourceType === targetType && r.targetType === sourceType
  );
  if (reverse) {
    return { valid: false, message: `Wrong direction: connect ${targetType} → ${sourceType} instead` };
  }

  // Same type
  if (sourceType === targetType) {
    return { valid: false, message: `Cannot connect ${sourceType} to ${sourceType}` };
  }

  // Skip levels
  return { valid: false, message: `Invalid: ${sourceType} cannot directly connect to ${targetType}. Follow hierarchy: Container → Module → Group → Option` };
};

export const getUniquenessViolation = (
  sourceId: string,
  targetId: string,
  existingEdges: { source: string; target: string }[]
): string | null => {
  const duplicate = existingEdges.find(
    (e) => e.source === sourceId && e.target === targetId
  );
  if (duplicate) return 'This connection already exists';

  const targetAlreadyConnected = existingEdges.find(
    (e) => e.target === targetId
  );
  if (targetAlreadyConnected) return 'This node already has a parent connection';

  return null;
};
