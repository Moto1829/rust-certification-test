import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");
const indexPath = path.join(projectRoot, "question", "index.json");

const idPattern = /^[a-z0-9_-]+$/;
const allowedDifficulties = new Set(["beginner", "intermediate", "advanced"]);

const fail = (messages) => {
  for (const message of messages) {
    console.error(`❌ ${message}`);
  }
  process.exit(1);
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const validateChoice = (choice, fileName, index, errors) => {
  if (typeof choice !== "object" || choice === null || Array.isArray(choice)) {
    errors.push(`${fileName}: choices[${index}] must be an object`);
    return;
  }

  if (!isNonEmptyString(choice.id)) {
    errors.push(`${fileName}: choices[${index}].id must be a non-empty string`);
  }

  if (!isNonEmptyString(choice.text)) {
    errors.push(`${fileName}: choices[${index}].text must be a non-empty string`);
  }
};

const validateItem = (item, fileName) => {
  const errors = [];

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return [`${fileName}: root must be an object`];
  }

  if (!isNonEmptyString(item.id)) {
    errors.push(`${fileName}: id must be a non-empty string`);
  } else {
    if (!idPattern.test(item.id)) {
      errors.push(`${fileName}: id format must match ${idPattern}`);
    }
    if (`${item.id}.json` !== fileName) {
      errors.push(`${fileName}: id and file name must match (${item.id}.json expected)`);
    }
  }

  if (!isNonEmptyString(item.question)) {
    errors.push(`${fileName}: question must be a non-empty string`);
  }

  if (!Array.isArray(item.choices)) {
    errors.push(`${fileName}: choices must be an array`);
  } else {
    if (item.choices.length < 2 || item.choices.length > 6) {
      errors.push(`${fileName}: choices length must be between 2 and 6`);
    }

    const seenChoiceIds = new Set();
    item.choices.forEach((choice, index) => {
      validateChoice(choice, fileName, index, errors);
      if (choice && typeof choice.id === "string") {
        if (seenChoiceIds.has(choice.id)) {
          errors.push(`${fileName}: duplicate choice id '${choice.id}'`);
        }
        seenChoiceIds.add(choice.id);
      }
    });

    if (isNonEmptyString(item.correctChoiceId) && !seenChoiceIds.has(item.correctChoiceId)) {
      errors.push(`${fileName}: correctChoiceId '${item.correctChoiceId}' not found in choices`);
    }
  }

  if (!isNonEmptyString(item.correctChoiceId)) {
    errors.push(`${fileName}: correctChoiceId must be a non-empty string`);
  }

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    errors.push(`${fileName}: sources must be a non-empty array`);
  } else {
    item.sources.forEach((source, index) => {
      if (!isNonEmptyString(source) || !/^https?:\/\//.test(source)) {
        errors.push(`${fileName}: sources[${index}] must be an http/https URL`);
      }
    });
  }

  if (!isNonEmptyString(item.difficulty) || !allowedDifficulties.has(item.difficulty)) {
    errors.push(
      `${fileName}: difficulty must be one of ${Array.from(allowedDifficulties).join(", ")}`
    );
  }

  if (item.tags !== undefined) {
    if (!Array.isArray(item.tags)) {
      errors.push(`${fileName}: tags must be an array when provided`);
    } else {
      const uniqueTags = new Set();
      item.tags.forEach((tag, index) => {
        if (!isNonEmptyString(tag)) {
          errors.push(`${fileName}: tags[${index}] must be a non-empty string`);
        }
        if (uniqueTags.has(tag)) {
          errors.push(`${fileName}: tags contains duplicate '${tag}'`);
        }
        uniqueTags.add(tag);
      });
    }
  }

  if (item.explanation !== undefined && typeof item.explanation !== "string") {
    errors.push(`${fileName}: explanation must be a string when provided`);
  }

  return errors;
};

const listFiles = await readdir(itemsDir, { withFileTypes: true });
const jsonFiles = listFiles
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (jsonFiles.length === 0) {
  fail(["question/items has no json files"]);
}

const allErrors = [];
const idSet = new Set();

for (const fileName of jsonFiles) {
  const fullPath = path.join(itemsDir, fileName);
  try {
    const text = await readFile(fullPath, "utf-8");
    const item = JSON.parse(text);

    const itemErrors = validateItem(item, fileName);
    allErrors.push(...itemErrors);

    if (item && typeof item.id === "string") {
      if (idSet.has(item.id)) {
        allErrors.push(`${fileName}: duplicate question id '${item.id}' in dataset`);
      }
      idSet.add(item.id);
    }
  } catch (error) {
    allErrors.push(`${fileName}: failed to parse JSON (${error.message})`);
  }
}

try {
  const indexText = await readFile(indexPath, "utf-8");
  const indexData = JSON.parse(indexText);

  if (typeof indexData !== "object" || indexData === null || Array.isArray(indexData)) {
    allErrors.push("question/index.json: root must be an object");
  } else if (!Array.isArray(indexData.items)) {
    allErrors.push("question/index.json: items must be an array");
  } else {
    const expected = jsonFiles.map((fileName) => ({
      id: fileName.replace(/\.json$/, ""),
      path: `question/items/${fileName}`
    }));

    const actual = indexData.items;
    if (actual.length !== expected.length) {
      allErrors.push(
        `question/index.json: item count mismatch (expected ${expected.length}, actual ${actual.length})`
      );
    }

    const compareLength = Math.min(actual.length, expected.length);
    for (let index = 0; index < compareLength; index += 1) {
      const actualItem = actual[index];
      const expectedItem = expected[index];
      if (!actualItem || actualItem.id !== expectedItem.id || actualItem.path !== expectedItem.path) {
        allErrors.push(
          `question/index.json: items[${index}] mismatch (expected ${expectedItem.id} -> ${expectedItem.path})`
        );
      }
    }
  }
} catch (error) {
  allErrors.push(`question/index.json: failed to parse JSON (${error.message})`);
}

if (allErrors.length > 0) {
  fail(allErrors);
}

console.log(`✅ question validation passed (${jsonFiles.length} files)`);
