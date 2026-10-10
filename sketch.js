const ghosts = [];
const sparkles = [];

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
}

function draw() {
  drawBackground();

  if (millis() - lastSpawn > 680) {
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
    vy: large ? random(1.1, 1.8) : random(2.1, 3.2),
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
      score += g.type === "groot" ? 2 : 1;
      makeSparkles(g.x, g.y, "#5ec5a5");
      ghosts.splice(i, 1);
      continue;
    }

    if (g.y - g.size * 0.5 > height) {
      lives -= 1;
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

  noStroke();
  fill(255, 245);
  ellipse(0, -10, 52, 52);
  rect(-26, -10, 52, 34, 10);

  beginShape();
  vertex(-26, 24);
  vertex(-18, 16);
  vertex(-8, 24);
  vertex(2, 16);
  vertex(14, 24);
  vertex(26, 16);
  vertex(26, 24);
  endShape(CLOSE);

  fill("#2f3c55");
  ellipse(-10, -12, 5, 7);
  ellipse(10, -12, 5, 7);
  noFill();
  stroke("#2f3c55");
  strokeWeight(2);
  arc(0, -2, 12, 8, 0, PI);

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
      score += g.type === "groot" ? 2 : 1;
      makeSparkles(g.x, g.y, "#ffb347");
      ghosts.splice(i, 1);
      return;
    }
  }
}

function mousePressed() {
  if (lives > 0) {
    tryCatchAt(mouseX, mouseY);
  }
}

function touchStarted() {
  if (lives > 0 && touches.length > 0) {
    tryCatchAt(touches[0].x, touches[0].y);
  }
  return false;
}

function keyPressed() {
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
