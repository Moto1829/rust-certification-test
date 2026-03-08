#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");

function usage() {
  console.log("Usage: npm run new:question -- --id q0106 [--category-dir ownership]");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--id") {
      args.id = argv[i + 1];
      i += 1;
    } else if (token === "--category-dir") {
      args.categoryDir = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function sanitizeDirName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.id) {
    usage();
    throw new Error("--id is required");
  }

  const categoryDir = sanitizeDirName(args.categoryDir);
  const targetDir = categoryDir ? path.join(itemsDir, categoryDir) : itemsDir;
  const filePath = path.join(targetDir, `${args.id}.json`);

  await fs.mkdir(targetDir, { recursive: true });

  try {
    await fs.access(filePath);
    throw new Error(`${path.relative(projectRoot, filePath)} already exists`);
  } catch {
  }

  const template = {
    id: args.id,
    difficulty: "beginner",
    question: "ここに問題文を記載してください。",
    choices: [
      { id: "a", text: "選択肢1" },
      { id: "b", text: "選択肢2" },
      { id: "c", text: "選択肢3" },
      { id: "d", text: "選択肢4" }
    ],
    correctChoiceId: "a",
    explanation: "ここに解説を記載してください。",
    tags: ["ownership"],
    sources: ["https://doc.rust-lang.org/book/"]
  };

  await fs.writeFile(filePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  console.log(`Created ${path.relative(projectRoot, filePath)}`);
}

main().catch((error) => {
  console.error("Failed to create question template:", error.message);
  process.exitCode = 1;
});
