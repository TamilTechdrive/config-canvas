/**
 * Parses raw JSON config into React Flow nodes and edges.
 * Handles: Container (root) → Module → Group → Option
 * Also creates rule/dependency edges and state nodes.
 */
import type { Node, Edge } from '@xyflow/react';
import type { RawConfig } from './sampleConfig';
import type { ConfigNodeData } from '@/types/configTypes';

interface ParseResult {
  nodes: Node[];
  edges: Edge[];
  maxId: number;
}

const makeNodeData = (
  overrides: Partial<ConfigNodeData> & Pick<ConfigNodeData, 'label' | 'type'>
): Record<string, unknown> =>
  ({
    label: overrides.label,
    type: overrides.type,
    description: overrides.description ?? '',
    properties: overrides.properties ?? {},
    visible: overrides.visible ?? true,
  }) as unknown as Record<string, unknown>;

const edgeDefaults = {
  type: 'smoothstep' as const,
  animated: true,
  style: { strokeWidth: 2 },
};

export const parseConfigToFlow = (config: RawConfig): ParseResult => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let idCounter = 1;

  const nextId = () => `node_${idCounter++}`;

  // Create a root container
  const containerId = nextId();
  nodes.push({
    id: containerId,
    type: 'configNode',
    position: { x: 400, y: 0 },
    data: makeNodeData({
      label: 'Configuration Root',
      type: 'container',
      description: 'Root container for all modules',
      properties: { moduleCount: config.modules.length },
    }),
  });

  config.modules.forEach((mod, modIdx) => {
    const moduleId = nextId();
    const modX = modIdx * 500;

    nodes.push({
      id: moduleId,
      type: 'configNode',
      position: { x: modX, y: 160 },
      data: makeNodeData({
        label: mod.name,
        type: 'module',
        description: `ID: ${mod.id} | Initial state: ${mod.initial}`,
        properties: {
          moduleId: mod.id,
          initial: mod.initial,
          rulesCount: mod.rules.length,
          statesCount: Object.keys(mod.states).length,
        },
      }),
    });

    edges.push({
      id: `edge_${containerId}_${moduleId}`,
      source: containerId,
      target: moduleId,
      ...edgeDefaults,
    });

    // Build a key→nodeId map for rule edges
    const optionKeyToNodeId: Record<string, string> = {};

    mod.groups.forEach((group, grpIdx) => {
      const groupId = nextId();
      const grpX = modX + grpIdx * 280 - ((mod.groups.length - 1) * 140);

      nodes.push({
        id: groupId,
        type: 'configNode',
        position: { x: grpX, y: 340 },
        data: makeNodeData({
          label: group.name,
          type: 'group',
          description: `${group.options.length} option(s)`,
          properties: {
            groupId: group.id,
            optionCount: group.options.length,
          },
        }),
      });

      edges.push({
        id: `edge_${moduleId}_${groupId}`,
        source: moduleId,
        target: groupId,
        ...edgeDefaults,
      });

      group.options.forEach((opt, optIdx) => {
        const optionId = nextId();
        const optX = grpX + optIdx * 200 - ((group.options.length - 1) * 100);

        optionKeyToNodeId[opt.key] = optionId;

        nodes.push({
          id: optionId,
          type: 'configNode',
          position: { x: optX, y: 520 },
          data: makeNodeData({
            label: opt.name,
            type: 'option',
            description: opt.included ? 'Included' : 'Not included',
            properties: {
              key: opt.key,
              editable: opt.editable,
              included: opt.included,
              optionId: opt.id,
            },
          }),
        });

        edges.push({
          id: `edge_${groupId}_${optionId}`,
          source: groupId,
          target: optionId,
          ...edgeDefaults,
        });
      });
    });

    // Create rule dependency edges (dashed, different color)
    mod.rules.forEach((rule) => {
      const dependentId = optionKeyToNodeId[rule.option_key];
      rule.requires.forEach((reqKey) => {
        const requiredId = optionKeyToNodeId[reqKey];
        if (dependentId && requiredId) {
          edges.push({
            id: `rule_${requiredId}_${dependentId}`,
            source: requiredId,
            target: dependentId,
            type: 'smoothstep',
            animated: false,
            style: { strokeWidth: 2, strokeDasharray: '6 3', stroke: 'hsl(35 80% 55%)' },
            label: 'requires',
            labelStyle: { fill: 'hsl(35 80% 55%)', fontSize: 10, fontWeight: 600 },
          });
        }
      });
    });
  });

  return { nodes, edges, maxId: idCounter };
};
