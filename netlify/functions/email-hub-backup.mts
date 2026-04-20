/**
 * email-hub-backup.mts — Snapshots the email_hub_drafts table to Netlify Blobs.
 *
 * Runs daily on schedule (see netlify.toml: "17 6 * * *" → 6:17 UTC). The odd
 * minute avoids the :00 fleet-thundering-herd. Also supports manual actions
 * via POST:
 *
 *   {action: "backup"}                       — take a backup now
 *   {action: "list"}                         — list all backup blobs
 *   {action: "load", key: "YYYY-MM-DD.json"} — inspect a specific backup
 *   {action: "restore", key: "..."}          — restore all drafts from a backup
 *                                              (upserts into DB — non-destructive
 *                                               to current drafts; overwrites by id)
 *
 * This function was created after a DB-wipe incident on 2026-04-20 where drafts
 * vanished from the email_hub_drafts table (suspected Neon branch swap or env
 * change during a deploy). It ensures future incidents have a trivial recovery
 * path: restore from the most recent daily JSON in the "email-hub-backups" blob
 * store.
 */

import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { sql, ensureTables } from "./lib/db.mjs";

const STORE_NAME = "email-hub-backups";

interface DraftRow {
  id: string;
  title: string;
  theme: string;
  details: string;
  audience: string;
  html: string;
  created_at: number | string;
  updated_at: number | string;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}.json`;
}

async function takeBackup(): Promise<{
  key: string;
  count: number;
  bytes: number;
}> {
  await ensureTables();
  const db = sql();
  const rows = (await db/* sql */`
    SELECT id, title, theme, details, audience, html, created_at, updated_at
    FROM email_hub_drafts
    ORDER BY updated_at DESC
  `) as unknown as DraftRow[];

  const payload = {
    backup_at: Date.now(),
    backup_iso: new Date().toISOString(),
    count: rows.length,
    drafts: rows.map((r) => ({
      ...r,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
    })),
  };
  const serialized = JSON.stringify(payload);
  const key = todayKey();

  const store = getStore(STORE_NAME);
  await store.set(key, serialized);
  // Also write a "latest" pointer for trivial restore-most-recent
  await store.set("latest.json", serialized);

  return { key, count: rows.length, bytes: serialized.length };
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

async function restoreBackup(
  key: string,
): Promise<{ restored: number; skipped: number; errors: string[] }> {
  const store = getStore(STORE_NAME);
  const backup = (await store.get(key, { type: "json" })) as {
    drafts?: DraftRow[];
  } | null;
  if (!backup || !Array.isArray(backup.drafts)) {
    throw new Error(`Backup ${key} missing or malformed`);
  }

  await ensureTables();
  const db = sql();
  let restored = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const d of backup.drafts) {
    try {
      // Upsert — matches the shape of the save-draft action in email-hub.mts
      await db/* sql */`
        INSERT INTO email_hub_drafts
          (id, title, theme, details, audience, html, created_at, updated_at)
        VALUES
          (${d.id}, ${d.title || "Untitled"}, ${d.theme || ""},
           ${d.details || ""}, ${d.audience || "all"}, ${d.html || ""},
           ${Number(d.created_at) || Date.now()},
           ${Number(d.updated_at) || Date.now()})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          theme = EXCLUDED.theme,
          details = EXCLUDED.details,
          audience = EXCLUDED.audience,
          html = EXCLUDED.html,
          updated_at = EXCLUDED.updated_at
      `;
      restored++;
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${d.id}: ${msg}`);
    }
  }
  return { restored, skipped, errors };
}

export default async function handler(req: Request, _context: Context) {
  // Scheduled invocation: Netlify calls with a POST and a body containing
  // `{next_run: "..."}`. Treat any non-action body as a scheduled trigger.
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
  } catch {
    // Ignore body-parse errors — scheduled invocations may send binary payloads
  }

  try {
    // Scheduled or explicit "backup" action — take a snapshot
    if (!action || action === "backup") {
      const result = await takeBackup();
      console.log(`[email-hub-backup] ✓ backed up ${result.count} drafts (${result.bytes} bytes) → ${result.key}`);
      return json({ ok: true, ...result });
    }

    if (action === "list") {
      const blobs = await listBackups();
      return json({ ok: true, backups: blobs });
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
      console.log(`[email-hub-backup] ↩ restored ${result.restored} drafts from ${key} (${result.skipped} skipped)`);
      return json({ ok: true, key, ...result });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email-hub-backup] ✗ ${msg}`);
    return json({ error: msg }, 500);
  }
}
