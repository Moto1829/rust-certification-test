#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");

const COARSE_PATTERNS = [
  {
    name: "effective-rust root",
    re: /^https:\/\/www\.lurklurk\.org\/effective-rust\/?$/
  },
  {
    name: "async-book generic chapter",
    re: /^https:\/\/rust-lang\.github\.io\/async-book\/.+\/(?:00|01)_chapter\.html(?:#.*)?$/
  },
  {
    name: "rust-jp chapter top",
    re: /^https:\/\/doc\.rust-jp\.rs\/book-ja\/ch\d{2}-00-[^#]+\.html(?:#.*)?$/
  },
  {
    name: "rust-book chapter top",
    re: /^https:\/\/doc\.rust-lang\.org\/book\/ch\d{2}-00-[^#]+\.html(?:#.*)?$/
  }
];

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

function validateSource(source, relPath, index) {
  const errors = [];

  if (typeof source !== "string" || source.trim().length === 0) {
    errors.push(`${relPath}: sources[${index}] must be a non-empty string`);
    return errors;
  }

  if (source !== source.trim()) {
    errors.push(`${relPath}: sources[${index}] has leading/trailing whitespace`);
  }

  let url;
  try {
    url = new URL(source);
  } catch {
    errors.push(`${relPath}: sources[${index}] is not a valid URL: ${source}`);
    return errors;
  }

  if (url.protocol !== "https:") {
    errors.push(`${relPath}: sources[${index}] must use https: ${source}`);
  }

  for (const rule of COARSE_PATTERNS) {
    if (rule.re.test(source)) {
      errors.push(`${relPath}: sources[${index}] is too coarse (${rule.name}): ${source}`);
    }
  }

  return errors;
}

async function main() {
  const files = await walkJsonFiles(itemsDir);
  if (files.length === 0) {
    throw new Error("No question files found in question/items");
  }

  const errors = [];
  let checked = 0;

  for (const file of files) {
    const raw = await fs.readFile(file.absPath, "utf8");
    let item;

    try {
      item = JSON.parse(raw);
    } catch (error) {
      errors.push(`${file.relPath}: invalid JSON (${error.message})`);
      continue;
    }

    if (!Array.isArray(item?.sources) || item.sources.length === 0) {
      errors.push(`${file.relPath}: sources must be a non-empty array`);
      continue;
    }

    const seen = new Set();
    item.sources.forEach((source, index) => {
      errors.push(...validateSource(source, file.relPath, index));
      if (typeof source === "string") {
        const key = source.trim();
        if (seen.has(key)) {
          errors.push(`${file.relPath}: duplicated source URL: ${key}`);
        }
        seen.add(key);
      }
      checked += 1;
    });
  }

  if (errors.length > 0) {
    console.error("Source link validation failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Source link validation passed (${files.length} files, ${checked} URLs)`);
}

main().catch((error) => {
  console.error("Validation error:", error.message);
  process.exitCode = 1;
});
