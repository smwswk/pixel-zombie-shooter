// ============================================================
// pets.js — 宠物随从系统
// ============================================================

class Pet {
  constructor(type, options = {}) {
    this.type = PET_DATA[type] ? type : 'hound';
    this.data = PET_DATA[this.type];
    this.level = Math.max(1, options.level || 1);
    this.x = options.x || (game.player ? game.player.x : 0);
    this.y = options.y || (game.player ? game.player.y : 0);
    this.angle = 0;
    this.fireTimer = 0;
    this.radius = 10;
    this.alive = true;
  }

  update(dt, index = 0) {
    if (!this.alive || !game.player) return;

    const orbitAngle = performance.now ? performance.now() / 700 + index * Math.PI * 2 / 3 : index;
    const targetX = game.player.x - Math.cos(game.player.angle || 0) * 38 + Math.cos(orbitAngle) * 28;
    const targetY = game.player.y - Math.sin(game.player.angle || 0) * 38 + Math.sin(orbitAngle) * 28;
    this.x = lerp(this.x, targetX, Math.min(1, dt * 5));
    this.y = lerp(this.y, targetY, Math.min(1, dt * 5));

    if (this.type === 'medic' && game.player.hp < game.player.maxHp) {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + (this.data.healRate || 0) * this.level * dt);
    }

    this.fireTimer = Math.max(0, this.fireTimer - dt);
    const target = this._findTarget();
    if (target) {
      this.angle = angleTo(this.x, this.y, target.x, target.y);
      if (this.type === 'hound') {
        const d = dist(this.x, this.y, target.x, target.y);
        if (d > (this.data.biteRange || 50) + target.radius) {
          const pull = Math.min(1, dt * 4.2);
          const approachX = target.x - Math.cos(this.angle) * ((this.data.biteRange || 50) * 0.65);
          const approachY = target.y - Math.sin(this.angle) * ((this.data.biteRange || 50) * 0.65);
          if (game.map && game.map.isWalkable(approachX, approachY, this.radius)) {
            this.x = lerp(this.x, approachX, pull);
            this.y = lerp(this.y, approachY, pull);
          }
        }
      }
      if (this.fireTimer <= 0) this._fireAt(target);
    }
  }

  _findTarget() {
    let closest = null;
    let bestScore = Infinity;
    const range = this.data.range + (this.level - 1) * 20;
    for (const enemy of game.enemies || []) {
      if (!enemy.alive) continue;
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d > range + enemy.radius) continue;
      let score = d;
      if (this.type === 'drone') score = d - (enemy.maxHp || enemy.hp || 0) * 0.16;
      if (score < bestScore) {
        closest = enemy;
        bestScore = score;
      }
    }
    return closest;
  }

  _fireAt(target) {
    const fireRate = this.data.fireRate * (1 + (this.level - 1) * 0.12);
    const damage = Math.round(this.data.damage * (1 + (this.level - 1) * 0.25));
    this.fireTimer = 1 / fireRate;
    const angle = angleTo(this.x, this.y, target.x, target.y);
    if (this.type === 'hound') {
      this._biteAt(target, damage);
      return;
    }
    if (this.type === 'drone' && target.applyControlEffect) {
      target.applyControlEffect({
        mark: this.data.markDuration || 2.5,
        markDamageMult: this.data.markDamageMult || 1.1,
      });
    }
    const projectileData = {
      id: `pet_${this.type}`,
      name: this.data.name,
      damage,
      fireRate,
      magazine: Infinity,
      reloadTime: 0,
      spread: 0,
      projectileSpeed: this.data.projectileSpeed,
      piercing: this.level >= 3 ? 1 : 0,
      explosive: 0,
      chain: this.type === 'drone' ? !!this.data.chain : false,
      projectileCount: 1,
      continuous: false,
      melee: false,
    };
    game.projectiles.push(new Projectile(this.x, this.y, angle, projectileData, game.player, { damage }));
    if (game.particles) game.particles.spawnMuzzleFlash(this.x, this.y, angle);
  }

  _biteAt(target, damage) {
    if (!target || !target.alive) return;
    const biteDamage = Math.round(damage * 1.35);
    target.applyControlEffect && target.applyControlEffect({
      slow: this.data.slowDuration || 1.5,
      slowMult: this.data.slowMult || 0.7,
      mark: this.data.markDuration || 2.0,
      markDamageMult: this.data.markDamageMult || 1.12,
    });
    target.takeDamage(biteDamage, {
      owner: game.player,
      weaponData: { id: 'pet_hound_bite', piercing: 1, explosive: 0 },
    });
    if (game.particles) {
      game.particles.spawnSpark(target.x, target.y, 6);
    }
    if (game.floatingTexts) {
      game.floatingTexts.push(new FloatingText(target.x, target.y - target.radius - 8, '咬住', this.data.color, 12));
    }
  }

  upgrade() {
    this.level++;
  }

  serialize() {
    return { type: this.type, level: this.level };
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this.type === 'hound') {
      this._drawHound(ctx);
    } else if (this.type === 'drone') {
      this._drawDrone(ctx);
    } else {
      this._drawMedic(ctx);
    }

    if (this.level > 1) {
      ctx.fillStyle = this.data.color;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${this.level}`, this.x, this.y - 18);
    }
  }

  _drawHound(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-13, -8, 26, 16);
    ctx.fillStyle = '#24313c';
    ctx.fillRect(-12, -6, 20, 12);
    ctx.fillStyle = this.data.color;
    ctx.fillRect(-8, -8, 12, 4);
    ctx.fillRect(-8, 4, 12, 4);
    ctx.fillStyle = '#1a222a';
    ctx.fillRect(5, -5, 11, 10);
    ctx.fillStyle = '#d7f7ff';
    ctx.fillRect(12, -3, 2, 2);
    ctx.fillRect(12, 2, 2, 2);
    ctx.fillStyle = '#111820';
    ctx.fillRect(-9, -10, 4, 4);
    ctx.fillRect(-9, 6, 4, 4);
    ctx.fillStyle = this.data.color;
    ctx.fillRect(-13, -9, 3, 5);
    ctx.fillRect(-13, 4, 3, 5);
    ctx.restore();
  }

  _drawDrone(ctx) {
    const spin = performance.now ? performance.now() / 120 : 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-14, -10, 28, 20);
    ctx.fillStyle = '#2c2f3a';
    ctx.fillRect(-8, -7, 16, 14);
    ctx.fillStyle = this.data.color;
    ctx.fillRect(-4, -3, 8, 6);
    ctx.strokeStyle = '#59606c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-18, -13);
    ctx.moveTo(8, -5);
    ctx.lineTo(18, -13);
    ctx.moveTo(-8, 5);
    ctx.lineTo(-18, 13);
    ctx.moveTo(8, 5);
    ctx.lineTo(18, 13);
    ctx.stroke();
    for (const [x, y] of [[-20, -14], [20, -14], [-20, 14], [20, 14]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.strokeStyle = '#dff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawMedic(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-9, -6, 18, 14);
    ctx.fillStyle = this.data.color;
    ctx.fillRect(-8, -7, 16, 12);
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -3, 10, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(8, -2, 2, 4);
    ctx.restore();
  }
}

class PetManager {
  constructor() {
    this.pets = [];
    this.maxPets = 3;
  }

  unlockPet(type, player = null) {
    const data = PET_DATA[type];
    if (!data) return false;
    const existing = this.pets.find(p => p.type === type);
    if (existing) {
      const cost = Math.round(data.price * (0.55 + existing.level * 0.3));
      if (player && player.money < cost) return false;
      if (player) player.money -= cost;
      existing.upgrade();
      this._float(existing.x, existing.y - 22, `${data.name} Lv.${existing.level}`, data.color);
      return true;
    }
    if (this.pets.length >= this.maxPets) return false;
    if (player && player.money < data.price) return false;
    if (player) player.money -= data.price;
    const pet = new Pet(type);
    this.pets.push(pet);
    if (game.metaProgression) game.metaProgression.recordPet(type);
    this._float(pet.x, pet.y - 22, `${data.name} 加入`, data.color);
    return true;
  }

  update(dt) {
    this.pets.forEach((pet, index) => pet.update(dt, index));
  }

  draw(ctx) {
    for (const pet of this.pets) pet.draw(ctx);
  }

  serialize() {
    return this.pets.map(p => p.serialize());
  }

  restore(list) {
    this.pets = [];
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || !PET_DATA[item.type]) continue;
      this.pets.push(new Pet(item.type, { level: item.level || 1 }));
      if (this.pets.length >= this.maxPets) break;
    }
  }

  _float(x, y, text, color) {
    if (!game.floatingTexts) return;
    game.floatingTexts.push(new FloatingText(x, y, text, color, 16));
  }
}
