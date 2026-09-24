const canvas = document.getElementById("integralCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const tMin = 0;
const tMax = 30;

const examples = {
  constant: {
    label: "Konstante Geschwindigkeit",
    equation: "v(t) = 22,5",
    description: "Gleiche Rechtecke ergeben eine gleichmäßig wachsende Strecke.",
    velocity: t => 22.5
  },
  accelerating: {
    label: "Zunehmende Geschwindigkeit",
    equation: "v(t) = -t³ / 600 + 3t² / 40",
    description: "Die Rechtecke werden größer; die Strecke wächst zunehmend schneller.",
    velocity: t => (-1 / 600) * t ** 3 + (3 / 40) * t ** 2
  },
  turning: {
    label: "Bremsen und Richtungswechsel",
    equation: "v(t) = -(t - 20)³ / 500",
    description: "Negative Geschwindigkeit erzeugt Fläche unterhalb der Achse und verringert die Position.",
    velocity: t => (-1 / 500) * (t - 20) ** 3
  }
};

let selectedExample = "constant";
let stepSize = 0.5;
let points = [];
let currentIndex = 0;
let timer = null;

function prepareData() {
  const velocity = examples[selectedExample].velocity;
  const count = Math.round((tMax - tMin) / stepSize);
  points = [];

  let position = 0;

  for (let i = 0; i <= count; i++) {
    const t = tMin + i * stepSize;
    points.push({ t, v: velocity(t), s: position });

    if (i < count) {
      position += velocity(t) * stepSize;
    }
  }

  currentIndex = Math.min(currentIndex, points.length - 1);
}

function velocityBounds() {
  const values = points.map(p => p.v);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = Math.max(2, (max - min) * 0.12);
  return { min: min - pad, max: max + pad };
}

function positionBounds() {
  const values = points.map(p => p.s);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = Math.max(10, (max - min) * 0.08);
  return { min: min - pad, max: max + pad };
}

function mapT(t) {
  return 74 + ((t - tMin) / (tMax - tMin)) * (W - 118);
}

function mapV(v, top, height, bounds) {
  return top + height - ((v - bounds.min) / (bounds.max - bounds.min)) * height;
}

function mapS(s, left, width, bounds) {
  return left + ((s - bounds.min) / (bounds.max - bounds.min)) * width;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#fbfdff");
  gradient.addColorStop(1, "#eef4fb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function drawVelocityPlot() {
  const top = 64;
  const height = 285;
  const left = 74;
  const right = W - 44;
  const bounds = velocityBounds();
  const baseY = mapV(0, top, height, bounds);

  ctx.strokeStyle = "rgba(24, 32, 51, 0.11)";
  ctx.lineWidth = 1;

  for (let t = 0; t <= 30; t += 5) {
    const x = mapT(t);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
  }

  for (let i = 0; i <= 4; i++) {
    const y = top + (height * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(24, 32, 51, 0.42)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.lineTo(right, baseY);
  ctx.stroke();

  drawRectangles(top, height, bounds, baseY);
  drawVelocityCurve(top, height, bounds);
  drawCursor(top, height);
  drawVelocityLabels(top, height, bounds);
}

function drawRectangles(top, height, bounds, baseY) {
  const velocity = examples[selectedExample].velocity;
  const rectWidth = mapT(stepSize) - mapT(0);

  for (let i = 0; i < currentIndex; i++) {
    const t = points[i].t;
    const v = velocity(t);
    const x = mapT(t);
    const y = mapV(v, top, height, bounds);
    const rectY = Math.min(y, baseY);
    const rectH = Math.abs(baseY - y);

    ctx.fillStyle = v >= 0 ? "rgba(52, 84, 209, 0.18)" : "rgba(244, 114, 82, 0.22)";
    ctx.fillRect(x, rectY, rectWidth, rectH);

    if (i === currentIndex - 1) {
      ctx.strokeStyle = v >= 0 ? "#3454d1" : "#d75d43";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, rectY, rectWidth, rectH);
    }
  }
}

function drawVelocityCurve(top, height, bounds) {
  const velocity = examples[selectedExample].velocity;

  ctx.strokeStyle = "#182033";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();

  for (let i = 0; i <= 360; i++) {
    const t = tMin + (tMax - tMin) * i / 360;
    const x = mapT(t);
    const y = mapV(velocity(t), top, height, bounds);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawCursor(top, height) {
  const p = points[currentIndex];
  const x = mapT(p.t);

  ctx.strokeStyle = "#19a88f";
  ctx.lineWidth = 2.4;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(x, top - 6);
  ctx.lineTo(x, top + height + 6);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#19a88f";
  ctx.beginPath();
  ctx.arc(x, top + height + 18, 5, 0, 2 * Math.PI);
  ctx.fill();
}

function drawVelocityLabels(top, height, bounds) {
  ctx.fillStyle = "#182033";
  ctx.font = "700 18px Inter, Arial, sans-serif";
  ctx.fillText("Geschwindigkeit v(t)", 74, 36);

  ctx.fillStyle = "#657084";
  ctx.font = "13px Inter, Arial, sans-serif";
  ctx.fillText("Zeit t", W - 86, top + height + 34);

  for (let t = 0; t <= 30; t += 5) {
    ctx.fillText(String(t), mapT(t) - 5, top + height + 23);
  }

  const values = [bounds.min, 0, bounds.max];
  for (const v of values) {
    const y = mapV(v, top, height, bounds);
    ctx.fillText(v.toFixed(0), 18, y + 4);
  }
}

function drawPositionTrack() {
  const top = 420;
  const left = 74;
  const width = W - 148;
  const bounds = positionBounds();
  const p = points[currentIndex];
  const x0 = mapS(0, left, width, bounds);
  const x = mapS(p.s, left, width, bounds);

  ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
  roundedRect(44, 392, W - 88, 108, 20);
  ctx.fill();

  ctx.strokeStyle = "rgba(24, 32, 51, 0.13)";
  ctx.lineWidth = 1;
  roundedRect(44, 392, W - 88, 108, 20);
  ctx.stroke();

  ctx.fillStyle = "#182033";
  ctx.font = "700 17px Inter, Arial, sans-serif";
  ctx.fillText("Kumulierte Strecke s(t)", 74, 418);

  ctx.strokeStyle = "rgba(24, 32, 51, 0.22)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, top + 38);
  ctx.lineTo(left + width, top + 38);
  ctx.stroke();

  ctx.strokeStyle = "#3454d1";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x0, top + 38);
  ctx.lineTo(x, top + 38);
  ctx.stroke();

  drawTrain(x, top + 38);

  ctx.fillStyle = "#657084";
  ctx.font = "13px Inter, Arial, sans-serif";
  ctx.fillText(`${bounds.min.toFixed(0)} m`, left - 8, top + 72);
  ctx.fillText(`${bounds.max.toFixed(0)} m`, left + width - 38, top + 72);
}

function drawTrain(x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#182033";
  roundedRect(-23, -24, 46, 24, 7);
  ctx.fill();

  ctx.fillStyle = "#5b7cfa";
  roundedRect(-14, -18, 13, 8, 3);
  ctx.fill();
  roundedRect(4, -18, 13, 8, 3);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(-13, 3, 5, 0, 2 * Math.PI);
  ctx.arc(13, 3, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawScene() {
  drawBackground();
  drawVelocityPlot();
  drawPositionTrack();
}

function updateText() {
  const example = examples[selectedExample];
  const p = points[currentIndex];

  document.getElementById("equation").innerHTML = `
    <strong>${example.label}</strong>
    <span>${example.equation}</span>
    <small>${example.description}</small>
  `;

  document.getElementById("metrics").innerHTML = `
    <span><strong>Zeit</strong>${p.t.toFixed(1)} s</span>
    <span><strong>Geschwindigkeit</strong>${p.v.toFixed(2)} m/s</span>
    <span><strong>Integral bisher</strong>${p.s.toFixed(2)} m</span>
    <span><strong>Rechteckbreite</strong>${stepSize.toString().replace(".", ",")} s</span>
  `;
}

function render() {
  drawScene();
  updateText();
}

function resetSimulation() {
  stopSimulation();
  currentIndex = 0;
  render();
}

function stepForward() {
  if (currentIndex < points.length - 1) {
    currentIndex += 1;
  } else {
    stopSimulation();
  }
  render();
}

function toggleSimulation() {
  if (timer) {
    stopSimulation();
    return;
  }

  document.getElementById("playButton").textContent = "Pause";
  timer = setInterval(stepForward, stepSize === 0.1 ? 55 : stepSize === 0.5 ? 105 : 185);
}

function stopSimulation() {
  clearInterval(timer);
  timer = null;
  document.getElementById("playButton").textContent = "Start";
}

function setExample(key) {
  selectedExample = key;
  currentIndex = 0;
  stopSimulation();
  prepareData();
  updateChoiceState("exampleChoices", key, "example");
  render();
}

function setStep(value) {
  stepSize = Number(value);
  currentIndex = 0;
  stopSimulation();
  prepareData();
  updateChoiceState("stepChoices", value, "step");
  render();
}

function updateChoiceState(groupId, value, field) {
  const buttons = document.querySelectorAll(`#${groupId} .choice`);
  buttons.forEach(button => {
    button.classList.toggle("is-selected", button.dataset[field] === String(value));
  });
}

document.querySelectorAll("#exampleChoices .choice").forEach(button => {
  button.addEventListener("click", () => setExample(button.dataset.example));
});

document.querySelectorAll("#stepChoices .choice").forEach(button => {
  button.addEventListener("click", () => setStep(button.dataset.step));
});

prepareData();
render();
