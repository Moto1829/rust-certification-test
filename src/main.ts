type Difficulty = "beginner" | "intermediate" | "advanced";
type DifficultyFilter = Difficulty | "all";
type CategoryFilter = string | "all";

const CATEGORY_LABELS: Record<string, string> = {
  async: "非同期",
  best_practices: "ベストプラクティス",
  borrow: "借用",
  concurrency: "並行処理",
  enum: "列挙型",
  error_handling: "エラーハンドリング",
  ffi: "FFI",
  function: "関数",
  functions_control: "関数・制御構文",
  iterator: "イテレータ",
  macro: "マクロ",
  modules: "モジュール",
  ownership: "所有権",
  pattern: "パターン",
  rc: "Rc/RefCell",
  shadowing: "シャドーイング",
  slice: "スライス",
  struct: "構造体",
  thread: "スレッド",
  tooling_testing: "ツール・テスト",
  traits_generics: "トレイト・ジェネリクス",
  types_collections: "型・コレクション",
  uncategorized: "未分類",
  unsafe: "unsafe",
  vector: "ベクタ",
  while: "while"
};

type Choice = {
  id: string;
  text: string;
};

type QuizItem = {
  id: string;
  category: string;
  question: string;
  choices: Choice[];
  correctChoiceId: string;
  explanation?: string;
  sources: string[];
  difficulty: Difficulty;
  tags?: string[];
};

type AnswerRecord = {
  questionId: string;
  selectedChoiceId: string;
  correctChoiceId: string;
  isCorrect: boolean;
};

const appWindow = window as Window & { __QUIZ_DATA__?: QuizItem[] };

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderInlineText = (escapedText: string): string => {
  const inlineCodePattern = /`([^`]+?)`/g;
  return escapedText.replace(inlineCodePattern, (_full, codeBody) => {
    return `<code class="inline-code">${codeBody}</code>`;
  });
};

const renderRichText = (input: string): string => {
  const escaped = escapeHtml(input);
  const codePattern = /```([\s\S]*?)```/g;
  const chunks: string[] = [];
  let lastIndex = 0;
  let match = codePattern.exec(escaped);

  while (match) {
    const [full, codeBody] = match;
    const start = match.index;
    const plain = renderInlineText(escaped.slice(lastIndex, start)).replace(/\n/g, "<br>");
    chunks.push(plain);
    chunks.push(`<pre class="code-block"><code>${codeBody.trim()}</code></pre>`);
    lastIndex = start + full.length;
    match = codePattern.exec(escaped);
  }

  chunks.push(renderInlineText(escaped.slice(lastIndex)).replace(/\n/g, "<br>"));
  return chunks.join("");
};

const setupSection = document.getElementById("setup-section") as HTMLElement;
const quizSection = document.getElementById("quiz-section") as HTMLElement;
const resultSection = document.getElementById("result-section") as HTMLElement;

const categorySelect = document.getElementById("category") as HTMLSelectElement;
const difficultySelect = document.getElementById("difficulty") as HTMLSelectElement;
const questionCountSelect = document.getElementById("question-count") as HTMLSelectElement;
const setupMessage = document.getElementById("setup-message") as HTMLParagraphElement;
const startButton = document.getElementById("start-btn") as HTMLButtonElement;

const progressElement = document.getElementById("progress") as HTMLParagraphElement;
const scorePreviewElement = document.getElementById("score-preview") as HTMLParagraphElement;
const questionTextElement = document.getElementById("question-text") as HTMLHeadingElement;
const choicesElement = document.getElementById("choices") as HTMLDivElement;
const feedbackElement = document.getElementById("feedback") as HTMLDivElement;
const nextButton = document.getElementById("next-btn") as HTMLButtonElement;
const quitButton = document.getElementById("quit-btn") as HTMLButtonElement;

const resultSummary = document.getElementById("result-summary") as HTMLParagraphElement;
const reviewList = document.getElementById("review-list") as HTMLUListElement;
const backToTopButton = document.getElementById("back-to-top-btn") as HTMLButtonElement;

let allQuestions: QuizItem[] = [];
let currentQuestions: QuizItem[] = [];
let answers: AnswerRecord[] = [];
let currentIndex = 0;

const shuffle = <T>(list: T[]): T[] => {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const loadQuestions = async (): Promise<QuizItem[]> => {
  if (Array.isArray(appWindow.__QUIZ_DATA__)) {
    return appWindow.__QUIZ_DATA__;
  }

  throw new Error("question-data.js is missing");
};

const resolveChoiceText = (question: QuizItem, choiceId: string): string => {
  const choice = question.choices.find((item) => item.id === choiceId);
  return choice ? choice.text : "(未選択)";
};

const renderChoiceText = (text: string): string => renderInlineText(escapeHtml(text));

const renderSetupMessage = (message: string): void => {
  setupMessage.textContent = message;
};

const renderCategoryOptions = (): void => {
  const categorySet = new Set(allQuestions.map((question) => question.category).filter(Boolean));
  const categories = [...categorySet].sort((left, right) => left.localeCompare(right));
  const previous = categorySelect.value || "all";

  categorySelect.innerHTML = [
    '<option value="all">すべて</option>',
    ...categories.map((category) => `<option value="${category}">${CATEGORY_LABELS[category] ?? category}</option>`)
  ].join("");

  if (categories.includes(previous)) {
    categorySelect.value = previous;
    return;
  }

  categorySelect.value = "all";
};

const renderProgress = (): void => {
  progressElement.textContent = `問題 ${currentIndex + 1} / ${currentQuestions.length}`;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  scorePreviewElement.textContent = `現在の正答数: ${correctCount}`;
};

const renderFeedback = (question: QuizItem, selectedChoiceId: string): void => {
  const isCorrect = selectedChoiceId === question.correctChoiceId;
  const status = isCorrect ? "正解です" : "不正解です";
  const correctText = resolveChoiceText(question, question.correctChoiceId);
  const explanation = renderRichText(question.explanation ?? "解説はありません。");
  const sources = question.sources
    .map((url) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>`)
    .join("");

  feedbackElement.innerHTML = `
    <p><strong>${status}</strong></p>
    <p>正答: ${renderChoiceText(correctText)}</p>
    <p>${explanation}</p>
    <ul>${sources}</ul>
  `;
};

const lockChoices = (question: QuizItem, selectedChoiceId: string): void => {
  const buttons = choicesElement.querySelectorAll("button");
  buttons.forEach((button) => {
    const choiceId = button.getAttribute("data-choice-id");
    button.setAttribute("disabled", "true");
    button.classList.remove("correct", "wrong");

    if (choiceId === question.correctChoiceId) {
      button.classList.add("correct");
      return;
    }

    if (choiceId === selectedChoiceId) {
      button.classList.add("wrong");
    }
  });
};

const handleSelectChoice = (choiceId: string): void => {
  const question = currentQuestions[currentIndex];
  const isCorrect = choiceId === question.correctChoiceId;

  answers.push({
    questionId: question.id,
    selectedChoiceId: choiceId,
    correctChoiceId: question.correctChoiceId,
    isCorrect
  });

  lockChoices(question, choiceId);
  renderFeedback(question, choiceId);
  nextButton.classList.remove("hidden");
  renderProgress();
};

const renderQuestion = (): void => {
  const question = currentQuestions[currentIndex];
  questionTextElement.innerHTML = renderRichText(question.question);
  feedbackElement.innerHTML = "";
  nextButton.classList.add("hidden");

  const choicesHtml = question.choices
    .map(
      (choice) =>
        `<button type="button" class="choice-btn" data-choice-id="${choice.id}">${choice.id.toUpperCase()}. ${renderChoiceText(choice.text)}</button>`
    )
    .join("");

  choicesElement.innerHTML = choicesHtml;

  const buttons = choicesElement.querySelectorAll("button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const choiceId = button.getAttribute("data-choice-id");
      if (!choiceId) {
        return;
      }
      handleSelectChoice(choiceId);
    });
  });

  renderProgress();
};

const renderReview = (): void => {
  const itemsHtml = currentQuestions
    .map((question, index) => {
      const answer = answers[index];
      const selectedText = resolveChoiceText(question, answer?.selectedChoiceId ?? "");
      const correctText = resolveChoiceText(question, question.correctChoiceId);
      const mark = answer?.isCorrect ? "✅" : "❌";
      const sources = question.sources
        .map((url) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>`)
        .join("");

      return `
        <li class="review-item">
          <p><strong>${mark} Q${index + 1}. ${renderRichText(question.question)}</strong></p>
          <p>あなたの回答: ${renderChoiceText(selectedText)}</p>
          <p>正答: ${renderChoiceText(correctText)}</p>
          <p>${renderRichText(question.explanation ?? "解説はありません。")}</p>
          <ul>${sources}</ul>
        </li>
      `;
    })
    .join("");

  reviewList.innerHTML = itemsHtml;
};

const finishQuiz = (): void => {
  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const total = currentQuestions.length;
  const rate = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;

  resultSummary.textContent = `正答数: ${correctCount} / ${total}（正答率: ${rate}%）`;
  renderReview();
};

const backToTop = (message = ""): void => {
  currentQuestions = [];
  answers = [];
  currentIndex = 0;
  progressElement.textContent = "";
  scorePreviewElement.textContent = "";
  questionTextElement.innerHTML = "";
  choicesElement.innerHTML = "";
  feedbackElement.innerHTML = "";
  nextButton.classList.add("hidden");

  quizSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  setupSection.classList.remove("hidden");
  renderSetupMessage(message);
};

const quitQuiz = (): void => {
  backToTop("クイズを中断しました。");
};

const nextQuestion = (): void => {
  if (answers.length <= currentIndex) {
    return;
  }

  if (currentIndex >= currentQuestions.length - 1) {
    finishQuiz();
    return;
  }

  currentIndex += 1;
  renderQuestion();
};

const selectQuestions = (category: CategoryFilter, difficulty: DifficultyFilter, count: number): QuizItem[] => {
  const filtered =
    category === "all"
      ? allQuestions
      : allQuestions.filter((question) => question.category === category);

  const filteredByDifficulty =
    difficulty === "all"
      ? filtered
      : filtered.filter((question) => question.difficulty === difficulty);

  return shuffle(filteredByDifficulty).slice(0, count);
};

const startQuiz = async (): Promise<void> => {
  try {
    renderSetupMessage("");
    startButton.disabled = true;

    if (allQuestions.length === 0) {
      allQuestions = await loadQuestions();
      renderCategoryOptions();
    }

    const category = categorySelect.value as CategoryFilter;
    const difficulty = difficultySelect.value as DifficultyFilter;
    const count = Number(questionCountSelect.value);
    const selected = selectQuestions(category, difficulty, count);

    if (selected.length === 0) {
      renderSetupMessage("選択したカテゴリ・難易度に該当する問題がありません。条件を変更してください。");
      return;
    }

    currentQuestions = selected;
    answers = [];
    currentIndex = 0;

    setupSection.classList.add("hidden");
    resultSection.classList.add("hidden");
    quizSection.classList.remove("hidden");

    renderQuestion();
  } catch {
    renderSetupMessage("問題データの読み込みに失敗しました。時間をおいて再試行してください。");
  } finally {
    startButton.disabled = false;
  }
};

const initializeSetup = async (): Promise<void> => {
  try {
    if (allQuestions.length === 0) {
      allQuestions = await loadQuestions();
    }
    renderCategoryOptions();
  } catch {
    renderSetupMessage("問題データの読み込みに失敗しました。時間をおいて再試行してください。");
  }
};

startButton.addEventListener("click", () => {
  void startQuiz();
});

nextButton.addEventListener("click", () => {
  nextQuestion();
});

backToTopButton.addEventListener("click", () => {
  backToTop();
});

quitButton.addEventListener("click", () => {
  quitQuiz();
});

void initializeSetup();
