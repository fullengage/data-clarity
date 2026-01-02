import { useState } from 'react';
import { Check, Edit2, X, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnMapping, SuggestedField } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ColumnMappingCardProps {
  mapping: ColumnMapping;
  sampleValues?: string[];
  onUpdate: (updates: Partial<ColumnMapping>) => void;
}

const TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'currency', label: 'Moeda' },
  { value: 'percentage', label: 'Porcentagem' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'category', label: 'Categoria' },
  { value: 'unknown', label: 'Indefinido' },
] as const;

export default function ColumnMappingCard({ mapping, sampleValues = [], onUpdate }: ColumnMappingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(mapping.mappedName);
  const [editedType, setEditedType] = useState(mapping.mappedType);

  const handleConfirm = () => {
    onUpdate({ status: 'confirmed' });
  };

  const handleIgnore = () => {
    onUpdate({ status: 'ignored' });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedName(mapping.mappedName);
    setEditedType(mapping.mappedType);
  };

  const handleSaveEdit = () => {
    onUpdate({
      mappedName: editedName,
      mappedType: editedType,
      status: 'edited',
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(mapping.mappedName);
    setEditedType(mapping.mappedType);
  };

  const handleRestore = () => {
    onUpdate({ status: 'pending' });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-dataviz-green';
    if (confidence >= 0.5) return 'text-dataviz-orange';
    return 'text-dataviz-red';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Média';
    return 'Baixa';
  };

  const getStatusBadge = () => {
    switch (mapping.status) {
      case 'confirmed':
        return <Badge className="bg-dataviz-green/10 text-dataviz-green border-dataviz-green/20">Confirmado</Badge>;
      case 'edited':
        return <Badge className="bg-dataviz-blue/10 text-dataviz-blue border-dataviz-blue/20">Editado</Badge>;
      case 'ignored':
        return <Badge className="bg-muted text-muted-foreground">Ignorado</Badge>;
      default:
        return null;
    }
  };

  const isActionable = mapping.status === 'pending';
  const isIgnored = mapping.status === 'ignored';

  return (
    <Card className={cn(
      "transition-all duration-200",
      isIgnored && "opacity-50",
      mapping.status === 'confirmed' && "border-dataviz-green/30 bg-dataviz-green/5",
      mapping.status === 'edited' && "border-dataviz-blue/30 bg-dataviz-blue/5",
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Column info */}
          <div className="flex-1 min-w-0">
            {/* Original name */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Original:</span>
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {mapping.originalName}
              </code>
            </div>

            {/* Suggested/Edited name */}
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome sugerido:</label>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9"
                    placeholder="Nome da coluna"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo de dado:</label>
                  <Select value={editedType} onValueChange={(v) => setEditedType(v as any)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-dataviz-purple" />
                  <span className="font-medium">{mapping.mappedName}</span>
                  <Badge variant="outline" className="text-xs">
                    {TYPE_OPTIONS.find(t => t.value === mapping.mappedType)?.label || mapping.mappedType}
                  </Badge>
                  {getStatusBadge()}
                </div>

                {/* Confidence */}
                {mapping.confidence > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Confiança:</span>
                    <span className={cn("font-medium", getConfidenceColor(mapping.confidence))}>
                      {getConfidenceLabel(mapping.confidence)} ({Math.round(mapping.confidence * 100)}%)
                    </span>
                  </div>
                )}

                {/* Sample values */}
                {sampleValues.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">Exemplos: </span>
                    <span className="text-xs text-foreground/80">
                      {sampleValues.slice(0, 3).join(', ')}
                      {sampleValues.length > 3 && '...'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          {!isEditing && (
            <div className="flex flex-col gap-1">
              {isActionable && (
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleConfirm}>
                    <Check className="w-4 h-4 mr-1" />
                    Confirmar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={handleIgnore}>
                    <X className="w-4 h-4 mr-1" />
                    Ignorar
                  </Button>
                </>
              )}
              {!isActionable && (
                <Button size="sm" variant="ghost" className="h-8" onClick={handleRestore}>
                  Restaurar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
