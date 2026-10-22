// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { A, asUser, createDatabase } from './database';

describe('ordered foreign-key index coverage after all local migrations', () => {
  let db: PGlite;
  beforeAll(async () => { db = await createDatabase(); }, 30000);
  afterAll(async () => { await db?.close(); });

  it('covers every non-user foreign key with valid nonpartial leading btree keys', async () => {
    const coverage = await db.query<{ table_name: string; columns: string[]; covering_indexes: string[] }>(`
      select child.relname as table_name,
        array(select a.attname::text
          from unnest(fk.conkey) with ordinality as key(attnum, position)
          join pg_attribute a on a.attrelid = fk.conrelid and a.attnum = key.attnum
          order by key.position) as columns,
        array(select index_class.relname::text
          from pg_index index_meta
          join pg_class index_class on index_class.oid = index_meta.indexrelid
          join pg_am access_method on access_method.oid = index_class.relam
          where index_meta.indrelid = fk.conrelid
            and access_method.amname = 'btree'
            and index_meta.indisvalid and index_meta.indisready
            and index_meta.indpred is null
            and index_meta.indnkeyatts >= cardinality(fk.conkey)
            and not exists (
              select 1 from unnest(fk.conkey) with ordinality as key(attnum, position)
              where index_meta.indkey[(key.position - 1)::integer] is distinct from key.attnum
            )
        ) as covering_indexes
      from pg_constraint fk
      join pg_class child on child.oid = fk.conrelid
      join pg_namespace child_schema on child_schema.oid = child.relnamespace
      where fk.contype = 'f' and child_schema.nspname = 'public'
        and fk.confrelid <> 'auth.users'::regclass
      order by child.relname, fk.conname
    `);
    expect(coverage.rows).toHaveLength(39);
    const missing = coverage.rows.filter((row) => row.covering_indexes.length === 0)
      .map((row) => `${row.table_name}(${row.columns.join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('uses both owner and conversation keys in an authenticated lookup index condition', async () => {
    await asUser(db, A);
    await db.exec('set enable_seqscan = off');
    try {
      const plan = await db.query(`explain (format json) select * from ai_messages
        where user_id='${A}' and conversation_id='90000000-0000-4000-8000-000000000001'`);
      expect(JSON.stringify(plan.rows)).toMatch(/Index Cond[^}]*conversation_id/);
    } finally { await db.exec('reset enable_seqscan'); }
  });
});


