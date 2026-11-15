import type { Crumb } from "./types";

export type FolderNode = { id: string; name: string; parents: string[] };

export const MAX_FOLDER_DEPTH = 10;

/**
 * Returns the breadcrumb path root -> target when `targetId` is the root or a
 * descendant of it (walking `parents` up at most `maxDepth` levels), or null.
 * `lookup` returns null for folders that do not exist or are not visible.
 * Cycles are cut by tracking visited ids.
 */
export async function resolveFolderPath(
  targetId: string,
  rootId: string,
  lookup: (id: string) => Promise<FolderNode | null>,
  maxDepth = MAX_FOLDER_DEPTH,
): Promise<Crumb[] | null> {
  const visited = new Set<string>();

  async function walk(id: string, depth: number): Promise<Crumb[] | null> {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = await lookup(id);
    if (!node) return null;
    const crumb = { id: node.id, name: node.name };
    if (id === rootId) return [crumb];
    if (depth >= maxDepth) return null;
    for (const parent of node.parents) {
      const path = await walk(parent, depth + 1);
      if (path) return [...path, crumb];
    }
    return null;
  }

  return walk(targetId, 0);
}
