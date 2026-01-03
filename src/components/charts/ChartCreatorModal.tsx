import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, LineChart, PieChart, Sparkles } from 'lucide-react';
import { ChartCategory, ChartConfig } from '@/types/chart.types';

interface ChartCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChart: (config: ChartConfig) => Promise<void>;
  columns: string[];
  availableChartTypes?: ChartCategory[];
}

export function ChartCreatorModal({
  isOpen,
  onClose,
  onCreateChart,
  columns,
  availableChartTypes = []
}: ChartCreatorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: '',
    title: '',
    x_column: '',
    y_column: '',
    aggregation: 'sum',
    show_values: true,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Resetar ao abrir
  useEffect(() => {
    if (isOpen) {
      setChartConfig({
        type: '',
        title: '',
        x_column: '',
        y_column: '',
        aggregation: 'sum',
        show_values: true,
      });
      setSelectedCategory('');
    }
  }, [isOpen]);

  const handleCreateChart = async () => {
    if (!chartConfig.type || !chartConfig.title) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateChart(chartConfig);
      onClose();
    } catch (error) {
      console.error('Erro ao criar gráfico:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedType = availableChartTypes
    .flatMap(cat => cat.types)
    .find(t => t.id === chartConfig.type);

  const needsXY = ['bar', 'column', 'horizontal_bar', 'line', 'area', 'scatter', 'bubble', 'waterfall', 'funnel', 'treemap', 'sunburst', 'radar'].includes(chartConfig.type);
  const needsOnlyX = ['histogram'].includes(chartConfig.type);
  const needsOnlyY = ['box'].includes(chartConfig.type);
  const needsCandlestick = chartConfig.type === 'candlestick';
  const needsSize = chartConfig.type === 'bubble';
  const supportsAggregation = ['bar', 'column', 'horizontal_bar', 'line', 'area', 'pie', 'donut'].includes(chartConfig.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Criar Novo Gráfico
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo de gráfico e configure os dados para visualização
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Básicos</TabsTrigger>
            <TabsTrigger value="specialized">Especializados</TabsTrigger>
            <TabsTrigger value="statistical">Estatísticos</TabsTrigger>
          </TabsList>

          {/* Básicos */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {availableChartTypes
                .filter(cat => ['Colunas e Barras', 'Linhas e Áreas', 'Pizza e Rosca', 'Dispersão e Bolhas'].includes(cat.category))
                .flatMap(cat => cat.types)
                .map(type => (
                  <Button
                    key={type.id}
                    variant={chartConfig.type === type.id ? 'default' : 'outline'}
                    className="h-auto flex-col items-start p-4"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: type.id }))}
                  >
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  </Button>
                ))}
            </div>
          </TabsContent>

          {/* Especializados */}
          <TabsContent value="specialized" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {availableChartTypes
                .filter(cat => cat.category === 'Especializados')
                .flatMap(cat => cat.types)
                .map(type => (
                  <Button
                    key={type.id}
                    variant={chartConfig.type === type.id ? 'default' : 'outline'}
                    className="h-auto flex-col items-start p-4"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: type.id }))}
                  >
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  </Button>
                ))}
            </div>
          </TabsContent>

          {/* Estatísticos */}
          <TabsContent value="statistical" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {availableChartTypes
                .filter(cat => cat.category === 'Estatísticos e Financeiros')
                .flatMap(cat => cat.types)
                .map(type => (
                  <Button
                    key={type.id}
                    variant={chartConfig.type === type.id ? 'default' : 'outline'}
                    className="h-auto flex-col items-start p-4"
                    onClick={() => setChartConfig(prev => ({ ...prev, type: type.id }))}
                  >
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  </Button>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {chartConfig.type && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedType?.name}</Badge>
              <span className="text-sm text-muted-foreground">{selectedType?.description}</span>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Gráfico *</Label>
              <Input
                id="title"
                placeholder="Ex: Vendas por Produto"
                value={chartConfig.title}
                onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Configurações específicas por tipo */}
            {needsXY && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="x_column">Coluna X (Categorias) *</Label>
                    <Select
                      value={chartConfig.x_column}
                      onValueChange={(value) => setChartConfig(prev => ({ ...prev, x_column: value }))}
                    >
                      <SelectTrigger id="x_column">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="y_column">Coluna Y (Valores) *</Label>
                    <Select
                      value={chartConfig.y_column}
                      onValueChange={(value) => setChartConfig(prev => ({ ...prev, y_column: value }))}
                    >
                      <SelectTrigger id="y_column">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {supportsAggregation && (
                  <div className="space-y-2">
                    <Label htmlFor="aggregation">Agregação</Label>
                    <Select
                      value={chartConfig.aggregation}
                      onValueChange={(value: any) => setChartConfig(prev => ({ ...prev, aggregation: value }))}
                    >
                      <SelectTrigger id="aggregation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Soma</SelectItem>
                        <SelectItem value="avg">Média</SelectItem>
                        <SelectItem value="count">Contagem</SelectItem>
                        <SelectItem value="min">Mínimo</SelectItem>
                        <SelectItem value="max">Máximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {needsOnlyX && (
              <div className="space-y-2">
                <Label htmlFor="x_column">Coluna para Histograma *</Label>
                <Select
                  value={chartConfig.x_column}
                  onValueChange={(value) => setChartConfig(prev => ({ ...prev, x_column: value }))}
                >
                  <SelectTrigger id="x_column">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsOnlyY && (
              <div className="space-y-2">
                <Label htmlFor="y_column">Coluna para Box Plot *</Label>
                <Select
                  value={chartConfig.y_column}
                  onValueChange={(value) => setChartConfig(prev => ({ ...prev, y_column: value }))}
                >
                  <SelectTrigger id="y_column">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsSize && (
              <div className="space-y-2">
                <Label htmlFor="size_column">Coluna para Tamanho das Bolhas</Label>
                <Select
                  value={chartConfig.size_column}
                  onValueChange={(value) => setChartConfig(prev => ({ ...prev, size_column: value }))}
                >
                  <SelectTrigger id="size_column">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsCandlestick && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Select
                    value={chartConfig.date_column}
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, date_column: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Abertura *</Label>
                  <Select
                    value={chartConfig.open_column}
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, open_column: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Máxima *</Label>
                  <Select
                    value={chartConfig.high_column}
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, high_column: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mínima *</Label>
                  <Select
                    value={chartConfig.low_column}
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, low_column: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Fechamento *</Label>
                  <Select
                    value={chartConfig.close_column}
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, close_column: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateChart}
            disabled={!chartConfig.type || !chartConfig.title || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Criar Gráfico
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
