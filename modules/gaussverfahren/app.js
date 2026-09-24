const stage = document.getElementById("gaussStage");
const statusLine = document.getElementById("statusLine");
const restartButton = document.getElementById("restartButton");
const backButton = document.getElementById("backButton");
const equationViewButton = document.getElementById("equationViewButton");
const matrixViewButton = document.getElementById("matrixViewButton");

const ROWS = 3;
const COLS = 4;
const VARIABLE_NAMES = ["x₁", "x₂", "x₃"];
const ROMAN = ["I", "II", "III"];

// ---------------------------------------------------------------------------
// Exakte rationale Zahlen
// ---------------------------------------------------------------------------

class Fraction {
  constructor(numerator, denominator = 1n) {
    let n = BigInt(numerator);
    let d = BigInt(denominator);
    if (d === 0n) throw new Error("Nenner darf nicht 0 sein.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBigInt(absBigInt(n), d);
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }

  static zero() { return new Fraction(0n); }
  static one() { return new Fraction(1n); }

  static parse(raw) {
    const text = String(raw).trim().replace(",", ".");
    if (!text) throw new Error("Bitte alle Felder ausfüllen.");

    if (text.includes("/")) {
      const parts = text.split("/");
      if (parts.length !== 2) throw new Error(`Ungültige Zahl: ${raw}`);
      const a = Fraction.parse(parts[0]);
      const b = Fraction.parse(parts[1]);
      if (b.isZero()) throw new Error("Nenner darf nicht 0 sein.");
      return a.div(b);
    }

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
      throw new Error(`Ungültige Zahl: ${raw}`);
    }

    const sign = text.startsWith("-") ? -1n : 1n;
    const unsigned = text.replace(/^[+-]/, "");
    if (!unsigned.includes(".")) return new Fraction(sign * BigInt(unsigned));

    const [integerPartRaw, decimalPartRaw] = unsigned.split(".");
    const integerPart = integerPartRaw || "0";
    const decimalPart = decimalPartRaw || "0";
    const denominator = 10n ** BigInt(decimalPart.length);
    const numerator = BigInt(integerPart) * denominator + BigInt(decimalPart);
    return new Fraction(sign * numerator, denominator);
  }

  add(other) { return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d); }
  sub(other) { return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d); }
  mul(other) { return new Fraction(this.n * other.n, this.d * other.d); }
  div(other) {
    if (other.isZero()) throw new Error("Division durch 0.");
    return new Fraction(this.n * other.d, this.d * other.n);
  }
  neg() { return new Fraction(-this.n, this.d); }
  abs() { return new Fraction(absBigInt(this.n), this.d); }
  reciprocal() {
    if (this.isZero()) throw new Error("0 besitzt keinen Kehrwert.");
    return new Fraction(this.d * (this.n < 0n ? -1n : 1n), absBigInt(this.n));
  }
  eq(other) { return this.n === other.n && this.d === other.d; }
  isZero() { return this.n === 0n; }
  isOne() { return this.n === this.d; }
  isMinusOne() { return this.n === -this.d; }
  sign() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
  toString() {
    const minus = this.n < 0n ? "−" : "";
    const absN = absBigInt(this.n);
    return this.d === 1n ? `${minus}${absN}` : `${minus}${absN}/${this.d}`;
  }
}

function absBigInt(x) { return x < 0n ? -x : x; }

function gcdBigInt(a, b) {
  let x = a;
  let y = b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

const EXAMPLE_INPUT = [
  ["0", "-1", "1", "-1"],
  ["1", "-1", "-1", "-4"],
  ["1", "1", "1", "6"]
];

let inputValues = EXAMPLE_INPUT.map(row => [...row]);
let viewMode = "equation";
let screen = "input";
let matrix = null;
let strategy = null;
let currentPlan = null;
let currentOptions = [];
let feedbackOption = null;
let resultState = null;
let stepNumber = 0;
let operationHistory = [];
let operationCount = 0;
let stateHistory = [];
let inputError = "";

function resetState() {
  inputValues = EXAMPLE_INPUT.map(row => [...row]);
  screen = "input";
  matrix = null;
  strategy = null;
  currentPlan = null;
  currentOptions = [];
  feedbackOption = null;
  resultState = null;
  stepNumber = 0;
  operationHistory = [];
  operationCount = 0;
  stateHistory = [];
  inputError = "";
  render();
}

// ---------------------------------------------------------------------------
// Matrixoperationen
// ---------------------------------------------------------------------------

function cloneMatrix(source) {
  return source.map(row => row.slice());
}

function swapRows(target, r1, r2) {
  const temp = target[r1];
  target[r1] = target[r2];
  target[r2] = temp;
}

function scaleRow(target, row, factor) {
  target[row] = target[row].map(value => value.mul(factor));
}

function addRowMultiple(target, sourceRow, targetRow, factor) {
  target[targetRow] = target[targetRow].map((value, c) =>
    value.add(target[sourceRow][c].mul(factor))
  );
}

function applyOperations(target, operations) {
  operations.forEach(operation => {
    if (operation.kind === "swap") {
      swapRows(target, operation.r1, operation.r2);
    } else if (operation.kind === "scale") {
      scaleRow(target, operation.row, operation.factor);
    } else if (operation.kind === "add") {
      addRowMultiple(target, operation.source, operation.target, operation.factor);
    }
  });
}

// Zähler für skalare Rechenoperationen auf der erweiterten Matrix.
// Bei einer Zeilenaddition werden pro Eintrag eine Multiplikation und
// eine Addition/Subtraktion gezählt; bei einer Skalierung eine Multiplikation.
// Ein Zeilentausch enthält keine arithmetische Rechenoperation.
function arithmeticCost(operations) {
  return operations.reduce((total, operation) => {
    if (operation.kind === "scale") return total + COLS;
    if (operation.kind === "add") return total + 2 * COLS;
    return total;
  }, 0);
}

function snapshotState() {
  return {
    matrix: cloneMatrix(matrix),
    strategy: { ...strategy },
    currentPlan,
    currentOptions,
    resultState,
    stepNumber,
    operationHistory: operationHistory.slice(),
    operationCount,
    screen
  };
}

function restoreState(snapshot) {
  matrix = cloneMatrix(snapshot.matrix);
  strategy = { ...snapshot.strategy };
  currentPlan = snapshot.currentPlan;
  currentOptions = snapshot.currentOptions;
  resultState = snapshot.resultState;
  stepNumber = snapshot.stepNumber;
  operationHistory = snapshot.operationHistory.slice();
  operationCount = snapshot.operationCount;
  feedbackOption = null;
  screen = snapshot.screen;
}

function returnToInput() {
  screen = "input";
  matrix = null;
  strategy = null;
  currentPlan = null;
  currentOptions = [];
  feedbackOption = null;
  resultState = null;
  stepNumber = 0;
  operationHistory = [];
  operationCount = 0;
  stateHistory = [];
  inputError = "";
  render();
}

function goBack() {
  if (screen === "input") return;

  // Aus einem Hinweis geht es zunächst zur unveränderten Auswahl zurück.
  if (screen === "feedback") {
    feedbackOption = null;
    screen = "quiz";
    render();
    return;
  }

  if (stateHistory.length) {
    restoreState(stateHistory.pop());
    render();
    return;
  }

  // Vor dem ersten Rechenschritt führt Zurück wieder zur Koeffizienteneingabe.
  returnToInput();
}

function findContradictionRow(target) {
  for (let r = 0; r < ROWS; r += 1) {
    const allZero = target[r].slice(0, 3).every(value => value.isZero());
    if (allZero && !target[r][3].isZero()) return r;
  }
  return -1;
}

function coefficientRank(target) {
  return target.filter(row => row.slice(0, 3).some(value => !value.isZero())).length;
}

// ---------------------------------------------------------------------------
// Gauß-Strategie: jeweils didaktisch günstigster nächster Schritt
// ---------------------------------------------------------------------------

function createStrategy() {
  return {
    phase: "forward",
    pivotRow: 0,
    pivotCol: 0,
    backRow: 2
  };
}

function choosePivotRow(target, row, col) {
  const current = target[row][col];

  // Eine vorhandene ±1 bleibt stehen: kein unnötiger Zeilentausch.
  if (current.isOne() || current.isMinusOne()) return row;

  // Sonst bevorzugen wir eine +1, danach eine -1 in einer tieferen Zeile.
  for (let r = row + 1; r < ROWS; r += 1) {
    if (target[r][col].isOne()) return r;
  }
  for (let r = row + 1; r < ROWS; r += 1) {
    if (target[r][col].isMinusOne()) return r;
  }

  // Ist der aktuelle Eintrag bereits ungleich 0, vermeiden wir einen unnötigen Tausch.
  if (!current.isZero()) return row;

  // Andernfalls nehmen wir die betragsmäßig einfachste verfügbare Zeile.
  const candidates = [];
  for (let r = row + 1; r < ROWS; r += 1) {
    if (!target[r][col].isZero()) candidates.push(r);
  }
  if (!candidates.length) return -1;

  candidates.sort((a, b) => compareFractionAbs(target[a][col], target[b][col]));
  return candidates[0];
}

function compareFractionAbs(a, b) {
  const left = absBigInt(a.n) * b.d;
  const right = absBigInt(b.n) * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function nextPlan() {
  const contradiction = findContradictionRow(matrix);
  if (contradiction >= 0) {
    finishWith({ type: "none", contradictionRow: contradiction });
    return null;
  }

  if (strategy.phase === "forward") {
    while (strategy.pivotRow < ROWS && strategy.pivotCol < 3) {
      const r = strategy.pivotRow;
      const c = strategy.pivotCol;

      const anyNonZero = Array.from({ length: ROWS - r }, (_, i) => r + i)
        .some(row => !matrix[row][c].isZero());

      if (!anyNonZero) {
        strategy.pivotCol += 1;
        continue;
      }

      const candidate = choosePivotRow(matrix, r, c);
      if (candidate !== r) return makeSwapPlan(r, c, candidate);

      const pivot = matrix[r][c];
      if (!pivot.isOne()) return makeScalePlan(r, c, pivot);

      const targets = [];
      for (let row = r + 1; row < ROWS; row += 1) {
        if (!matrix[row][c].isZero()) targets.push(row);
      }
      if (targets.length) return makeEliminationPlan(r, c, targets, "below");

      strategy.pivotRow += 1;
      strategy.pivotCol += 1;
    }

    const contradictionAfterForward = findContradictionRow(matrix);
    if (contradictionAfterForward >= 0) {
      finishWith({ type: "none", contradictionRow: contradictionAfterForward });
      return null;
    }

    if (coefficientRank(matrix) < 3) {
      finishWith({ type: "infinite" });
      return null;
    }

    strategy.phase = "backward";
    strategy.backRow = 2;
  }

  while (strategy.phase === "backward" && strategy.backRow >= 0) {
    const r = strategy.backRow;
    const c = r;
    const targets = [];
    for (let row = 0; row < r; row += 1) {
      if (!matrix[row][c].isZero()) targets.push(row);
    }

    if (targets.length) return makeEliminationPlan(r, c, targets, "above");
    strategy.backRow -= 1;
  }

  finishWith({ type: "unique" });
  return null;
}

function makeSwapPlan(pivotRow, pivotCol, candidateRow) {
  const value = matrix[candidateRow][pivotCol];
  const operations = [{ kind: "swap", r1: pivotRow, r2: candidateRow }];
  const correctLabel = `${ROMAN[pivotRow]} ↔ ${ROMAN[candidateRow]}`;

  return {
    type: "swap",
    phase: "Vorwärtselimination",
    goal: `Pivot in Spalte ${pivotCol + 1} festlegen`,
    prompt: "Welche Zeilenoperation ist hier am günstigsten?",
    correctLabel,
    operations,
    pivotCell: cellKey(pivotRow, pivotCol),
    targetCells: [cellKey(candidateRow, pivotCol)],
    explanation: `An der nächsten Pivotposition benötigen wir einen möglichst einfachen Eintrag ungleich 0. Durch ${correctLabel} gelangt ${value.toString()} an diese Position.`,
    wrongExplanation: `Entscheidend ist jetzt die Pivotposition in Zeile ${pivotRow + 1}, Spalte ${pivotCol + 1}. Der beste Schritt bringt dort einen einfachen Eintrag ungleich 0 hin; ${correctLabel} erledigt das unmittelbar.`,
    distractors: makeSwapDistractors(pivotRow, pivotCol, candidateRow)
  };
}

function makeSwapDistractors(pivotRow, pivotCol, candidateRow) {
  const alternatives = [];

  alternatives.push({
    label: `${ROMAN[pivotRow]} ← 2 · ${ROMAN[pivotRow]}`,
    operations: [{ kind: "scale", row: pivotRow, factor: new Fraction(2n) }]
  });

  const untouchedRows = [0, 1, 2].filter(r => r !== pivotRow);
  alternatives.push({
    label: `${ROMAN[untouchedRows[0]]} ↔ ${ROMAN[untouchedRows[1]]}`,
    operations: [{ kind: "swap", r1: untouchedRows[0], r2: untouchedRows[1] }]
  });

  return alternatives.slice(0, 2);
}

function makeScalePlan(pivotRow, pivotCol, pivot) {
  const factor = pivot.reciprocal();
  const correctLabel = `${ROMAN[pivotRow]} ← ${factor.toString()} · ${ROMAN[pivotRow]}`;
  const distractorFactor = new Fraction(2n);
  const untouchedRows = [0, 1, 2].filter(r => r !== pivotRow);

  return {
    type: "scale",
    phase: "Vorwärtselimination",
    goal: `Pivot in Spalte ${pivotCol + 1} auf 1 normieren`,
    prompt: "Welcher Schritt erzeugt an der Pivotposition eine 1?",
    correctLabel,
    operations: [{ kind: "scale", row: pivotRow, factor }],
    pivotCell: cellKey(pivotRow, pivotCol),
    targetCells: [cellKey(pivotRow, pivotCol)],
    explanation: `Der aktuelle Pivot ist ${pivot.toString()}. Die Multiplikation mit dem Kehrwert ${factor.toString()} macht daraus genau 1.`,
    wrongExplanation: `Für die weitere Elimination ist ein Pivot 1 besonders übersichtlich. Aus ${pivot.toString()} wird genau dann 1, wenn die gesamte Zeile mit ${factor.toString()} multipliziert wird.`,
    distractors: [
      {
        label: `${ROMAN[pivotRow]} ← ${distractorFactor.toString()} · ${ROMAN[pivotRow]}`,
        operations: [{ kind: "scale", row: pivotRow, factor: distractorFactor }]
      },
      {
        label: `${ROMAN[untouchedRows[0]]} ↔ ${ROMAN[untouchedRows[1]]}`,
        operations: [{ kind: "swap", r1: untouchedRows[0], r2: untouchedRows[1] }]
      }
    ]
  };
}

function makeEliminationPlan(pivotRow, pivotCol, targetRows, direction) {
  const operations = targetRows.map(targetRow => ({
    kind: "add",
    source: pivotRow,
    target: targetRow,
    factor: matrix[targetRow][pivotCol].neg()
  }));

  const correctLabel = formatCombinedOperations(operations);
  const wrongSignOps = targetRows.map(targetRow => ({
    kind: "add",
    source: pivotRow,
    target: targetRow,
    factor: matrix[targetRow][pivotCol]
  }));

  const used = new Set([
    operationSignature(operations),
    operationSignature(wrongSignOps)
  ]);
  let offset = 1n;
  let offsetOps;
  do {
    offsetOps = targetRows.map(targetRow => ({
      kind: "add",
      source: pivotRow,
      target: targetRow,
      factor: matrix[targetRow][pivotCol].neg().add(new Fraction(offset))
    }));
    offset += 1n;
  } while (used.has(operationSignature(offsetOps)));

  const targetValues = targetRows.map(r => matrix[r][pivotCol].toString()).join(", ");
  const where = direction === "below" ? "unterhalb" : "oberhalb";
  const phase = direction === "below" ? "Vorwärtselimination" : "Rückwärtselimination";

  return {
    type: direction === "below" ? "eliminate-below" : "eliminate-above",
    phase,
    goal: `Einträge ${where} des Pivots in Spalte ${pivotCol + 1} zu 0 machen`,
    prompt: "Welche Operation beseitigt die markierten Einträge in einem Schritt?",
    correctLabel,
    operations,
    pivotCell: cellKey(pivotRow, pivotCol),
    targetCells: targetRows.map(r => cellKey(r, pivotCol)),
    explanation: `Der Pivot ist bereits 1. Die markierten Einträge (${targetValues}) verschwinden, wenn jeweils das passende Vielfache der Pivotzeile addiert wird.`,
    wrongExplanation: `Der Pivot ist 1. Das aktuelle Ziel ist deshalb, die markierten Einträge ${where} dieses Pivots exakt zu 0 zu machen. ${correctLabel} wählt dafür jeweils den Gegenwert des betreffenden Eintrags.`,
    distractors: [
      { label: formatCombinedOperations(wrongSignOps), operations: wrongSignOps },
      { label: formatCombinedOperations(offsetOps), operations: offsetOps }
    ]
  };
}

function operationSignature(operations) {
  return operations.map(operation => {
    if (operation.kind === "add") {
      return `a:${operation.source}:${operation.target}:${operation.factor.n}/${operation.factor.d}`;
    }
    if (operation.kind === "scale") {
      return `s:${operation.row}:${operation.factor.n}/${operation.factor.d}`;
    }
    return `w:${operation.r1}:${operation.r2}`;
  }).join("|");
}

function formatCombinedOperations(operations) {
  return operations.map(operation => {
    if (operation.kind !== "add") return "";
    const factor = operation.factor;
    const source = ROMAN[operation.source];
    const target = ROMAN[operation.target];

    let sourceTerm;
    if (factor.isOne()) sourceTerm = source;
    else if (factor.isMinusOne()) sourceTerm = `−${source}`;
    else sourceTerm = `${factor.toString()} · ${source}`;

    // Zielzeile bewusst links: III ← 2 · II + III.
    return `${target} ← ${sourceTerm} + ${target}`;
  }).join("; ");
}

function cellKey(row, col) {
  return `${row}-${col}`;
}

function finishWith(result) {
  screen = "result";
  resultState = result;
  currentPlan = null;
  currentOptions = [];
}

// ---------------------------------------------------------------------------
// Quizoptionen
// ---------------------------------------------------------------------------

function buildOptions(plan) {
  const options = [
    {
      label: plan.correctLabel,
      isCorrect: true,
      operations: plan.operations,
      feedback: plan.explanation
    },
    ...plan.distractors.map(item => ({
      label: item.label,
      isCorrect: false,
      operations: item.operations,
      feedback: plan.wrongExplanation
    }))
  ];

  // Reproduzierbare Rotation: die richtige Antwort steht nicht immer an derselben Stelle.
  const shift = stepNumber % options.length;
  return options.slice(shift).concat(options.slice(0, shift));
}

function selectOption(index) {
  if (screen !== "quiz") return;
  const option = currentOptions[index];
  if (!option) return;

  if (!option.isCorrect) {
    feedbackOption = option;
    screen = "feedback";
    render();
    return;
  }

  // Zustand vor dem Rechenschritt sichern, damit Zurück die Matrix und
  // den Operationszähler exakt auf den vorherigen Stand setzt.
  stateHistory.push(snapshotState());

  applyOperations(matrix, option.operations);
  operationCount += arithmeticCost(option.operations);
  operationHistory.push(currentPlan.correctLabel);
  stepNumber += 1;
  currentPlan = nextPlan();

  if (screen !== "result") {
    currentOptions = buildOptions(currentPlan);
    screen = "quiz";
  }
  render();
}

function closeFeedback() {
  feedbackOption = null;
  screen = "quiz";
  render();
}

// ---------------------------------------------------------------------------
// Eingabe
// ---------------------------------------------------------------------------

function confirmInput() {
  try {
    const parsed = inputValues.map(row => row.map(value => Fraction.parse(value)));
    matrix = parsed;
    strategy = createStrategy();
    stepNumber = 0;
    operationHistory = [];
    operationCount = 0;
    stateHistory = [];
    inputError = "";
    resultState = null;
    currentPlan = nextPlan();

    if (screen !== "result") {
      screen = "quiz";
      currentOptions = buildOptions(currentPlan);
    }
    render();
  } catch (error) {
    inputError = error.message || "Die Eingabe konnte nicht gelesen werden.";
    render();
  }
}

function updateInputValue(event) {
  const input = event.target.closest("input[data-row][data-col]");
  if (!input) return;
  const r = Number(input.dataset.row);
  const c = Number(input.dataset.col);
  inputValues[r][c] = input.value;
}

// ---------------------------------------------------------------------------
// Darstellung
// ---------------------------------------------------------------------------

function render() {
  equationViewButton.classList.toggle("is-selected", viewMode === "equation");
  matrixViewButton.classList.toggle("is-selected", viewMode === "matrix");
  backButton.disabled = screen === "input";

  const setStatus = label => {
    statusLine.innerHTML = `
      <span>${escapeHTML(label)}</span>
      <span class="gauss-operation-count">Anzahl Rechenoperationen: <strong>${operationCount}</strong></span>
    `;
  };

  if (screen === "input") {
    setStatus("Eingabe");
    stage.innerHTML = renderInputScreen();
    bindStageEvents();
    return;
  }

  if (screen === "quiz") {
    setStatus(`Schritt ${stepNumber + 1} · ${currentPlan.phase}`);
    stage.innerHTML = renderQuizScreen();
    bindStageEvents();
    return;
  }

  if (screen === "feedback") {
    setStatus(`Schritt ${stepNumber + 1} · Hinweis`);
    stage.innerHTML = renderFeedbackScreen();
    bindStageEvents();
    return;
  }

  setStatus("Ergebnis");
  stage.innerHTML = renderResultScreen();
  bindStageEvents();
}

function renderInputScreen() {
  const content = viewMode === "matrix"
    ? renderMatrixInput()
    : renderEquationInput();

  return `
    <div class="gauss-screen">
      <div class="gauss-screen-head">
        <h2>Lineares Gleichungssystem eingeben</h2>
        <p>Tragen Sie die Koeffizienten der drei Gleichungen und die rechte Seite ein. Ganze Zahlen, Dezimalzahlen und Brüche wie <code>1/2</code> sind möglich.</p>
      </div>
      <div class="gauss-display-card input-card">
        ${content}
      </div>
      ${inputError ? `<div class="gauss-message is-error">${escapeHTML(inputError)}</div>` : ""}
      <div class="gauss-action-row">
        <button type="button" class="gauss-primary-action" id="confirmInputButton">Weiter</button>
      </div>
    </div>`;
}

function renderMatrixInput() {
  const cells = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      cells.push(`
        <label class="gauss-input-cell${c === 3 ? " rhs" : ""}">
          <span class="sr-only">Zeile ${r + 1}, ${c === 3 ? "rechte Seite" : `Koeffizient von ${VARIABLE_NAMES[c]}`}</span>
          <input data-row="${r}" data-col="${c}" inputmode="decimal" value="${escapeHTML(inputValues[r][c])}">
        </label>`);
    }
  }
  return `<div class="gauss-input-matrix">${cells.join("")}</div>`;
}

function renderEquationInput() {
  return `
    <div class="gauss-input-equations">
      ${Array.from({ length: ROWS }, (_, r) => `
        <div class="gauss-input-equation">
          ${Array.from({ length: 3 }, (_, c) => `
            <label>
              <span class="sr-only">Zeile ${r + 1}, Koeffizient von ${VARIABLE_NAMES[c]}</span>
              <input data-row="${r}" data-col="${c}" inputmode="decimal" value="${escapeHTML(inputValues[r][c])}">
              <span>· ${VARIABLE_NAMES[c]}</span>
            </label>
            ${c < 2 ? '<span class="input-plus">+</span>' : ""}
          `).join("")}
          <span class="input-equals">=</span>
          <label>
            <span class="sr-only">Zeile ${r + 1}, rechte Seite</span>
            <input data-row="${r}" data-col="3" inputmode="decimal" value="${escapeHTML(inputValues[r][3])}">
          </label>
        </div>
      `).join("")}
    </div>`;
}

function renderQuizScreen() {
  const highlights = {
    pivotCells: [currentPlan.pivotCell],
    targetCells: []
  };

  return `
    <div class="gauss-screen">
      <div class="gauss-screen-head">
        <span class="gauss-goal-label">Aktuelles Ziel</span>
        <h2>${escapeHTML(currentPlan.goal)}</h2>
        <p>${escapeHTML(currentPlan.prompt)}</p>
      </div>

      <div class="gauss-display-card">
        ${renderCurrentSystem(highlights)}
      </div>

      <div class="gauss-options" role="group" aria-label="Mögliche nächste Schritte">
        ${currentOptions.map((option, index) => `
          <button type="button" class="gauss-option" data-option-index="${index}">
            ${escapeHTML(option.label)}
          </button>
        `).join("")}
      </div>
    </div>`;
}

function renderFeedbackScreen() {
  const highlights = {
    pivotCells: [currentPlan.pivotCell],
    targetCells: currentPlan.targetCells
  };

  return `
    <div class="gauss-screen">
      <div class="gauss-screen-head">
        <span class="gauss-goal-label is-hint">Hinweis</span>
        <h2>Der gewählte Schritt ist hier nicht der günstigste.</h2>
      </div>

      <div class="gauss-display-card">
        ${renderCurrentSystem(highlights)}
      </div>

      <div class="gauss-feedback-box">
        <p>${escapeHTML(feedbackOption.feedback)}</p>
        <p class="gauss-best-step"><strong>Günstiger nächster Schritt:</strong> ${escapeHTML(currentPlan.correctLabel)}</p>
      </div>

      <div class="gauss-action-row">
        <button type="button" class="gauss-primary-action" id="feedbackContinueButton">Weiter</button>
      </div>
    </div>`;
}

function renderResultScreen() {
  if (resultState.type === "unique") {
    const solutions = matrix.map(row => row[3]);
    return `
      <div class="gauss-screen">
        <div class="gauss-screen-head">
          <span class="gauss-goal-label is-success">Eindeutige Lösung</span>
          <h2>Die linke Seite ist die Einheitsmatrix.</h2>
          <p>Damit kann die Lösung direkt aus der rechten Spalte abgelesen werden.</p>
        </div>
        <div class="gauss-display-card">
          ${renderCurrentSystem({
            pivotCells: [cellKey(0, 0), cellKey(1, 1), cellKey(2, 2)],
            targetCells: [cellKey(0, 3), cellKey(1, 3), cellKey(2, 3)]
          })}
        </div>
        <div class="gauss-result-values">
          ${solutions.map((value, i) => `<span>${VARIABLE_NAMES[i]} = ${value.toString()}</span>`).join("")}
        </div>
      </div>`;
  }

  if (resultState.type === "none") {
    const row = resultState.contradictionRow;
    return `
      <div class="gauss-screen">
        <div class="gauss-screen-head">
          <span class="gauss-goal-label is-error-label">Keine Lösung</span>
          <h2>Es ist ein Widerspruch entstanden.</h2>
          <p>Die markierte Zeile hat links nur Nullen, rechts aber einen Wert ungleich 0. Sie entspricht also einer unmöglichen Gleichung.</p>
        </div>
        <div class="gauss-display-card">
          ${renderCurrentSystem({ warningRows: [row] })}
        </div>
      </div>`;
  }

  return `
    <div class="gauss-screen">
      <div class="gauss-screen-head">
        <span class="gauss-goal-label is-hint">Unendlich viele Lösungen</span>
        <h2>Es gibt weniger Pivotpositionen als Unbekannte.</h2>
        <p>Mindestens eine Variable bleibt frei. Da kein Widerspruch vorliegt, besitzt das Gleichungssystem unendlich viele Lösungen.</p>
      </div>
      <div class="gauss-display-card">
        ${renderCurrentSystem({})}
      </div>
    </div>`;
}

function renderCurrentSystem(highlights) {
  return viewMode === "matrix"
    ? renderMatrix(matrix, highlights)
    : renderEquationSystem(matrix, highlights);
}

function renderMatrix(target, highlights = {}) {
  const pivotCells = new Set(highlights.pivotCells || []);
  const targetCells = new Set(highlights.targetCells || []);
  const warningRows = new Set(highlights.warningRows || []);

  const cells = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const key = cellKey(r, c);
      const classes = ["gauss-value-cell"];
      if (c === 3) classes.push("rhs");
      if (pivotCells.has(key)) classes.push("is-pivot");
      if (targetCells.has(key)) classes.push("is-target");
      if (warningRows.has(r)) classes.push("is-warning");
      cells.push(`<span class="${classes.join(" ")}">${target[r][c].toString()}</span>`);
    }
  }

  return `<div class="gauss-matrix" aria-label="Erweiterte Matrix">${cells.join("")}</div>`;
}

function renderEquationSystem(target, highlights = {}) {
  const pivotCells = new Set(highlights.pivotCells || []);
  const targetCells = new Set(highlights.targetCells || []);
  const warningRows = new Set(highlights.warningRows || []);

  return `
    <div class="gauss-equation-system">
      ${target.map((row, r) => `
        <div class="gauss-equation-row${warningRows.has(r) ? " is-warning" : ""}">
          <div class="gauss-equation-left">
            ${renderEquationLeft(row, r, pivotCells, targetCells)}
          </div>
          <span class="gauss-equals">=</span>
          <span class="gauss-rhs-value${targetCells.has(cellKey(r, 3)) ? " is-target" : ""}${pivotCells.has(cellKey(r, 3)) ? " is-pivot" : ""}">${row[3].toString()}</span>
        </div>
      `).join("")}
    </div>`;
}

function renderEquationLeft(row, r, pivotCells, targetCells) {
  const pieces = [];
  let hasVisibleTerm = false;

  for (let c = 0; c < 3; c += 1) {
    const value = row[c];
    const key = cellKey(r, c);
    const highlighted = pivotCells.has(key) || targetCells.has(key);

    if (value.isZero() && !highlighted) continue;

    const classes = ["gauss-equation-term"];
    if (pivotCells.has(key)) classes.push("is-pivot");
    if (targetCells.has(key)) classes.push("is-target");

    const sign = value.sign();
    const absValue = value.abs();
    let prefix = "";

    if (!hasVisibleTerm) {
      if (sign < 0) prefix = "−";
    } else {
      prefix = sign < 0 ? "− " : "+ ";
    }

    let coefficient = "";
    if (value.isZero()) coefficient = "0 · ";
    else if (!absValue.isOne()) coefficient = `${absValue.toString()} · `;

    pieces.push(`<span class="${classes.join(" ")}">${prefix}${coefficient}${VARIABLE_NAMES[c]}</span>`);
    hasVisibleTerm = true;
  }

  if (!pieces.length) return '<span class="gauss-equation-term">0</span>';
  return pieces.join(" ");
}

// ---------------------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------------------

function bindStageEvents() {
  stage.querySelectorAll("input[data-row][data-col]").forEach(input => {
    input.addEventListener("input", updateInputValue);
  });

  const confirmButton = document.getElementById("confirmInputButton");
  if (confirmButton) confirmButton.addEventListener("click", confirmInput);

  stage.querySelectorAll("button[data-option-index]").forEach(button => {
    button.addEventListener("click", () => selectOption(Number(button.dataset.optionIndex)));
  });

  const feedbackContinue = document.getElementById("feedbackContinueButton");
  if (feedbackContinue) feedbackContinue.addEventListener("click", closeFeedback);
}

equationViewButton.addEventListener("click", () => {
  viewMode = "equation";
  render();
});

matrixViewButton.addEventListener("click", () => {
  viewMode = "matrix";
  render();
});

backButton.addEventListener("click", goBack);
restartButton.addEventListener("click", resetState);

stage.addEventListener("keydown", event => {
  if (screen === "input" && event.key === "Enter" && event.target.matches("input")) {
    event.preventDefault();
    confirmInput();
  }
});

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
