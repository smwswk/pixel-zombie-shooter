// ============================================================
// turrets.js — 可购买炮台系统
// ============================================================

class Turret {
  constructor(type, x, y, options = {}) {
    this.type = TURRET_DATA[type] ? type : 'sentry';
    this.data = TURRET_DATA[this.type];
    this.x = x;
    this.y = y;
    this.level = Math.max(1, Math.min(3, options.level || 1));
    this.radius = 18;
    this.angle = options.angle || 0;
    this.targetMode = options.targetMode || 'nearest';
    this.fireTimer = 0;
    this.maxHeat = this.data.maxHeat || 100;
    this.heatPerShot = this.data.heatPerShot || 22;
    this.coolRate = this.data.coolRate || 18;
    this.deployTime = this.data.deployTime || 0.9;
    this.heat = Math.max(0, Math.min(this.maxHeat, options.heat || 0));
    this.overheated = !!options.overheated;
    this.deployTimer = Math.max(0, options.deployTimer || 0);
    this.alive = true;
    this.crushNoticeTimer = 0;

    this._applyLevelStats();
    this.hp = options.hp !== undefined ? Math.min(options.hp, this.maxHp) : this.maxHp;
  }

  _applyLevelStats() {
    const levelBonus = this.level - 1;
    this.maxHp = Math.round(this.data.maxHp * (1 + levelBonus * 0.35));
    this.range = this.data.range + levelBonus * 35;
    this.damage = Math.round(this.data.damage * (1 + levelBonus * 0.45));
    this.fireRate = this.data.fireRate * (1 + levelBonus * 0.18);
  }

  update(dt) {
    if (!this.alive) return;
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this._updateHeat(dt);
    if (this.deployTimer > 0) {
      this.deployTimer = Math.max(0, this.deployTimer - dt);
      return;
    }
    if (this.overheated) return;

    const target = this._findTarget();
    if (!target) return;

    this.angle = angleTo(this.x, this.y, target.x, target.y);
    if (this.fireTimer <= 0) {
      this._fireAt(target);
    }
  }

  _findTarget() {
    let selected = null;
    let selectedScore = Infinity;
    const enemies = game.enemies || (game.enemyManager ? game.enemyManager.enemies : []);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d > this.range + enemy.radius) continue;

      let score = d;
      if (this.targetMode === 'strongest') {
        score = -(enemy.maxHp || enemy.hp || 0) + d * 0.01;
      } else if (this.targetMode === 'weakest') {
        score = (enemy.hp || 0) + d * 0.01;
      } else if (this.targetMode === 'protect') {
        const playerDist = game.player ? dist(game.player.x, game.player.y, enemy.x, enemy.y) : d;
        score = playerDist + d * 0.05;
      }
      if (enemy.type === 'saboteur') score -= 220;
      if (enemy.playerFocusTimer > 0) score -= 120;
      if (score < selectedScore) {
        selected = enemy;
        selectedScore = score;
      }
    }
    return selected;
  }

  cycleTargetMode() {
    const modes = ['nearest', 'strongest', 'weakest', 'protect'];
    const index = modes.indexOf(this.targetMode);
    this.targetMode = modes[(index + 1) % modes.length];
    return this.targetMode;
  }

  _updateHeat(dt) {
    const cool = this.coolRate * (this.overheated ? 1.25 : 1);
    if (this.heat > 0) this.heat = Math.max(0, this.heat - cool * dt);
    if (this.overheated && this.heat <= this.maxHeat * 0.42) {
      this.overheated = false;
      if (game.floatingTexts) {
        game.floatingTexts.push(new FloatingText(this.x, this.y - 30, '炮台冷却', this.data.color, 13));
      }
    }
  }

  _fireAt(target) {
    this.fireTimer = 1 / this.fireRate;
    const targetDistance = dist(this.x, this.y, target.x, target.y);
    let angle = targetDistance > 0.01 ? angleTo(this.x, this.y, target.x, target.y) : this.angle;
    if (!Number.isFinite(angle)) angle = 0;
    this.angle = angle;

    const muzzleX = this.x + Math.cos(angle) * (this.radius + 8);
    const muzzleY = this.y + Math.sin(angle) * (this.radius + 8);
    const projectileData = {
      id: `turret_${this.type}`,
      name: this.data.name,
      damage: this.damage,
      fireRate: this.fireRate,
      magazine: Infinity,
      reloadTime: 0,
      spread: 0,
      projectileSpeed: this.data.projectileSpeed,
      piercing: this.data.piercing,
      explosive: 0,
      chain: this.type === 'tesla',
      projectileCount: 1,
      continuous: false,
      melee: false,
    };

    game.projectiles.push(new Projectile(
      muzzleX,
      muzzleY,
      angle,
      projectileData,
      game.player,
      { damage: this.damage }
    ));

    if (game.particles) {
      game.particles.spawnMuzzleFlash(muzzleX, muzzleY, angle);
      if (this.type === 'tesla') {
        game.particles.spawnSpark(muzzleX, muzzleY, 4);
      }
    }

    this.heat = Math.min(this.maxHeat + this.heatPerShot, this.heat + this.heatPerShot);
    if (this.heat >= this.maxHeat) {
      this.overheated = true;
      this.fireTimer = Math.max(this.fireTimer, 0.65);
      if (game.floatingTexts) {
        game.floatingTexts.push(new FloatingText(this.x, this.y - 30, '过热', '#ff8844', 14));
      }
    }
  }

  upgrade() {
    if (this.level >= 3) return false;
    this.level++;
    this._applyLevelStats();
    this.hp = this.maxHp;
    return true;
  }

  repair() {
    if (this.hp >= this.maxHp) return false;
    this.hp = this.maxHp;
    this.heat = 0;
    this.overheated = false;
    return true;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    if (game.particles) game.particles.spawnExplosion(this.x, this.y, 34, 12);
    if (game.floatingTexts) {
      game.floatingTexts.push(new FloatingText(this.x, this.y - 26, '炮台损毁', '#f66', 16));
    }
  }

  serialize() {
    return {
      type: this.type,
      x: Math.round(this.x),
      y: Math.round(this.y),
      level: this.level,
      hp: Math.round(this.hp),
      targetMode: this.targetMode,
      heat: Math.round(this.heat),
      overheated: this.overheated,
      deployTimer: Number(this.deployTimer.toFixed(2)),
    };
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = this.data.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.translate(this.x, this.y);

    // 底座
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(-16, -10, 32, 24);
    ctx.fillStyle = '#2b2f35';
    ctx.fillRect(-15, -12, 30, 24);
    ctx.fillStyle = '#171a1f';
    ctx.fillRect(-11, -8, 22, 16);

    // 等级灯
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.level ? this.data.color : '#333';
      ctx.fillRect(-10 + i * 8, 10, 5, 3);
    }

    ctx.fillStyle = this.targetMode === 'strongest' ? '#ff8844' : (this.targetMode === 'weakest' ? '#88ff88' : '#ffffff');
    ctx.fillRect(10, -14, 5, 5);

    // 炮身
    ctx.rotate(this.angle);
    ctx.fillStyle = '#101216';
    ctx.fillRect(-4, -5, 18, 10);
    ctx.fillStyle = this.data.color;
    ctx.fillRect(8, -3, 22, 6);
    ctx.fillStyle = this.data.muzzleColor;
    ctx.fillRect(28, -2, 5, 4);
    ctx.restore();

    // 血条
    if (this.hp < this.maxHp) {
      const barW = 36;
      const barH = 4;
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, barH);
      ctx.fillStyle = this.hp > this.maxHp * 0.35 ? '#55cc66' : '#dd5555';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * (this.hp / this.maxHp), barH);
    }

    if (this.heat > 0 || this.overheated || this.deployTimer > 0) {
      const barW = 36;
      const barH = 3;
      const y = this.y + this.radius + 8;
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - barW / 2, y, barW, barH);
      ctx.fillStyle = this.overheated ? '#ff5522' : (this.deployTimer > 0 ? '#66aaff' : '#ffaa44');
      const ratio = this.deployTimer > 0
        ? Math.max(0, this.deployTimer / this.deployTime)
        : Math.min(1, this.heat / this.maxHeat);
      ctx.fillRect(this.x - barW / 2, y, barW * ratio, barH);
    }
  }
}

class TurretManager {
  constructor() {
    this.turrets = [];
    this.maxTurrets = 3;
  }

  build(type, player) {
    const data = TURRET_DATA[type];
    if (!data || !player) return false;
    this.turrets = this.turrets.filter(t => t.alive);
    if (this.turrets.length >= this.maxTurrets) {
      this._float(player.x, player.y - 36, '炮台上限', '#aaa');
      return false;
    }
    if (player.money < data.price) return false;

    const pos = this._findPlacement(player);
    if (!pos) {
      this._float(player.x, player.y - 36, '附近没有部署空间', '#aaa');
      return false;
    }

    player.money -= data.price;
    const turret = new Turret(type, pos.x, pos.y);
    this.turrets.push(turret);
    if (game.metaProgression) game.metaProgression.recordTurret(type);
    this._float(turret.x, turret.y - 28, `${data.name} 已部署`, data.color);
    return true;
  }

  repairNearest(player) {
    const turret = this.getNearestTurret(player, 190, t => t.hp < t.maxHp);
    if (!turret) return false;
    const cost = turret.data.repairCost;
    if (player.money < cost) return false;
    if (!turret.repair()) return false;
    player.money -= cost;
    this._float(turret.x, turret.y - 28, `修理 -$${cost}`, '#7f7');
    return true;
  }

  upgradeNearest(player) {
    const turret = this.getNearestTurret(player, 190, t => t.level < 3);
    if (!turret) return false;
    const cost = turret.data.upgradeCost;
    if (player.money < cost) return false;
    if (!turret.upgrade()) return false;
    player.money -= cost;
    this._float(turret.x, turret.y - 28, `炮台 Lv.${turret.level}`, turret.data.color);
    return true;
  }

  redeployNearest(player) {
    const turret = this.getNearestTurret(player, 420);
    if (!turret) return false;
    const pos = this._findPlacement(player, turret);
    if (!pos) return false;
    turret.x = pos.x;
    turret.y = pos.y;
    turret.fireTimer = 0;
    turret.deployTimer = turret.deployTime;
    turret.heat = Math.min(turret.maxHeat * 0.75, turret.heat + 12);
    turret.overheated = false;
    this._float(turret.x, turret.y - 28, '炮台重部署', turret.data.color);
    return true;
  }

  cycleTargetModeNearest(player) {
    const turret = this.getNearestTurret(player, 260);
    if (!turret) return false;
    const mode = turret.cycleTargetMode();
    const label = mode === 'strongest' ? '优先精英' : (mode === 'weakest' ? '优先残血' : (mode === 'protect' ? '保护玩家' : '就近射击'));
    this._float(turret.x, turret.y - 28, label, turret.data.color);
    return true;
  }

  getNearestTurret(player, maxDist = 220, predicate = null) {
    if (!player) return null;
    let nearest = null;
    let nearestDist = maxDist;
    for (const turret of this.turrets) {
      if (!turret.alive) continue;
      if (predicate && !predicate(turret)) continue;
      const d = dist(player.x, player.y, turret.x, turret.y);
      if (d <= nearestDist) {
        nearest = turret;
        nearestDist = d;
      }
    }
    return nearest;
  }

  update(dt) {
    this._resolveEnemyOverlaps(dt);
    for (const turret of this.turrets) {
      turret.update(dt);
    }
    this.turrets = this.turrets.filter(t => t.alive);
  }

  draw(ctx) {
    for (const turret of this.turrets) {
      turret.draw(ctx);
    }
  }

  serialize() {
    return this.turrets.filter(t => t.alive).map(t => t.serialize());
  }

  restore(list) {
    this.turrets = [];
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || !TURRET_DATA[item.type]) continue;
      this.turrets.push(new Turret(item.type, item.x, item.y, {
        level: item.level,
        hp: item.hp,
        targetMode: item.targetMode,
        heat: item.heat,
        overheated: item.overheated,
        deployTimer: item.deployTimer,
      }));
      if (this.turrets.length >= this.maxTurrets) break;
    }
  }

  _resolveEnemyOverlaps(dt) {
    const enemies = game.enemies || (game.enemyManager ? game.enemyManager.enemies : []);
    if (!Array.isArray(enemies) || enemies.length === 0) return;

    for (const turret of this.turrets) {
      if (!turret.alive) continue;
      if (turret.crushNoticeTimer > 0) {
        turret.crushNoticeTimer = Math.max(0, turret.crushNoticeTimer - dt);
      }

      for (const enemy of enemies) {
        if (!turret.alive) break;
        if (!enemy.alive || enemy.type === 'saboteur') continue;
        const minDistance = turret.radius + enemy.radius + 4;
        const overlapDistance = dist(turret.x, turret.y, enemy.x, enemy.y);
        if (overlapDistance >= minDistance) continue;

        if (this._pushEnemyOffTurret(enemy, turret, minDistance, overlapDistance)) {
          enemy.stuckTimer = 0;
        }

        if (enemy.type === 'boss' || enemy.type === 'colossus') {
          const pressure = (enemy.damage || 20) * (enemy.type === 'colossus' ? 0.18 : 0.12) * dt;
          turret.takeDamage(pressure);
          if (game.floatingTexts && turret.alive && turret.crushNoticeTimer <= 0) {
            game.floatingTexts.push(new FloatingText(turret.x, turret.y - turret.radius - 18, 'Boss 压制', '#ff9966', 13));
            turret.crushNoticeTimer = 0.8;
          }
        }
      }
    }
  }

  _pushEnemyOffTurret(enemy, turret, minDistance, overlapDistance) {
    const baseAngle = overlapDistance > 0.01
      ? Math.atan2(enemy.y - turret.y, enemy.x - turret.x)
      : this._fallbackPushAngle(turret);
    const offsets = [
      0,
      Math.PI / 8,
      -Math.PI / 8,
      Math.PI / 4,
      -Math.PI / 4,
      Math.PI / 2,
      -Math.PI / 2,
      Math.PI * 0.75,
      -Math.PI * 0.75,
      Math.PI,
    ];

    for (const extraDistance of [2, 18, 36, 58]) {
      const pushDistance = minDistance + extraDistance;
      for (const offset of offsets) {
        const angle = baseAngle + offset;
        const x = turret.x + Math.cos(angle) * pushDistance;
        const y = turret.y + Math.sin(angle) * pushDistance;
        if (this._canEnemyStandAt(enemy, x, y, turret)) {
          enemy.x = x;
          enemy.y = y;
          return true;
        }
      }
    }
    return false;
  }

  _fallbackPushAngle(turret) {
    if (game.player && Number.isFinite(game.player.x) && Number.isFinite(game.player.y)) {
      const angle = angleTo(game.player.x, game.player.y, turret.x, turret.y);
      if (Number.isFinite(angle)) return angle;
    }
    return 0;
  }

  _canEnemyStandAt(enemy, x, y, sourceTurret) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (game.map && !game.map.isWalkable(x, y, enemy.radius)) return false;
    for (const turret of this.turrets) {
      if (!turret.alive || turret === sourceTurret) continue;
      if (dist(x, y, turret.x, turret.y) < enemy.radius + turret.radius + 4) return false;
    }
    return true;
  }

  _findPlacement(player, ignoreTurret = null) {
    const preferredAngle = player.angle || 0;
    const candidates = [
      { angle: preferredAngle, dist: 58 },
      { angle: preferredAngle + Math.PI / 4, dist: 62 },
      { angle: preferredAngle - Math.PI / 4, dist: 62 },
      { angle: preferredAngle + Math.PI / 2, dist: 64 },
      { angle: preferredAngle - Math.PI / 2, dist: 64 },
      { angle: preferredAngle + Math.PI, dist: 66 },
    ];

    for (let ring = 0; ring < 3; ring++) {
      for (const candidate of candidates) {
        const x = player.x + Math.cos(candidate.angle) * (candidate.dist + ring * 28);
        const y = player.y + Math.sin(candidate.angle) * (candidate.dist + ring * 28);
        if (this._canPlaceAt(x, y, ignoreTurret)) return { x, y };
      }
    }
    return null;
  }

  _canPlaceAt(x, y, ignoreTurret = null) {
    if (!game.map || !game.map.isWalkable(x, y, 20)) return false;
    for (const turret of this.turrets) {
      if (turret === ignoreTurret) continue;
      if (dist(x, y, turret.x, turret.y) < 48) return false;
    }
    if (game.vehicleManager) {
      for (const vehicle of game.vehicleManager.vehicles) {
        if (vehicle.alive && dist(x, y, vehicle.x, vehicle.y) < vehicle.radius + 32) return false;
      }
    }
    return true;
  }

  _float(x, y, text, color) {
    if (!game.floatingTexts) return;
    game.floatingTexts.push(new FloatingText(x, y, text, color, 16));
  }
}
