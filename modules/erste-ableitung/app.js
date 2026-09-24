const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

function f(x) {
  return -x * x;
}

function fp(x) {
  return -2 * x;
}

const xMin = -3.2;
const xMax = 3.2;
const yMin = -10.5;
// Extra space above f(0)=0 keeps the character visible at the highest point.
const yMax = 3.5;

let xPlayer = -2.2;
let xTarget = -2.2;
let animationPhase = 0;
let lastTime = 0;

function mapX(x) {
  return (x - xMin) / (xMax - xMin) * W;
}

function mapY(y) {
  return H - (y - yMin) / (yMax - yMin) * H;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRect(ctx, x, y, w, h, r) {
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

function drawGrid() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e2e8f0";

  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    ctx.beginPath();
    ctx.moveTo(mapX(x), 0);
    ctx.lineTo(mapX(x), H);
    ctx.stroke();
  }

  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    ctx.beginPath();
    ctx.moveTo(0, mapY(y));
    ctx.lineTo(W, mapY(y));
    ctx.stroke();
  }

  ctx.strokeStyle = "#aab6c6";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, mapY(0));
  ctx.lineTo(W, mapY(0));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mapX(0), 0);
  ctx.lineTo(mapX(0), H);
  ctx.stroke();
}

function drawFunction() {
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();

  const steps = 500;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + (xMax - xMin) * i / steps;
    const y = f(x);
    const px = mapX(x);
    const py = mapY(y);

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.stroke();
}

function drawTangent(x0) {
  const y0 = f(x0);
  const m = fp(x0);
  const xA = x0 - 0.9;
  const xB = x0 + 0.9;

  ctx.strokeStyle = "#c84747";
  ctx.lineWidth = 2.3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(mapX(xA), mapY(y0 + m * (xA - x0)));
  ctx.lineTo(mapX(xB), mapY(y0 + m * (xB - x0)));
  ctx.stroke();
  ctx.setLineDash([]);
}

function getTangentAngle(x0) {
  const y0 = f(x0);
  const m = fp(x0);
  const px = mapX(x0);
  const py = mapY(y0);
  const px2 = mapX(x0 + 1);
  const py2 = mapY(y0 + m);

  return Math.atan2(py2 - py, px2 - px);
}

function drawMotionArrow(x0) {
  const y0 = f(x0);
  const m = fp(x0);
  const dx = 0.48;
  const dy = m * dx;
  const px = mapX(x0);
  const py = mapY(y0);
  const qx = mapX(x0 + dx);
  const qy = mapY(y0 + dy);

  ctx.strokeStyle = "#3454d1";
  ctx.fillStyle = "#3454d1";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(qx, qy);
  ctx.stroke();

  const angle = Math.atan2(qy - py, qx - px);
  ctx.beginPath();
  ctx.moveTo(qx, qy);
  ctx.lineTo(qx - 13 * Math.cos(angle - 0.42), qy - 13 * Math.sin(angle - 0.42));
  ctx.lineTo(qx - 13 * Math.cos(angle + 0.42), qy - 13 * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(x0) {
  const y0 = f(x0);
  const m = fp(x0);
  const px = mapX(x0);
  const py = mapY(y0);
  const tangentAngle = getTangentAngle(x0);
  const moving = Math.abs(xTarget - xPlayer) > 0.01;
  const speed = moving ? 1 : 0;
  const stride = Math.sin(animationPhase) * 8 * speed;
  const bodyBounce = Math.abs(Math.sin(animationPhase)) * 2 * speed;
  const lean = clamp(-m * 0.035, -0.22, 0.22);

  ctx.save();
  ctx.translate(px, py + 8);
  ctx.rotate(tangentAngle);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 28, 7, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(tangentAngle);

  ctx.fillStyle = "#111827";
  roundedRect(ctx, -25, -3, 50, 7, 4);
  ctx.fill();

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(-14 + stride * 0.5, -1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, -8);
  ctx.lineTo(14 - stride * 0.5, -1);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -32 - bodyBounce);
  ctx.rotate(lean);

  ctx.fillStyle = "#475569";
  roundedRect(ctx, -22, -17, 12, 26, 5);
  ctx.fill();

  ctx.fillStyle = "#3454d1";
  roundedRect(ctx, -14, -22, 28, 36, 8);
  ctx.fill();

  ctx.fillStyle = "#7ea2ff";
  roundedRect(ctx, -8, -14, 16, 18, 6);
  ctx.fill();

  ctx.strokeStyle = "#23347c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(11, -12);
  ctx.lineTo(22 + stride * 0.25, -2);
  ctx.stroke();

  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(0, -36, 12, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#111827";
  roundedRect(ctx, -11, -50, 22, 9, 4);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(5, -38, 2, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#3454d1";
  ctx.beginPath();
  ctx.moveTo(-10, -31);
  ctx.lineTo(-31, -38 + Math.sin(animationPhase) * 3);
  ctx.lineTo(-12, -25);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "#c84747";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawSlopeBadge(x0) {
  const slope = fp(x0);
  let label = "nach rechts: fast waagerecht";
  let color = "#3454d1";

  if (slope > 0.15) {
    label = "nach rechts: steigt";
    color = "#178d73";
  } else if (slope < -0.15) {
    label = "nach rechts: fällt";
    color = "#b65a24";
  }

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.93)";
  roundedRect(ctx, 20, 20, 286, 76, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(30, 41, 59, 0.12)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 20, 20, 286, 76, 16);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "bold 20px Arial";
  ctx.fillText(label, 38, 50);

  ctx.fillStyle = "#182033";
  ctx.font = "15px Arial";
  ctx.fillText("f'(x) = " + slope.toFixed(2), 38, 78);
  ctx.restore();
}

function updateInfo() {
  const y = f(xPlayer);
  const slope = fp(xPlayer);

  document.getElementById("info").innerHTML =
    "<strong>Position:</strong> x = " + xPlayer.toFixed(2) + "<br>" +
    "<strong>Funktionswert:</strong> f(x) = " + y.toFixed(2) + "<br>" +
    "<strong>Steigung:</strong> f'(x) = " + slope.toFixed(2);
}

function drawScene() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawGrid();
  drawFunction();
  drawTangent(xPlayer);
  drawMotionArrow(xPlayer);
  drawPlayer(xPlayer);
  drawSlopeBadge(xPlayer);
  updateInfo();
}

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;

  const diff = xTarget - xPlayer;
  if (Math.abs(diff) > 0.001) {
    xPlayer += diff * Math.min(1, dt * 8);
    animationPhase += dt * 12;
  } else {
    xPlayer = xTarget;
    animationPhase += dt * 2;
  }

  drawScene();
  requestAnimationFrame(animate);
}

function moveBack() {
  xTarget -= 0.35;
  if (xTarget < xMin + 0.25) xTarget = xMin + 0.25;
}

function moveForward() {
  xTarget += 0.35;
  if (xTarget > xMax - 0.25) xTarget = xMax - 0.25;
}

document.addEventListener("keydown", function(event) {
  if (event.key === "ArrowLeft") moveBack();
  if (event.key === "ArrowRight") moveForward();
});

requestAnimationFrame(animate);
