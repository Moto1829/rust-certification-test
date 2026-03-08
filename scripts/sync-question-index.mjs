#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const questionDir = path.join(projectRoot, "question");
const itemsDir = path.join(questionDir, "items");
const indexPath = path.join(questionDir, "index.json");

function inferCategory(relPath, id) {
  const fromDir = path.dirname(relPath).split("/")[0];
  if (fromDir && fromDir !== ".") {
    return fromDir;
  }

  return String(id || "")
    .trim()
    .toLowerCase()
    .split("_")[0] || "uncategorized";
}

async function walkJsonFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(absPath, baseDir)));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    files.push({
      absPath,
      relPath: path.relative(baseDir, absPath).replaceAll(path.sep, "/")
    });
  }

  return files;
}

async function main() {
  const itemFiles = await walkJsonFiles(itemsDir);
  const entries = [];

  for (const itemFile of itemFiles) {
    const raw = await fs.readFile(itemFile.absPath, "utf8");
    const item = JSON.parse(raw);

    if (!item.id) {
      throw new Error(`id is missing in ${itemFile.relPath}`);
    }

    entries.push({
      id: item.id,
      path: `question/items/${itemFile.relPath}`,
      title: item.question,
      category: inferCategory(itemFile.relPath, item.id),
      difficulty: item.difficulty
    });
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));

  const index = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    items: entries
  };

  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`Synced ${entries.length} questions to question/index.json`);
}

main().catch((error) => {
  console.error("Failed to sync question index:", error.message);
  process.exitCode = 1;
});
