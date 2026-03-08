#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const itemsDir = path.join(projectRoot, "question", "items");

const DEFAULT_BY_CATEGORY = {
  ownership: {
    title: "The Rust Programming Language - Understanding Ownership",
    url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html"
  },
  borrowing: {
    title: "The Rust Programming Language - References and Borrowing",
    url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html"
  },
  lifetimes: {
    title: "The Rust Programming Language - Validating References with Lifetimes",
    url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html"
  },
  traits: {
    title: "The Rust Programming Language - Traits",
    url: "https://doc.rust-lang.org/book/ch10-02-traits.html"
  },
  generics: {
    title: "The Rust Programming Language - Generic Data Types",
    url: "https://doc.rust-lang.org/book/ch10-01-syntax.html"
  },
  error_handling: {
    title: "The Rust Programming Language - Error Handling",
    url: "https://doc.rust-lang.org/book/ch09-00-error-handling.html"
  },
  async: {
    title: "Asynchronous Programming in Rust",
    url: "https://rust-lang.github.io/async-book/"
  },
  collections: {
    title: "The Rust Programming Language - Common Collections",
    url: "https://doc.rust-lang.org/book/ch08-00-common-collections.html"
  },
  modules: {
    title: "The Rust Programming Language - Managing Growing Projects with Packages, Crates, and Modules",
    url: "https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html"
  }
};

function inferCategory(filePath, itemId) {
  const relPath = path.relative(itemsDir, filePath).replaceAll(path.sep, "/");
  const fromDir = path.dirname(relPath).split("/")[0];
  if (fromDir && fromDir !== "." && fromDir !== "uncategorized") {
    return fromDir;
  }

  return String(itemId || "")
    .trim()
    .toLowerCase()
    .split("_")[0];
}

function pickSource(filePath, item) {
  const category = inferCategory(filePath, item?.id);
  if (DEFAULT_BY_CATEGORY[category]) {
    return DEFAULT_BY_CATEGORY[category];
  }

  return {
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/"
  };
}

async function walkJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(absPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(absPath);
    }
  }

  return files;
}

async function main() {
  const files = await walkJsonFiles(itemsDir);
  let updated = 0;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const item = JSON.parse(raw);
    const currentUrl = item?.source?.url;

    if (typeof currentUrl === "string" && currentUrl.startsWith("https://doc.rust-lang.org/book/")) {
      const normalized = pickSource(filePath, item);

      if (item.source?.title !== normalized.title || item.source?.url !== normalized.url) {
        item.source = normalized;
        await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
        updated += 1;
      }
    }
  }

  console.log(`Normalized sources in ${updated} files.`);
}

main().catch((error) => {
  console.error("Failed to normalize sources:", error.message);
  process.exitCode = 1;
});
