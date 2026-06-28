const { createClient } = require('@supabase/supabase-js');
const db = createClient('https://gewcyydpgbfutkdcyztr.supabase.co', '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Get all exercises
  const { data: all } = await db.from('lesen_exercises').select('id,teil');
  console.log('All exercises:', all?.length);

  for (const ex of all ?? []) {
    if (ex.teil === 1) {
      await db.from('lesen_t1_headlines').delete().eq('exercise_id', ex.id);
      await db.from('lesen_t1_texts').delete().eq('exercise_id', ex.id);
    } else if (ex.teil === 2) {
      await db.from('lesen_t2_passages').delete().eq('exercise_id', ex.id);
      await db.from('lesen_t2_questions').delete().eq('exercise_id', ex.id);
    } else if (ex.teil === 3) {
      await db.from('lesen_t3_situations').delete().eq('exercise_id', ex.id);
      await db.from('lesen_t3_texts').delete().eq('exercise_id', ex.id);
    }
    const { error } = await db.from('lesen_exercises').delete().eq('id', ex.id);
    console.log('Deleted', ex.id, 'T' + ex.teil, error?.message ?? 'ok');
  }

  const [r1, r2, r3] = await Promise.all([
    db.from('lesen_exercises').select('id', { count: 'exact', head: true }).eq('teil', 1),
    db.from('lesen_exercises').select('id', { count: 'exact', head: true }).eq('teil', 2),
    db.from('lesen_exercises').select('id', { count: 'exact', head: true }).eq('teil', 3),
  ]);
  console.log('After cleanup — T1:', r1.count, 'T2:', r2.count, 'T3:', r3.count);
}

main().catch(e => { console.error(e); process.exit(1); });
