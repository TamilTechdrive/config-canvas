/**
 * AI-like Rule Engine: analyses nodes & edges to produce
 * conflicts, dependency suggestions, and validation insights.
 */
import type { Node, Edge } from '@xyflow/react';
import type { ConfigNodeData } from '@/types/configTypes';
import type { RawConfig, RawRule } from '@/data/sampleConfig';

// ─── Types ───────────────────────────────────────────────────────

export type IssueSeverity = 'error' | 'warning' | 'info' | 'suggestion';

export interface RuleIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  affectedNodeIds: string[];
  fix?: {
    label: string;
    action: 'add_option' | 'remove_option' | 'connect' | 'disconnect';
    payload: Record<string, string>;
  };
}

export interface NodeAnalysis {
  nodeId: string;
  issues: RuleIssue[];
  suggestions: RuleIssue[];
  dependencies: { key: string; label: string; present: boolean; nodeId?: string }[];
  conflicts: { key: string; label: string; conflictsWith: string; nodeId?: string }[];
  health: 'healthy' | 'warning' | 'critical';
}

// ─── Helpers ─────────────────────────────────────────────────────

const getNodeData = (node: Node): ConfigNodeData =>
  node.data as unknown as ConfigNodeData;

const findOptionByKey = (
  nodes: Node[],
  key: string
): Node | undefined =>
  nodes.find((n) => {
    const d = getNodeData(n);
    return d.type === 'option' && d.properties?.key === key;
  });

const getChildNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const childIds = edges.filter((e) => e.source === nodeId).map((e) => e.target);
  return nodes.filter((n) => childIds.includes(n.id));
};

const getParentNode = (nodeId: string, nodes: Node[], edges: Edge[]): Node | undefined => {
  const parentEdge = edges.find((e) => e.target === nodeId);
  return parentEdge ? nodes.find((n) => n.id === parentEdge.source) : undefined;
};

const getSiblingOptions = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const parent = getParentNode(nodeId, nodes, edges);
  if (!parent) return [];
  // Go up to module level to find all options in the same module
  const moduleNode = getNodeData(parent).type === 'module'
    ? parent
    : getParentNode(parent.id, nodes, edges);
  if (!moduleNode) return [];

  const groups = getChildNodes(moduleNode.id, nodes, edges);
  return groups.flatMap((g) => getChildNodes(g.id, nodes, edges));
};

// ─── Main Analysis ──────────────────────────────────────────────

export const analyzeNode = (
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  rawConfig?: RawConfig
): NodeAnalysis => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return emptyAnalysis(nodeId);

  const data = getNodeData(node);
  const issues: RuleIssue[] = [];
  const suggestions: RuleIssue[] = [];
  const dependencies: NodeAnalysis['dependencies'] = [];
  const conflicts: NodeAnalysis['conflicts'] = [];

  // ── Hierarchy checks ─────────────────────────
  if (data.type === 'container') {
    analyzeContainer(nodeId, nodes, edges, issues, suggestions);
  } else if (data.type === 'module') {
    analyzeModule(nodeId, nodes, edges, issues, suggestions);
  } else if (data.type === 'group') {
    analyzeGroup(nodeId, nodes, edges, issues, suggestions);
  } else if (data.type === 'option') {
    analyzeOption(nodeId, data, nodes, edges, rawConfig, issues, suggestions, dependencies, conflicts);
  }

  // ── Orphan check ──────────────────────────────
  if (data.type !== 'container') {
    const hasParent = edges.some((e) => e.target === nodeId);
    if (!hasParent) {
      issues.push({
        id: `orphan_${nodeId}`,
        severity: 'error',
        title: 'Orphan Node',
        message: `This ${data.type} is not connected to any parent. It won't be part of the configuration.`,
        affectedNodeIds: [nodeId],
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const health = errorCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy';

  return { nodeId, issues, suggestions, dependencies, conflicts, health };
};

const emptyAnalysis = (nodeId: string): NodeAnalysis => ({
  nodeId,
  issues: [],
  suggestions: [],
  dependencies: [],
  conflicts: [],
  health: 'healthy',
});

// ── Container ──────────────────────────────────

const analyzeContainer = (
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  issues: RuleIssue[],
  suggestions: RuleIssue[]
) => {
  const children = getChildNodes(nodeId, nodes, edges);
  if (children.length === 0) {
    issues.push({
      id: `container_empty_${nodeId}`,
      severity: 'warning',
      title: 'Empty Container',
      message: 'This container has no modules. Add at least one module to build your configuration.',
      affectedNodeIds: [nodeId],
    });
  }

  suggestions.push({
    id: `suggest_module_${nodeId}`,
    severity: 'suggestion',
    title: '💡 Add More Modules',
    message: 'Consider adding more modules for a complete streaming pipeline (Video, Audio, CDN, DRM, Analytics).',
    affectedNodeIds: [nodeId],
  });
};

// ── Module ──────────────────────────────────────

const analyzeModule = (
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  issues: RuleIssue[],
  suggestions: RuleIssue[]
) => {
  const children = getChildNodes(nodeId, nodes, edges);
  const groups = children.filter((c) => getNodeData(c).type === 'group');

  if (groups.length === 0) {
    issues.push({
      id: `module_no_groups_${nodeId}`,
      severity: 'error',
      title: 'No Groups',
      message: 'Every module needs at least one group to organize its options.',
      affectedNodeIds: [nodeId],
    });
  }

  groups.forEach((g) => {
    const opts = getChildNodes(g.id, nodes, edges);
    if (opts.length === 0) {
      issues.push({
        id: `group_empty_${g.id}`,
        severity: 'warning',
        title: `Empty Group: ${getNodeData(g).label}`,
        message: 'This group has no options. Consider adding configuration options.',
        affectedNodeIds: [nodeId, g.id],
      });
    }
  });

  if (groups.length === 1) {
    suggestions.push({
      id: `suggest_more_groups_${nodeId}`,
      severity: 'suggestion',
      title: '💡 Consider More Groups',
      message: 'Modules with multiple groups provide better organization. E.g. separate codec settings from hardware settings.',
      affectedNodeIds: [nodeId],
    });
  }
};

// ── Group ──────────────────────────────────────

const analyzeGroup = (
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  issues: RuleIssue[],
  suggestions: RuleIssue[]
) => {
  const options = getChildNodes(nodeId, nodes, edges);
  if (options.length === 0) {
    issues.push({
      id: `group_empty_${nodeId}`,
      severity: 'warning',
      title: 'Empty Group',
      message: 'Add options to this group for configuration.',
      affectedNodeIds: [nodeId],
    });
  }

  const includedCount = options.filter((o) => getNodeData(o).properties?.included === true).length;
  if (options.length > 0 && includedCount === 0) {
    suggestions.push({
      id: `suggest_include_${nodeId}`,
      severity: 'info',
      title: '⚠️ No Default Selections',
      message: 'None of the options in this group are included by default. Consider setting at least one default option.',
      affectedNodeIds: [nodeId],
    });
  }
};

// ── Option (the main rule-check target) ─────────

const analyzeOption = (
  nodeId: string,
  data: ConfigNodeData,
  nodes: Node[],
  edges: Edge[],
  rawConfig: RawConfig | undefined,
  issues: RuleIssue[],
  suggestions: RuleIssue[],
  dependencies: NodeAnalysis['dependencies'],
  conflicts: NodeAnalysis['conflicts']
) => {
  const optionKey = data.properties?.key as string | undefined;
  if (!optionKey || !rawConfig) return;

  const allSiblings = getSiblingOptions(nodeId, nodes, edges);

  // Find rules that mention this option
  for (const mod of rawConfig.modules) {
    for (const rule of mod.rules) {
      // This option is the dependent
      if (rule.option_key === optionKey) {
        // Check requires
        for (const reqKey of (rule.requires ?? [])) {
          const reqNode = findOptionByKey(nodes, reqKey);
          const present = !!reqNode && allSiblings.some((s) => s.id === reqNode.id);
          const reqIncluded = reqNode ? (getNodeData(reqNode).properties?.included === true) : false;

          dependencies.push({
            key: reqKey,
            label: reqNode ? getNodeData(reqNode).label : reqKey,
            present: present && reqIncluded,
            nodeId: reqNode?.id,
          });

          if (!present || !reqIncluded) {
            issues.push({
              id: `missing_dep_${optionKey}_${reqKey}`,
              severity: 'error',
              title: `Missing Dependency: ${reqKey}`,
              message: rule.suggestion || `"${data.label}" requires "${reqKey}" to be enabled.`,
              affectedNodeIds: reqNode ? [nodeId, reqNode.id] : [nodeId],
              fix: reqNode ? {
                label: `Enable ${reqKey}`,
                action: 'add_option',
                payload: { nodeId: reqNode.id, key: reqKey },
              } : undefined,
            });
          }
        }

        // Check conflicts
        if (rule.conflicts) {
          for (const conflictKey of rule.conflicts) {
            const conflictNode = findOptionByKey(nodes, conflictKey);
            const conflictIncluded = conflictNode
              ? (getNodeData(conflictNode).properties?.included === true)
              : false;

            if (conflictIncluded) {
              const conflictLabel = conflictNode ? getNodeData(conflictNode).label : conflictKey;
              conflicts.push({
                key: conflictKey,
                label: conflictLabel,
                conflictsWith: optionKey,
                nodeId: conflictNode?.id,
              });

              issues.push({
                id: `conflict_${optionKey}_${conflictKey}`,
                severity: 'error',
                title: `Conflict: ${data.label} ⚡ ${conflictLabel}`,
                message: rule.suggestion || `"${data.label}" conflicts with "${conflictLabel}". They cannot both be active.`,
                affectedNodeIds: conflictNode ? [nodeId, conflictNode.id] : [nodeId],
                fix: conflictNode ? {
                  label: `Disable ${conflictKey}`,
                  action: 'remove_option',
                  payload: { nodeId: conflictNode.id, key: conflictKey },
                } : undefined,
              });
            }
          }
        }
      }

      // This option is a requirement for something else
      if ((rule.requires ?? []).includes(optionKey)) {
        const dependentNode = findOptionByKey(nodes, rule.option_key);
        const dependentIncluded = dependentNode
          ? (getNodeData(dependentNode).properties?.included === true)
          : false;

        if (dependentIncluded && data.properties?.included !== true) {
          issues.push({
            id: `needed_by_${optionKey}_${rule.option_key}`,
            severity: 'warning',
            title: `Required By: ${rule.option_key}`,
            message: `"${dependentNode ? getNodeData(dependentNode).label : rule.option_key}" depends on this option. Disabling it may break the dependency chain.`,
            affectedNodeIds: dependentNode ? [nodeId, dependentNode.id] : [nodeId],
          });
        }
      }
    }
  }

  // AI-like suggestions
  if (data.properties?.included === true) {
    suggestions.push({
      id: `ai_dep_chain_${nodeId}`,
      severity: 'suggestion',
      title: '🤖 Dependency Chain Analysis',
      message: `This option is active. The rule engine has checked ${dependencies.length} dependencies and ${conflicts.length} potential conflicts.`,
      affectedNodeIds: [nodeId],
    });
  }

  if (data.properties?.editable === false) {
    suggestions.push({
      id: `ai_locked_${nodeId}`,
      severity: 'info',
      title: '🔒 Locked Option',
      message: 'This option is not user-editable. It\'s controlled by system rules or admin configuration.',
      affectedNodeIds: [nodeId],
    });
  }
};

// ─── Full Graph Analysis ─────────────────────────────────────────

export const analyzeFullGraph = (
  nodes: Node[],
  edges: Edge[],
  rawConfig?: RawConfig
): { analyses: Map<string, NodeAnalysis>; totalIssues: number; totalConflicts: number } => {
  const analyses = new Map<string, NodeAnalysis>();
  let totalIssues = 0;
  let totalConflicts = 0;

  for (const node of nodes) {
    const analysis = analyzeNode(node.id, nodes, edges, rawConfig);
    analyses.set(node.id, analysis);
    totalIssues += analysis.issues.length;
    totalConflicts += analysis.conflicts.length;
  }

  return { analyses, totalIssues, totalConflicts };
};
