// ============================================================
// core.js — 像素俯视角射击游戏「核心框架」
// 全局接口: canvas, ctx, game, INPUT, camera, map
// ============================================================

// ==================== 工具函数 ====================

function rectIntersect(r1, r2) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max));
}

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== Input 类 ====================

class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseWorldX = 0;
    this.mouseWorldY = 0;
    this.mouseDown = false;
    this.mouseJustPressed = false;
    this.touchMoveId = null;
    this.touchAimId = null;
    this.joystick = {
      active: false,
      baseX: 0,
      baseY: 0,
      knobX: 0,
      knobY: 0,
      dx: 0,
      dy: 0,
      radius: 58,
    };
    this.mobileActions = new Set();

    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundContextMenu = this._onContextMenu.bind(this);
    this._boundTouchStart = this._onTouchStart.bind(this);
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);

    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    canvas.addEventListener('mousemove', this._boundMouseMove);
    canvas.addEventListener('mousedown', this._boundMouseDown);
    canvas.addEventListener('mouseup', this._boundMouseUp);
    canvas.addEventListener('contextmenu', this._boundContextMenu);
    canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._boundTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this._boundTouchEnd, { passive: false });
  }

  hasTouchInput() {
    const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : null);
    return !!(nav && nav.maxTouchPoints > 0);
  }

  hasCoarsePointer() {
    return !!(
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  prefersTouchControls() {
    return this.hasTouchInput() || this.hasCoarsePointer();
  }

  isMobileLayout() {
    return this.prefersTouchControls();
  }

  isCompactLandscape() {
    return this.isMobileLayout() && this.canvas.width > this.canvas.height && this.canvas.height <= 430;
  }

  getJoystickRadius() {
    if (this.isCompactLandscape()) return Math.max(40, Math.min(48, this.canvas.height * 0.12));
    return Math.max(48, Math.min(58, Math.min(this.canvas.width, this.canvas.height) * 0.15));
  }

  getJoystickRestPosition() {
    const radius = this.getJoystickRadius();
    return {
      x: 20 + radius,
      y: this.canvas.height - 28 - radius,
    };
  }

  hasOpenTouchUI() {
    if (typeof game === 'undefined' || !game) return false;
    return !!(
      (game.shopSystem && game.shopSystem.open) ||
      (game.upgradeSystem && game.upgradeSystem.open) ||
      (game.equipmentUI && game.equipmentUI.open) ||
      (game.relicSystem && game.relicSystem.showChoice)
    );
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    // Prevent default for game keys to avoid page scrolling
    const gameKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9',
      'KeyB', 'KeyU', 'KeyR', 'KeyE', 'KeyQ', 'KeyT', 'KeyY', 'KeyF', 'KeyC', 'KeyV',
      'ShiftLeft', 'ShiftRight', 'Space', 'Escape'
    ];
    if (gameKeys.includes(e.code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this.mouseDown = true;
      this.mouseJustPressed = true;
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
  }

  _eventPoint(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      id: touch.identifier,
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  getMobileButtons() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const landscape = this.isCompactLandscape();
    const size = landscape
      ? Math.max(40, Math.min(46, Math.min(W, H) * 0.12))
      : Math.max(44, Math.min(58, Math.min(W, H) * 0.12));
    const gap = landscape ? 8 : 10;
    const right = W - (landscape ? 12 : 16) - size;
    const bottom = H - (landscape ? 10 : 18) - size;
    const shopY = landscape ? 12 : Math.max(64, H * 0.08);
    return [
      { id: 'shop', icon: 'cart', x: right, y: shopY, w: size, h: size },
      { id: 'dash', icon: 'dash', x: right, y: bottom - (size + gap), w: size, h: size },
      { id: 'interact', icon: 'interact', x: right - (size + gap), y: bottom, w: size, h: size },
      { id: 'nextWeapon', icon: 'swap', x: right, y: bottom, w: size, h: size },
      ...this.getMobileSkillButtons(),
    ];
  }

  getMobileSkillButtons() {
    const skillIds = this._getMobileSkillIds();
    if (skillIds.length === 0) return [];

    const W = this.canvas.width;
    const H = this.canvas.height;
    const landscape = this.isCompactLandscape();
    const gap = landscape ? 6 : 8;

    if (landscape) {
      const size = Math.max(32, Math.min(38, H * 0.105));
      const totalW = skillIds.length * size + (skillIds.length - 1) * gap;
      const minX = Math.max(132, this.getJoystickRestPosition().x + this.getJoystickRadius() + 18);
      const maxX = Math.max(minX, W - totalW - 160);
      const x = Math.max(minX, Math.min(maxX, (W - totalW) / 2));
      const y = H - size - 10;
      return skillIds.map((id, i) => ({
        id: `skill:${id}`,
        skillId: id,
        icon: this._skillIcon(id),
        x: x + i * (size + gap),
        y,
        w: size,
        h: size,
      }));
    }

    const size = Math.max(38, Math.min(46, W * 0.12));
    const cols = 2;
    const x = W - 16 - cols * size - (cols - 1) * gap;
    const y = Math.max(104, Math.min(H * 0.18, H - 340));
    return skillIds.map((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: `skill:${id}`,
        skillId: id,
        icon: this._skillIcon(id),
        x: x + col * (size + gap),
        y: y + row * (size + gap),
        w: size,
        h: size,
      };
    });
  }

  _getMobileSkillIds() {
    if (typeof game === 'undefined' || !game || !game.heroSkillSystem) return [];
    const skills = typeof HERO_SKILL_DATA !== 'undefined' ? HERO_SKILL_DATA : game.heroSkillSystem.skills;
    return Object.keys(skills).filter(id => game.heroSkillSystem.isUnlocked(id));
  }

  _skillIcon(id) {
    const icons = {
      shockwave: 'shockwave',
      phaseDash: 'phase',
      medField: 'heal',
      stasisGrenade: 'stasis',
      orbitalStrike: 'orbital',
      nanoSwarm: 'nano',
    };
    return icons[id] || 'pulse';
  }

  _hitMobileButton(x, y) {
    if (!this.isMobileLayout()) return null;
    return this.getMobileButtons().find(btn => (
      x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h
    )) || null;
  }

  consumeAction(id) {
    if (!this.mobileActions.has(id)) return false;
    this.mobileActions.delete(id);
    return true;
  }

  _onTouchStart(e) {
    if (e.preventDefault) e.preventDefault();
    for (const touch of Array.from(e.changedTouches || [])) {
      const p = this._eventPoint(touch);
      if (this.hasOpenTouchUI()) continue;

      const button = this._hitMobileButton(p.x, p.y);
      if (button) {
        this.mobileActions.add(button.id);
        continue;
      }

      if (p.x < this.canvas.width * 0.45 && this.touchMoveId === null) {
        this.touchMoveId = p.id;
        this.joystick.radius = this.getJoystickRadius();
        this.joystick.active = true;
        this.joystick.baseX = p.x;
        this.joystick.baseY = p.y;
        this.joystick.knobX = p.x;
        this.joystick.knobY = p.y;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
      } else if (this.touchAimId === null) {
        this.touchAimId = p.id;
        this.mouseX = p.x;
        this.mouseY = p.y;
        this.mouseDown = true;
        this.mouseJustPressed = true;
      }
    }
  }

  _onTouchMove(e) {
    if (e.preventDefault) e.preventDefault();
    for (const touch of Array.from(e.changedTouches || [])) {
      const p = this._eventPoint(touch);
      if (this.hasOpenTouchUI()) continue;

      if (p.id === this.touchMoveId) {
        const rawDx = p.x - this.joystick.baseX;
        const rawDy = p.y - this.joystick.baseY;
        const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        const limit = this.joystick.radius;
        const clamped = len > limit ? limit / len : 1;
        this.joystick.knobX = this.joystick.baseX + rawDx * clamped;
        this.joystick.knobY = this.joystick.baseY + rawDy * clamped;
        this.joystick.dx = len > 6 ? (rawDx * clamped) / limit : 0;
        this.joystick.dy = len > 6 ? (rawDy * clamped) / limit : 0;
      } else if (p.id === this.touchAimId) {
        this.mouseX = p.x;
        this.mouseY = p.y;
        this.mouseDown = true;
      }
    }
  }

  _onTouchEnd(e) {
    if (e.preventDefault) e.preventDefault();
    for (const touch of Array.from(e.changedTouches || [])) {
      const p = this._eventPoint(touch);
      if (p.id === this.touchMoveId) {
        this.touchMoveId = null;
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.keys.KeyW = false;
        this.keys.KeyA = false;
        this.keys.KeyS = false;
        this.keys.KeyD = false;
      }
      if (p.id === this.touchAimId) {
        this.touchAimId = null;
        this.mouseDown = false;
      }
    }
  }

  update(camera) {
    if (this.isMobileLayout()) {
      const deadzone = 0.22;
      this.keys.KeyA = this.joystick.active && this.joystick.dx < -deadzone;
      this.keys.KeyD = this.joystick.active && this.joystick.dx > deadzone;
      this.keys.KeyW = this.joystick.active && this.joystick.dy < -deadzone;
      this.keys.KeyS = this.joystick.active && this.joystick.dy > deadzone;
    }
    // Convert screen mouse coordinates to world coordinates
    if (camera) {
      this.mouseWorldX = this.mouseX + camera.x;
      this.mouseWorldY = this.mouseY + camera.y;
    } else {
      this.mouseWorldX = this.mouseX;
      this.mouseWorldY = this.mouseY;
    }
  }

  // Call this at the end of each frame to reset one-frame flags
  endFrame() {
    this.mouseJustPressed = false;
  }

  drawMobileControls(ctx) {
    if (!this.isMobileLayout()) return;
    this.joystick.radius = this.getJoystickRadius();
    ctx.save();
    ctx.lineWidth = 2;
    if (this.joystick.active) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#8cf';
      ctx.beginPath();
      ctx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#66aaff';
      ctx.beginPath();
      ctx.arc(this.joystick.knobX, this.joystick.knobY, Math.max(18, this.joystick.radius * 0.42), 0, Math.PI * 2);
      ctx.fill();
    } else {
      const { x, y } = this.getJoystickRestPosition();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#8cf';
      ctx.beginPath();
      ctx.arc(x, y, this.joystick.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const btn of this.getMobileButtons()) {
      this._drawMobileButton(ctx, btn);
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  _mobileButtonColor(icon) {
    const colors = {
      cart: '#d6a73a',
      pulse: '#33b6ff',
      dash: '#a78bfa',
      interact: '#4ade80',
      swap: '#60a5fa',
      shockwave: '#33b6ff',
      phase: '#a78bfa',
      heal: '#4ade80',
      stasis: '#b084ff',
      orbital: '#ffcc66',
      nano: '#66ffcc',
    };
    return colors[icon] || '#7aa7ff';
  }

  _drawMobileButton(ctx, btn) {
    const accent = this._mobileButtonColor(btn.icon);
    ctx.save();
    ctx.globalAlpha = 0.64;
    ctx.fillStyle = 'rgba(10, 15, 24, 0.78)';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    if (btn.skillId && typeof game !== 'undefined' && game.heroSkillSystem) {
      const cooldown = game.heroSkillSystem.cooldowns[btn.skillId] || 0;
      const skill = game.heroSkillSystem.getEffectiveSkill
        ? game.heroSkillSystem.getEffectiveSkill(btn.skillId)
        : game.heroSkillSystem.skills[btn.skillId];
      if (cooldown > 0 && skill) {
        const ratio = Math.max(0, Math.min(1, cooldown / skill.cooldown));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h * ratio);
      }
    }

    ctx.globalAlpha = 0.96;
    ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
    const scale = btn.w / 48;
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this._drawMobileIcon(ctx, btn.icon);
    ctx.restore();
  }

  _drawMobileIcon(ctx, icon) {
    if (icon === 'cart') {
      ctx.beginPath();
      ctx.moveTo(-17, -12);
      ctx.lineTo(-11, -12);
      ctx.lineTo(-7, 6);
      ctx.lineTo(12, 6);
      ctx.lineTo(16, -5);
      ctx.lineTo(-8, -5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-4, 13, 3, 0, Math.PI * 2);
      ctx.arc(10, 13, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (icon === 'pulse') {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 13, Math.PI * 0.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 20, Math.PI * 0.18, Math.PI * 1.82);
      ctx.stroke();
      return;
    }

    if (icon === 'shockwave') {
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      for (const r of [12, 20]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.1, Math.PI * 1.9);
        ctx.stroke();
      }
      return;
    }

    if (icon === 'dash') {
      ctx.beginPath();
      ctx.moveTo(-3, -20);
      ctx.lineTo(-14, 1);
      ctx.lineTo(-3, 1);
      ctx.lineTo(-8, 20);
      ctx.lineTo(14, -5);
      ctx.lineTo(2, -5);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (icon === 'phase') {
      ctx.beginPath();
      ctx.moveTo(-18, 8);
      ctx.lineTo(2, -16);
      ctx.lineTo(0, -2);
      ctx.lineTo(18, -8);
      ctx.lineTo(-2, 16);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (icon === 'heal') {
      ctx.fillRect(-5, -18, 10, 36);
      ctx.fillRect(-18, -5, 36, 10);
      return;
    }

    if (icon === 'stasis') {
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, 17);
      ctx.moveTo(-17, 0);
      ctx.lineTo(17, 0);
      ctx.stroke();
      return;
    }

    if (icon === 'orbital') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 8, -0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, -18);
      ctx.lineTo(5, -4);
      ctx.stroke();
      return;
    }

    if (icon === 'nano') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 13, Math.sin(a) * 13, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (icon === 'interact') {
      ctx.beginPath();
      ctx.rect(-16, -18, 19, 36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(17, 0);
      ctx.moveTo(9, -8);
      ctx.lineTo(17, 0);
      ctx.lineTo(9, 8);
      ctx.stroke();
      return;
    }

    if (icon === 'swap') {
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(2, -12);
      ctx.moveTo(8, -6);
      ctx.lineTo(2, 0);
      ctx.moveTo(16, 6);
      ctx.lineTo(-8, 6);
      ctx.lineTo(-2, 12);
      ctx.moveTo(-8, 6);
      ctx.lineTo(-2, 0);
      ctx.stroke();
    }
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    this.canvas.removeEventListener('mouseup', this._boundMouseUp);
    this.canvas.removeEventListener('contextmenu', this._boundContextMenu);
    this.canvas.removeEventListener('touchstart', this._boundTouchStart);
    this.canvas.removeEventListener('touchmove', this._boundTouchMove);
    this.canvas.removeEventListener('touchend', this._boundTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._boundTouchEnd);
  }
}

// ==================== Camera 类 ====================

class Camera {
  constructor(w, h) {
    this.x = 0;
    this.y = 0;
    this.w = w;
    this.h = h;
    this.smoothSpeed = 0.12;
  }

  follow(target, mapWidth, mapHeight) {
    // Target camera position (centered on target)
    const targetX = target.x - this.w / 2;
    const targetY = target.y - this.h / 2;

    // Smooth interpolation
    this.x = lerp(this.x, targetX, this.smoothSpeed);
    this.y = lerp(this.y, targetY, this.smoothSpeed);

    // Clamp to map boundaries
    if (mapWidth !== undefined && mapHeight !== undefined) {
      this.x = Math.max(0, Math.min(this.x, mapWidth - this.w));
      this.y = Math.max(0, Math.min(this.y, mapHeight - this.h));
    }
  }
}

// ==================== Map 类 ====================

// 地图主题配置
const MAP_THEMES = {
  grass: {
    groundColors: ['#4a5d3a', '#3d4f30', '#526b40'],
    wallBody: '#5a4a3a',
    wallBorder: '#3a2a1a',
    wallRoof: '#6a5a4a',
    gridColor: '#3d4f30',
    outOfBounds: '#3d4f2a',
    buildingCount: [10, 18],
  },
  desert: {
    groundColors: ['#c4a35a', '#b8934a', '#d4b36a'],
    wallBody: '#8a7a5a',
    wallBorder: '#5a4a2a',
    wallRoof: '#9a8a6a',
    gridColor: '#b8934a',
    outOfBounds: '#c4a35a',
    buildingCount: [6, 12],
  },
  snow: {
    groundColors: ['#d0d8e0', '#c0c8d0', '#e0e8f0'],
    wallBody: '#6a7a8a',
    wallBorder: '#4a5a6a',
    wallRoof: '#7a8a9a',
    gridColor: '#c0c8d0',
    outOfBounds: '#d0d8e0',
    buildingCount: [12, 22],
  },
  ruins: {
    groundColors: ['#5a5a5a', '#4a4a4a', '#6a6a6a'],
    wallBody: '#3a3a3a',
    wallBorder: '#1a1a1a',
    wallRoof: '#4a4a4a',
    gridColor: '#4a4a4a',
    outOfBounds: '#5a5a5a',
    buildingCount: [15, 25],
  },
};

class Map {
  constructor(width, height, tileSize) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.walls = [];      // Array of {x, y, w, h} rectangles (buildings/obstacles)
    this.ground = [];     // 2D grid for ground type info
    this.borderWidth = tileSize;
    this.theme = 'grass';
    this.themeConfig = MAP_THEMES.grass;
  }

  setTheme(themeName) {
    this.theme = themeName;
    this.themeConfig = MAP_THEMES[themeName] || MAP_THEMES.grass;
  }

  generate(themeName) {
    if (themeName) this.setTheme(themeName);
    const cfg = this.themeConfig;
    this.walls = [];
    this.ground = [];

    const cols = Math.ceil(this.width / this.tileSize);
    const rows = Math.ceil(this.height / this.tileSize);

    // Initialize ground grid
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        // Random ground variation for visual interest
        row.push(Math.random() < 0.05 ? 1 : (Math.random() < 0.02 ? 2 : 0));
      }
      this.ground.push(row);
    }

    // Create border walls
    const b = this.borderWidth;
    // Top border
    this.walls.push({ x: 0, y: 0, w: this.width, h: b });
    // Bottom border
    this.walls.push({ x: 0, y: this.height - b, w: this.width, h: b });
    // Left border
    this.walls.push({ x: 0, y: 0, w: b, h: this.height });
    // Right border
    this.walls.push({ x: this.width - b, y: 0, w: b, h: this.height });

    // Generate random buildings as cover/obstacles
    const [minBuildings, maxBuildings] = cfg.buildingCount;
    const buildingCount = randInt(minBuildings, maxBuildings + 1);
    const margin = b + 100; // Keep away from border
    const minBuildingSize = 60;
    const maxBuildingSize = 200;
    const minGap = 80; // Minimum gap between buildings

    let attempts = 0;
    const maxAttempts = 500;

    while (this.walls.length < 4 + buildingCount && attempts < maxAttempts) {
      attempts++;

      const bw = randInt(minBuildingSize, maxBuildingSize + 1);
      const bh = randInt(minBuildingSize, maxBuildingSize + 1);
      const bx = rand(margin, this.width - margin - bw);
      const by = rand(margin, this.height - margin - bh);

      const newBuilding = { x: bx, y: by, w: bw, h: bh };

      // Check overlap with existing buildings (with gap)
      let overlaps = false;
      for (const wall of this.walls) {
        const gapWall = {
          x: wall.x - minGap,
          y: wall.y - minGap,
          w: wall.w + minGap * 2,
          h: wall.h + minGap * 2
        };
        if (rectIntersect(newBuilding, gapWall)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.walls.push(newBuilding);
      }
    }
  }

  draw(ctx, camera) {
    const cfg = this.themeConfig;
    const startCol = Math.floor(camera.x / this.tileSize);
    const endCol = Math.ceil((camera.x + camera.w) / this.tileSize);
    const startRow = Math.floor(camera.y / this.tileSize);
    const endRow = Math.ceil((camera.y + camera.h) / this.tileSize);

    // Draw ground tiles
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const x = col * this.tileSize;
        const y = row * this.tileSize;

        if (row >= 0 && row < this.ground.length && col >= 0 && col < this.ground[0].length) {
          const tile = this.ground[row][col];
          // Base ground color from theme
          ctx.fillStyle = cfg.groundColors[tile % cfg.groundColors.length];
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          // Grid line
          ctx.strokeStyle = cfg.gridColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        } else {
          // 超出地图边界也画默认地面，避免黑色"虚空"
          ctx.fillStyle = cfg.outOfBounds;
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
      }
    }

    // Draw walls/buildings
    for (const wall of this.walls) {
      // Skip if not visible
      if (
        wall.x + wall.w < camera.x ||
        wall.x > camera.x + camera.w ||
        wall.y + wall.h < camera.y ||
        wall.y > camera.y + camera.h
      ) {
        continue;
      }

      const sx = wall.x;
      const sy = wall.y;

      // Building body
      ctx.fillStyle = cfg.wallBody;
      ctx.fillRect(sx, sy, wall.w, wall.h);

      // Building border
      ctx.strokeStyle = cfg.wallBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, wall.w, wall.h);

      // Roof detail
      ctx.fillStyle = cfg.wallRoof;
      ctx.fillRect(sx + 4, sy + 4, wall.w - 8, wall.h - 8);
    }
  }

  isWalkable(x, y, radius) {
    for (const wall of this.walls) {
      if (circleRectCollision(x, y, radius, wall.x, wall.y, wall.w, wall.h)) {
        return false;
      }
    }
    // Check map boundaries
    if (x - radius < 0 || x + radius > this.width ||
        y - radius < 0 || y + radius > this.height) {
      return false;
    }
    return true;
  }

  getSpawnPoints(count, playerX, playerY, minDist) {
    const points = [];
    const margin = this.borderWidth + 50;
    let attempts = 0;
    const maxAttempts = count * 50;

    while (points.length < count && attempts < maxAttempts) {
      attempts++;

      const x = rand(margin, this.width - margin);
      const y = rand(margin, this.height - margin);

      // Must be far from player
      if (dist(x, y, playerX, playerY) < minDist) {
        continue;
      }

      // Must not be inside a wall
      if (!this.isWalkable(x, y, 15)) {
        continue;
      }

      // Must not be too close to other spawn points
      let tooClose = false;
      for (const p of points) {
        if (dist(x, y, p.x, p.y) < 60) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      points.push({ x, y });
    }

    return points;
  }
}

// ------------------------------------------------------------------
// 程序化音频：无需外部素材，移动端首次触摸/按键后解锁
// ------------------------------------------------------------------
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.supported = true;
    this.muted = false;
    this.bgmActive = false;
    this.bgmTimer = 0;
    this.bgmStep = 0;
    this.lastPlayed = {};
    this.eventLog = [];
    this.masterVolume = 0.75;
    this.musicVolume = 0.22;
    this.sfxVolume = 0.55;
  }

  _audioContextCtor() {
    if (typeof window !== 'undefined') {
      return window.AudioContext || window.webkitAudioContext;
    }
    return typeof AudioContext !== 'undefined' ? AudioContext : null;
  }

  _ensure() {
    if (this.muted) return false;
    if (this.ctx) return true;
    const AudioCtor = this._audioContextCtor();
    if (!AudioCtor) {
      this.supported = false;
      return false;
    }
    try {
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch (err) {
      this.supported = false;
      return false;
    }
  }

  unlock() {
    if (!this._ensure()) return false;
    if (this.ctx.state === 'suspended' && this.ctx.resume) {
      this.ctx.resume();
    }
    return true;
  }

  startBGM() {
    this.bgmActive = true;
    this.bgmTimer = 0;
  }

  stopBGM() {
    this.bgmActive = false;
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
    return this.muted;
  }

  update(dt) {
    if (!this.bgmActive || this.muted) return;
    if (!this._ensure()) return;
    this.bgmTimer -= dt;
    while (this.bgmTimer <= 0) {
      this._playBGMStep();
      this.bgmTimer += 0.38;
    }
  }

  _time() {
    if (this.ctx && Number.isFinite(this.ctx.currentTime)) return this.ctx.currentTime;
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
  }

  _emit(id, minInterval = 0.03) {
    if (this.muted) return false;
    const now = this._time();
    if (this.lastPlayed[id] !== undefined && now - this.lastPlayed[id] < minInterval) return false;
    this.lastPlayed[id] = now;
    this.eventLog.push({ id, time: now });
    if (this.eventLog.length > 160) this.eventLog.shift();
    return true;
  }

  _createTone({ freq = 440, endFreq = null, duration = 0.12, type = 'square', gain = 0.12, dest = this.sfxGain }) {
    if (!this._ensure()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    amp.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _createNoise({ duration = 0.08, gain = 0.08, filter = 1200 } = {}) {
    if (!this._ensure() || !this.ctx.createBufferSource) return;
    const sampleRate = this.ctx.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = this.ctx.createBufferSource();
    const amp = this.ctx.createGain();
    src.buffer = buffer;
    amp.gain.setValueAtTime(gain, this.ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    if (this.ctx.createBiquadFilter) {
      const biquad = this.ctx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(filter, this.ctx.currentTime);
      src.connect(biquad);
      biquad.connect(amp);
    } else {
      src.connect(amp);
    }
    amp.connect(this.sfxGain);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + duration + 0.02);
  }

  playWeapon(weaponData = {}) {
    const id = weaponData.id || 'weapon';
    const continuous = weaponData.continuous || id === 'flamethrower' || id === 'laser';
    if (!this._emit(`weapon:${id}`, continuous ? 0.16 : 0.035)) return false;
    const loud = weaponData.explosive > 0 || id.includes('rocket') || id.includes('nuke');
    if (id === 'laser' || weaponData.special === 'storm_chain') {
      this._createTone({ freq: 760, endFreq: 1180, duration: 0.09, type: 'sawtooth', gain: 0.075 });
      return true;
    }
    if (id === 'flamethrower' || weaponData.special === 'plasma_chain_flame') {
      this._createNoise({ duration: 0.13, gain: 0.055, filter: 720 });
      this._createTone({ freq: 120, endFreq: 70, duration: 0.11, type: 'sawtooth', gain: 0.035 });
      return true;
    }
    if (weaponData.melee || id === 'chainsaw') {
      this._createTone({ freq: 95, endFreq: 72, duration: 0.11, type: 'sawtooth', gain: 0.08 });
      return true;
    }
    this._createNoise({ duration: loud ? 0.16 : 0.075, gain: loud ? 0.14 : 0.075, filter: loud ? 520 : 1500 });
    this._createTone({
      freq: loud ? 95 : (id === 'sniper' || id === 'railgun' ? 180 : 260),
      endFreq: loud ? 45 : 95,
      duration: loud ? 0.18 : 0.08,
      type: 'square',
      gain: loud ? 0.13 : 0.06,
    });
    return true;
  }

  playZombie(kind = 'groan', type = 'normal') {
    const interval = kind === 'attack' ? 0.18 : 0.08;
    if (!this._emit(`zombie:${kind}:${type}`, interval)) return false;
    const base = type === 'boss' || type === 'colossus' ? 62 : (type === 'runner' || type === 'spider' ? 150 : 92);
    if (kind === 'death') {
      this._createTone({ freq: base, endFreq: 38, duration: 0.24, type: 'sawtooth', gain: 0.07 });
      this._createNoise({ duration: 0.12, gain: 0.045, filter: 500 });
      return true;
    }
    if (kind === 'attack') {
      this._createTone({ freq: base * 1.4, endFreq: base * 0.7, duration: 0.1, type: 'triangle', gain: 0.06 });
      return true;
    }
    this._createTone({ freq: base, endFreq: base * 0.72, duration: 0.18, type: 'triangle', gain: 0.035 });
    return true;
  }

  _playBGMStep() {
    if (!this._emit(`music:${this.bgmStep % 8}`, 0.01)) return;
    const bass = [55, 55, 65, 55, 82, 73, 65, 49][this.bgmStep % 8];
    this._createTone({ freq: bass, endFreq: bass * 0.82, duration: 0.22, type: 'sawtooth', gain: 0.045, dest: this.musicGain });
    if (this.bgmStep % 4 === 2) {
      this._createTone({ freq: bass * 4, endFreq: bass * 5, duration: 0.12, type: 'square', gain: 0.018, dest: this.musicGain });
    }
    this.bgmStep++;
  }
}
