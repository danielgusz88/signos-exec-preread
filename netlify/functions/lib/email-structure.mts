/**
 * email-structure.mts — Deterministic HTML structural audit + auto-heal.
 *
 * Why this exists:
 *   The patch-apply executor in email-hub-apply-background.mts inserts new
 *   <tr> blocks into an email's content region. If any EXISTING <tr> block
 *   in that region has unbalanced table tags (unclosed <table>, <tbody>, or
 *   <td>), the new <tr> gets nested inside the broken block rather than
 *   appended as a sibling. The result: rendered email has empty sections,
 *   squeezed-column layouts, or duplicated content.
 *
 *   This file provides:
 *     auditContent() — parses the content region and reports imbalance
 *     healContent()  — deterministic auto-repair: close dangling inner tags
 *                      immediately before any top-level <tr> that would
 *                      otherwise be trapped inside a previous block
 *
 *   We use node-html-parser (tolerant + DOM-shaped API). The parser is
 *   permissive, so to detect structural defects we count open/close tags
 *   at the string level AND re-serialize through the parser to confirm.
 *
 * Performance: ~5-20ms on a typical email. Runs synchronously in the
 * background function. Cheap compared to the Claude call.
 */

import { parse, type HTMLElement } from "node-html-parser";

export interface AuditResult {
  ok: boolean;
  topLevelTrCount: number;      // number of top-level <tr>s in the content region
  imbalances: string[];          // human-readable descriptions of each defect
  perBlock: BlockAudit[];        // one entry per top-level <tr>
}

export interface BlockAudit {
  index: number;
  trCount: number;               // total <tr> inside this block (should be >= 1)
  tableOpens: number;
  tableCloses: number;
  tbodyOpens: number;
  tbodyCloses: number;
  tdOpens: number;
  tdCloses: number;
  snippet: string;               // first 80 chars of visible text for debugging
  balanced: boolean;
}

/**
 * Split a content region string into top-level <tr>...</tr> blocks.
 * "Top-level" = every <tr> that the patcher inserts as a sibling.
 * We detect this by scanning for `<tr` at the start of a line OR preceded
 * by whitespace AND NOT preceded by another open `<table>` that's still
 * open from the previous block.
 *
 * This is a simple two-pass approach: parse as a whole region first with
 * the HTML parser, then inspect the root's direct children.
 */
export function splitTopLevelTrs(content: string): string[] {
  // Wrap in a <tbody> so node-html-parser treats <tr>s as children.
  const wrapper = parse(`<table><tbody>${content}</tbody></table>`, {
    lowerCaseTagName: false,
    comment: true,
  });
  const tbody = wrapper.querySelector("tbody");
  if (!tbody) return [content];
  return tbody.childNodes
    .filter((n): n is HTMLElement => "tagName" in n && n.tagName?.toLowerCase() === "tr")
    .map((tr) => tr.outerHTML);
}

/**
 * Count occurrences of an open / close tag pair in a string.
 * Ignores tags inside HTML comments and <style>/<script> blocks.
 */
function tagCount(html: string, tag: string): { opens: number; closes: number } {
  // Strip comments and style/script blocks to avoid false positives.
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const openRegex = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  const closeRegex = new RegExp(`</${tag}\\s*>`, "gi");
  return {
    opens: (cleaned.match(openRegex) || []).length,
    closes: (cleaned.match(closeRegex) || []).length,
  };
}

export function auditBlock(html: string, index: number): BlockAudit {
  const tr = tagCount(html, "tr");
  const table = tagCount(html, "table");
  const tbody = tagCount(html, "tbody");
  const td = tagCount(html, "td");
  const balanced =
    tr.opens === tr.closes &&
    table.opens === table.closes &&
    tbody.opens === tbody.closes &&
    td.opens === td.closes;

  const visibleText = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return {
    index,
    trCount: tr.opens,
    tableOpens: table.opens,
    tableCloses: table.closes,
    tbodyOpens: tbody.opens,
    tbodyCloses: tbody.closes,
    tdOpens: td.opens,
    tdCloses: td.closes,
    snippet: visibleText,
    balanced,
  };
}

export function auditContent(content: string): AuditResult {
  const blocks = splitTopLevelTrs(content);
  const perBlock = blocks.map((b, i) => auditBlock(b, i));
  const imbalances: string[] = [];
  for (const b of perBlock) {
    if (!b.balanced) {
      const parts: string[] = [];
      if (b.tableOpens !== b.tableCloses) parts.push(`<table> ${b.tableOpens}/${b.tableCloses}`);
      if (b.tbodyOpens !== b.tbodyCloses) parts.push(`<tbody> ${b.tbodyOpens}/${b.tbodyCloses}`);
      if (b.tdOpens !== b.tdCloses) parts.push(`<td> ${b.tdOpens}/${b.tdCloses}`);
      if (b.trCount !== tagCount(blocks[b.index], "tr").closes) parts.push(`<tr> ${b.trCount}`);
      imbalances.push(`block ${b.index} ("${b.snippet}"): ${parts.join(", ")}`);
    }
  }
  return {
    ok: imbalances.length === 0,
    topLevelTrCount: perBlock.length,
    imbalances,
    perBlock,
  };
}

/**
 * healBlock — deterministic repair for a single top-level <tr>.
 * Uses node-html-parser to re-serialize. node-html-parser auto-balances
 * common open tags when given an input with dangling opens, so
 * re-parse-then-serialize is a cheap way to produce a valid block.
 *
 * BUT: node-html-parser preserves broken input literally unless we give
 * it the right hints. The safe strategy: wrap in <table><tbody> and let
 * the parser close inner tags as it walks. Then extract the first <tr>.
 */
export function healBlock(html: string): string {
  // Fast-path: if already balanced, return as-is.
  const audit = auditBlock(html, 0);
  if (audit.balanced) return html;

  // Strategy: walk the string and emit a balanced tag stack, closing
  // any dangling inner <table>/<tbody>/<td> before the trailing </tr>.
  //
  // We do this with a simple tokenizer because node-html-parser's
  // re-serialization sometimes reorders attributes and loses formatting,
  // which breaks downstream string matching. The tokenizer approach
  // preserves the original string byte-for-byte except for appended
  // closing tags.

  // Find where the outermost </tr> sits (last one in the block).
  const lastCloseTr = html.lastIndexOf("</tr>");
  if (lastCloseTr < 0) return html; // nothing we can do

  const beforeCloseTr = html.slice(0, lastCloseTr);
  const afterCloseTr = html.slice(lastCloseTr);

  // Count missing tags we need to close BEFORE the final </tr>.
  const table = tagCount(beforeCloseTr, "table");
  const tbody = tagCount(beforeCloseTr, "tbody");
  const td = tagCount(beforeCloseTr, "td");
  const innerTr = tagCount(beforeCloseTr, "tr");

  let closers = "";
  // Close inner <tr>s first (nested table-inside-td rows)
  const trDeficit = innerTr.opens - innerTr.closes - 1; // -1 because outermost <tr> closes at afterCloseTr
  for (let i = 0; i < Math.max(0, trDeficit); i++) closers += "</tr>";
  // Then <td>, <tbody>, <table> in LIFO order
  for (let i = 0; i < Math.max(0, td.opens - td.closes - 1); i++) closers += "</td>"; // -1 for outer <td>
  for (let i = 0; i < Math.max(0, tbody.opens - tbody.closes); i++) closers += "</tbody>";
  for (let i = 0; i < Math.max(0, table.opens - table.closes); i++) closers += "</table>";
  // Finally close the outer <td> that every <tr> should have.
  // We track this by checking if td deficit > 1 already handled above.

  // If we still have a td deficit of 1 (the outer wrapping cell), close it.
  const remainingTdDeficit = td.opens - td.closes - 1 - Math.max(0, td.opens - td.closes - 1);
  // Above expression simplifies to either 0 or 1 depending on source.
  // If outer <td> is still open, inject the </td> before </tr>.

  if (closers.length > 0) {
    return beforeCloseTr + closers + afterCloseTr;
  }

  // Fallback: simple count-based. If outer block has missing closes, append
  // them just before the trailing </tr>.
  let out = beforeCloseTr;
  const tableDeficit = table.opens - table.closes;
  const tbodyDeficit = tbody.opens - tbody.closes;
  const tdDeficit = td.opens - td.closes;

  // Heuristic: outer row normally has one <td> wrapping everything plus its </td>.
  // If we see N opens and <N closes inside the block, we insert (N - closes - 1)
  // close tags BEFORE the outer </td> — which we find as the last </td> before </tr>.
  if (tdDeficit > 1 || tbodyDeficit > 0 || tableDeficit > 0) {
    const innerClosers =
      "</td>".repeat(Math.max(0, tdDeficit - 1)) +
      "</tbody>".repeat(Math.max(0, tbodyDeficit)) +
      "</table>".repeat(Math.max(0, tableDeficit));
    out = beforeCloseTr + innerClosers;
  }

  return out + afterCloseTr;
}

/**
 * truncateToLastCompleteTr — if the stream was cut off mid-tag or mid-
 * attribute (e.g. `<p class="eyebrow" style="font-family:'`), roll the
 * output back to the last complete `</tr>` so closers + footer can be
 * appended cleanly.
 *
 * Detects truncation by looking for an open `<` without a matching `>` in
 * the trailing fragment. If found, finds the last `</tr>` and cuts there.
 * No-op if the output already ends cleanly.
 */
export function truncateToLastCompleteTr(html: string): string {
  if (!html) return html;
  // Find position of the last `>` and the last `<`. If last `<` comes
  // after last `>`, the stream is mid-tag.
  const lastGt = html.lastIndexOf(">");
  const lastLt = html.lastIndexOf("<");
  if (lastLt <= lastGt) return html; // already clean, or no tags at all

  // Truncation detected. Find the last complete `</tr>` and cut there.
  const lastTrClose = html.lastIndexOf("</tr>");
  if (lastTrClose < 0) {
    // No complete <tr> at all — just strip the partial tag fragment.
    return html.slice(0, lastLt).trimEnd();
  }
  return html.slice(0, lastTrClose + "</tr>".length);
}

/**
 * computeMissingClosers — scan an HTML stream fragment and emit the
 * exact closing tags needed to balance it.
 *
 * Used at the end of a generation stream: Claude may be cut off mid-block
 * (max_tokens, network, etc.) and we need to close <p>, <td>, <tr>, <tbody>,
 * <table> in LIFO order. The previous implementation hardcoded
 * `</p></td></tr></table></td></tr>` which was wrong for half the block
 * types (some have no nested table, some have two).
 *
 * This scans opens vs. closes per-tag and emits the missing closers in
 * reasonable LIFO order (p, td, tr, tbody, table → repeated as needed).
 */
export function computeMissingClosers(html: string): string {
  // Ignore tags inside comments/style/script
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  const open = (tag: string) => (cleaned.match(new RegExp(`<${tag}(\\s[^>]*)?>`, "gi")) || []).length;
  // self-closing <img>, <br>, etc. don't need this
  const close = (tag: string) => (cleaned.match(new RegExp(`</${tag}\\s*>`, "gi")) || []).length;

  const pDeficit = Math.max(0, open("p") - close("p"));
  const tdDeficit = Math.max(0, open("td") - close("td"));
  const trDeficit = Math.max(0, open("tr") - close("tr"));
  const tbodyDeficit = Math.max(0, open("tbody") - close("tbody"));
  const tableDeficit = Math.max(0, open("table") - close("table"));

  let out = "";
  // Emit in LIFO: closest-to-cursor closers first.
  out += "</p>".repeat(pDeficit);
  // Unwind from innermost element out.
  // Each <tr> needs a parent table close; but innermost td closes before tr.
  // We emit simple: all td, then tr, then tbody, then table closes.
  // For nested tables inside a td, we may need to close inner <table>+<td>+<tr>
  // before the outer <td>.
  // Simple heuristic: pair them up so every inner table gets closed in the right order.
  // We emit: (</td></tr></table>) pairs until nested table debt is gone,
  // then close any remaining top-level <td></tr></tbody></table>.
  const innerPairs = Math.max(0, Math.min(tdDeficit, trDeficit, tableDeficit) - 1);
  for (let i = 0; i < innerPairs; i++) out += "</td></tr></table>";
  const remainingTd = tdDeficit - innerPairs;
  const remainingTr = trDeficit - innerPairs;
  const remainingTable = tableDeficit - innerPairs;
  out += "</td>".repeat(Math.max(0, remainingTd));
  out += "</tr>".repeat(Math.max(0, remainingTr));
  out += "</tbody>".repeat(tbodyDeficit);
  out += "</table>".repeat(Math.max(0, remainingTable));
  return out;
}

/* ───────────────────────── STREAM-STYLE HEALER ─────────────────────
 * Scans the content as a single stream, tracking open-tag depth across
 * <table>/<tr>/<td>/<tbody>. When it encounters a new top-level <tr>
 * (tableDepth=0 && trDepth=0) while the previous block still has
 * unclosed <td>/<tbody>/<table> tags, it INSERTS the missing closers
 * before the new <tr>. This is the key repair the old node-html-parser-
 * based healer couldn't do — it kept piling closers at the end of a
 * mis-split mega-block instead of placing them at module boundaries.
 *
 * Events returned describe exactly what repairs were made so the UI can
 * surface them in the Debug panel.
 * ─────────────────────────────────────────────────────────────────── */

export type HealEventAction =
  | "close-td"
  | "close-tr"
  | "close-tbody"
  | "close-table"
  | "unmatched-close";

export interface HealEvent {
  blockIndex: number;      // 0-based index of the top-level block being repaired
  action: HealEventAction;
  count: number;
  position: "between-blocks" | "end-of-stream";
}

export interface HealStreamResult {
  healed: string;
  events: HealEvent[];
  blocksRepaired: number;
  topLevelTrCount: number;
}

function maskRegions(content: string): string {
  const patterns: RegExp[] = [
    /<!--[\s\S]*?-->/g,
    /<style\b[\s\S]*?<\/style>/gi,
    /<script\b[\s\S]*?<\/script>/gi,
  ];
  let masked = content;
  for (const re of patterns) {
    masked = masked.replace(re, (m) => " ".repeat(m.length));
  }
  return masked;
}

export function healContentStream(content: string): HealStreamResult {
  const masked = maskRegions(content);
  const re = /<(\/?)(table|tr|tbody|td)\b([^>]*)>/gi;

  // Detect top-level <tr>s by string position: the content region is a
  // sequence of <tr>...</tr> lines, so any <tr that starts at the beginning
  // of a line (optionally preceded by whitespace back to \n or string start)
  // is a new top-level block. Depth-based detection fails when broken
  // input leaves `tableDepth > 0` before the next top-level <tr>.
  const isLineStart = (pos: number): boolean => {
    if (pos === 0) return true;
    let i = pos - 1;
    while (i >= 0) {
      const ch = content.charAt(i);
      if (ch === "\n") return true;
      if (ch === " " || ch === "\t" || ch === "\r") { i--; continue; }
      return false;
    }
    return true;
  };

  type StackTag = "tr" | "td" | "tbody" | "table";
  const out: string[] = [];
  const events: HealEvent[] = [];
  let cursor = 0;
  let stack: StackTag[] = [];
  let blockIndex = -1;
  let currentBlockRepaired = false;
  const repairedBlocks = new Set<number>();
  let topLevelTrCount = 0;

  const countFrom = (stk: StackTag[]): { tr: number; td: number; tbody: number; table: number } =>
    stk.reduce(
      (acc, t) => { acc[t]++; return acc; },
      { tr: 0, td: 0, tbody: 0, table: 0 },
    );

  const actionFor = (t: StackTag): HealEventAction =>
    t === "tr" ? "close-tr" : t === "td" ? "close-td" : t === "tbody" ? "close-tbody" : "close-table";

  const drainStack = (pos: HealEvent["position"]) => {
    // Pop the stack in LIFO order (innermost first), emitting the exact
    // closing tag for each popped entry. Summarize events by action.
    if (stack.length === 0) return;
    const counts: Record<HealEventAction, number> = {
      "close-tr": 0, "close-td": 0, "close-tbody": 0, "close-table": 0, "unmatched-close": 0,
    };
    while (stack.length > 0) {
      const t = stack.pop()!;
      out.push(`</${t}>`);
      const action = actionFor(t);
      counts[action]++;
    }
    (["close-td", "close-tr", "close-tbody", "close-table"] as HealEventAction[]).forEach((a) => {
      if (counts[a] > 0) {
        events.push({ blockIndex: Math.max(0, blockIndex), action: a, count: counts[a], position: pos });
      }
    });
    currentBlockRepaired = true;
    if (blockIndex >= 0) repairedBlocks.add(blockIndex);
  };

  let match: RegExpExecArray | null;
  while ((match = re.exec(masked)) !== null) {
    const isClose = match[1] === "/";
    const tag = match[2].toLowerCase() as StackTag;
    const fullStart = match.index;
    const fullEnd = fullStart + match[0].length;

    // Top-level <tr> detection by position (line start), regardless of depth
    if (tag === "tr" && !isClose && isLineStart(fullStart)) {
      // Flush content before this <tr>
      out.push(content.slice(cursor, fullStart));
      // Drain any still-open tags from the previous block BEFORE opening
      // this new top-level <tr>
      if (stack.length > 0) {
        drainStack("between-blocks");
      }
      // Emit the <tr> opener itself
      out.push(content.slice(fullStart, fullEnd));
      cursor = fullEnd;
      blockIndex++;
      currentBlockRepaired = false;
      topLevelTrCount++;
      stack.push("tr");
      continue;
    }

    // Track stack for non-top-level tags
    if (!isClose) {
      stack.push(tag);
    } else {
      // Closer: pop if the top of stack matches; otherwise record as unmatched
      const top = stack[stack.length - 1];
      if (top === tag) {
        stack.pop();
      } else {
        // Tolerant pop: find the closest matching tag on the stack. If found,
        // auto-close the intervening tags (reflecting real HTML parser rules).
        const idx = stack.lastIndexOf(tag);
        if (idx >= 0) {
          // Intervening tags above it are implicitly closed — treat as a
          // soft repair (no event emitted; the input's intent is clear).
          stack = stack.slice(0, idx);
        } else {
          events.push({
            blockIndex: Math.max(0, blockIndex),
            action: "unmatched-close",
            count: 1,
            position: "between-blocks",
          });
        }
      }
    }

    // Suppress unused warning
    void currentBlockRepaired;
  }

  // Flush trailing content + final drain
  out.push(content.slice(cursor));
  if (stack.length > 0) {
    drainStack("end-of-stream");
  }

  return {
    healed: out.join(""),
    events,
    blocksRepaired: repairedBlocks.size,
    topLevelTrCount,
  };
}

/**
 * healContent — run auto-heal across every top-level <tr>, return the
 * repaired content region + diagnostic info.
 */
export interface HealResult {
  healed: string;
  beforeAudit: AuditResult;
  afterAudit: AuditResult;
  blocksRepaired: number;
}

export function healContent(content: string): HealResult {
  const beforeAudit = auditContent(content);
  if (beforeAudit.ok) {
    return { healed: content, beforeAudit, afterAudit: beforeAudit, blocksRepaired: 0 };
  }

  // Delegate to the stream-style healer, which correctly inserts missing
  // closers BETWEEN top-level blocks (rather than piling them at the end).
  // The old per-block path mis-handled cascading unclosed tables because
  // node-html-parser would nest subsequent <tr>s inside the first block.
  const stream = healContentStream(content);
  const afterAudit = auditContent(stream.healed);
  return {
    healed: stream.healed,
    beforeAudit,
    afterAudit,
    blocksRepaired: stream.blocksRepaired,
  };
}
