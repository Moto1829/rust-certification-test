#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const questionDir = path.join(projectRoot, "question");
const itemsDir = path.join(questionDir, "items");
const indexPath = path.join(questionDir, "index.json");
const schemaPath = path.join(questionDir, "quiz.schema.json");

const REQUIRED_FIELDS = ["id", "question", "choices", "correctChoiceId", "sources", "difficulty"];
const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);

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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateQuestion(item, relPath) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in item)) {
      errors.push(`${relPath}: missing required field '${field}'`);
    }
  }

  if (!isNonEmptyString(item.id)) {
    errors.push(`${relPath}: 'id' must be a non-empty string`);
  }

  const expectedId = path.basename(relPath, ".json");
  if (item.id && item.id !== expectedId) {
    errors.push(`${relPath}: 'id' (${item.id}) must match file name (${expectedId})`);
  }

  if (!VALID_DIFFICULTIES.has(item.difficulty)) {
    errors.push(`${relPath}: 'difficulty' must be one of beginner|intermediate|advanced`);
  }

  if (!isNonEmptyString(item.question)) {
    errors.push(`${relPath}: 'question' must be a non-empty string`);
  }

  if (!Array.isArray(item.choices) || item.choices.length < 2) {
    errors.push(`${relPath}: 'choices' must be an array with at least 2 items`);
  } else if (item.choices.some((choice) => !choice || !isNonEmptyString(choice.id) || !isNonEmptyString(choice.text))) {
    errors.push(`${relPath}: all 'choices' entries must have non-empty 'id' and 'text'`);
  }

  if (!isNonEmptyString(item.correctChoiceId)) {
    errors.push(`${relPath}: 'correctChoiceId' must be a non-empty string`);
  } else if (Array.isArray(item.choices) && !item.choices.some((choice) => choice?.id === item.correctChoiceId)) {
    errors.push(`${relPath}: 'correctChoiceId' must match one of choices[].id`);
  }

  if (item.explanation !== undefined && !isNonEmptyString(item.explanation)) {
    errors.push(`${relPath}: 'explanation' must be a non-empty string when present`);
  }

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    errors.push(`${relPath}: 'sources' must be a non-empty array`);
  } else if (item.sources.some((source) => !isNonEmptyString(source))) {
    errors.push(`${relPath}: all 'sources' entries must be non-empty strings`);
  }

  if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some((tag) => !isNonEmptyString(tag)))) {
    errors.push(`${relPath}: all 'tags' entries must be non-empty strings`);
  }

  return errors;
}

async function main() {
  await fs.access(schemaPath);
  await fs.access(indexPath);

  const itemFiles = await walkJsonFiles(itemsDir);

  if (itemFiles.length === 0) {
    throw new Error("No question files found in question/items");
  }

  const seenIds = new Set();
  const allErrors = [];

  for (const file of itemFiles) {
    const raw = await fs.readFile(file.absPath, "utf8");
    let item;

    try {
      item = JSON.parse(raw);
    } catch (error) {
      allErrors.push(`${file.relPath}: invalid JSON (${error.message})`);
      continue;
    }

    allErrors.push(...validateQuestion(item, file.relPath));

    if (item?.id) {
      if (seenIds.has(item.id)) {
        allErrors.push(`${file.relPath}: duplicated id '${item.id}'`);
      }
      seenIds.add(item.id);
    }
  }

  const indexRaw = await fs.readFile(indexPath, "utf8");
  const index = JSON.parse(indexRaw);

  if (typeof index?.count !== "number") {
    allErrors.push("question/index.json: 'count' must be a number");
  }

  if (!Array.isArray(index?.items)) {
    allErrors.push("question/index.json: 'items' must be an array");
  } else {
    if (index.count !== index.items.length) {
      allErrors.push("question/index.json: 'count' does not match items length");
    }

    const indexIds = new Set();

    for (const entry of index.items) {
      if (!isNonEmptyString(entry.id)) {
        allErrors.push("question/index.json: each item.id must be a non-empty string");
      } else {
        indexIds.add(entry.id);
      }

      if (!isNonEmptyString(entry.path)) {
        allErrors.push(`question/index.json: item ${entry.id ?? "(unknown)"} path must be non-empty`);
      } else {
        const resolved = path.resolve(projectRoot, entry.path);
        if (!itemFiles.some((file) => file.absPath === resolved)) {
          allErrors.push(`question/index.json: item ${entry.id} points to missing file ${entry.path}`);
        }
      }
    }

    for (const id of seenIds) {
      if (!indexIds.has(id)) {
        allErrors.push(`question/index.json: missing item id '${id}'`);
      }
    }
  }

  if (allErrors.length > 0) {
    console.error("Question validation failed:\n");
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Question validation passed (${itemFiles.length} files)`);
}

main().catch((error) => {
  console.error("Validation error:", error.message);
  process.exitCode = 1;
});
