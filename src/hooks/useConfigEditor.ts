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

const createNodeData = (type: ConfigNodeType): ConfigNodeData => ({
  label: `New ${NODE_LABELS[type]}`,
  type,
  description: '',
  properties: {},
  visible: true,
});

export const useConfigEditor = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const idCounter = useRef(1);

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
      // Validate hierarchy: source must be parent type of target
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const sourceType = (sourceNode.data as unknown as ConfigNodeData).type;
      const targetType = (targetNode.data as unknown as ConfigNodeData).type;
      const expectedParent = NODE_HIERARCHY[targetType];

      if (expectedParent !== sourceType) return;

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
    },
    [nodes]
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
          if (config.nodes && config.edges) {
            setNodes(config.nodes);
            setEdges(config.edges);
            // Update counter
            const maxId = config.nodes.reduce((max: number, n: Node) => {
              const num = parseInt(n.id.replace('node_', ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            idCounter.current = maxId + 1;
            setSelectedNodeId(null);
          }
        } catch {
          console.error('Invalid config file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
    updateNodeData,
    deleteNode,
    setSelectedNodeId,
    exportConfig,
    importConfig,
  };
};
