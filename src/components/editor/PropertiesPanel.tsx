import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { ConfigNodeData } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';

interface PropertiesPanelProps {
  nodeId: string;
  data: ConfigNodeData;
  onUpdate: (nodeId: string, data: Partial<ConfigNodeData>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

const PropertiesPanel = ({ nodeId, data, onUpdate, onClose, onDelete }: PropertiesPanelProps) => {
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropValue, setNewPropValue] = useState('');

  const addProperty = () => {
    if (!newPropKey.trim()) return;
    onUpdate(nodeId, {
      properties: { ...data.properties, [newPropKey.trim()]: newPropValue },
    });
    setNewPropKey('');
    setNewPropValue('');
  };

  const removeProperty = (key: string) => {
    const { [key]: _, ...rest } = data.properties;
    onUpdate(nodeId, { properties: rest });
  };

  const updateProperty = (key: string, value: string) => {
    onUpdate(nodeId, {
      properties: { ...data.properties, [key]: value },
    });
  };

  return (
    <div className="w-80 bg-surface-overlay border-l border-border h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {NODE_LABELS[data.type]}
          </p>
          <p className="text-sm font-semibold text-foreground">{data.label}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={data.label}
              onChange={(e) => onUpdate(nodeId, { label: e.target.value })}
              className="mt-1 bg-card border-border text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={data.description || ''}
              onChange={(e) => onUpdate(nodeId, { description: e.target.value })}
              className="mt-1 bg-card border-border text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Visible</Label>
            <div className="flex items-center gap-2">
              {data.visible ? (
                <Eye className="w-3.5 h-3.5 text-primary" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Switch
                checked={data.visible}
                onCheckedChange={(visible) => onUpdate(nodeId, { visible })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Visibility Rule */}
        <div>
          <Label className="text-xs text-muted-foreground">Visibility Rule</Label>
          <Input
            value={data.visibilityRule || ''}
            onChange={(e) => onUpdate(nodeId, { visibilityRule: e.target.value })}
            placeholder="e.g. parent.enabled === true"
            className="mt-1 bg-card border-border text-xs font-mono"
          />
        </div>

        <Separator />

        {/* Properties */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Properties</Label>
          <div className="space-y-2">
            {Object.entries(data.properties).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground min-w-[60px] truncate">
                  {key}
                </span>
                <Input
                  value={String(value)}
                  onChange={(e) => updateProperty(key, e.target.value)}
                  className="h-7 text-xs bg-card border-border flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeProperty(key)}
                  className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <Input
              value={newPropKey}
              onChange={(e) => setNewPropKey(e.target.value)}
              placeholder="Key"
              className="h-7 text-xs bg-card border-border"
            />
            <Input
              value={newPropValue}
              onChange={(e) => setNewPropValue(e.target.value)}
              placeholder="Value"
              className="h-7 text-xs bg-card border-border"
              onKeyDown={(e) => e.key === 'Enter' && addProperty()}
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={addProperty}
              className="h-7 w-7 shrink-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(nodeId)}
          className="w-full"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
