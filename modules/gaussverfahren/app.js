const stage = document.getElementById("gaussStage");
const progressBar = document.getElementById("progressBar");
const progressCount = document.getElementById("progressCount");
const backButton = document.getElementById("backButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");

const initialMatrix = [
  [0, -1, 1, -1],
  [1, -1, -1, -4],
  [1, 1, 1, 6]
];

const swappedMatrix = [
  [1, -1, -1, -4],
  [0, -1, 1, -1],
  [1, 1, 1, 6]
];

const firstElimination = [
  [1, -1, -1, -4],
  [0, -1, 1, -1],
  [0, 2, 2, 10]
];

const secondPivot = [
  [1, -1, -1, -4],
  [0, 1, -1, 1],
  [0, 2, 2, 10]
];

const secondElimination = [
  [1, -1, -1, -4],
  [0, 1, -1, 1],
  [0, 0, 4, 8]
];

const thirdPivot = [
  [1, -1, -1, -4],
  [0, 1, -1, 1],
  [0, 0, 1, 2]
];

const x2Solved = [
  [1, -1, -1, -4],
  [0, 1, 0, 3],
  [0, 0, 1, 2]
];

const firstBackStep = [
  [1, 0, -1, -1],
  [0, 1, 0, 3],
  [0, 0, 1, 2]
];

const identityMatrix = [
  [1, 0, 0, 1],
  [0, 1, 0, 3],
  [0, 0, 1, 2]
];

function equationSystemHTML(options = {}) {
  const highlightRows = options.highlightRows || [];
  const highlightVariables = options.highlightVariables || false;

  const variable = (name) => highlightVariables
    ? `<span class="variable-highlight">${name}</span>`
    : name;

  const rowClass = (row) => highlightRows.includes(row) ? "equation-line is-highlighted" : "equation-line";

  return `
    <div class="system-card">
      <div class="system-layout">
        <div class="equation-system" aria-label="Lineares Gleichungssystem">
          <div class="${rowClass(0)}"><span>−${variable("x<sub>2</sub>")} + ${variable("x<sub>3</sub>")}</span><span>= −1</span></div>
          <div class="${rowClass(1)}"><span>${variable("x<sub>1</sub>")} − ${variable("x<sub>2</sub>")} − ${variable("x<sub>3</sub>")}</span><span>= −4</span></div>
          <div class="${rowClass(2)}"><span>${variable("x<sub>1</sub>")} + ${variable("x<sub>2</sub>")} + ${variable("x<sub>3</sub>")}</span><span>= 6</span></div>
        </div>
        <div class="system-note">
          <span>3 Gleichungen</span>
          <span>3 Unbekannte</span>
        </div>
      </div>
    </div>`;
}

function matrixHTML(matrix, options = {}) {
  const {
    showRhs = true,
    showSeparator = true,
    highlightColumn = null,
    highlightRows = [],
    highlightCells = [],
    pivotCells = [],
    warningCells = []
  } = options;

  const key = (r, c) => `${r}-${c}`;
  const cells = [];

  matrix.forEach((row, r) => {
    row.forEach((value, c) => {
      const classes = ["matrix-cell"];
      if (c === 3) {
        classes.push("rhs");
        if (!showSeparator) classes.push("no-separator");
      }
      if (!showRhs && c === 3) classes.push("is-hidden");
      if (highlightColumn === c || highlightRows.includes(r) || highlightCells.includes(key(r, c))) {
        classes.push("is-highlighted");
      }
      if (pivotCells.includes(key(r, c))) classes.push("is-pivot");
      if (warningCells.includes(key(r, c))) classes.push("is-warning");

      cells.push(`<span class="${classes.join(" ")}">${formatNumber(value)}</span>`);
    });
  });

  return `<div class="aug-matrix" role="img" aria-label="Erweiterte Matrix">${cells.join("")}</div>`;
}

function formatNumber(value) {
  if (Object.is(value, -0)) return "0";
  return String(value).replace("-", "−");
}

function matrixCard(matrix, options = {}) {
  const operation = options.operation
    ? `<span class="operation-chip${options.operationSoft ? " is-soft" : ""}">${options.operation}</span>`
    : "";

  const caption = options.caption || "Gaußschema";
  const undertext = options.undertext ? `<p class="matrix-undertext">${options.undertext}</p>` : "";
  const goal = options.goal ? `<div class="goal-row">${options.goal}</div>` : "";

  return `
    <div class="matrix-card">
      <div class="matrix-caption"><span>${caption}</span>${operation}</div>
      ${matrixHTML(matrix, options)}
      ${goal}
      ${undertext}
    </div>`;
}

function rulesHTML() {
  return `
    <div class="rules-card">
      <div class="row-rule">
        <span class="row-rule-symbol">↕</span>
        <span><strong>Zeilen vertauschen</strong>Zwei Gleichungen dürfen ihre Position tauschen.</span>
      </div>
      <div class="row-rule">
        <span class="row-rule-symbol">·c</span>
        <span><strong>Eine Zeile skalieren</strong>Eine Zeile darf mit einer Zahl ungleich 0 multipliziert werden.</span>
      </div>
      <div class="row-rule">
        <span class="row-rule-symbol">+</span>
        <span><strong>Ein Vielfaches addieren</strong>Ein Vielfaches einer Zeile darf zu einer anderen Zeile addiert werden.</span>
      </div>
    </div>`;
}

function solutionHTML() {
  return `
    <div class="solution-card">
      ${matrixHTML(identityMatrix, {
        pivotCells: ["0-0", "1-1", "2-2"],
        highlightCells: ["0-3", "1-3", "2-3"]
      })}
      <div class="solution-values" aria-label="Lösung">
        <span class="solution-value">x<sub>1</sub> = 1</span>
        <span class="solution-value">x<sub>2</sub> = 3</span>
        <span class="solution-value">x<sub>3</sub> = 2</span>
      </div>
    </div>`;
}

function checkHTML() {
  return `
    <div class="check-card">
      <div class="check-line"><span>−3 + 2 = −1</span><span class="check-mark">✓</span></div>
      <div class="check-line"><span>1 − 3 − 2 = −4</span><span class="check-mark">✓</span></div>
      <div class="check-line"><span>1 + 3 + 2 = 6</span><span class="check-mark">✓</span></div>
    </div>`;
}

const steps = [
  {
    kicker: "Ausgangssituation",
    title: "Drei Gleichungen, drei Unbekannte",
    text: "Aufgabe ist es, dieses lineare Gleichungssystem zu lösen. Gegeben sind drei Gleichungen und die drei Unbekannten x₁, x₂ und x₃.",
    visual: () => equationSystemHTML({ highlightRows: [0, 1, 2], highlightVariables: true })
  },
  {
    kicker: "Was heißt lösen?",
    title: "Gesucht sind Werte, die alle Gleichungen erfüllen",
    text: "Wir suchen genau eine Belegung der Unbekannten, für die alle drei Gleichungen gleichzeitig richtig sind.",
    visual: () => equationSystemHTML()
  },
  {
    kicker: "Kürzere Notation",
    title: "Zuerst schreiben wir nur die Koeffizienten auf",
    text: "Die Vorfaktoren von x₁, x₂ und x₃ bilden die ersten drei Spalten. Fehlt eine Unbekannte in einer Gleichung, steht an dieser Stelle eine 0.",
    visual: () => matrixCard(initialMatrix, {
      showRhs: false,
      showSeparator: false,
      caption: "Koeffizientenmatrix",
      undertext: "Die erste Gleichung enthält kein x₁. Deshalb beginnt ihre Zeile mit 0."
    })
  },
  {
    kicker: "Kürzere Notation",
    title: "Dann setzen wir eine senkrechte Trennlinie",
    text: "Die Linie markiert die Grenze zwischen den Koeffizienten auf der linken Seite und den später folgenden rechten Seiten der Gleichungen.",
    visual: () => matrixCard(initialMatrix, {
      showRhs: false,
      showSeparator: true,
      caption: "Gaußschema mit Trennlinie",
      undertext: "Links bleibt die Koeffizientenmatrix unverändert."
    })
  },
  {
    kicker: "Erweiterte Matrix",
    title: "Rechts ergänzen wir die Ergebnisse der Gleichungen",
    text: "Nun tragen wir hinter der Trennlinie −1, −4 und 6 ein. Das vollständige Gaußschema enthält damit dieselbe Information wie das ursprüngliche Gleichungssystem.",
    visual: () => matrixCard(initialMatrix, {
      caption: "Erweitertes Gaußschema",
      highlightColumn: 3,
      undertext: "Links stehen die Koeffizienten, rechts die Konstanten."
    })
  },
  {
    kicker: "Eliminationsidee",
    title: "Wir beginnen in der ersten Spalte",
    text: "Für die erste Pivotposition oben links benötigen wir einen Eintrag ungleich 0. Besonders übersichtlich ist eine 1. Danach erzeugen wir unter diesem Pivot Nullen.",
    visual: () => matrixCard(initialMatrix, {
      caption: "Erster Eliminationsschritt",
      highlightColumn: 0,
      warningCells: ["0-0"],
      goal: '<span class="goal-chip">Ziel in Spalte 1: 1, 0, 0</span>'
    })
  },
  {
    kicker: "Äquivalente Umformungen",
    title: "Diese Zeilenoperationen sind erlaubt",
    text: "Mit diesen Operationen verändern wir die Schreibweise, aber nicht die Lösungsmenge des Gleichungssystems.",
    visual: () => rulesHTML()
  },
  {
    kicker: "Pivotwahl",
    title: "Oben links steht zunächst eine 0",
    text: "Mit 0 als Pivot lässt sich nicht eliminieren. Hier ist es deshalb am einfachsten, die erste und die zweite Zeile zu vertauschen. Andere geeignete Zeilenumformungen wären ebenfalls möglich.",
    visual: () => matrixCard(initialMatrix, {
      caption: "Ausgangsschema",
      warningCells: ["0-0"],
      operation: "Z₁ ↔ Z₂",
      operationSoft: true
    })
  },
  {
    kicker: "1. Zeilenoperation",
    title: "Wir vertauschen die erste und die zweite Zeile",
    text: "Jetzt steht an der ersten Pivotposition eine 1. Die zweite Zeile beginnt bereits mit 0; nur in der dritten Zeile muss der erste Eintrag noch eliminiert werden.",
    visual: () => matrixCard(swappedMatrix, {
      caption: "Nach Z₁ ↔ Z₂",
      operation: "Z₁ ↔ Z₂",
      pivotCells: ["0-0"],
      highlightRows: [0, 1]
    })
  },
  {
    kicker: "Elimination unter Pivot 1",
    title: "Die 1 in der dritten Zeile wird zu 0",
    text: "Wir ziehen die erste Zeile von der dritten Zeile ab. Dadurch verschwindet x₁ aus der dritten Gleichung.",
    visual: () => matrixCard(firstElimination, {
      caption: "Erste Spalte bereinigt",
      operation: "Z₃ ← Z₃ − Z₁",
      pivotCells: ["0-0"],
      highlightRows: [2]
    })
  },
  {
    kicker: "Pivot 2",
    title: "Den zweiten Pivot machen wir zu 1",
    text: "In der zweiten Zeile steht −1. Wir multiplizieren die gesamte zweite Zeile mit −1.",
    visual: () => matrixCard(secondPivot, {
      caption: "Zweiter Pivot normiert",
      operation: "Z₂ ← −Z₂",
      pivotCells: ["0-0", "1-1"],
      highlightRows: [1]
    })
  },
  {
    kicker: "Elimination unter Pivot 2",
    title: "Auch unter dem zweiten Pivot entsteht eine 0",
    text: "Von der dritten Zeile ziehen wir das Zweifache der zweiten Zeile ab. Damit enthält die dritte Zeile nur noch x₃.",
    visual: () => matrixCard(secondElimination, {
      caption: "Stufenform",
      operation: "Z₃ ← Z₃ − 2Z₂",
      pivotCells: ["0-0", "1-1"],
      highlightRows: [2]
    })
  },
  {
    kicker: "Pivot 3",
    title: "Die letzte Zeile liefert direkt x₃",
    text: "Wir teilen die dritte Zeile durch 4. Dann steht dort x₃ = 2.",
    visual: () => matrixCard(thirdPivot, {
      caption: "Dritter Pivot normiert",
      operation: "Z₃ ← ¼ Z₃",
      pivotCells: ["0-0", "1-1", "2-2"],
      highlightRows: [2]
    })
  },
  {
    kicker: "Rückwärtsschritt",
    title: "Mit x₃ eliminieren wir den Eintrag darüber",
    text: "Wir addieren die dritte Zeile zur zweiten Zeile. Aus x₂ − x₃ = 1 wird x₂ = 3.",
    visual: () => matrixCard(x2Solved, {
      caption: "x₂ bestimmt",
      operation: "Z₂ ← Z₂ + Z₃",
      pivotCells: ["0-0", "1-1", "2-2"],
      highlightRows: [1]
    })
  },
  {
    kicker: "Rückwärtsschritt",
    title: "Nun eliminieren wir x₂ aus der ersten Zeile",
    text: "Wir addieren die zweite Zeile zur ersten Zeile. In der ersten Zeile bleibt zunächst x₁ − x₃ = −1.",
    visual: () => matrixCard(firstBackStep, {
      caption: "x₂ aus Zeile 1 eliminiert",
      operation: "Z₁ ← Z₁ + Z₂",
      pivotCells: ["0-0", "1-1", "2-2"],
      highlightRows: [0]
    })
  },
  {
    kicker: "Letzter Eliminationsschritt",
    title: "Zum Schluss eliminieren wir x₃ aus der ersten Zeile",
    text: "Wir addieren die dritte Zeile zur ersten Zeile. Links steht jetzt die Einheitsmatrix; rechts können wir die Lösung direkt ablesen.",
    visual: () => matrixCard(identityMatrix, {
      caption: "Reduzierte Zeilenstufenform",
      operation: "Z₁ ← Z₁ + Z₃",
      pivotCells: ["0-0", "1-1", "2-2"],
      highlightRows: [0]
    })
  },
  {
    kicker: "Lösung",
    title: "Die Lösung lässt sich direkt ablesen",
    text: "Die drei Zeilen bedeuten x₁ = 1, x₂ = 3 und x₃ = 2.",
    visual: () => solutionHTML()
  },
  {
    kicker: "Probe",
    title: "Alle drei Ausgangsgleichungen sind erfüllt",
    text: "Setzen wir die gefundenen Werte in das ursprüngliche Gleichungssystem ein, stimmen alle rechten Seiten. Damit ist die Lösung bestätigt.",
    visual: () => checkHTML()
  }
];

let currentStep = 0;

function renderStep() {
  const step = steps[currentStep];
  const percent = steps.length === 1 ? 100 : (currentStep / (steps.length - 1)) * 100;

  stage.classList.remove("is-changing");
  void stage.offsetWidth;

  stage.innerHTML = `
    <div class="gauss-stage-inner">
      <div class="gauss-stage-head">
        <span class="gauss-kicker">${step.kicker}</span>
        <h2>${step.title}</h2>
        <p class="gauss-explanation">${step.text}</p>
      </div>
      <div class="gauss-visual">${step.visual()}</div>
    </div>`;

  stage.classList.add("is-changing");
  progressBar.style.width = `${percent}%`;
  progressCount.textContent = `${currentStep + 1} / ${steps.length}`;
  backButton.disabled = currentStep === 0;
  nextButton.disabled = currentStep === steps.length - 1;
  nextButton.textContent = currentStep === steps.length - 2 ? "Zur Lösung ▶" : "Weiter ▶";
}

function moveBack() {
  if (currentStep > 0) {
    currentStep -= 1;
    renderStep();
  }
}

function moveForward() {
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    renderStep();
  }
}

function restart() {
  currentStep = 0;
  renderStep();
}

backButton.addEventListener("click", moveBack);
nextButton.addEventListener("click", moveForward);
restartButton.addEventListener("click", restart);

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") moveBack();
  if (event.key === "ArrowRight") moveForward();
});

renderStep();
