// Script para diagnosticar os dados no Supabase
// Execute com: npx tsx scripts/check-dashboard.ts

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bfsatiyhcywneoderhij.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY não encontrada. Adicione ao .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDashboards() {
    console.log('\n📊 === DIAGNÓSTICO DE DASHBOARDS ===\n');

    // 1. Listar últimos dashboards
    console.log('1️⃣ Últimos dashboards:\n');
    const { data: dashboards, error: dashError, count } = await supabase
        .from('dashboards')
        .select('id, title, semantic_dataset_id, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`   Total encontrado: ${count ?? 0}`);

    if (dashError) {
        console.error('❌ Erro ao buscar dashboards:', dashError.message);
        console.error('   Detalhes:', dashError);
    } else if (!dashboards || dashboards.length === 0) {
        console.log('   ⚠️ Nenhum dashboard encontrado (pode ser RLS bloqueando)');
    } else {
        dashboards?.forEach(d => {
            console.log(`  📋 ${d.title}`);
            console.log(`     ID: ${d.id}`);
            console.log(`     semantic_dataset_id: ${d.semantic_dataset_id || '❌ NULL'}`);
            console.log(`     created_at: ${d.created_at}`);
            console.log('');
        });
    }

    if (dashboards && dashboards.length > 0) {
        const lastDashId = dashboards[0].id;

        // 2. Verificar widgets
        console.log(`\n2️⃣ Widgets do último dashboard (${lastDashId}):\n`);
        const { data: widgets, error: widgetError } = await supabase
            .from('widgets')
            .select('id, type, config')
            .eq('dashboard_id', lastDashId);

        if (widgetError) {
            console.error('❌ Erro ao buscar widgets:', widgetError.message);
        } else if (!widgets || widgets.length === 0) {
            console.log('  ⚠️ Nenhum widget encontrado!');
        } else {
            console.log(`  ✅ ${widgets.length} widgets encontrados:`);
            widgets.forEach(w => {
                console.log(`     - ${w.type}: ${(w.config as any)?.title || (w.config as any)?.label || 'Sem título'}`);
            });
        }

        // 3. Verificar semantic_dataset
        const semId = dashboards[0].semantic_dataset_id;
        if (semId) {
            console.log(`\n3️⃣ Semantic Dataset (${semId}):\n`);
            const { data: semantic, error: semError } = await supabase
                .from('semantic_datasets')
                .select('id, dataset_type, structured_dataset_id')
                .eq('id', semId)
                .single();

            if (semError) {
                console.error('❌ Erro:', semError.message);
            } else {
                console.log(`  ✅ dataset_type: ${semantic?.dataset_type}`);
                console.log(`  ✅ structured_dataset_id: ${semantic?.structured_dataset_id}`);
            }
        }
    }

    console.log('\n✅ Diagnóstico concluído!\n');
}

checkDashboards().catch(console.error);
