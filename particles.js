// ============================================================
// particles.js — 粒子系统：Particle + ParticleSystem + FloatingText + Decal + DecalSystem
// ============================================================

// ------------------------------------------------------------------
// Particle 类
// ------------------------------------------------------------------
class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.gravity = 0;
    this.friction = 1.0;
  }

  update(dt) {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// ------------------------------------------------------------------
// ParticleSystem 类
// ------------------------------------------------------------------
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  push(particle) {
    this.particles.push(particle);
  }

  spawnBlood(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.5,
        randPick(['#aa0000', '#cc0000', '#880000', '#ff0000']),
        2 + Math.random() * 3
      ));
    }
  }

  spawnExplosion(x, y, radius, count) {
    // 冲击波
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      const p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.4,
        randPick(['#ff4400', '#ff8800', '#ffaa00', '#ffcc00', '#ffffff']),
        3 + Math.random() * 5
      );
      p.friction = 0.9;
      this.particles.push(p);
    }
    // 烟雾
    for (let i = 0; i < count / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 30,
        0.5 + Math.random() * 0.5,
        randPick(['#555555', '#666666', '#444444']),
        4 + Math.random() * 6
      );
      p.friction = 0.95;
      this.particles.push(p);
    }
  }

  spawnMuzzleFlash(x, y, angle) {
    // 闪光核心
    for (let i = 0; i < 5; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push(new Particle(
        x, y,
        Math.cos(spreadAngle) * speed,
        Math.sin(spreadAngle) * speed,
        0.05 + Math.random() * 0.1,
        randPick(['#ffffaa', '#ffffff', '#ffdd44']),
        2 + Math.random() * 3
      ));
    }
  }

  spawnShell(x, y, angle) {
    const shellAngle = angle + (Math.random() - 0.5) * 0.8;
    const speed = 80 + Math.random() * 60;
    const p = new Particle(
      x, y,
      Math.cos(shellAngle) * speed,
      Math.sin(shellAngle) * speed,
      0.8 + Math.random() * 0.4,
      '#ddaa33',
      2
    );
    p.gravity = 300;
    p.friction = 0.98;
    this.particles.push(p);
  }

  spawnSpark(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.1 + Math.random() * 0.2,
        '#ffff00',
        1 + Math.random() * 2
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const alive = this.particles[i].update(dt);
      if (!alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}

// ------------------------------------------------------------------
// FloatingText 类
// ------------------------------------------------------------------
class FloatingText {
  constructor(x, y, text, color, size = 14) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1.2;
    this.maxLife = 1.2;
    this.vy = -50;
    this.vx = (Math.random() - 0.5) * 30;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';
  }
}

// ------------------------------------------------------------------
// DecalSystem — 地面残留（血迹、弹壳）
// ------------------------------------------------------------------
class Decal {
  constructor(x, y, type, options = {}) {
    this.x = x;
    this.y = y;
    this.type = type; // 'blood', 'shell'
    this.life = options.life || (type === 'blood' ? 30 : 15);
    this.maxLife = this.life;
    this.rotation = options.rotation || 0;
    this.size = options.size || (type === 'blood' ? 8 + Math.random() * 12 : 3 + Math.random() * 2);
    this.color = options.color || (type === 'blood'
      ? randPick(['#660000', '#770000', '#550000', '#440000', '#800000'])
      : '#ccaa33');
    this.shape = options.shape || (type === 'blood' ? Math.floor(Math.random() * 3) : 0);

    // 预计算不规则血渍的顶点，避免 draw 时抖动
    this.shapePoints = [];
    if (this.type === 'blood' && this.shape === 2) {
      const points = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const r = this.size * (0.6 + Math.random() * 0.4);
        this.shapePoints.push({
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
        });
      }
    }
  }

  update(dt) {
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife) * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;

    if (this.type === 'blood') {
      if (this.shape === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shape === 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shapePoints.length > 0) {
        // 不规则血渍 — 使用预计算顶点
        ctx.beginPath();
        for (let i = 0; i <= this.shapePoints.length; i++) {
          const p = this.shapePoints[i % this.shapePoints.length];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
      }
      // 血渍中心更深
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#330000';
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shell') {
      // 弹壳：细长椭圆
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // 弹壳高光
      ctx.fillStyle = '#eedd66';
      ctx.beginPath();
      ctx.ellipse(-1, -0.5, this.size * 0.8, this.size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class DecalSystem {
  constructor() {
    this.decals = [];
    this.maxDecals = 300; // 上限防止内存爆炸
  }

  addBlood(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      this.decals.push(new Decal(x + offsetX, y + offsetY, 'blood', {
        rotation: Math.random() * Math.PI * 2,
        life: 20 + Math.random() * 40,
      }));
    }
    this._trim();
  }

  addShell(x, y, angle) {
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetY = (Math.random() - 0.5) * 8;
    this.decals.push(new Decal(x + offsetX, y + offsetY, 'shell', {
      rotation: angle + (Math.random() - 0.5) * 1.5,
      life: 10 + Math.random() * 10,
      size: 2 + Math.random() * 2,
    }));
    this._trim();
  }

  _trim() {
    if (this.decals.length > this.maxDecals) {
      // 移除最旧的（前10%）
      const removeCount = Math.floor(this.maxDecals * 0.1);
      this.decals.splice(0, removeCount);
    }
  }

  update(dt) {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      if (!this.decals[i].update(dt)) {
        this.decals.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const d of this.decals) {
      d.draw(ctx);
    }
  }

  clear() {
    this.decals = [];
  }
}
