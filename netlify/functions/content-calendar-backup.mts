/**
 * content-calendar-backup.mts — Snapshots the content-calendar tables to
 * Netlify Blobs every 12 hours (schedule defined in netlify.toml).
 *
 * Modeled after email-hub-backup.mts — same JSON-in-Blobs pattern with
 * `latest.json` pointer + per-run date-stamped keys. Built in direct
 * response to the 2026-04-20 content calendar data loss incident where
 * the UI showed 0 items and no recovery path existed.
 *
 * Tables backed up (all calendar-adjacent state):
 *   - content_calendar_items
 *   - content_calendar_assignees
 *   - content_review_stage_history
 *   - content_voice_profiles
 *
 * Manual actions via POST:
 *   {action: "backup"}                               — take a backup now
 *   {action: "list"}                                 — list all backup blobs
 *   {action: "load", key: "YYYY-MM-DD-HH.json"}      — inspect a backup
 *   {action: "restore", key: "..."}                  — restore rows
 *                                                      (upsert by id — non-destructive
 *                                                       to any newer rows not in backup)
 */

import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { sql, ensureTables } from "./lib/db.mjs";

const STORE_NAME = "content-calendar-backups";

type Row = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/**
 * Backup key encodes date + hour so 12-hour runs create distinct blobs
 * (one at 06:20 UTC and one at 18:20 UTC each day = 2/day → last ~30 days
 * of backups ≈ 60 keys in the store, well under any practical limit).
 */
function backupKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}-${h}.json`;
}

async function takeBackup(): Promise<{
  key: string;
  counts: Record<string, number>;
  bytes: number;
}> {
  await ensureTables();
  const db = sql();

  // Serialize BigInt fields (created_at / updated_at etc) to plain numbers
  // so JSON.stringify doesn't throw.
  const serialize = (rows: Row[]) =>
    rows.map((r) => {
      const o: Row = {};
      for (const [k, v] of Object.entries(r)) {
        o[k] = typeof v === "bigint" ? Number(v) : v;
      }
      return o;
    });

  const items = serialize((await db/* sql */`SELECT * FROM content_calendar_items ORDER BY updated_at DESC`) as unknown as Row[]);
  const assignees = serialize((await db/* sql */`SELECT * FROM content_calendar_assignees`) as unknown as Row[]);
  const history = serialize((await db/* sql */`SELECT * FROM content_review_stage_history ORDER BY entered_at DESC`) as unknown as Row[]);
  const voiceProfiles = serialize((await db/* sql */`SELECT * FROM content_voice_profiles ORDER BY updated_at DESC`) as unknown as Row[]);

  const payload = {
    backup_at: Date.now(),
    backup_iso: new Date().toISOString(),
    counts: {
      content_calendar_items: items.length,
      content_calendar_assignees: assignees.length,
      content_review_stage_history: history.length,
      content_voice_profiles: voiceProfiles.length,
    },
    tables: {
      content_calendar_items: items,
      content_calendar_assignees: assignees,
      content_review_stage_history: history,
      content_voice_profiles: voiceProfiles,
    },
  };
  const serialized = JSON.stringify(payload);
  const key = backupKey();

  const store = getStore(STORE_NAME);
  await store.set(key, serialized);
  await store.set("latest.json", serialized);

  return { key, counts: payload.counts, bytes: serialized.length };
}

async function listBackups() {
  const store = getStore(STORE_NAME);
  const result = await store.list();
  return result.blobs.map((b) => ({ key: b.key, etag: b.etag }));
}

async function loadBackup(key: string) {
  const store = getStore(STORE_NAME);
  const data = await store.get(key, { type: "json" });
  return data;
}

async function restoreBackup(key: string): Promise<{
  restored: Record<string, number>;
  errors: string[];
}> {
  const store = getStore(STORE_NAME);
  const backup = (await store.get(key, { type: "json" })) as {
    tables?: {
      content_calendar_items?: Row[];
      content_calendar_assignees?: Row[];
      content_review_stage_history?: Row[];
      content_voice_profiles?: Row[];
    };
  } | null;
  if (!backup || !backup.tables) throw new Error(`Backup ${key} missing or malformed`);

  await ensureTables();
  const db = sql();
  const errors: string[] = [];
  const restored: Record<string, number> = {};

  // 1. content_calendar_items
  const items = backup.tables.content_calendar_items || [];
  let n = 0;
  for (const row of items) {
    try {
      // Full-row upsert keyed on id. We use COALESCE to keep this
      // forward-compatible if the schema adds columns later — missing
      // keys in the backup row just fall through to DB defaults.
      await db/* sql */`
        INSERT INTO content_calendar_items (
          id, title, content_type, date, status, assignee, theme, notes,
          final_copy, review_stage, images, campaign_id,
          checked_out_by, checked_out_at, lock_expires_at,
          created_at, updated_at
        ) VALUES (
          ${row.id}, ${row.title || "(untitled)"}, ${row.content_type || ""},
          ${row.date || null}, ${row.status || "idea"}, ${row.assignee || ""},
          ${row.theme || ""}, ${row.notes || ""}, ${row.final_copy || ""},
          ${row.review_stage || "not_started"},
          ${JSON.stringify(row.images || [])}::jsonb,
          ${row.campaign_id || null},
          ${row.checked_out_by || ""}, ${Number(row.checked_out_at || 0) || null},
          ${Number(row.lock_expires_at || 0) || null},
          ${Number(row.created_at || Date.now())},
          ${Number(row.updated_at || Date.now())}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content_type = EXCLUDED.content_type,
          date = EXCLUDED.date,
          status = EXCLUDED.status,
          assignee = EXCLUDED.assignee,
          theme = EXCLUDED.theme,
          notes = EXCLUDED.notes,
          final_copy = EXCLUDED.final_copy,
          review_stage = EXCLUDED.review_stage,
          images = EXCLUDED.images,
          campaign_id = EXCLUDED.campaign_id,
          updated_at = EXCLUDED.updated_at
      `;
      n++;
    } catch (err) {
      errors.push(`content_calendar_items:${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  restored.content_calendar_items = n;

  // 2. content_calendar_assignees
  const assignees = backup.tables.content_calendar_assignees || [];
  n = 0;
  for (const row of assignees) {
    try {
      await db/* sql */`
        INSERT INTO content_calendar_assignees (id, name, created_at)
        VALUES (${row.id}, ${row.name}, ${Number(row.created_at || Date.now())})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `;
      n++;
    } catch (err) {
      errors.push(`content_calendar_assignees:${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  restored.content_calendar_assignees = n;

  // 3. content_review_stage_history
  const history = backup.tables.content_review_stage_history || [];
  n = 0;
  for (const row of history) {
    try {
      await db/* sql */`
        INSERT INTO content_review_stage_history
          (id, item_id, stage, reviewer, feedback, entered_at, completed_at)
        VALUES
          (${row.id}, ${row.item_id}, ${row.stage}, ${row.reviewer || ""},
           ${row.feedback || ""},
           ${Number(row.entered_at || Date.now())},
           ${row.completed_at ? Number(row.completed_at) : null})
        ON CONFLICT (id) DO NOTHING
      `;
      n++;
    } catch (err) {
      errors.push(`content_review_stage_history:${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  restored.content_review_stage_history = n;

  // 4. content_voice_profiles
  const voices = backup.tables.content_voice_profiles || [];
  n = 0;
  for (const row of voices) {
    try {
      await db/* sql */`
        INSERT INTO content_voice_profiles
          (id, name, description, prompt_text, is_default, updated_by, created_at, updated_at)
        VALUES
          (${row.id}, ${row.name || "Untitled"}, ${row.description || ""},
           ${row.prompt_text || ""}, ${row.is_default === true},
           ${row.updated_by || ""},
           ${Number(row.created_at || Date.now())},
           ${Number(row.updated_at || Date.now())})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          prompt_text = EXCLUDED.prompt_text,
          is_default = EXCLUDED.is_default,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `;
      n++;
    } catch (err) {
      errors.push(`content_voice_profiles:${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  restored.content_voice_profiles = n;

  return { restored, errors };
}

export default async function handler(req: Request, _context: Context) {
  let action: string | undefined;
  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
        action = typeof body.action === "string" ? body.action : undefined;
      }
    }
  } catch { /* ignore */ }

  try {
    if (!action || action === "backup") {
      const result = await takeBackup();
      console.log(`[content-calendar-backup] ✓ key=${result.key} counts=${JSON.stringify(result.counts)} bytes=${result.bytes}`);
      return json({ ok: true, ...result });
    }
    if (action === "list") {
      return json({ ok: true, backups: await listBackups() });
    }
    if (action === "load") {
      const key = (body.key as string) || "latest.json";
      const data = await loadBackup(key);
      if (!data) return json({ error: `No backup at key ${key}` }, 404);
      return json({ ok: true, backup: data });
    }
    if (action === "restore") {
      const key = (body.key as string) || "latest.json";
      const result = await restoreBackup(key);
      console.log(`[content-calendar-backup] ↩ restored from ${key}: ${JSON.stringify(result.restored)}`);
      return json({ ok: true, key, ...result });
    }
    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[content-calendar-backup] ✗ ${msg}`);
    return json({ error: msg }, 500);
  }
}
