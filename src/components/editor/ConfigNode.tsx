import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Puzzle, Layers, ToggleLeft, GripVertical } from 'lucide-react';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { NODE_CHILDREN } from '@/types/configTypes';

const iconMap: Record<ConfigNodeType, React.ElementType> = {
  container: Box,
  module: Puzzle,
  group: Layers,
  option: ToggleLeft,
};

const colorClassMap: Record<ConfigNodeType, string> = {
  container: 'border-node-container/60 shadow-[0_0_20px_-4px] shadow-node-container/20',
  module: 'border-node-module/60 shadow-[0_0_20px_-4px] shadow-node-module/20',
  group: 'border-node-group/60 shadow-[0_0_20px_-4px] shadow-node-group/20',
  option: 'border-node-option/60 shadow-[0_0_20px_-4px] shadow-node-option/20',
};

const iconColorMap: Record<ConfigNodeType, string> = {
  container: 'text-node-container',
  module: 'text-node-module',
  group: 'text-node-group',
  option: 'text-node-option',
};

const ConfigNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ConfigNodeData;
  const Icon = iconMap[nodeData.type];
  const canHaveChildren = NODE_CHILDREN[nodeData.type] !== null;
  const hasParent = nodeData.type !== 'container';

  return (
    <div
      className={`
        relative bg-card border-2 rounded-lg min-w-[200px] transition-all duration-200
        ${colorClassMap[nodeData.type]}
        ${selected ? 'ring-2 ring-primary/50 scale-[1.02]' : ''}
        ${!nodeData.visible ? 'opacity-40' : ''}
      `}
    >
      {hasParent && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card hover:!bg-primary transition-colors"
        />
      )}

      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 cursor-grab" />
        <Icon className={`w-4 h-4 ${iconColorMap[nodeData.type]}`} />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {nodeData.type}
        </span>
      </div>

      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground truncate">{nodeData.label}</p>
        {nodeData.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">
            {nodeData.description}
          </p>
        )}
      </div>

      {Object.keys(nodeData.properties).length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {Object.entries(nodeData.properties).slice(0, 3).map(([key]) => (
            <span
              key={key}
              className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono"
            >
              {key}
            </span>
          ))}
          {Object.keys(nodeData.properties).length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              +{Object.keys(nodeData.properties).length - 3}
            </span>
          )}
        </div>
      )}

      {canHaveChildren && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card hover:!bg-primary transition-colors"
        />
      )}
    </div>
  );
};

export default memo(ConfigNode);
