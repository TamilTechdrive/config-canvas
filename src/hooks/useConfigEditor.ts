import { useState, useCallback, useRef } from 'react';
import {
  type Node,
  type Edge,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { NODE_LABELS, NODE_HIERARCHY } from '@/types/configTypes';
import { validateConnection, getUniquenessViolation } from '@/types/connectionRules';
import { SAMPLE_CONFIG } from '@/data/sampleConfig';
import { parseConfigToFlow } from '@/data/configParser';
import { toast } from 'sonner';

const createNodeData = (type: ConfigNodeType): ConfigNodeData => ({
  label: `New ${NODE_LABELS[type]}`,
  type,
  description: '',
  properties: {},
  visible: true,
});

// Parse sample data for initial load
const initialData = parseConfigToFlow(SAMPLE_CONFIG);

export const useConfigEditor = () => {
  const [nodes, setNodes] = useState<Node[]>(initialData.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialData.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const idCounter = useRef(initialData.maxId);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const sourceType = (sourceNode.data as unknown as ConfigNodeData).type;
      const targetType = (targetNode.data as unknown as ConfigNodeData).type;

      // Validate connection rules
      const validation = validateConnection(sourceType, targetType);
      if (!validation.valid) {
        toast.error('Invalid Connection', { description: validation.message });
        return;
      }

      // Uniqueness check
      const uniqueError = getUniquenessViolation(connection.source!, connection.target!, edges);
      if (uniqueError) {
        toast.warning('Connection Blocked', { description: uniqueError });
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
      toast.success('Connected', { description: validation.message });
    },
    [nodes, edges]
  );

  const addNode = useCallback((type: ConfigNodeType, position: { x: number; y: number }) => {
    const id = `node_${idCounter.current++}`;
    const newNode: Node = {
      id,
      type: 'configNode',
      position,
      data: createNodeData(type) as unknown as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
    return id;
  }, []);

  const autoAddChild = useCallback((parentId: string, childType: ConfigNodeType) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const offset = { x: 0, y: 150 };
    const childrenCount = edges.filter((e) => e.source === parentId).length;
    const position = {
      x: parentNode.position.x + childrenCount * 220 + offset.x,
      y: parentNode.position.y + offset.y,
    };

    const childId = `node_${idCounter.current++}`;
    const newNode: Node = {
      id: childId,
      type: 'configNode',
      position,
      data: createNodeData(childType) as unknown as Record<string, unknown>,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `edge_${parentId}_${childId}`,
        source: parentId,
        target: childId,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 2 },
      },
    ]);
    toast.success(`Added ${NODE_LABELS[childType]}`, { description: `Connected to parent node` });
  }, [nodes, edges]);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<ConfigNodeData>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const exportConfig = useCallback(() => {
    const config = { nodes, edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const importConfig = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target?.result as string);

          // Try parsing as raw module config first
          if (config.modules && Array.isArray(config.modules)) {
            const parsed = parseConfigToFlow(config);
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            idCounter.current = parsed.maxId;
            setSelectedNodeId(null);
            toast.success('Imported', { description: `Loaded ${parsed.nodes.length} nodes from module config` });
            return;
          }

          // Fall back to React Flow format
          if (config.nodes && config.edges) {
            setNodes(config.nodes);
            setEdges(config.edges);
            const maxId = config.nodes.reduce((max: number, n: Node) => {
              const num = parseInt(n.id.replace('node_', ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            idCounter.current = maxId + 1;
            setSelectedNodeId(null);
            toast.success('Imported', { description: `Loaded ${config.nodes.length} nodes` });
          }
        } catch {
          toast.error('Import Failed', { description: 'Invalid JSON file' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const loadSampleData = useCallback(() => {
    const parsed = parseConfigToFlow(SAMPLE_CONFIG);
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    idCounter.current = parsed.maxId;
    setSelectedNodeId(null);
    toast.success('Sample Loaded', { description: `${parsed.nodes.length} nodes, ${parsed.edges.length} edges` });
  }, []);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    autoAddChild,
    updateNodeData,
    deleteNode,
    setSelectedNodeId,
    exportConfig,
    importConfig,
    loadSampleData,
  };
};
