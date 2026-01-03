"""
Chart Generator - Geração de gráficos com Pandas e Plotly
Suporta todos os tipos de gráficos solicitados pelo usuário
"""
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Any, Optional
import json


class ChartGenerator:
    """Gerador de gráficos usando Plotly"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        
    def generate_chart(self, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera um gráfico baseado na configuração fornecida
        
        Args:
            chart_config: {
                'type': 'bar' | 'line' | 'pie' | 'scatter' | 'area' | etc,
                'x_column': nome da coluna X,
                'y_column': nome da coluna Y (ou lista de colunas),
                'title': título do gráfico,
                'aggregation': 'sum' | 'avg' | 'count' | 'min' | 'max',
                'color_column': coluna para colorir (opcional),
                'size_column': coluna para tamanho (bolhas, opcional),
                'orientation': 'v' | 'h' (vertical ou horizontal),
                'show_values': bool (mostrar valores nas barras/colunas)
            }
        
        Returns:
            {
                'success': bool,
                'chart_json': str (JSON do Plotly),
                'chart_data': dict (dados processados),
                'error': str (se houver erro)
            }
        """
        try:
            chart_type = chart_config.get('type', 'bar')
            
            # Mapear para método específico
            chart_methods = {
                'bar': self._generate_bar_chart,
                'column': self._generate_bar_chart,
                'horizontal_bar': self._generate_horizontal_bar,
                'line': self._generate_line_chart,
                'area': self._generate_area_chart,
                'pie': self._generate_pie_chart,
                'donut': self._generate_donut_chart,
                'scatter': self._generate_scatter_chart,
                'bubble': self._generate_bubble_chart,
                'waterfall': self._generate_waterfall_chart,
                'funnel': self._generate_funnel_chart,
                'treemap': self._generate_treemap_chart,
                'sunburst': self._generate_sunburst_chart,
                'radar': self._generate_radar_chart,
                'histogram': self._generate_histogram_chart,
                'box': self._generate_box_chart,
                'candlestick': self._generate_candlestick_chart,
            }
            
            method = chart_methods.get(chart_type)
            if not method:
                return {
                    'success': False,
                    'error': f'Tipo de gráfico não suportado: {chart_type}'
                }
            
            fig = method(chart_config)
            
            return {
                'success': True,
                'chart_json': fig.to_json(),
                'chart_data': self._extract_chart_data(chart_config),
                'type': chart_type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _prepare_data(self, chart_config: Dict[str, Any]) -> pd.DataFrame:
        """Prepara e agrega os dados conforme configuração"""
        x_col = chart_config.get('x_column')
        y_col = chart_config.get('y_column')
        agg = chart_config.get('aggregation', 'sum')
        
        if not x_col or not y_col:
            return self.df
        
        # Agregar dados
        if agg == 'count':
            data = self.df.groupby(x_col).size().reset_index(name=y_col)
        elif agg == 'sum':
            data = self.df.groupby(x_col)[y_col].sum().reset_index()
        elif agg == 'avg':
            data = self.df.groupby(x_col)[y_col].mean().reset_index()
        elif agg == 'min':
            data = self.df.groupby(x_col)[y_col].min().reset_index()
        elif agg == 'max':
            data = self.df.groupby(x_col)[y_col].max().reset_index()
        else:
            data = self.df[[x_col, y_col]].copy()
        
        return data
    
    def _generate_bar_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de barras/colunas"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Bar(
                x=data[x_col],
                y=data[y_col],
                text=data[y_col] if config.get('show_values') else None,
                textposition='auto',
                marker_color=config.get('color', '#3b82f6')
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Barras'),
            xaxis_title=x_col,
            yaxis_title=y_col,
            template='plotly_white'
        )
        
        return fig
    
    def _generate_horizontal_bar(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de barras horizontais"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Bar(
                y=data[x_col],
                x=data[y_col],
                orientation='h',
                text=data[y_col] if config.get('show_values') else None,
                textposition='auto',
                marker_color=config.get('color', '#3b82f6')
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Barras Horizontais'),
            xaxis_title=y_col,
            yaxis_title=x_col,
            template='plotly_white'
        )
        
        return fig
    
    def _generate_line_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de linhas"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Scatter(
                x=data[x_col],
                y=data[y_col],
                mode='lines+markers',
                line=dict(color=config.get('color', '#3b82f6'), width=2),
                marker=dict(size=6)
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Linhas'),
            xaxis_title=x_col,
            yaxis_title=y_col,
            template='plotly_white'
        )
        
        return fig
    
    def _generate_area_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de área"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Scatter(
                x=data[x_col],
                y=data[y_col],
                fill='tozeroy',
                mode='lines',
                line=dict(color=config.get('color', '#3b82f6'), width=2)
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Área'),
            xaxis_title=x_col,
            yaxis_title=y_col,
            template='plotly_white'
        )
        
        return fig
    
    def _generate_pie_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de pizza"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Pie(
                labels=data[x_col],
                values=data[y_col],
                hole=0
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Pizza'),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_donut_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de rosca"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=[
            go.Pie(
                labels=data[x_col],
                values=data[y_col],
                hole=0.4
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Rosca'),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_scatter_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de dispersão"""
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        color_col = config.get('color_column')
        
        if color_col:
            fig = px.scatter(
                self.df,
                x=x_col,
                y=y_col,
                color=color_col,
                title=config.get('title', 'Gráfico de Dispersão')
            )
        else:
            fig = go.Figure(data=[
                go.Scatter(
                    x=self.df[x_col],
                    y=self.df[y_col],
                    mode='markers',
                    marker=dict(size=8, color=config.get('color', '#3b82f6'))
                )
            ])
            
            fig.update_layout(
                title=config.get('title', 'Gráfico de Dispersão'),
                xaxis_title=x_col,
                yaxis_title=y_col,
                template='plotly_white'
            )
        
        return fig
    
    def _generate_bubble_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de bolhas"""
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        size_col = config.get('size_column')
        color_col = config.get('color_column')
        
        fig = px.scatter(
            self.df,
            x=x_col,
            y=y_col,
            size=size_col,
            color=color_col if color_col else None,
            title=config.get('title', 'Gráfico de Bolhas')
        )
        
        return fig
    
    def _generate_waterfall_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de cascata"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(go.Waterfall(
            x=data[x_col],
            y=data[y_col],
            textposition="outside"
        ))
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Cascata'),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_funnel_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico de funil"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(go.Funnel(
            y=data[x_col],
            x=data[y_col],
            textinfo="value+percent initial"
        ))
        
        fig.update_layout(
            title=config.get('title', 'Gráfico de Funil'),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_treemap_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico treemap"""
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = px.treemap(
            self.df,
            path=[x_col],
            values=y_col,
            title=config.get('title', 'Treemap')
        )
        
        return fig
    
    def _generate_sunburst_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico sunburst"""
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = px.sunburst(
            self.df,
            path=[x_col],
            values=y_col,
            title=config.get('title', 'Sunburst')
        )
        
        return fig
    
    def _generate_radar_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico radar"""
        data = self._prepare_data(config)
        x_col = config.get('x_column')
        y_col = config.get('y_column')
        
        fig = go.Figure(data=go.Scatterpolar(
            r=data[y_col],
            theta=data[x_col],
            fill='toself'
        ))
        
        fig.update_layout(
            title=config.get('title', 'Gráfico Radar'),
            polar=dict(radialaxis=dict(visible=True)),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_histogram_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Histograma"""
        x_col = config.get('x_column')
        
        fig = go.Figure(data=[
            go.Histogram(
                x=self.df[x_col],
                marker_color=config.get('color', '#3b82f6')
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Histograma'),
            xaxis_title=x_col,
            yaxis_title='Frequência',
            template='plotly_white'
        )
        
        return fig
    
    def _generate_box_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Box plot"""
        y_col = config.get('y_column')
        x_col = config.get('x_column')
        
        if x_col:
            fig = px.box(self.df, x=x_col, y=y_col)
        else:
            fig = go.Figure(data=[
                go.Box(y=self.df[y_col])
            ])
        
        fig.update_layout(
            title=config.get('title', 'Box Plot'),
            template='plotly_white'
        )
        
        return fig
    
    def _generate_candlestick_chart(self, config: Dict[str, Any]) -> go.Figure:
        """Gráfico candlestick (velas)"""
        date_col = config.get('date_column')
        open_col = config.get('open_column')
        high_col = config.get('high_column')
        low_col = config.get('low_column')
        close_col = config.get('close_column')
        
        fig = go.Figure(data=[
            go.Candlestick(
                x=self.df[date_col],
                open=self.df[open_col],
                high=self.df[high_col],
                low=self.df[low_col],
                close=self.df[close_col]
            )
        ])
        
        fig.update_layout(
            title=config.get('title', 'Candlestick'),
            xaxis_title='Data',
            yaxis_title='Preço',
            template='plotly_white'
        )
        
        return fig
    
    def _extract_chart_data(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Extrai dados processados do gráfico"""
        data = self._prepare_data(config)
        return {
            'rows': data.to_dict('records'),
            'columns': list(data.columns),
            'row_count': len(data)
        }


def get_available_chart_types() -> List[Dict[str, Any]]:
    """Retorna lista de tipos de gráficos disponíveis"""
    return [
        {
            'category': 'Colunas e Barras',
            'types': [
                {'id': 'bar', 'name': 'Colunas', 'description': 'Ideais para comparar categorias'},
                {'id': 'horizontal_bar', 'name': 'Barras Horizontais', 'description': 'Recomendado para etiquetas longas'},
            ]
        },
        {
            'category': 'Linhas e Áreas',
            'types': [
                {'id': 'line', 'name': 'Linhas', 'description': 'Excelente para tendências ao longo do tempo'},
                {'id': 'area', 'name': 'Área', 'description': 'Enfatiza magnitude da mudança'},
            ]
        },
        {
            'category': 'Pizza e Rosca',
            'types': [
                {'id': 'pie', 'name': 'Pizza', 'description': 'Mostra proporção em relação ao total'},
                {'id': 'donut', 'name': 'Rosca', 'description': 'Permite visualizar múltiplas séries'},
            ]
        },
        {
            'category': 'Dispersão e Bolhas',
            'types': [
                {'id': 'scatter', 'name': 'Dispersão', 'description': 'Relação entre duas variáveis'},
                {'id': 'bubble', 'name': 'Bolhas', 'description': 'Adiciona terceira dimensão (tamanho)'},
            ]
        },
        {
            'category': 'Especializados',
            'types': [
                {'id': 'waterfall', 'name': 'Cascata', 'description': 'Fluxos de caixa e variações'},
                {'id': 'funnel', 'name': 'Funil', 'description': 'Estágios de processo (vendas/marketing)'},
                {'id': 'treemap', 'name': 'Treemap', 'description': 'Hierarquias e proporções'},
                {'id': 'sunburst', 'name': 'Sunburst', 'description': 'Dados hierárquicos circulares'},
                {'id': 'radar', 'name': 'Radar', 'description': 'Compara valores agregados'},
            ]
        },
        {
            'category': 'Estatísticos e Financeiros',
            'types': [
                {'id': 'histogram', 'name': 'Histograma', 'description': 'Frequência de dados'},
                {'id': 'box', 'name': 'Box Plot', 'description': 'Distribuição estatística'},
                {'id': 'candlestick', 'name': 'Candlestick', 'description': 'Variações de preço (mercado financeiro)'},
            ]
        }
    ]
