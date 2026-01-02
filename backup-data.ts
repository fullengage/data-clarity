import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://bfsatiyhcywneoderhij.supabase.co';
const supabaseKey = 'sb_publishable_pvSTlQfTZEDtSkg6o9NRbA_yMLLyFlN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupData() {
  console.log('📦 Fazendo backup dos dados existentes...\n');

  const backup: any = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  // Backup das tabelas do Insight Canvas que têm dados
  const tables = ['datasets', 'ai_decisions', 'dashboards', 'dashboard_blocks'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.log(`❌ Erro ao fazer backup de ${table}: ${error.message}`);
    } else {
      backup.tables[table] = data;
      console.log(`✅ ${table}: ${data?.length || 0} registros salvos`);
    }
  }

  // Salvar backup em arquivo JSON
  const backupFile = `backup-${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Backup salvo em: ${backupFile}`);
  return backupFile;
}

backupData().catch(console.error);
