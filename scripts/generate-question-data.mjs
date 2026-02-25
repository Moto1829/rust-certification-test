import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const indexPath = path.join(projectRoot, "question", "index.json");
const outputPath = path.join(projectRoot, "docs", "question-data.js");

const indexText = await readFile(indexPath, "utf-8");
const indexData = JSON.parse(indexText);

const questions = await Promise.all(
  indexData.items.map(async (item) => {
    const itemPath = path.join(projectRoot, item.path);
    const itemText = await readFile(itemPath, "utf-8");
    return JSON.parse(itemText);
  })
);

const output = `window.__QUIZ_DATA__ = ${JSON.stringify(questions, null, 2)};\n`;
await writeFile(outputPath, output, "utf-8");
console.log(`generated: ${outputPath}`);
