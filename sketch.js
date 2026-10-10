const ghosts = [];
const sparkles = [];

const SPAWN_INTERVAL_MS = 1100;
const LARGE_SPEED_MIN = 0.7;
const LARGE_SPEED_MAX = 1.2;
const SMALL_SPEED_MIN = 1.2;
const SMALL_SPEED_MAX = 2.0;

let audioCtx = null;
let masterGain = null;
let lastMissSoundAt = 0;
let audioUnlocked = false;

let score = 0;
let lives = 7;
let lastSpawn = 0;

let catcherX = 0;
let catcherTargetX = 0;
let keyLeft = false;
let keyRight = false;

function setup() {
  const wrap = document.getElementById("game-wrap");
  const w = min(windowWidth - 24, 920);
  const h = constrain(windowHeight * 0.68, 450, 640);
  const c = createCanvas(w, h);
  c.parent("game-wrap");

  catcherX = width * 0.5;
  catcherTargetX = catcherX;
  textFont("Baloo 2");

  window.addEventListener("pointerdown", unlockAudioFromGesture, { passive: true });
  window.addEventListener("keydown", unlockAudioFromGesture);
}

function draw() {
  drawBackground();

  if (millis() - lastSpawn > SPAWN_INTERVAL_MS) {
    spawnGhost();
    lastSpawn = millis();
  }

  updateCatcher();
  updateGhosts();
  drawCatcher();
  updateSparkles();
  drawHud();

  if (lives <= 0) {
    drawGameOver();
    noLoop();
  }
}

function ensureAudioReady() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function unlockAudioFromGesture() {
  ensureAudioReady();
  if (!audioCtx) {
    return;
  }

  audioCtx.resume().then(() => {
    audioUnlocked = audioCtx.state === "running";
  });
}

function playCatchSound() {
  if (!audioCtx || !masterGain || !audioUnlocked || audioCtx.state !== "running") {
    return;
  }

  const now = audioCtx.currentTime;

  const whoo = audioCtx.createOscillator();
  const whooGain = audioCtx.createGain();
  whoo.type = "sine";
  whoo.frequency.setValueAtTime(540, now);
  whoo.frequency.exponentialRampToValueAtTime(280, now + 0.22);
  whooGain.gain.setValueAtTime(0.0001, now);
  whooGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
  whooGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  whoo.connect(whooGain);
  whooGain.connect(masterGain);
  whoo.start(now);
  whoo.stop(now + 0.25);

  const sparkle = audioCtx.createOscillator();
  const sparkleGain = audioCtx.createGain();
  sparkle.type = "triangle";
  sparkle.frequency.setValueAtTime(760, now + 0.03);
  sparkle.frequency.exponentialRampToValueAtTime(980, now + 0.14);
  sparkleGain.gain.setValueAtTime(0.0001, now + 0.02);
  sparkleGain.gain.exponentialRampToValueAtTime(0.11, now + 0.06);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(masterGain);
  sparkle.start(now + 0.02);
  sparkle.stop(now + 0.18);
}

function playMissSound() {
  if (!audioCtx || !masterGain || !audioUnlocked || audioCtx.state !== "running") {
    return;
  }

  const nowMs = millis();
  if (nowMs - lastMissSoundAt < 350) {
    return;
  }
  lastMissSoundAt = nowMs;

  const now = audioCtx.currentTime;
  const oops = audioCtx.createOscillator();
  const oopsGain = audioCtx.createGain();
  oops.type = "triangle";
  oops.frequency.setValueAtTime(240, now);
  oops.frequency.exponentialRampToValueAtTime(165, now + 0.2);
  oopsGain.gain.setValueAtTime(0.0001, now);
  oopsGain.gain.exponentialRampToValueAtTime(0.1, now + 0.04);
  oopsGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  oops.connect(oopsGain);
  oopsGain.connect(masterGain);
  oops.start(now);
  oops.stop(now + 0.23);
}

function playCheerSound() {
  if (!audioCtx || !masterGain || !audioUnlocked || audioCtx.state !== "running") {
    return;
  }

  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99];

  for (let i = 0; i < notes.length; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const start = now + i * 0.1;
    const end = start + 0.16;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(notes[i], start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(end);
  }
}

function addScore(points) {
  const previousMilestone = floor(score / 5);
  score += points;
  const newMilestone = floor(score / 5);
  if (newMilestone > previousMilestone) {
    playCheerSound();
  }
}

function drawBackground() {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const c = lerpColor(color("#7ecaf8"), color("#d9f2ff"), t);
    stroke(c);
    line(0, y, width, y);
  }

  noStroke();
  fill(255, 250);
  drawCloud(width * 0.2, height * 0.14, 1.05);
  drawCloud(width * 0.76, height * 0.2, 0.9);
  drawCloud(width * 0.55, height * 0.11, 0.7);

  fill("#7dc87f");
  rect(0, height - 68, width, 68);
  fill("#9ddc9f");
  rect(0, height - 54, width, 54);
}

function drawCloud(x, y, s) {
  ellipse(x, y, 84 * s, 50 * s);
  ellipse(x - 30 * s, y + 5 * s, 52 * s, 38 * s);
  ellipse(x + 32 * s, y + 7 * s, 56 * s, 36 * s);
}

function spawnGhost() {
  const large = random() < 0.38;
  ghosts.push({
    x: random(42, width - 42),
    y: -40,
    size: large ? random(60, 78) : random(34, 50),
    vy: large
      ? random(LARGE_SPEED_MIN, LARGE_SPEED_MAX)
      : random(SMALL_SPEED_MIN, SMALL_SPEED_MAX),
    type: large ? "groot" : "klein",
    wobble: random(TWO_PI),
  });
}

function updateGhosts() {
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i];
    g.y += g.vy;
    g.x += sin(frameCount * 0.05 + g.wobble) * 0.55;
    drawGhost(g);

    if (touchingCatcher(g)) {
      addScore(g.type === "groot" ? 2 : 1);
      makeSparkles(g.x, g.y, "#5ec5a5");
      playCatchSound();
      ghosts.splice(i, 1);
      continue;
    }

    if (g.y - g.size * 0.5 > height) {
      lives -= 1;
      playMissSound();
      ghosts.splice(i, 1);
    }
  }
}

function touchingCatcher(g) {
  const catcherY = height - 66;
  const catcherW = 120;
  const inX = abs(g.x - catcherX) < catcherW * 0.5;
  const inY = g.y + g.size * 0.3 > catcherY - 20;
  return inX && inY;
}

function drawGhost(g) {
  push();
  translate(g.x, g.y);
  scale(g.size / 56);

  const bob = sin(frameCount * 0.08 + g.wobble) * 1.8;
  translate(0, bob);

  noStroke();
  fill(200, 235, 255, 85);
  ellipse(0, 5, 62, 58);

  fill(255, 250);
  ellipse(0, -12, 52, 52);
  rect(-26, -12, 52, 38, 12);

  fill(255, 240);
  ellipse(-28, 0, 12, 16);
  ellipse(28, 0, 12, 16);

  beginShape();
  vertex(-26, 26);
  vertex(-22, 18);
  vertex(-14, 26);
  vertex(-4, 18);
  vertex(7, 26);
  vertex(18, 18);
  vertex(26, 26);
  endShape(CLOSE);

  fill(255, 255, 255, 120);
  ellipse(-9, -22, 15, 11);

  fill("#2f3c55");
  ellipse(-10, -13, 6, 8);
  ellipse(10, -13, 6, 8);
  fill(255);
  ellipse(-9, -14, 2, 2);
  ellipse(11, -14, 2, 2);

  fill("#ffcad8");
  ellipse(-16, -3, 6, 4);
  ellipse(16, -3, 6, 4);

  noFill();
  stroke("#2f3c55");
  strokeWeight(1.8);
  arc(0, -1, 14, 10, 0.1, PI - 0.1);

  pop();
}

function updateCatcher() {
  if (keyLeft) {
    catcherTargetX -= 4.4;
  }
  if (keyRight) {
    catcherTargetX += 4.4;
  }

  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    catcherTargetX = mouseX;
  }

  catcherTargetX = constrain(catcherTargetX, 70, width - 70);
  catcherX = lerp(catcherX, catcherTargetX, 0.25);
}

function drawCatcher() {
  const y = height - 62;
  push();
  translate(catcherX, y);

  noStroke();
  fill("#ffb347");
  rectMode(CENTER);
  rect(0, 18, 124, 30, 12);
  fill("#ffe19f");
  rect(0, 8, 124, 15, 8);

  stroke("#2f3c55");
  strokeWeight(3);
  noFill();
  arc(0, -2, 116, 34, PI, TWO_PI);

  pop();
}

function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 1;

    noStroke();
    fill(s.c + hex(floor(map(s.life, 0, 20, 0, 255)), 2));
    circle(s.x, s.y, 5);

    if (s.life <= 0) {
      sparkles.splice(i, 1);
    }
  }
}

function makeSparkles(x, y, c) {
  for (let i = 0; i < 8; i++) {
    sparkles.push({
      x,
      y,
      vx: random(-2.2, 2.2),
      vy: random(-1.8, 1.8),
      life: 20,
      c,
    });
  }
}

function drawHud() {
  noStroke();
  fill("#fff8e8");
  rect(14, 12, 240, 72, 14);

  fill("#2f3c55");
  textAlign(LEFT, TOP);
  textSize(26);
  text(`Score: ${score}`, 26, 20);
  textSize(23);
  text(`Levens: ${lives}`, 26, 48);

  textAlign(RIGHT, TOP);
  textSize(16);
  text("Tik/Klik op spookjes", width - 20, 18);
  text("Pijltjes = vangnet", width - 20, 38);
}

function drawGameOver() {
  noStroke();
  fill(47, 60, 85, 180);
  rect(0, 0, width, height);

  fill("#fff8e8");
  rect(width * 0.5 - 170, height * 0.5 - 90, 340, 180, 22);

  fill("#2f3c55");
  textAlign(CENTER, CENTER);
  textSize(46);
  text("Klaar!", width * 0.5, height * 0.5 - 30);
  textSize(30);
  text(`Score: ${score}`, width * 0.5, height * 0.5 + 14);
  textSize(20);
  text("Druk op R om opnieuw te starten", width * 0.5, height * 0.5 + 52);
}

function tryCatchAt(px, py) {
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i];
    if (dist(px, py, g.x, g.y) < g.size * 0.5) {
      addScore(g.type === "groot" ? 2 : 1);
      makeSparkles(g.x, g.y, "#ffb347");
      playCatchSound();
      ghosts.splice(i, 1);
      return;
    }
  }
}

function mousePressed() {
  ensureAudioReady();
  if (lives > 0) {
    tryCatchAt(mouseX, mouseY);
  }
}

function touchStarted() {
  ensureAudioReady();
  if (lives > 0 && touches.length > 0) {
    tryCatchAt(touches[0].x, touches[0].y);
  }
  return false;
}

function keyPressed() {
  ensureAudioReady();
  if (keyCode === LEFT_ARROW) {
    keyLeft = true;
  }
  if (keyCode === RIGHT_ARROW) {
    keyRight = true;
  }
  if ((key === "r" || key === "R") && lives <= 0) {
    restartGame();
  }
}

function keyReleased() {
  if (keyCode === LEFT_ARROW) {
    keyLeft = false;
  }
  if (keyCode === RIGHT_ARROW) {
    keyRight = false;
  }
}

function restartGame() {
  score = 0;
  lives = 7;
  ghosts.length = 0;
  sparkles.length = 0;
  lastSpawn = millis();
  loop();
}

function windowResized() {
  const w = min(windowWidth - 24, 920);
  const h = constrain(windowHeight * 0.68, 450, 640);
  resizeCanvas(w, h);
  catcherTargetX = constrain(catcherTargetX, 70, width - 70);
  catcherX = constrain(catcherX, 70, width - 70);
}
