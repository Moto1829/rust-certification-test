#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");
const outDir = path.join(projectRoot, "question", "review");
const outPath = path.join(outDir, "question-quality-report.md");

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[`'"“”‘’]/g, "")
    .replace(/[。．.!?！？]/g, "")
    .trim();
}

function addCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

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

function topEntries(map, limit = 15) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function main() {
  const files = await walkJsonFiles(itemsDir);
  if (files.length === 0) {
    throw new Error("No question files found under question/items");
  }

  const items = [];
  const parseErrors = [];

  for (const file of files) {
    try {
      const raw = await fs.readFile(file.absPath, "utf8");
      const item = JSON.parse(raw);
      items.push({ ...item, __relPath: file.relPath });
    } catch (error) {
      parseErrors.push(`${file.relPath}: ${error.message}`);
    }
  }

  const difficultyCounts = new Map();
  const categoryCounts = new Map();
  const tagCounts = new Map();
  const sourceUrlCounts = new Map();

  const missing = {
    explanation: [],
    sourceTitle: [],
    sourceUrl: [],
    tags: []
  };

  const questionFingerprint = new Map();

  for (const item of items) {
    addCount(difficultyCounts, item.difficulty || "(missing)");
    addCount(categoryCounts, inferCategory(item.__relPath, item.id));

    if (Array.isArray(item.tags) && item.tags.length > 0) {
      for (const tag of item.tags) {
        addCount(tagCounts, tag || "(empty)");
      }
    } else {
      missing.tags.push(item.id || item.__relPath);
    }

    if (!item.explanation || !String(item.explanation).trim()) {
      missing.explanation.push(item.id || item.__relPath);
    }

    if (!Array.isArray(item.sources) || item.sources.length === 0) {
      missing.sourceTitle.push(item.id || item.__relPath);
      missing.sourceUrl.push(item.id || item.__relPath);
    } else {
      for (const sourceUrl of item.sources) {
        if (!sourceUrl || !String(sourceUrl).trim()) {
          missing.sourceUrl.push(item.id || item.__relPath);
          continue;
        }

        addCount(sourceUrlCounts, String(sourceUrl).trim());
      }
    }

    const fp = normalizeText(item.question);
    if (fp) {
      if (!questionFingerprint.has(fp)) {
        questionFingerprint.set(fp, []);
      }
      questionFingerprint.get(fp).push(item.id || item.__relPath);
    }
  }

  const duplicateCandidates = [...questionFingerprint.entries()]
    .filter(([, ids]) => ids.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 25);

  const lines = [];
  lines.push("# 問題品質レポート");
  lines.push("");
  lines.push(`- 生成日時: ${new Date().toISOString()}`);
  lines.push(`- 対象件数: ${items.length}`);
  lines.push(`- 解析エラー: ${parseErrors.length}`);
  lines.push("");

  lines.push("## 難易度分布");
  for (const [key, count] of topEntries(difficultyCounts, 10)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("");

  lines.push("## カテゴリ分布");
  for (const [key, count] of topEntries(categoryCounts, 20)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("");

  lines.push("## タグ出現上位");
  for (const [key, count] of topEntries(tagCounts, 30)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("");

  lines.push("## 出典URL上位");
  for (const [key, count] of topEntries(sourceUrlCounts, 20)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("");

  lines.push("## 欠損チェック");
  lines.push(`- explanation 欠損: ${missing.explanation.length}`);
  lines.push(`- source.title 欠損: ${missing.sourceTitle.length}`);
  lines.push(`- source.url 欠損: ${missing.sourceUrl.length}`);
  lines.push(`- tags 欠損: ${missing.tags.length}`);
  lines.push("");

  if (missing.explanation.length) {
    lines.push("### explanation 欠損ID");
    lines.push(`- ${missing.explanation.join(", ")}`);
    lines.push("");
  }
  if (missing.sourceTitle.length) {
    lines.push("### source.title 欠損ID");
    lines.push(`- ${missing.sourceTitle.join(", ")}`);
    lines.push("");
  }
  if (missing.sourceUrl.length) {
    lines.push("### source.url 欠損ID");
    lines.push(`- ${missing.sourceUrl.join(", ")}`);
    lines.push("");
  }
  if (missing.tags.length) {
    lines.push("### tags 欠損ID");
    lines.push(`- ${missing.tags.join(", ")}`);
    lines.push("");
  }

  lines.push("## 重複候補（問題文の正規化一致）");
  if (duplicateCandidates.length === 0) {
    lines.push("- なし");
  } else {
    for (const [, ids] of duplicateCandidates) {
      lines.push(`- ${ids.join(", ")}`);
    }
  }
  lines.push("");

  if (parseErrors.length) {
    lines.push("## 解析エラー詳細");
    for (const error of parseErrors) {
      lines.push(`- ${error}`);
    }
    lines.push("");
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Generated report: ${path.relative(projectRoot, outPath)}`);
}

main().catch((error) => {
  console.error("Failed to generate report:", error.message);
  process.exitCode = 1;
});
