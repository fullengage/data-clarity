import { DashboardTemplate } from '@/types/template';

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
    // 1. DASHBOARD DE VENDAS
    {
        id: 'sales',
        name: 'Dashboard de Vendas',
        description: 'Analise receita, pedidos, performance de produtos e clientes',
        category: 'vendas',
        tags: ['Vendas', 'Faturamento', 'Receita', 'Pedidos'],
        icon: 'TrendingUp',
        gradient: 'from-blue-500 to-cyan-500',

        expectedColumns: [
            {
                semanticName: 'data',
                displayName: 'Data',
                type: 'date',
                category: 'tempo',
                required: true,
                aliases: ['Data', 'Date', 'Data do Pedido', 'Data Venda', 'Dt. Pedido'],
            },
            {
                semanticName: 'receita',
                displayName: 'Receita/Valor',
                type: 'currency',
                category: 'valores',
                required: true,
                aliases: ['Receita', 'Valor', 'Total', 'Revenue', 'Faturamento', 'Valor Total'],
            },
            {
                semanticName: 'cliente',
                displayName: 'Cliente',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Cliente', 'Customer', 'Comprador', 'Nome Cliente'],
            },
            {
                semanticName: 'produto',
                displayName: 'Produto',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Produto', 'Product', 'Item', 'Descrição', 'SKU'],
            },
            {
                semanticName: 'quantidade',
                displayName: 'Quantidade',
                type: 'number',
                category: 'quantidade',
                required: false,
                aliases: ['Quantidade', 'Qtd', 'Qty', 'Unidades'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-revenue',
                label: 'Receita Total',
                icon: 'dollar',
                color: 'green',
                aggregation: 'sum',
                sourceColumn: 'receita',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'total-orders',
                label: 'Total de Pedidos',
                icon: 'cart',
                color: 'blue',
                aggregation: 'count',
                sourceColumn: 'data',
                format: 'number',
            },
            {
                id: 'avg-ticket',
                label: 'Ticket Médio',
                icon: 'trending-up',
                color: 'purple',
                aggregation: 'avg',
                sourceColumn: 'receita',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'total-customers',
                label: 'Clientes Únicos',
                icon: 'users',
                color: 'orange',
                aggregation: 'count-distinct',
                sourceColumn: 'cliente',
                format: 'number',
            },
        ],

        defaultCharts: [
            {
                id: 'revenue-over-time',
                type: 'line',
                title: 'Evolução da Receita',
                xColumn: 'data',
                yColumn: 'receita',
                aggregation: 'sum',
            },
            {
                id: 'top-products',
                type: 'horizontal_bar',
                title: 'Top 10 Produtos',
                xColumn: 'produto',
                yColumn: 'receita',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
            {
                id: 'top-customers',
                type: 'horizontal_bar',
                title: 'Top 10 Clientes',
                xColumn: 'cliente',
                yColumn: 'receita',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
            {
                id: 'orders-by-day',
                type: 'bar',
                title: 'Pedidos por Dia',
                xColumn: 'data',
                yColumn: 'data',
                aggregation: 'count',
            },
        ],

        uploadPrompt: 'Envie sua planilha de vendas',
        uploadHint: 'Pode estar bagunçada, com colunas extras ou nomes diferentes. A gente organiza tudo pra você!',
        errorMessages: {
            missing_revenue: 'Não encontramos valores de venda nessa planilha. Certifique-se de que existe uma coluna com valores monetários.',
            missing_date: 'Não encontramos datas nessa planilha. Para análise temporal, é necessária uma coluna de data.',
        },
    },

    // 2. DASHBOARD FINANCEIRO
    {
        id: 'financial',
        name: 'Dashboard Financeiro',
        description: 'Controle receitas, despesas, lucro e fluxo de caixa com visão executiva',
        category: 'financeiro',
        tags: ['Financeiro', 'Receitas', 'Despesas', 'Lucro', 'Fluxo de Caixa', 'Projetos'],
        icon: 'DollarSign',
        gradient: 'from-emerald-500 to-teal-500',

        expectedColumns: [
            // 1. TEMPO
            {
                semanticName: 'data',
                displayName: 'Data',
                type: 'date',
                category: 'tempo',
                required: true,
                aliases: ['Data', 'Date', 'Dt. Movimento', 'Competência', 'Vencimento', 'Pagamento'],
            },

            // 2. VALORES
            {
                semanticName: 'receita',
                displayName: 'Receita',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Receita', 'Faturamento', 'Entrada', 'Valor Recebido', 'Receita Total'],
            },
            {
                semanticName: 'despesa',
                displayName: 'Custo / Despesa',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Custo', 'Despesa', 'Saída', 'Valor Pago', 'Custo Total'],
            },
            {
                semanticName: 'resultado',
                displayName: 'Resultado (Lucro/Prejuízo)',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Resultado', 'Lucro', 'Prejuízo', 'Net Profit', 'Saldo'],
            },
            {
                semanticName: 'valor',
                displayName: 'Valor (genérico)',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Valor', 'Total', 'Amount', 'Montante', 'Valor Líquido', 'Valor Bruto'],
            },
            {
                semanticName: 'receita_unitaria',
                displayName: 'Receita Unitária',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Valor Unitário Venda', 'Preço Unitário', 'Preço Venda'],
            },
            {
                semanticName: 'custo_unitario',
                displayName: 'Custo Unitário',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Valor Unitário Custo', 'Custo Unitário', 'Preço de Compra'],
            },

            // 3. QUANTIDADE
            {
                semanticName: 'quantidade',
                displayName: 'Quantidade',
                type: 'number',
                category: 'quantidade',
                required: false,
                aliases: ['Quantidade', 'Qtd', 'Volume', 'Unidades', 'Qty'],
            },

            // 4. ORGANIZAÇÃO (Classificação)
            {
                semanticName: 'cliente',
                displayName: 'Cliente',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Cliente', 'Customer', 'Sacado', 'Tomador'],
            },
            {
                semanticName: 'fornecedor',
                displayName: 'Fornecedor',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Fornecedor', 'Supplier', 'Cedente', 'Prestador'],
            },
            {
                semanticName: 'projeto',
                displayName: 'Projeto',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Projeto', 'Job', 'Obra'],
            },
            {
                semanticName: 'centro_custo',
                displayName: 'Centro de custo',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Centro de Custo', 'CC', 'Unidade de Negócio'],
            },
            {
                semanticName: 'categoria',
                displayName: 'Categoria',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Categoria', 'Natureza', 'Classificação', 'Plano de Contas'],
            },
            {
                semanticName: 'status',
                displayName: 'Status',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Status', 'Situação', 'Pago', 'Liquidado', 'Conciliado'],
            },
            {
                semanticName: 'forma_pagamento',
                displayName: 'Forma de pagamento',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Forma de Pagamento', 'Meio de Pagamento', 'Conta', 'Banco', 'Cartão/PIX'],
            },

            // 5. DESCRITIVO
            {
                semanticName: 'descricao',
                displayName: 'Descrição',
                type: 'text',
                category: 'descritivo',
                required: false,
                aliases: ['Descrição', 'Description', 'Histórico'],
            },
            {
                semanticName: 'observacao',
                displayName: 'Observação',
                type: 'text',
                category: 'descritivo',
                required: false,
                aliases: ['Observação', 'Obs', 'Notes', 'Nota'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-revenue',
                label: 'Receita Total',
                icon: 'trending-up',
                color: 'green',
                aggregation: 'sum',
                sourceColumn: 'receita', // Try specific column first
                fallbackColumn: 'valor',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'total-expenses',
                label: 'Custo Total',
                icon: 'trending-down',
                color: 'red',
                aggregation: 'sum',
                sourceColumn: 'despesa', // Try specific column first
                fallbackColumn: 'valor',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'net-profit',
                label: 'Resultado (Lucro/Prejuízo)',
                icon: 'dollar',
                color: 'blue',
                aggregation: 'sum',
                sourceColumn: 'valor',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'profit-margin',
                label: 'Margem Líquida',
                icon: 'percent',
                color: 'purple',
                aggregation: 'avg',
                sourceColumn: 'valor',
                suffix: '%',
                format: 'percentage',
            },
        ],

        defaultCharts: [
            {
                id: 'cashflow-over-time',
                type: 'area',
                title: 'Evolução por Data (Fluxo de Caixa)',
                xColumn: 'data',
                yColumn: 'valor',
                aggregation: 'sum',
            },
            {
                id: 'analysis-by-project',
                type: 'bar',
                title: 'Análise por Projeto',
                xColumn: 'projeto',
                yColumn: 'valor',
                aggregation: 'sum',
            },
            {
                id: 'analysis-by-customer',
                type: 'horizontal_bar',
                title: 'Análise por Cliente',
                xColumn: 'cliente',
                yColumn: 'valor',
                aggregation: 'sum',
            },
            {
                id: 'status-financial',
                type: 'pie',
                title: 'Status Financeiro e Operacional',
                xColumn: 'status',
                yColumn: 'valor',
                aggregation: 'count',
            },
            {
                id: 'payment-methods',
                type: 'bar',
                title: 'Formas de Pagamento',
                xColumn: 'forma_pagamento',
                yColumn: 'valor',
                aggregation: 'count',
            },
        ],

        uploadPrompt: 'Envie sua planilha financeira (ex: Extrato, Fluxo de Caixa, DRE)',
        uploadHint: 'Identificamos automaticamente Clientes, Projetos, Status e Formas de Pagamento.',
        errorMessages: {
            missing_value: 'Não encontramos valores financeiros nessa planilha.',
            missing_type: 'Não conseguimos identificar se são receitas ou despesas. Inclua uma coluna de categoria/tipo.',
        },
    },

    // 3. DASHBOARD DE PRODUÇÃO
    {
        id: 'production',
        name: 'Dashboard de Produção',
        description: 'Monitore volume produzido, eficiência e performance operacional',
        category: 'producao',
        tags: ['Produção', 'Operação', 'Eficiência', 'Volume'],
        icon: 'Factory',
        gradient: 'from-orange-500 to-red-500',

        expectedColumns: [
            {
                semanticName: 'data',
                displayName: 'Data',
                type: 'date',
                category: 'tempo',
                required: true,
                aliases: ['Data', 'Date', 'Data Produção', 'Turno'],
            },
            {
                semanticName: 'produto',
                displayName: 'Produto/Item',
                type: 'text',
                category: 'organizacao',
                required: true,
                aliases: ['Produto', 'Item', 'SKU', 'Código'],
            },
            {
                semanticName: 'quantidade',
                displayName: 'Quantidade',
                type: 'number',
                category: 'quantidade',
                required: true,
                aliases: ['Quantidade', 'Qtd', 'Volume', 'Produzido', 'Unidades'],
            },
            {
                semanticName: 'linha',
                displayName: 'Linha/Setor',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Linha', 'Setor', 'Máquina', 'Equipe', 'Centro de Trabalho'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-production',
                label: 'Volume Total',
                icon: 'package',
                color: 'blue',
                aggregation: 'sum',
                sourceColumn: 'quantidade',
                format: 'number',
            },
            {
                id: 'daily-avg',
                label: 'Média Diária',
                icon: 'trending-up',
                color: 'green',
                aggregation: 'avg',
                sourceColumn: 'quantidade',
                format: 'number',
            },
            {
                id: 'total-items',
                label: 'Itens Produzidos',
                icon: 'box',
                color: 'orange',
                aggregation: 'count-distinct',
                sourceColumn: 'produto',
                format: 'number',
            },
            {
                id: 'production-days',
                label: 'Dias de Produção',
                icon: 'chart',
                color: 'purple',
                aggregation: 'count-distinct',
                sourceColumn: 'data',
                format: 'number',
            },
        ],

        defaultCharts: [
            {
                id: 'production-over-time',
                type: 'line',
                title: 'Evolução da Produção',
                xColumn: 'data',
                yColumn: 'quantidade',
                aggregation: 'sum',
            },
            {
                id: 'top-products',
                type: 'horizontal_bar',
                title: 'Top 10 Produtos Produzidos',
                xColumn: 'produto',
                yColumn: 'quantidade',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
            {
                id: 'production-by-line',
                type: 'bar',
                title: 'Produção por Linha/Setor',
                xColumn: 'linha',
                yColumn: 'quantidade',
                aggregation: 'sum',
            },
        ],

        uploadPrompt: 'Envie sua planilha de produção',
        uploadHint: 'Inclua dados de volume produzido, itens e datas. O resto organizamos!',
        errorMessages: {
            missing_quantity: 'Não encontramos valores de quantidade produzida.',
            missing_product: 'Não conseguimos identificar os produtos/itens produzidos.',
        },
    },

    // 4. DASHBOARD DE CLIENTES
    {
        id: 'customers',
        name: 'Dashboard de Clientes',
        description: 'Análise RFM, segmentação e comportamento de compra',
        category: 'clientes',
        tags: ['Clientes', 'RFM', 'Segmentação', 'Retenção'],
        icon: 'Users',
        gradient: 'from-purple-500 to-pink-500',

        expectedColumns: [
            {
                semanticName: 'cliente',
                displayName: 'Cliente',
                type: 'text',
                category: 'organizacao',
                required: true,
                aliases: ['Cliente', 'Customer', 'Nome', 'ID Cliente'],
            },
            {
                semanticName: 'data',
                displayName: 'Data da Compra',
                type: 'date',
                category: 'tempo',
                required: true,
                aliases: ['Data', 'Date', 'Data Compra', 'Última Compra'],
            },
            {
                semanticName: 'valor',
                displayName: 'Valor',
                type: 'currency',
                category: 'valores',
                required: true,
                aliases: ['Valor', 'Total', 'Receita', 'Faturamento'],
            },
            {
                semanticName: 'segmento',
                displayName: 'Segmento',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Segmento', 'Categoria', 'Tipo', 'Classificação'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-customers',
                label: 'Total de Clientes',
                icon: 'users',
                color: 'blue',
                aggregation: 'count-distinct',
                sourceColumn: 'cliente',
                format: 'number',
            },
            {
                id: 'avg-ltv',
                label: 'LTV Médio',
                icon: 'dollar',
                color: 'green',
                aggregation: 'avg',
                sourceColumn: 'valor',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'top-customer-value',
                label: 'Maior Ticket',
                icon: 'trending-up',
                color: 'purple',
                aggregation: 'max',
                sourceColumn: 'valor',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'active-customers',
                label: 'Clientes Ativos',
                icon: 'target',
                color: 'orange',
                aggregation: 'count-distinct',
                sourceColumn: 'cliente',
                format: 'number',
            },
        ],

        defaultCharts: [
            {
                id: 'top-customers',
                type: 'horizontal_bar',
                title: 'Top 10 Clientes por Faturamento',
                xColumn: 'cliente',
                yColumn: 'valor',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
            {
                id: 'customers-by-segment',
                type: 'pie',
                title: 'Clientes por Segmento',
                xColumn: 'segmento',
                yColumn: 'cliente',
                aggregation: 'count-distinct',
            },
            {
                id: 'customer-acquisition',
                type: 'line',
                title: 'Aquisição de Clientes',
                xColumn: 'data',
                yColumn: 'cliente',
                aggregation: 'count-distinct',
            },
        ],

        uploadPrompt: 'Envie sua planilha de clientes',
        uploadHint: 'Pode incluir histórico de compras. Vamos fazer a análise RFM automaticamente.',
        errorMessages: {
            missing_customer: 'Não encontramos uma coluna de identificação de clientes.',
            missing_value: 'Não encontramos valores de compra para análise.',
        },
    },

    // 5. DASHBOARD DE ESTOQUE
    {
        id: 'inventory',
        name: 'Dashboard de Estoque',
        description: 'Controle de itens, movimentações e giro de estoque',
        category: 'estoque',
        tags: ['Estoque', 'Inventário', 'Giro', 'Movimentação'],
        icon: 'Package',
        gradient: 'from-yellow-500 to-orange-500',

        expectedColumns: [
            {
                semanticName: 'produto',
                displayName: 'Produto',
                type: 'text',
                category: 'organizacao',
                required: true,
                aliases: ['Produto', 'Item', 'SKU', 'Código', 'Descrição'],
            },
            {
                semanticName: 'quantidade',
                displayName: 'Quantidade',
                type: 'number',
                category: 'quantidade',
                required: true,
                aliases: ['Quantidade', 'Qtd', 'Estoque', 'Saldo', 'Disponível'],
            },
            {
                semanticName: 'categoria',
                displayName: 'Categoria',
                type: 'text',
                category: 'organizacao',
                required: false,
                aliases: ['Categoria', 'Grupo', 'Tipo', 'Família'],
            },
            {
                semanticName: 'valor_unitario',
                displayName: 'Valor Unitário',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Valor Unitário', 'Preço', 'Custo', 'Valor Un'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-items',
                label: 'Total de Itens',
                icon: 'box',
                color: 'blue',
                aggregation: 'count-distinct',
                sourceColumn: 'produto',
                format: 'number',
            },
            {
                id: 'total-quantity',
                label: 'Quantidade em Estoque',
                icon: 'package',
                color: 'orange',
                aggregation: 'sum',
                sourceColumn: 'quantidade',
                format: 'number',
            },
            {
                id: 'inventory-value',
                label: 'Valor Total em Estoque',
                icon: 'dollar',
                color: 'green',
                aggregation: 'sum',
                sourceColumn: 'valor_unitario',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'avg-stock',
                label: 'Estoque Médio',
                icon: 'chart',
                color: 'purple',
                aggregation: 'avg',
                sourceColumn: 'quantidade',
                format: 'number',
            },
        ],

        defaultCharts: [
            {
                id: 'stock-by-category',
                type: 'pie',
                title: 'Estoque por Categoria',
                xColumn: 'categoria',
                yColumn: 'quantidade',
                aggregation: 'sum',
            },
            {
                id: 'top-items',
                type: 'horizontal_bar',
                title: 'Top 10 Itens em Estoque',
                xColumn: 'produto',
                yColumn: 'quantidade',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
            {
                id: 'value-distribution',
                type: 'bar',
                title: 'Distribuição de Valor',
                xColumn: 'categoria',
                yColumn: 'valor_unitario',
                aggregation: 'sum',
            },
        ],

        uploadPrompt: 'Envie sua planilha de estoque',
        uploadHint: 'Pode ser saldo atual ou movimentações. Organizamos automaticamente!',
        errorMessages: {
            missing_product: 'Não encontramos uma coluna de produtos/itens.',
            missing_quantity: 'Não encontramos valores de quantidade em estoque.',
        },
    },

    // 6. DASHBOARD DE GROWTH MARKETING
    {
        id: 'growth-marketing',
        name: 'Dashboard de Growth Marketing',
        description: 'Métricas de aquisição, conversão, CAC e ROI de campanhas',
        category: 'marketing',
        tags: ['Marketing', 'Growth', 'CAC', 'ROI', 'Conversão', 'Campanhas'],
        icon: 'TrendingUp',
        gradient: 'from-pink-500 to-rose-500',

        expectedColumns: [
            {
                semanticName: 'data',
                displayName: 'Data',
                type: 'date',
                category: 'tempo',
                required: true,
                aliases: ['Data', 'Date', 'Data Campanha', 'Período'],
            },
            {
                semanticName: 'campanha',
                displayName: 'Campanha/Canal',
                type: 'text',
                category: 'organizacao',
                required: true,
                aliases: ['Campanha', 'Campaign', 'Canal', 'Fonte', 'Mídia'],
            },
            {
                semanticName: 'investimento',
                displayName: 'Investimento',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Investimento', 'Custo', 'Gasto', 'Spend', 'Budget'],
            },
            {
                semanticName: 'leads',
                displayName: 'Leads/Conversões',
                type: 'number',
                category: 'quantidade',
                required: false,
                aliases: ['Leads', 'Conversões', 'Cliques', 'Impressões', 'Views'],
            },
            {
                semanticName: 'receita',
                displayName: 'Receita',
                type: 'currency',
                category: 'valores',
                required: false,
                aliases: ['Receita', 'Revenue', 'Faturamento', 'Vendas'],
            },
        ],

        defaultMetrics: [
            {
                id: 'total-investment',
                label: 'Investimento Total',
                icon: 'dollar',
                color: 'red',
                aggregation: 'sum',
                sourceColumn: 'investimento',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'total-leads',
                label: 'Total de Leads',
                icon: 'users',
                color: 'blue',
                aggregation: 'sum',
                sourceColumn: 'leads',
                format: 'number',
            },
            {
                id: 'total-revenue',
                label: 'Receita Gerada',
                icon: 'trending-up',
                color: 'green',
                aggregation: 'sum',
                sourceColumn: 'receita',
                prefix: 'R$',
                format: 'currency',
            },
            {
                id: 'roi',
                label: 'ROI',
                icon: 'percent',
                color: 'purple',
                aggregation: 'avg',
                sourceColumn: 'receita',
                suffix: '%',
                format: 'percentage',
            },
        ],

        defaultCharts: [
            {
                id: 'investment-over-time',
                type: 'area',
                title: 'Investimento ao Longo do Tempo',
                xColumn: 'data',
                yColumn: 'investimento',
                aggregation: 'sum',
            },
            {
                id: 'leads-by-channel',
                type: 'bar',
                title: 'Leads por Canal',
                xColumn: 'campanha',
                yColumn: 'leads',
                aggregation: 'sum',
            },
            {
                id: 'roi-by-campaign',
                type: 'horizontal_bar',
                title: 'ROI por Campanha',
                xColumn: 'campanha',
                yColumn: 'receita',
                aggregation: 'sum',
                limit: 10,
                sortBy: 'value',
                sortOrder: 'desc',
            },
        ],

        uploadPrompt: 'Envie sua planilha de campanhas',
        uploadHint: 'Pode incluir dados de Google Ads, Facebook Ads ou qualquer fonte. Organizamos tudo!',
        errorMessages: {
            missing_campaign: 'Não encontramos uma coluna de campanhas/canais.',
            missing_metrics: 'Não encontramos métricas de performance (leads, investimento ou receita).',
        },
    },
];

// Helper para buscar template por ID
export function getTemplateById(id: string): DashboardTemplate | undefined {
    return DASHBOARD_TEMPLATES.find(t => t.id === id);
}

// Helper para filtrar templates por categoria
export function getTemplatesByCategory(category: DashboardTemplate['category']): DashboardTemplate[] {
    return DASHBOARD_TEMPLATES.filter(t => t.category === category);
}

// Helper para buscar templates por tags
export function searchTemplates(query: string): DashboardTemplate[] {
    const lowerQuery = query.toLowerCase();
    return DASHBOARD_TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}
