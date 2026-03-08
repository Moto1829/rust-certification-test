#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");

function sanitizeCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "uncategorized";
}

function inferCategoryFromId(id) {
  const prefix = String(id || "")
    .trim()
    .toLowerCase()
    .split("_")[0];

  const map = {
    ownership: "ownership",
    borrowing: "ownership",
    lifetime: "ownership",
    lifetimes: "ownership",
    move: "ownership",
    copy: "ownership",
    drop: "ownership",
    async: "async",
    await: "async",
    future: "async",
    pin: "async",
    stream: "async",
    tokio: "async",
    trait: "traits_generics",
    traits: "traits_generics",
    generic: "traits_generics",
    where: "traits_generics",
    impl: "traits_generics",
    dyn: "traits_generics",
    module: "modules",
    crate: "modules",
    use: "modules",
    pub: "modules",
    path: "modules",
    result: "error_handling",
    option: "error_handling",
    panic: "error_handling",
    error: "error_handling",
    box: "types_collections",
    vec: "types_collections",
    hashmap: "types_collections",
    string: "types_collections",
    char: "types_collections",
    tuple: "types_collections",
    array: "types_collections",
    closure: "functions_control",
    match: "functions_control",
    if: "functions_control",
    loop: "functions_control",
    let: "functions_control",
    const: "functions_control",
    channel: "concurrency",
    mutex: "concurrency",
    arc: "concurrency",
    send: "concurrency",
    sync: "concurrency",
    cargo: "tooling_testing",
    test: "tooling_testing",
    doc: "tooling_testing",
    derive: "tooling_testing",
    effective: "best_practices"
  };

  return map[prefix] || sanitizeCategory(prefix);
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

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push({
        absPath,
        relPath: path.relative(baseDir, absPath).replaceAll(path.sep, "/")
      });
    }
  }

  return files;
}

async function main() {
  const files = await walkJsonFiles(itemsDir);
  let moved = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = await fs.readFile(file.absPath, "utf8");
    const item = JSON.parse(raw);
    const category = inferCategoryFromId(item.id);
    const expectedName = `${item.id}.json`;
    const targetDir = path.join(itemsDir, category);
    const targetPath = path.join(targetDir, expectedName);

    const currentRel = path.relative(itemsDir, file.absPath).replaceAll(path.sep, "/");
    const targetRel = path.relative(itemsDir, targetPath).replaceAll(path.sep, "/");

    if (currentRel === targetRel) {
      skipped += 1;
      continue;
    }

    await fs.mkdir(targetDir, { recursive: true });

    try {
      await fs.access(targetPath);
      throw new Error(`Target already exists: ${targetRel}`);
    } catch {
    }

    await fs.rename(file.absPath, targetPath);
    moved += 1;
  }

  console.log(`Organized question files: moved=${moved}, unchanged=${skipped}`);
}

main().catch((error) => {
  console.error("Failed to organize question files:", error.message);
  process.exitCode = 1;
});
