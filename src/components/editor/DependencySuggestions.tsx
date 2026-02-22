import { AlertTriangle, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';
import { DEPENDENCY_RULES, type DependencySuggestion } from '@/types/connectionRules';
import type { Edge } from '@xyflow/react';

interface DependencySuggestionsProps {
  nodeId: string;
  nodeData: ConfigNodeData;
  edges: Edge[];
  allNodes: { id: string; data: unknown }[];
  onAutoAdd: (parentId: string, type: ConfigNodeType) => void;
}

const DependencySuggestions = ({
  nodeId,
  nodeData,
  edges,
  allNodes,
  onAutoAdd,
}: DependencySuggestionsProps) => {
  const suggestions = DEPENDENCY_RULES[nodeData.type];
  if (!suggestions || suggestions.length === 0) return null;

  // Find existing children
  const childEdges = edges.filter((e) => e.source === nodeId);
  const childIds = childEdges.map((e) => e.target);
  const childNodes = allNodes.filter((n) => childIds.includes(n.id));
  const childTypes = childNodes.map((n) => (n.data as unknown as ConfigNodeData).type);

  // Filter to missing required deps
  const missingSuggestions = suggestions.filter((s) => {
    if (s.required) {
      return !childTypes.includes(s.type);
    }
    // Show optional only if no children of that type exist
    return childTypes.filter((t) => t === s.type).length < 2;
  });

  if (missingSuggestions.length === 0) return null;

  const requiredMissing = missingSuggestions.filter((s) => s.required);
  const optionalSuggestions = missingSuggestions.filter((s) => !s.required);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dependencies
        </span>
      </div>

      {requiredMissing.length > 0 && (
        <div className="space-y-1.5">
          {requiredMissing.map((s, i) => (
            <SuggestionRow
              key={`req-${i}`}
              suggestion={s}
              onAdd={() => onAutoAdd(nodeId, s.type)}
              variant="required"
            />
          ))}
        </div>
      )}

      {optionalSuggestions.length > 0 && (
        <div className="space-y-1.5">
          {optionalSuggestions.map((s, i) => (
            <SuggestionRow
              key={`opt-${i}`}
              suggestion={s}
              onAdd={() => onAutoAdd(nodeId, s.type)}
              variant="optional"
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SuggestionRow = ({
  suggestion,
  onAdd,
  variant,
}: {
  suggestion: DependencySuggestion;
  onAdd: () => void;
  variant: 'required' | 'optional';
}) => (
  <div
    className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-colors ${
      variant === 'required'
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-border bg-card'
    }`}
  >
    {variant === 'required' ? (
      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
    ) : (
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium text-foreground">{suggestion.label}</p>
      <p className="text-muted-foreground truncate">{suggestion.reason}</p>
    </div>
    <Button
      variant={variant === 'required' ? 'default' : 'secondary'}
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={onAdd}
    >
      <Plus className="w-3 h-3" />
    </Button>
  </div>
);

export default DependencySuggestions;
