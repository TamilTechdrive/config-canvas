import { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ConfigNode from '@/components/editor/ConfigNode';
import NodePalette from '@/components/editor/NodePalette';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import EditorToolbar from '@/components/editor/EditorToolbar';
import { useConfigEditor } from '@/hooks/useConfigEditor';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';

const nodeTypes: NodeTypes = {
  configNode: ConfigNode,
};

const EditorCanvas = () => {
  const {
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
  } = useConfigEditor();

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as ConfigNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
          proOptions={{ hideAttribution: true }}
        >
          <EditorToolbar
            onExport={exportConfig}
            onImport={importConfig}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(220 14% 18%)" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as ConfigNodeData;
              const colors: Record<string, string> = {
                container: 'hsl(200, 60%, 50%)',
                module: 'hsl(160, 60%, 45%)',
                group: 'hsl(35, 80%, 55%)',
                option: 'hsl(260, 50%, 55%)',
              };
              return colors[data.type] || '#666';
            }}
            maskColor="hsla(220, 16%, 10%, 0.8)"
          />
        </ReactFlow>

        {/* Left palette */}
        <div className="absolute left-0 top-11 bottom-0 w-56 bg-surface-overlay border-r border-border overflow-y-auto z-10">
          <NodePalette />
        </div>

        {/* Right properties panel */}
        {selectedNode && (
          <div className="absolute right-0 top-11 bottom-0 z-10">
            <PropertiesPanel
              nodeId={selectedNodeId!}
              data={selectedNode.data as unknown as ConfigNodeData}
              onUpdate={updateNodeData}
              onClose={() => setSelectedNodeId(null)}
              onDelete={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Index = () => (
  <ReactFlowProvider>
    <EditorCanvas />
  </ReactFlowProvider>
);

export default Index;
