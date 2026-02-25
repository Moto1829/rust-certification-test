import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const itemsDir = path.join(root, "question", "items");
const reportDir = path.join(root, "reports");
const reportPath = path.join(reportDir, "question-report.md");

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[\s　]+/g, " ")
    .trim();

const files = (await readdir(itemsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const items = [];
for (const fileName of files) {
  const fullPath = path.join(itemsDir, fileName);
  const raw = await readFile(fullPath, "utf-8");
  const parsed = JSON.parse(raw);
  items.push(parsed);
}

const total = items.length;
const difficultyCount = {
  beginner: 0,
  intermediate: 0,
  advanced: 0,
  unknown: 0
};

const missingSources = [];
const missingExplanation = [];
const missingTags = [];

const textMap = new Map();
const tagCount = new Map();
const sourceCount = new Map();
const sourceDomainCount = new Map();
const difficultyTagCount = {
  beginner: new Map(),
  intermediate: new Map(),
  advanced: new Map(),
  unknown: new Map()
};

for (const item of items) {
  if (item.difficulty in difficultyCount) {
    difficultyCount[item.difficulty] += 1;
  } else {
    difficultyCount.unknown += 1;
  }

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    missingSources.push(item.id);
  } else {
    for (const source of item.sources) {
      sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1);
      try {
        const domain = new URL(source).hostname;
        sourceDomainCount.set(domain, (sourceDomainCount.get(domain) ?? 0) + 1);
      } catch {
        sourceDomainCount.set("(invalid-url)", (sourceDomainCount.get("(invalid-url)") ?? 0) + 1);
      }
    }
  }

  if (typeof item.explanation !== "string" || item.explanation.trim() === "") {
    missingExplanation.push(item.id);
  }

  if (!Array.isArray(item.tags) || item.tags.length === 0) {
    missingTags.push(item.id);
  } else {
    const bucket =
      item.difficulty === "beginner" || item.difficulty === "intermediate" || item.difficulty === "advanced"
        ? difficultyTagCount[item.difficulty]
        : difficultyTagCount.unknown;

    for (const tag of item.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      bucket.set(tag, (bucket.get(tag) ?? 0) + 1);
    }
  }

  const normalized = normalize(item.question ?? "");
  if (!textMap.has(normalized)) {
    textMap.set(normalized, []);
  }
  textMap.get(normalized).push(item.id);
}

const duplicates = Array.from(textMap.entries())
  .filter(([, ids]) => ids.length > 1)
  .map(([text, ids]) => ({ text, ids }))
  .sort((a, b) => b.ids.length - a.ids.length);

const topTags = Array.from(tagCount.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);

const topSources = Array.from(sourceCount.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const topSourceDomains = Array.from(sourceDomainCount.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const formatIds = (ids) => (ids.length === 0 ? "- なし" : ids.map((id) => `- ${id}`).join("\n"));
const ratio = (count) => (total === 0 ? "0.0" : ((count / total) * 100).toFixed(1));

const duplicateSection =
  duplicates.length === 0
    ? "- 重複候補は見つかりませんでした。"
    : duplicates
        .map((entry) => `- ${entry.ids.join(", ")}\n  - question(normalized): ${entry.text}`)
        .join("\n");

const topTagsSection =
  topTags.length === 0
    ? "- タグがありません。"
    : topTags.map(([tag, count]) => `- ${tag}: ${count}`).join("\n");

const sourceSection =
  topSources.length === 0
    ? "- 出典URLがありません。"
    : topSources.map(([source, count]) => `- ${source}: ${count}`).join("\n");

const sourceDomainSection =
  topSourceDomains.length === 0
    ? "- 出典ドメインがありません。"
    : topSourceDomains.map(([domain, count]) => `- ${domain}: ${count}`).join("\n");

const topTagKeys = topTags.map(([tag]) => tag);
const matrixHeader = "| tag | beginner | intermediate | advanced | total |\n|---|---:|---:|---:|---:|";
const matrixRows =
  topTagKeys.length === 0
    ? "| (none) | 0 | 0 | 0 | 0 |"
    : topTagKeys
        .map((tag) => {
          const beginner = difficultyTagCount.beginner.get(tag) ?? 0;
          const intermediate = difficultyTagCount.intermediate.get(tag) ?? 0;
          const advanced = difficultyTagCount.advanced.get(tag) ?? 0;
          const totalCount = beginner + intermediate + advanced;
          return `| ${tag} | ${beginner} | ${intermediate} | ${advanced} | ${totalCount} |`;
        })
        .join("\n");

const recommendations = [];
const beginnerRatio = total === 0 ? 0 : difficultyCount.beginner / total;
const intermediateRatio = total === 0 ? 0 : difficultyCount.intermediate / total;
const advancedRatio = total === 0 ? 0 : difficultyCount.advanced / total;

if (beginnerRatio < 0.25) {
  recommendations.push("beginner問題が少なめです。導入向け問題の追加を検討してください。");
}
if (advancedRatio < 0.20) {
  recommendations.push("advanced問題が少なめです。応用問題の追加を検討してください。");
}
if (intermediateRatio > 0.50) {
  recommendations.push("intermediateへ偏っています。beginner/advancedへ分散すると学習段階をカバーしやすくなります。");
}
if (topTagKeys.length > 0 && (difficultyTagCount.beginner.get(topTagKeys[0]) ?? 0) === 0) {
  recommendations.push(`最多タグ '${topTagKeys[0]}' は beginner 問題がありません。初級向けの同テーマ追加を検討してください。`);
}

const recommendationSection =
  recommendations.length === 0 ? "- 現状の分布に大きな偏りは見られません。" : recommendations.map((line) => `- ${line}`).join("\n");

const now = new Date().toISOString();

const markdown = `# Question Report\n\nGenerated: ${now}\n\n## Summary\n- total questions: ${total}\n- beginner: ${difficultyCount.beginner} (${ratio(difficultyCount.beginner)}%)\n- intermediate: ${difficultyCount.intermediate} (${ratio(difficultyCount.intermediate)}%)\n- advanced: ${difficultyCount.advanced} (${ratio(difficultyCount.advanced)}%)\n- unknown difficulty: ${difficultyCount.unknown}\n\n## Missing Sources\n${formatIds(missingSources)}\n\n## Missing Explanation\n${formatIds(missingExplanation)}\n\n## Missing Tags\n${formatIds(missingTags)}\n\n## Duplicate Question Candidates\n${duplicateSection}\n\n## Top Tags\n${topTagsSection}\n\n## Sources Count\n${sourceSection}\n\n## Source Domains Count\n${sourceDomainSection}\n\n## Difficulty x Top Tags\n${matrixHeader}\n${matrixRows}\n\n## Recommendations\n${recommendationSection}\n`;

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, markdown, "utf-8");

console.log(`✅ report generated: ${path.relative(root, reportPath)}`);
console.log(`total=${total}, beginner=${difficultyCount.beginner}, intermediate=${difficultyCount.intermediate}, advanced=${difficultyCount.advanced}`);
