// supabase/functions/assistant/index.ts
//
// Edge Function para integrar OpenAI Chat Completions API com Data Clarity.
//
// Esta função recebe mensagens do usuário junto com o analysis_snapshot
// (contrato cognitivo gerado pelo Python) e retorna respostas da IA
// baseadas exclusivamente nos dados pré-calculados.
//
// A IA NÃO calcula, NÃO adivinha - ela apenas interpreta e formata
// os dados que o Python já calculou.

import { serve } from "https://deno.land/std@0.202.0/http/server.ts";

// CORS headers para permitir chamadas do frontend
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SYSTEM PROMPT - Contrato Cognitivo Data Clarity
// ============================================================
const SYSTEM_PROMPT = `## IDENTIDADE
Você é o **Analista de Dados** do Data Clarity.
Você transforma números em clareza para empresários e gestores.

## REGRA ABSOLUTA
> **Você NÃO calcula.**
> **Você NÃO soma.**
> **Você NÃO adivinha.**
> **Você NÃO pede esclarecimentos.**

Se o dado não está no \`analysis_snapshot\`, ele **não existe**.

## O QUE VOCÊ RECEBE
Você sempre recebe um JSON chamado \`analysis_snapshot\` contendo:
- dataset: identidade do dataset (template, rows, confidence)
- profile: tipos de colunas (date, numeric, currency, categorical)
- safe_metrics: métricas já calculadas pelo Python
- precomputed_views: dados prontos para gráficos (rankings, time series)
- grouping_capabilities: dimensões permitidas para agrupamento
- system_hints: recomendações de gráficos e observações

## O QUE VOCÊ PODE FAZER
1. Escolher KPIs a partir de \`safe_metrics\`
2. Escolher gráficos compatíveis com \`precomputed_views\`
3. Definir layout lógico do dashboard
4. Gerar narrativa humana que explique os dados
5. Traduzir pedidos do usuário em configuração de widgets

## O QUE VOCÊ NÃO PODE FAZER
❌ Somar, dividir, multiplicar ou recalcular valores
❌ Usar campos que não estão no snapshot
❌ Inventar métricas ou estatísticas
❌ Responder "não ficou claro" ou "preciso de mais dados"

## FORMATO DE RESPOSTA
Quando o usuário pedir um dashboard ou análise, responda em JSON:
\`\`\`json
{
  "dashboard_plan": {
    "kpis": ["receita_total", "margem_bruta"],
    "charts": [
      { "type": "line", "source": "precomputed_views.time_series_receita", "title": "Evolução da Receita" }
    ],
    "narrative": ["A receita total foi de R$ 482.300,00 no período."]
  }
}
\`\`\`

## REGRAS DE NARRATIVA
1. Seja direto: Comece pelo número mais importante
2. Use linguagem de negócios: "faturamento", "margem", "ticket médio"
3. Formate valores: R$ 482.300,00 (não 482300)
4. Destaque anomalias: "Atenção: vendas caíram 15% em março"
5. Dê recomendações acionáveis: "Considere focar no produto X"

> **O Python garante a verdade. Você garante o entendimento.**`;

// ============================================================
// TIPOS
// ============================================================
interface RequestPayload {
    message: string;
    dashboardId?: string;
    analysisSnapshot?: Record<string, unknown>;
    conversationHistory?: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

interface OpenAIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
    // Tratamento de requisições OPTIONS para CORS pré-flight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const {
            message,
            dashboardId,
            analysisSnapshot,
            conversationHistory = [],
            model = "gpt-4o",
            temperature = 0.7,
            max_tokens = 2048,
        } = (await req.json()) as RequestPayload;

        // Validação
        if (!message || typeof message !== "string") {
            return new Response(
                JSON.stringify({ error: "O campo 'message' é obrigatório e deve ser uma string." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verifica API Key
        const apiKey = Deno.env.get("OPENAI_API_KEY");
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Chave da OpenAI não configurada no ambiente." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Monta o contexto com o snapshot (se fornecido)
        let contextMessage = "";
        if (analysisSnapshot && Object.keys(analysisSnapshot).length > 0) {
            contextMessage = `## ANALYSIS SNAPSHOT (dados calculados pelo Python - fonte da verdade):\n\`\`\`json\n${JSON.stringify(analysisSnapshot, null, 2)}\n\`\`\`\n\n`;
        }

        // Monta array de mensagens para a Chat Completions API
        const messages: OpenAIMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
        ];

        // Adiciona histórico de conversa (se houver)
        for (const msg of conversationHistory) {
            if (msg.role === "user" || msg.role === "assistant") {
                messages.push({ role: msg.role, content: msg.content });
            }
        }

        // Adiciona a mensagem atual do usuário com contexto
        const userContent = contextMessage
            ? `${contextMessage}## PERGUNTA DO USUÁRIO:\n${message}`
            : message;

        messages.push({ role: "user", content: userContent });

        // Chama a OpenAI Chat Completions API
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
            }),
        });

        // Tratamento de erros da OpenAI
        if (!openAiRes.ok) {
            let errorMessage = `Erro na API da OpenAI: status ${openAiRes.status}`;
            try {
                const errorData = await openAiRes.json();
                if (errorData?.error?.message) {
                    errorMessage = `Erro na API da OpenAI: ${errorData.error.message}`;
                }
            } catch (_) {
                // ignora se não for JSON
            }
            return new Response(
                JSON.stringify({ error: errorMessage }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await openAiRes.json();

        // Extrai a resposta do assistente
        const reply = data.choices?.[0]?.message?.content || "";

        // Tenta extrair JSON estruturado se a resposta contiver dashboard_plan
        let dashboardPlan = null;
        try {
            // Procura por bloco de código JSON
            const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                dashboardPlan = JSON.parse(jsonMatch[1]);
            } else if (reply.trim().startsWith("{") && reply.trim().endsWith("}")) {
                // Se a resposta é JSON puro
                dashboardPlan = JSON.parse(reply);
            }
        } catch (_) {
            // Se não for JSON válido, mantém como texto narrativo
        }

        // Monta resposta final
        const result = {
            message: reply.trim(),
            dashboardPlan,
            dashboardId,
            usage: data.usage,
            model: data.model,
        };

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        // Log do erro para debugging
        console.error("Erro inesperado na Edge Function:", error);

        return new Response(
            JSON.stringify({ error: "Erro interno na função." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
