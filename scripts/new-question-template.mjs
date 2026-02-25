import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , idArg, difficultyArg] = process.argv;

const usage =
  "Usage: npm run new:question -- <id> <difficulty>\n" +
  "  <id>: lowercase letters/numbers/_/- (e.g. ownership_move_002)\n" +
  "  <difficulty>: beginner | intermediate | advanced";

if (!idArg || !difficultyArg) {
  console.error(usage);
  process.exit(1);
}

const id = idArg.trim();
const difficulty = difficultyArg.trim();
const idPattern = /^[a-z0-9_-]+$/;
const difficulties = new Set(["beginner", "intermediate", "advanced"]);

if (!idPattern.test(id)) {
  console.error("❌ invalid id format");
  console.error(usage);
  process.exit(1);
}

if (!difficulties.has(difficulty)) {
  console.error("❌ invalid difficulty");
  console.error(usage);
  process.exit(1);
}

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");
const filePath = path.join(itemsDir, `${id}.json`);

await mkdir(itemsDir, { recursive: true });

try {
  await access(filePath);
  console.error(`❌ file already exists: ${filePath}`);
  process.exit(1);
} catch {
}

const template = {
  id,
  question: "ここに問題文を記入してください",
  choices: [
    { id: "a", text: "選択肢A" },
    { id: "b", text: "選択肢B" },
    { id: "c", text: "選択肢C" },
    { id: "d", text: "選択肢D" }
  ],
  correctChoiceId: "a",
  explanation: "ここに解説を記入してください",
  sources: ["https://example.com"],
  difficulty,
  tags: ["topic"]
};

await writeFile(filePath, `${JSON.stringify(template, null, 2)}\n`, "utf-8");

console.log(`✅ created: ${path.relative(projectRoot, filePath)}`);
console.log("next: npm run sync:index && npm run validate:questions");
