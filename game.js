(() => {
  'use strict';

  // ---------- Grid / Map ----------
  const COLS = 15;
  const ROWS = 10;
  const CELL = 50;

  // Waypoints given as grid cells; consecutive waypoints share a row or column
  // so every cell in between can be derived (used for path drawing + blocking
  // tower placement on the path).
  const WAYPOINT_CELLS = [
    { col: 0, row: 4 },
    { col: 3, row: 4 },
    { col: 3, row: 1 },
    { col: 7, row: 1 },
    { col: 7, row: 7 },
    { col: 11, row: 7 },
    { col: 11, row: 3 },
    { col: 14, row: 3 },
  ];

  function cellCenter(col, row) {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  const WAYPOINTS = WAYPOINT_CELLS.map(c => cellCenter(c.col, c.row));

  const PATH_CELLS = new Set();
  for (let i = 0; i < WAYPOINT_CELLS.length - 1; i++) {
    const a = WAYPOINT_CELLS[i];
    const b = WAYPOINT_CELLS[i + 1];
    const stepCol = Math.sign(b.col - a.col);
    const stepRow = Math.sign(b.row - a.row);
    let { col, row } = a;
    PATH_CELLS.add(`${col},${row}`);
    while (col !== b.col || row !== b.row) {
      col += stepCol;
      row += stepRow;
      PATH_CELLS.add(`${col},${row}`);
    }
  }

  function isPathCell(col, row) {
    return PATH_CELLS.has(`${col},${row}`);
  }

  // ---------- Tower definitions ----------
  const TOWER_TYPES = [
    { id: 'gatling', name: 'Gatling', cost: 50, range: 100, fireRate: 0.15, damage: 8, splash: 0, color: '#ffb703', projectileColor: '#ffe08a' },
    { id: 'cannon', name: 'Cannon', cost: 100, range: 90, fireRate: 1.2, damage: 40, splash: 45, color: '#6c757d', projectileColor: '#cfd4da' },
    { id: 'sniper', name: 'Sniper', cost: 150, range: 220, fireRate: 1.8, damage: 70, splash: 0, color: '#9d4edd', projectileColor: '#d9b8fa' },
  ];

  // ---------- Wave config ----------
  const TOTAL_WAVES = 10;
  const START_GOLD = 200;
  const START_LIVES = 20;
  const SPAWN_INTERVAL = 0.7; // seconds between enemy spawns within a wave

  function waveEnemyCount(wave) {
    return 5 + (wave - 1) * 2;
  }
  function waveEnemyHp(wave) {
    return 50 + (wave - 1) * 18;
  }
  function waveEnemySpeed(wave) {
    return 60 + (wave - 1) * 4;
  }

  // ---------- Entities ----------
  class Enemy {
    constructor(wave) {
      const start = WAYPOINTS[0];
      this.x = start.x;
      this.y = start.y;
      this.waypointIndex = 0;
      this.maxHp = waveEnemyHp(wave);
      this.hp = this.maxHp;
      this.speed = waveEnemySpeed(wave);
      this.reward = 10;
      this.dead = false;
      this.reachedBase = false;
      this.radius = 12;
    }

    update(dt) {
      let remaining = this.speed * dt;
      while (remaining > 0 && this.waypointIndex < WAYPOINTS.length - 1) {
        const target = WAYPOINTS[this.waypointIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= remaining) {
          this.x = target.x;
          this.y = target.y;
          remaining -= dist;
          this.waypointIndex++;
        } else {
          this.x += (dx / dist) * remaining;
          this.y += (dy / dist) * remaining;
          remaining = 0;
        }
      }
      if (this.waypointIndex >= WAYPOINTS.length - 1) {
        this.reachedBase = true;
      }
    }

    takeDamage(amount) {
      if (this.dead) return;
      this.hp -= amount;
      if (this.hp <= 0) this.dead = true;
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#e63946';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#7a0d15';
      ctx.stroke();

      const barW = 26;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, 5);
      ctx.fillStyle = pct > 0.4 ? '#4caf50' : '#e63946';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * pct, 5);
    }
  }

  class Projectile {
    constructor(x, y, target, damage, splash, color) {
      this.x = x;
      this.y = y;
      this.target = target;
      this.damage = damage;
      this.splash = splash;
      this.color = color;
      this.speed = 400;
      this.done = false;
      this.impactX = target.x;
      this.impactY = target.y;
    }

    update(dt, enemies) {
      if (!this.target.dead) {
        this.impactX = this.target.x;
        this.impactY = this.target.y;
      }
      const dx = this.impactX - this.x;
      const dy = this.impactY - this.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (dist <= step) {
        this.x = this.impactX;
        this.y = this.impactY;
        this.hit(enemies);
        this.done = true;
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    }

    hit(enemies) {
      if (this.splash > 0) {
        for (const e of enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - this.impactX, e.y - this.impactY) <= this.splash) {
            e.takeDamage(this.damage);
          }
        }
      } else if (!this.target.dead) {
        this.target.takeDamage(this.damage);
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  class Tower {
    constructor(type, col, row) {
      this.type = type;
      this.col = col;
      this.row = row;
      const c = cellCenter(col, row);
      this.x = c.x;
      this.y = c.y;
      this.cooldown = 0;
      this.target = null;
    }

    update(dt, enemies, projectiles) {
      this.cooldown -= dt;
      if (this.target && (this.target.dead || this.outOfRange(this.target))) {
        this.target = null;
      }
      if (!this.target) {
        this.target = this.acquireTarget(enemies);
      }
      if (this.target && this.cooldown <= 0) {
        this.cooldown = this.type.fireRate;
        projectiles.push(new Projectile(this.x, this.y, this.target, this.type.damage, this.type.splash, this.type.projectileColor));
      }
    }

    outOfRange(enemy) {
      return Math.hypot(enemy.x - this.x, enemy.y - this.y) > this.type.range;
    }

    acquireTarget(enemies) {
      let best = null;
      let bestProgress = -1;
      for (const e of enemies) {
        if (e.dead) continue;
        if (this.outOfRange(e)) continue;
        if (e.waypointIndex > bestProgress) {
          bestProgress = e.waypointIndex;
          best = e;
        }
      }
      return best;
    }

    draw(ctx, showRange) {
      if (showRange) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.type.range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.stroke();
      }
      ctx.fillStyle = '#3d3d3d';
      ctx.fillRect(this.x - CELL / 2 + 4, this.y - CELL / 2 + 4, CELL - 8, CELL - 8);

      ctx.fillStyle = this.type.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#222';
      ctx.stroke();

      if (this.target) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.stroke();
      }
    }
  }

  // ---------- Game state ----------
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const goldEl = document.getElementById('gold-value');
  const livesEl = document.getElementById('lives-value');
  const waveEl = document.getElementById('wave-value');
  const startWaveBtn = document.getElementById('start-wave-btn');
  const towerListEl = document.getElementById('tower-list');
  const overlayEl = document.getElementById('overlay');
  const overlayMessageEl = document.getElementById('overlay-message');
  const restartBtn = document.getElementById('restart-btn');

  const state = {
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0,
    phase: 'idle', // idle | wave | gameover | win
    towers: [],
    towerGrid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [],
    projectiles: [],
    selectedTowerId: null,
    hoverCell: null,
    spawnedThisWave: 0,
    spawnTimer: 0,
    lastTime: null,
  };

  function buildTowerButtons() {
    towerListEl.innerHTML = '';
    for (const type of TOWER_TYPES) {
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.id = type.id;
      btn.innerHTML = `
        <span class="tower-swatch" style="background:${type.color}"></span>
        <span class="tower-info">
          <span class="tower-name">${type.name}</span>
          <span class="tower-cost">${type.cost}g</span>
        </span>`;
      btn.addEventListener('click', () => {
        if (state.phase === 'gameover' || state.phase === 'win') return;
        state.selectedTowerId = state.selectedTowerId === type.id ? null : type.id;
        refreshTowerButtons();
      });
      towerListEl.appendChild(btn);
    }
  }

  function refreshTowerButtons() {
    for (const btn of towerListEl.children) {
      const type = TOWER_TYPES.find(t => t.id === btn.dataset.id);
      btn.classList.toggle('selected', state.selectedTowerId === type.id);
      btn.disabled = state.gold < type.cost;
    }
  }

  function updateStats() {
    goldEl.textContent = state.gold;
    livesEl.textContent = state.lives;
    waveEl.textContent = `${Math.min(state.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`;
    startWaveBtn.disabled = state.phase === 'wave' || state.phase === 'gameover' || state.phase === 'win';
    refreshTowerButtons();
  }

  function canvasCell(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    return { col, row, x, y };
  }

  canvas.addEventListener('mousemove', evt => {
    const { col, row } = canvasCell(evt);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      state.hoverCell = { col, row };
    } else {
      state.hoverCell = null;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    state.hoverCell = null;
  });

  canvas.addEventListener('click', evt => {
    if (state.phase === 'gameover' || state.phase === 'win') return;
    const { col, row } = canvasCell(evt);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (!state.selectedTowerId) return;

    const type = TOWER_TYPES.find(t => t.id === state.selectedTowerId);
    if (isPathCell(col, row)) return;
    if (state.towerGrid[row][col]) return;
    if (state.gold < type.cost) return;

    const tower = new Tower(type, col, row);
    state.towers.push(tower);
    state.towerGrid[row][col] = tower;
    state.gold -= type.cost;
    updateStats();
  });

  startWaveBtn.addEventListener('click', () => {
    if (state.phase !== 'idle') return;
    state.wave++;
    state.phase = 'wave';
    state.spawnedThisWave = 0;
    state.spawnTimer = 0;
    updateStats();
  });

  restartBtn.addEventListener('click', resetGame);

  function resetGame() {
    state.gold = START_GOLD;
    state.lives = START_LIVES;
    state.wave = 0;
    state.phase = 'idle';
    state.towers = [];
    state.towerGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    state.enemies = [];
    state.projectiles = [];
    state.selectedTowerId = null;
    state.spawnedThisWave = 0;
    state.spawnTimer = 0;
    overlayEl.classList.add('hidden');
    updateStats();
  }

  function showOverlay(message) {
    overlayMessageEl.textContent = message;
    overlayEl.classList.remove('hidden');
  }

  // ---------- Update ----------
  function update(dt) {
    if (state.phase === 'wave') {
      const targetCount = waveEnemyCount(state.wave);
      state.spawnTimer -= dt;
      if (state.spawnedThisWave < targetCount && state.spawnTimer <= 0) {
        state.enemies.push(new Enemy(state.wave));
        state.spawnedThisWave++;
        state.spawnTimer = SPAWN_INTERVAL;
      }

      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.reachedBase) continue;
        enemy.update(dt);
        if (enemy.reachedBase) {
          state.lives--;
        }
      }

      for (const enemy of state.enemies) {
        if (enemy.dead && !enemy.rewarded) {
          enemy.rewarded = true;
          state.gold += enemy.reward;
        }
      }

      state.enemies = state.enemies.filter(e => !e.dead && !e.reachedBase);

      if (state.lives <= 0) {
        state.lives = 0;
        state.phase = 'gameover';
        showOverlay('Game Over');
      } else if (state.spawnedThisWave >= targetCount && state.enemies.length === 0) {
        if (state.wave >= TOTAL_WAVES) {
          state.phase = 'win';
          showOverlay('You Win!');
        } else {
          state.phase = 'idle';
        }
      }
      updateStats();
    }

    for (const tower of state.towers) {
      tower.update(dt, state.enemies, state.projectiles);
    }

    for (const p of state.projectiles) {
      p.update(dt, state.enemies);
    }
    state.projectiles = state.projectiles.filter(p => !p.done);

    // Re-check deaths/rewards caused by projectile hits this frame
    for (const enemy of state.enemies) {
      if (enemy.dead && !enemy.rewarded) {
        enemy.rewarded = true;
        state.gold += enemy.reward;
      }
    }
  }

  // ---------- Draw ----------
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }

    // path
    for (const key of PATH_CELLS) {
      const [col, row] = key.split(',').map(Number);
      ctx.fillStyle = '#c9a66b';
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
    // spawn + base markers
    const spawnC = WAYPOINT_CELLS[0];
    const baseC = WAYPOINT_CELLS[WAYPOINT_CELLS.length - 1];
    ctx.fillStyle = 'rgba(76,175,80,0.6)';
    ctx.fillRect(spawnC.col * CELL, spawnC.row * CELL, CELL, CELL);
    ctx.fillStyle = 'rgba(230,57,70,0.6)';
    ctx.fillRect(baseC.col * CELL, baseC.row * CELL, CELL, CELL);

    // hover preview
    if (state.hoverCell && state.selectedTowerId && state.phase !== 'gameover' && state.phase !== 'win') {
      const { col, row } = state.hoverCell;
      const type = TOWER_TYPES.find(t => t.id === state.selectedTowerId);
      const valid = !isPathCell(col, row) && !state.towerGrid[row][col] && state.gold >= type.cost;
      const c = cellCenter(col, row);
      ctx.beginPath();
      ctx.arc(c.x, c.y, type.range, 0, Math.PI * 2);
      ctx.fillStyle = valid ? 'rgba(255,255,255,0.10)' : 'rgba(230,57,70,0.12)';
      ctx.fill();
      ctx.strokeStyle = valid ? 'rgba(255,255,255,0.4)' : 'rgba(230,57,70,0.5)';
      ctx.stroke();

      ctx.fillStyle = valid ? 'rgba(255,255,255,0.25)' : 'rgba(230,57,70,0.35)';
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }

    // towers
    for (const tower of state.towers) {
      const isHovered = state.hoverCell && state.hoverCell.col === tower.col && state.hoverCell.row === tower.row;
      tower.draw(ctx, isHovered && !state.selectedTowerId);
    }

    // enemies
    for (const enemy of state.enemies) {
      enemy.draw(ctx);
    }

    // projectiles
    for (const p of state.projectiles) {
      p.draw(ctx);
    }
  }

  // ---------- Main loop ----------
  function loop(timestamp) {
    if (state.lastTime === null) state.lastTime = timestamp;
    let dt = (timestamp - state.lastTime) / 1000;
    state.lastTime = timestamp;
    dt = Math.min(dt, 0.05); // clamp to avoid huge jumps on tab-switch

    if (state.phase !== 'gameover' && state.phase !== 'win') {
      update(dt);
    }
    draw();
    requestAnimationFrame(loop);
  }

  buildTowerButtons();
  updateStats();
  requestAnimationFrame(loop);
})();
