"""
Endpoints para geração de gráficos
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import pandas as pd
from .chart_generator import ChartGenerator, get_available_chart_types

router = APIRouter(prefix="/charts", tags=["charts"])


class ChartGenerationRequest(BaseModel):
    """Request para gerar gráfico"""
    dataset_id: str
    chart_config: Dict[str, Any]
    data: Optional[List[Dict[str, Any]]] = None


class ChartTypesResponse(BaseModel):
    """Response com tipos de gráficos disponíveis"""
    success: bool
    chart_types: List[Dict[str, Any]]


class ChartGenerationResponse(BaseModel):
    """Response da geração de gráfico"""
    success: bool
    chart_json: Optional[str] = None
    chart_data: Optional[Dict[str, Any]] = None
    type: Optional[str] = None
    error: Optional[str] = None


@router.get("/types", response_model=ChartTypesResponse)
async def get_chart_types():
    """
    Retorna todos os tipos de gráficos disponíveis
    
    Returns:
        Lista categorizada de tipos de gráficos
    """
    return {
        "success": True,
        "chart_types": get_available_chart_types()
    }


@router.post("/generate", response_model=ChartGenerationResponse)
async def generate_chart(request: ChartGenerationRequest):
    """
    Gera um gráfico baseado nos dados e configuração fornecidos
    
    Args:
        request: {
            dataset_id: ID do dataset,
            chart_config: {
                type: tipo do gráfico,
                x_column: coluna X,
                y_column: coluna Y,
                title: título,
                aggregation: tipo de agregação,
                ... (outros parâmetros específicos do tipo)
            },
            data: dados opcionais (se não fornecido, busca do dataset_id)
        }
    
    Returns:
        Gráfico em formato JSON do Plotly
    """
    try:
        # Se não tiver dados, precisaria buscar do Supabase
        # Por enquanto, exige que os dados sejam fornecidos
        if not request.data:
            raise HTTPException(
                status_code=400,
                detail="Dados não fornecidos. Envie 'data' no request."
            )
        
        # Criar DataFrame
        df = pd.DataFrame(request.data)
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="DataFrame vazio. Verifique os dados enviados."
            )
        
        # Gerar gráfico
        generator = ChartGenerator(df)
        result = generator.generate_chart(request.chart_config)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/preview")
async def preview_chart_data(request: ChartGenerationRequest):
    """
    Preview dos dados que serão usados no gráfico (sem gerar o gráfico)
    Útil para validar antes de criar
    
    Returns:
        Dados agregados e processados
    """
    try:
        if not request.data:
            raise HTTPException(
                status_code=400,
                detail="Dados não fornecidos"
            )
        
        df = pd.DataFrame(request.data)
        generator = ChartGenerator(df)
        
        # Extrair apenas os dados processados
        chart_data = generator._extract_chart_data(request.chart_config)
        
        return {
            "success": True,
            "preview_data": chart_data,
            "config": request.chart_config
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
