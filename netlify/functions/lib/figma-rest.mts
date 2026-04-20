/**
 * figma-rest.mts — Shared Figma REST API helpers.
 *
 * Used by both the ad pipeline (figma-review.mts, figma-orchestrator.mts)
 * and the Email Hub Figma-to-email generator.
 *
 * Exports:
 *   parseFigmaUrl(url) — extract fileKey + nodeId from a Figma share URL
 *   exportFigmaNodes(token, fileKey, nodeIds) — fetch PNG renders + base64
 *
 * Requires env var FIGMA_ACCESS_TOKEN for exportFigmaNodes.
 */

const FIGMA_API = "https://api.figma.com/v1";

export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null; // may be null if URL has no node-id param
  originalUrl: string;
}

/**
 * Parse a Figma share URL into { fileKey, nodeId }.
 * Supports formats:
 *   https://www.figma.com/design/FILE_KEY/FileName?node-id=1-2
 *   https://www.figma.com/file/FILE_KEY/FileName?node-id=1-2
 *   https://www.figma.com/board/FILE_KEY/FileName?node-id=1-2
 *   https://www.figma.com/design/FILE_KEY/FileName/branch/BRANCH_KEY/BranchName?node-id=1-2
 *
 * Node IDs in URLs use hyphens ("1-2") but the API wants colons ("1:2").
 * Returns null if the URL doesn't parse.
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    if (!u.hostname.includes("figma.com")) return null;

    // Path like /design/FILE_KEY/FileName or /design/FILE_KEY/branch/BRANCH_KEY/...
    // We take the key right after design|file|board.
    const parts = u.pathname.split("/").filter(Boolean);
    const typeIdx = parts.findIndex((p) => p === "design" || p === "file" || p === "board" || p === "make");
    if (typeIdx < 0 || !parts[typeIdx + 1]) return null;

    // If there's a branch, the branch key is the file key for API purposes.
    let fileKey = parts[typeIdx + 1];
    const branchIdx = parts.findIndex((p) => p === "branch");
    if (branchIdx > 0 && parts[branchIdx + 1]) fileKey = parts[branchIdx + 1];

    // Extract node-id from query
    const nodeIdRaw = u.searchParams.get("node-id");
    const nodeId = nodeIdRaw ? nodeIdRaw.replace(/-/g, ":") : null;

    return { fileKey, nodeId, originalUrl: trimmed };
  } catch {
    return null;
  }
}

export interface ExportedNode {
  nodeId: string;
  imageUrl: string;
  imageBase64: string;
  mimeType: "image/png";
}

/**
 * Fetch PNG renders for one or more nodes in a Figma file.
 * Returns base64 + original short-lived URL for each.
 *
 * scale is 1|2|3|4; 2 is a good default for retina without massive payloads.
 * Nodes that fail to render return empty strings for imageUrl/imageBase64.
 */
export async function exportFigmaNodes(
  figmaToken: string,
  fileKey: string,
  nodeIds: string[],
  scale: 1 | 2 | 3 | 4 = 2,
): Promise<ExportedNode[]> {
  if (!nodeIds.length) return [];

  const idsParam = nodeIds.join(",");
  const url = `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=png&scale=${scale}`;

  const res = await fetch(url, { headers: { "X-Figma-Token": figmaToken } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Figma export API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (data.err) throw new Error(`Figma export error: ${data.err}`);

  const images: Record<string, string | null> = data.images || {};
  const out: ExportedNode[] = [];

  for (const nodeId of nodeIds) {
    const imgUrl = images[nodeId];
    if (!imgUrl) {
      out.push({ nodeId, imageUrl: "", imageBase64: "", mimeType: "image/png" });
      continue;
    }
    // Figma returns a short-lived signed URL; fetch the bytes now so we can
    // base64-embed them into the Claude prompt.
    try {
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) {
        out.push({ nodeId, imageUrl: imgUrl, imageBase64: "", mimeType: "image/png" });
        continue;
      }
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Chunked base64 to avoid "call stack exceeded" on large images.
      let base64 = "";
      const CHUNK = 32768;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        base64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      out.push({ nodeId, imageUrl: imgUrl, imageBase64: btoa(base64), mimeType: "image/png" });
    } catch {
      out.push({ nodeId, imageUrl: imgUrl, imageBase64: "", mimeType: "image/png" });
    }
  }
  return out;
}

/**
 * Fetch top-level file metadata (name, last modified, frame names) for
 * one or more Figma files. Useful for giving Claude a textual description
 * of the design so it isn't just working from pixels.
 */
export async function getFigmaFileSummary(
  figmaToken: string,
  fileKey: string,
): Promise<{ name: string; lastModified: string; pages: { name: string; nodeIds: string[] }[] } | null> {
  const res = await fetch(`${FIGMA_API}/files/${fileKey}?depth=2`, {
    headers: { "X-Figma-Token": figmaToken },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.document) return null;

  const pages = (data.document.children || []).map((p: { name: string; children?: Array<{ id: string }> }) => ({
    name: p.name,
    nodeIds: (p.children || []).map((c) => c.id).slice(0, 10),
  }));

  return {
    name: data.name || "Untitled",
    lastModified: data.lastModified || "",
    pages,
  };
}
