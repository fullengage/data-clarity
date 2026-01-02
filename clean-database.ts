import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfsatiyhcywneoderhij.supabase.co';
const supabaseKey = 'sb_publishable_pvSTlQfTZEDtSkg6o9NRbA_yMLLyFlN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('🧹 Limpando banco de dados...\n');

  // Lista de tabelas extras para remover
  const tablesToDrop = [
    'aparas',
    'ordens_producao',
    'pedidos',
    'clientes',
    'materiais',
    'maquinas',
    'usuarios',
    'sources',
    'raw_datasets',
    'interpretations',
    'structured_datasets',
    'semantic_datasets',
    'widgets',
    'itens_pedido',
    'operadores',
    'workflow_pedido',
    'registro_horas_producao',
    'paradas_maquina',
    'controle_qualidade',
    'devolucoes_descartes',
    'documentos',
    'historico_aprovacoes',
    'vendedores_normalizacao',
    'pedidos_backup_valor',
    'stg_aparas',
    'stg_controle_diario_pedidos',
    'stg_controle_qualidade',
    'stg_corte_solda',
    'stg_devolucao_descartes',
    'stg_extrusora',
    'stg_fechamento_producao',
    'stg_impressao',
    'employees',
    'materials',
    'user_profiles'
  ];

  console.log(`📋 Tentando remover ${tablesToDrop.length} tabelas extras...\n`);

  for (const table of tablesToDrop) {
    try {
      // Tentar acessar a tabela para ver se existe
      const { error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (!error) {
        console.log(`⚠️  Tabela ${table} existe mas não pode ser removida via API`);
        console.log(`   → Precisa ser removida via SQL Editor do Supabase`);
      }
    } catch (err) {
      // Tabela não existe, ok
    }
  }

  console.log('\n⚠️  IMPORTANTE:');
  console.log('   As tabelas extras não podem ser removidas via API REST.');
  console.log('   Você precisa executar o SQL manualmente no Supabase Dashboard.\n');
  console.log('📝 Passos:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/bfsatiyhcywneoderhij/editor');
  console.log('   2. Abra o SQL Editor');
  console.log('   3. Cole e execute o arquivo: migration-insight-canvas-clean.sql');
  console.log('   4. Execute o script de restauração dos dados');
}

cleanDatabase().catch(console.error);
