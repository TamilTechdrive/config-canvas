import { Box, Puzzle, Layers, ToggleLeft } from 'lucide-react';
import type { ConfigNodeType } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';

const paletteItems: { type: ConfigNodeType; icon: React.ElementType; desc: string }[] = [
  { type: 'container', icon: Box, desc: 'Top-level container' },
  { type: 'module', icon: Puzzle, desc: 'Functional module' },
  { type: 'group', icon: Layers, desc: 'Option group' },
  { type: 'option', icon: ToggleLeft, desc: 'Config option' },
];

const colorMap: Record<ConfigNodeType, string> = {
  container: 'border-node-container/40 hover:border-node-container/80 hover:bg-node-container/5',
  module: 'border-node-module/40 hover:border-node-module/80 hover:bg-node-module/5',
  group: 'border-node-group/40 hover:border-node-group/80 hover:bg-node-group/5',
  option: 'border-node-option/40 hover:border-node-option/80 hover:bg-node-option/5',
};

const iconColorMap: Record<ConfigNodeType, string> = {
  container: 'text-node-container',
  module: 'text-node-module',
  group: 'text-node-group',
  option: 'text-node-option',
};

const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: ConfigNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Components
      </h3>
      {paletteItems.map(({ type, icon: Icon, desc }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          className={`
            flex items-center gap-3 p-2.5 rounded-md border cursor-grab
            bg-card transition-all duration-150 active:scale-95
            ${colorMap[type]}
          `}
        >
          <Icon className={`w-4 h-4 shrink-0 ${iconColorMap[type]}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{NODE_LABELS[type]}</p>
            <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NodePalette;
