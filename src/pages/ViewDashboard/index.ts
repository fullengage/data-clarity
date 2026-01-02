/**
 * ViewDashboard - Módulo Refatorado
 * 
 * Este módulo contém o componente ViewDashboard refatorado com:
 * 
 * 📁 Estrutura de Arquivos:
 * ├── ViewDashboard.tsx        - Componente principal
 * ├── types/
 * │   └── viewDashboard.types.ts - Tipos TypeScript
 * ├── hooks/
 * │   ├── useDashboardData.ts  - Hook para gerenciamento de dados
 * │   └── useTableOperations.ts - Hook para operações de tabela
 * ├── utils/
 * │   ├── dataUtils.ts         - Utilitários de parsing e formatação
 * │   ├── chartUtils.ts        - Utilitários de construção de gráficos
 * │   └── insightGenerator.ts  - Gerador de insights automático
 * └── constants/
 *     └── dashboardConfig.ts   - Constantes e configurações
 * 
 * 🚀 Melhorias Aplicadas:
 * 
 * 1. SEPARAÇÃO DE RESPONSABILIDADES
 *    - Hooks customizados extraídos para lógica reutilizável
 *    - Utilitários puros para transformação de dados
 *    - Constantes centralizadas para fácil manutenção
 * 
 * 2. PERFORMANCE
 *    - useMemo para valores computados pesados
 *    - useCallback para handlers estáveis
 *    - Componentes memoizados para sub-seções
 * 
 * 3. TIPAGEM ROBUSTA
 *    - Tipos específicos para cada domínio
 *    - Eliminação de `any` onde possível
 *    - Interfaces claras para props e estados
 * 
 * 4. MANUTENIBILIDADE
 *    - Funções menores e focadas
 *    - Código auto-documentado
 *    - Separação clara entre UI e lógica
 * 
 * 5. TESTABILIDADE
 *    - Funções puras isoladas em utils
 *    - Hooks com responsabilidades definidas
 *    - Fácil mockar dependências
 */

// Componente Principal
export { default as ViewDashboard } from './ViewDashboard';

// Hooks
export { useDashboardData } from './hooks/useDashboardData';
export { useTableOperations } from './hooks/useTableOperations';

// Utilitários
export * from './utils/dataUtils';
export * from './utils/chartUtils';
export { generateInsights } from './utils/insightGenerator';

// Constantes
export * from './constants/dashboardConfig';

// Tipos
export type * from './types/viewDashboard.types';
