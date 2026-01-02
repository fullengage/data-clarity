import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfsatiyhcywneoderhij.supabase.co';
const supabaseKey = 'sb_publishable_pvSTlQfTZEDtSkg6o9NRbA_yMLLyFlN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados...\n');

  // Verificar tabelas existentes
  const tables = [
    'accounts',
    'users',
    'datasets',
    'ai_decisions',
    'dashboards',
    'dashboard_blocks'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: NÃO EXISTE ou sem permissão`);
      console.log(`   Erro: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count || 0} registros`);
    }
  }

  // Verificar tabelas extras (que não deveriam existir)
  console.log('\n🔍 Verificando tabelas extras...\n');
  
  const extraTables = [
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
    'widgets'
  ];

  for (const table of extraTables) {
    const { error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`⚠️  ${table}: EXISTE (não deveria)`);
    }
  }

  console.log('\n✅ Verificação concluída!');
}

checkDatabase().catch(console.error);
