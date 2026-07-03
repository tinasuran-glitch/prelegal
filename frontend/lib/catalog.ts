import { readFile } from "node:fs/promises";
import path from "node:path";

const CATALOG_PATH = path.join(process.cwd(), "..", "catalog.json");

// Not an independently selectable document — it's the Mutual NDA's own cover page.
const EXCLUDED_FILENAMES = new Set(["Mutual-NDA-coverpage.md"]);

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  filename: string;
}

let cachedCatalog: CatalogEntry[] | null = null;

/** Mirrors backend/app/catalog.py's document-type derivation: same catalog.json, same id scheme. */
export async function loadCatalog(): Promise<CatalogEntry[]> {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const raw = await readFile(CATALOG_PATH, "utf-8");
  const entries: { name: string; description: string; filename: string }[] = JSON.parse(raw);

  cachedCatalog = entries
    .filter((entry) => !EXCLUDED_FILENAMES.has(entry.filename))
    .map((entry) => ({
      id: entry.filename.replace(/\.md$/, "").toLowerCase(),
      name: entry.name,
      description: entry.description,
      filename: entry.filename,
    }));

  return cachedCatalog;
}
