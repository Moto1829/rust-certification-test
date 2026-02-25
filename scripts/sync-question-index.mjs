import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");
const indexPath = path.join(projectRoot, "question", "index.json");

const entries = await readdir(itemsDir, { withFileTypes: true });
const itemFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

const items = [];
for (const fileName of itemFiles) {
  const fullPath = path.join(itemsDir, fileName);
  const text = await readFile(fullPath, "utf-8");
  const quizItem = JSON.parse(text);
  if (typeof quizItem.id !== "string" || quizItem.id.length === 0) {
    throw new Error(`invalid quiz id in ${fileName}`);
  }

  items.push({
    id: quizItem.id,
    path: `question/items/${fileName}`
  });
}

const indexData = {
  version: 1,
  items
};

await writeFile(indexPath, `${JSON.stringify(indexData, null, 2)}\n`, "utf-8");
console.log(`synced: ${indexPath} (${items.length} items)`);
