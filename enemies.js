// enemies.js — 敌人系统：Enemy 基类 + 8 种僵尸 + 毒液弹 + EnemyManager
// ============================================================

// ------------------------------------------------------------------
// 毒液弹（Spitter 远程攻击用）
// ------------------------------------------------------------------
class PoisonProjectile {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.speed = 120;
    this.damage = 8;
    const a = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(a) * this.speed;
    this.vy = Math.sin(a) * this.speed;
    this.life = 4.0;          // 4 秒后自动消失
    this.color = "#44ff44";
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // 命中玩家检测
    const p = game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d < this.radius + p.radius) {
      p.takeDamage(this.damage);
      p.poisoned = true;
      p.poisonTimer = 3.0;
      return false; // 销毁
    }
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------------
// Enemy 基类
// ------------------------------------------------------------------
class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 12;
    this.hp = 50;
    this.maxHp = 50;
    this.speed = 80;
    this.damage = 10;
    this.color = "#5a8f5a";
    this.attackCooldown = 0;
    this.attackRange = this.radius + game.player.radius + 2;
    this.attackInterval = 0.8;
    this.flashTimer = 0;
    this.alive = true;
    this.summonTimer = 0;
    this.shieldTimer = 0;     // Boss 护盾无敌时间
    this.hasShield = false;
    this.eliteAffixes = [];
    this.bossMechanics = [];
    this.thornsRatio = 0;
    this.toxicAura = null;
    this.stunTimer = 0;
    this.slowTimer = 0;
    this.slowMult = 1;
    this.markedTimer = 0;
    this.markedDamageMult = 1;
    this.playerFocusTimer = 0;
    this.burning = false;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.frozen = false;
    this.frozenTimer = 0;

    // 卡住检测
    this.stuckTimer = 0;
    this.lastX = x;
    this.lastY = y;

    // 按类型覆盖属性
    this._applyType(type);
  }

  _applyType(type) {
    switch (type) {
      case "normal":
        this.hp = this.maxHp = 50;
        this.speed = 80;
        this.damage = 10;
        this.color = "#5a8f5a";
        break;
      case "runner":
        this.hp = this.maxHp = 30;
        this.speed = 180;
        this.damage = 8;
        this.color = "#ffcc44";
        break;
      case "tank":
        this.hp = this.maxHp = 250;
        this.speed = 40;
        this.damage = 20;
        this.color = "#666688";
        this.radius = 22;
        this.armor = 0.5;
        break;
      case "bomber":
        this.hp = this.maxHp = 40;
        this.speed = 100;
        this.damage = 15;
        this.color = "#ff4444";
        break;
      case "spitter":
        this.hp = this.maxHp = 60;
        this.speed = 60;
        this.damage = 0;
        this.color = "#44ff44";
        this.spitTimer = 0;
        this.spitInterval = 2.0;
        break;
      case "summoner":
        this.hp = this.maxHp = 100;
        this.speed = 50;
        this.damage = 5;
        this.color = "#aa44ff";
        this.summonInterval = 5.0;
        this.summonTimer = this.summonInterval;
        this.armor = 0.3;
        break;
      case "elite":
        this.hp = this.maxHp = 150;
        this.speed = 120;
        this.damage = 25;
        this.color = "#ff8800";
        this.radius = 18;
        this.armor = 0.3;
        break;
      case "spider":
        this.hp = this.maxHp = 35;
        this.speed = 200;
        this.damage = 8;
        this.color = "#884422";
        this.radius = 10;
        this.attackInterval = 0.5;
        break;
      case "miniSpider":
        this.hp = this.maxHp = 12;
        this.speed = 280;
        this.damage = 5;
        this.color = "#aa5522";
        this.radius = 6;
        this.attackInterval = 0.4;
        break;
      case "saboteur":
        this.hp = this.maxHp = 90;
        this.speed = 145;
        this.damage = 18;
        this.color = "#6f7c2a";
        this.radius = 13;
        this.attackInterval = 0.55;
        this.armor = 0.15;
        break;
      case "boss":
        this.hp = this.maxHp = 1500;
        this.speed = 45;
        this.damage = 40;
        this.color = "#880000";
        this.radius = 40;
        this.summonInterval = 2.5;
        this.summonTimer = this.summonInterval;
        this.phase2 = false;
        this.armor = 0.5;
        this.attackInterval = 0.5;
        // Boss 特殊状态
        this.bossPhase = 1;
        this.bossAttackCooldown = 2.0;
        this.bossCharging = false;
        this.bossChargeTimer = 0;
        this.bossChargeDirX = 0;
        this.bossChargeDirY = 0;
        this.bossChargeSpeed = 0;
        this.bossShockwaveActive = false;
        this.bossShockwaveRadius = 0;
        this.bossShockwaveMaxRadius = 200;
        this.bossShockwaveSpeed = 120;
        this.bossShockwaveHitPlayer = false;
        break;
      case "colossus":
        this.hp = this.maxHp = 9000;
        this.speed = 26;
        this.damage = 58;
        this.color = "#3a1024";
        this.radius = 88;
        this.isColossus = true;
        this.armor = 0.62;
        this.attackInterval = 0.9;
        this.bossPhase = 1;
        this.summonInterval = 4.2;
        this.summonTimer = 2.0;
        this.colossusStompTimer = 1.2;
        this.colossusStompInterval = 4.8;
        this.colossusPullTimer = 0;
        this.colossusRuptureTimer = 3.2;
        break;
    }
    this.attackRange = this.radius + game.player.radius + 2;
  }

  applyEliteAffix(id) {
    const affix = ELITE_AFFIX_DATA[id];
    if (!affix || this.eliteAffixes.includes(id)) return false;
    this.eliteAffixes.push(id);
    if (affix.speedMult) this.speed *= affix.speedMult;
    if (affix.shieldTime) {
      this.hasShield = true;
      this.shieldTimer = affix.shieldTime;
    }
    if (affix.splitOnDeath) this.affixSplitCount = affix.splitOnDeath;
    if (affix.auraRadius) this.toxicAura = { radius: affix.auraRadius, damage: affix.auraDamage };
    if (affix.reflectRatio) this.thornsRatio = affix.reflectRatio;
    if (affix.summonInterval) {
      this.summonInterval = Math.min(this.summonInterval || affix.summonInterval, affix.summonInterval);
      this.summonTimer = this.summonInterval;
    }
    return true;
  }

  applyBossMechanic(id) {
    const mechanic = BOSS_MECHANIC_DATA[id];
    if (!mechanic || this.bossMechanics.includes(id)) return false;
    this.bossMechanics.push(id);
    if (id === 'armorBreak') this.bossChargeDamageMult = mechanic.chargeDamageMult;
    if (id === 'addPhase') this.bossSummonCountMult = mechanic.summonCountMult;
    if (id === 'rageClock') this.bossRageTimer = mechanic.rageAfter;
    if (id === 'shieldCycle') this.bossShieldCycle = mechanic.interval;
    return true;
  }

  update(dt) {
    if (!this.alive) return;

    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // ---- 受伤闪烁衰减 ----
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.hasShield = false;
    }
    if (this.toxicAura && d < this.toxicAura.radius) {
      p.takeDamage(this.toxicAura.damage * dt);
    }
    if (this.bossRageTimer !== undefined) {
      this.bossRageTimer -= dt;
      if (this.bossRageTimer <= 0 && !this.bossRaged) {
        this.bossRaged = true;
        this.speed *= 1.35;
        this.damage *= 1.3;
        this.color = '#ff2200';
      }
    }
    if (this.markedTimer > 0) {
      this.markedTimer = Math.max(0, this.markedTimer - dt);
      if (this.markedTimer <= 0) this.markedDamageMult = 1;
    }
    if (this.playerFocusTimer > 0) {
      this.playerFocusTimer = Math.max(0, this.playerFocusTimer - dt);
    }
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);
      this.burning = this.burnTimer > 0;
      this.takeDamage((this.burnDps || 6) * dt, { weaponData: { id: 'burn', piercing: 1, explosive: 0 } });
      if (!this.alive) return;
      if (Math.random() < 0.08 && game.particles && game.particles.spawnSpark) {
        game.particles.spawnSpark(this.x, this.y, 1);
      }
    } else {
      this.burning = false;
    }
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer <= 0) this.slowMult = 1;
    }
    if (this.frozenTimer > 0) {
      this.frozenTimer = Math.max(0, this.frozenTimer - dt);
      this.frozen = this.frozenTimer > 0;
      if (this.attackCooldown > 0) this.attackCooldown -= dt;
      this.lastX = this.x;
      this.lastY = this.y;
      return;
    } else {
      this.frozen = false;
    }
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      if (this.attackCooldown > 0) this.attackCooldown -= dt;
      this.lastX = this.x;
      this.lastY = this.y;
      return;
    }

    // ---- 各类型特殊 AI ----
    if (this.type === "colossus") {
      this._updateColossus(dt, d, dx, dy);
    } else if (this.type === "saboteur") {
      this._updateSaboteur(dt, d, dx, dy);
    } else if (this.type === "spitter") {
      this._updateSpitter(dt, d, dx, dy);
    } else if (this.type === "boss") {
      this._updateBoss(dt);
    } else {
      if (this.type === "summoner") {
        this._updateSummoner(dt);
      }

      // ---- 通用移动：朝玩家直线移动 + 简单避障 ----
      if (d > 0.1) {
        const moveSpeed = this._getMoveSpeed();
        let mx = (dx / d) * moveSpeed;
        let my = (dy / d) * moveSpeed;

        // 尝试直接移动
        let nx = this.x + mx * dt;
        let ny = this.y + my * dt;

        if (!game.map.isWalkable(nx, ny, this.radius)) {
          // 沿墙滑动：分别尝试 x/y 方向
          if (game.map.isWalkable(nx, this.y, this.radius)) {
            ny = this.y;
          } else if (game.map.isWalkable(this.x, ny, this.radius)) {
            nx = this.x;
          } else {
            // 都撞墙，尝试 45° 偏转
            const angle = Math.atan2(dy, dx);
            for (const offset of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
              const ta = angle + offset;
              const tx = this.x + Math.cos(ta) * moveSpeed * dt;
              const ty = this.y + Math.sin(ta) * moveSpeed * dt;
              if (game.map.isWalkable(tx, ty, this.radius)) {
                nx = tx;
                ny = ty;
                break;
              }
            }
          }
        }

        if (game.map.isWalkable(nx, ny, this.radius)) {
          this.x = nx;
          this.y = ny;
        }
      }

      // ---- 攻击（碰撞即伤害，有冷却）----
      if (d < this.attackRange + p.radius && this.attackCooldown <= 0) {
        p.takeDamage(this.damage);
        this.attackCooldown = this.attackInterval;
      }
      if (this.attackCooldown > 0) this.attackCooldown -= dt;
    }

    // 卡住检测：10秒几乎没动就清理（防止密室卡住导致波次无法完成）
    const moved = Math.abs(this.x - this.lastX) + Math.abs(this.y - this.lastY);
    if (moved < 0.05) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 10) {
        this.alive = false;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;
  }

  _getMoveSpeed() {
    return this.speed * (this.slowTimer > 0 ? this.slowMult : 1);
  }

  applyControlEffect({ stun = 0, slow = 0, slowMult = 1, mark = 0, markDamageMult = 1 } = {}) {
    if (stun > 0) this.stunTimer = Math.max(this.stunTimer || 0, stun);
    if (slow > 0) {
      this.slowTimer = Math.max(this.slowTimer || 0, slow);
      this.slowMult = Math.min(this.slowMult || 1, slowMult);
    }
    if (mark > 0) {
      this.markedTimer = Math.max(this.markedTimer || 0, mark);
      this.markedDamageMult = Math.max(this.markedDamageMult || 1, markDamageMult);
    }
  }

  // Spitter：保持距离，远程喷毒
  _updateSpitter(dt, d, dx, dy) {
    const p = game.player;
    this.spitTimer -= dt;

    // 理想距离 200~400
    const idealMin = 200;
    const idealMax = 400;

    let moveDx = 0;
    let moveDy = 0;

    if (d < idealMin) {
      // 太近，后退
      moveDx = -dx / d;
      moveDy = -dy / d;
    } else if (d > idealMax) {
      // 太远，接近
      moveDx = dx / d;
      moveDy = dy / d;
    } else {
      // 在舒适区，横向微移避免原地不动
      const sideAngle = Math.atan2(dy, dx) + Math.PI / 2;
      moveDx = Math.cos(sideAngle) * 0.3;
      moveDy = Math.sin(sideAngle) * 0.3;
    }

    if (d > 0.1) {
      const moveSpeed = this._getMoveSpeed();
      let nx = this.x + moveDx * moveSpeed * dt;
      let ny = this.y + moveDy * moveSpeed * dt;
      if (game.map.isWalkable(nx, ny, this.radius)) {
        this.x = nx;
        this.y = ny;
      }
    }

    // 喷毒
    if (this.spitTimer <= 0 && d < 500) {
      const proj = new PoisonProjectile(this.x, this.y, p.x, p.y);
      game.projectiles.push(proj);
      this.spitTimer = this.spitInterval;
    }
  }

  // Summoner：定时召唤 2 个普通僵尸
  _updateSummoner(dt) {
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distSpawn = 30 + Math.random() * 20;
        const sx = this.x + Math.cos(angle) * distSpawn;
        const sy = this.y + Math.sin(angle) * distSpawn;
        if (game.map.isWalkable(sx, sy, 12)) {
          game.enemies.push(new Enemy(sx, sy, "normal"));
        }
      }
      this.summonTimer = this.summonInterval;
    }
  }

  // Boss：三阶段 + 冲锋 + 震荡波 + 召唤
  _updateBoss(dt) {
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // 阶段转换
    const hpRatio = this.hp / this.maxHp;
    if (this.bossPhase === 1 && hpRatio <= 0.66) {
      this.bossPhase = 2;
      this.speed *= 1.3;
      this.summonInterval *= 0.7;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 20, 'Boss 狂暴!', '#f44', 24));
      game.particles.spawnExplosion(this.x, this.y, 40, 15);
    } else if (this.bossPhase === 2 && hpRatio <= 0.33) {
      this.bossPhase = 3;
      this.speed *= 1.4;
      this.summonInterval *= 0.6;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 20, 'Boss 终极狂暴!', '#f00', 28));
      game.particles.spawnExplosion(this.x, this.y, 60, 25);
    }

    // 召唤
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      const types = this.bossPhase === 3
        ? ["normal", "runner", "elite"]
        : ["normal", "runner", "tank", "spitter"];
      const count = this.bossPhase === 1 ? 2 : (this.bossPhase === 2 ? 3 : 4);
      for (let i = 0; i < count; i++) {
        const t = randPick(types);
        const angle = Math.random() * Math.PI * 2;
        const distSpawn = 40 + Math.random() * 30;
        const sx = this.x + Math.cos(angle) * distSpawn;
        const sy = this.y + Math.sin(angle) * distSpawn;
        if (game.map.isWalkable(sx, sy, 12)) {
          game.enemies.push(new Enemy(sx, sy, t));
        }
      }
      this.summonTimer = this.summonInterval;
    }

    // 特殊攻击冷却
    if (this.bossAttackCooldown > 0) this.bossAttackCooldown -= dt;

    // 冲锋攻击（阶段2+）
    if (this.bossPhase >= 2 && this.bossAttackCooldown <= 0 && !this.bossCharging && d < 300) {
      if (Math.random() < 0.015) {
        this._startCharge(dx, dy, d);
      }
    }

    // 震荡波（阶段3）
    if (this.bossPhase >= 3 && this.bossAttackCooldown <= 0 && !this.bossShockwaveActive) {
      if (Math.random() < 0.01) {
        this._startShockwave();
      }
    }

    // 执行冲锋
    if (this.bossCharging) {
      this._updateCharge(dt, p);
    }

    // 执行震荡波
    if (this.bossShockwaveActive) {
      this._updateShockwave(dt, p);
    }

    // 普通移动（非冲锋状态）
    if (!this.bossCharging && d > 0.1) {
      const moveSpeed = this._getMoveSpeed();
      let mx = (dx / d) * moveSpeed;
      let my = (dy / d) * moveSpeed;
      let nx = this.x + mx * dt;
      let ny = this.y + my * dt;
      if (game.map.isWalkable(nx, ny, this.radius)) {
        this.x = nx;
        this.y = ny;
      }
    }

    // 普通攻击（近战）
    if (d < this.attackRange + p.radius && this.attackCooldown <= 0) {
      p.takeDamage(this.damage);
      this.attackCooldown = this.attackInterval;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
  }

  _updateColossus(dt, d, dx, dy) {
    const p = game.player;
    const hpRatio = this.hp / this.maxHp;
    if (this.bossPhase === 1 && hpRatio <= 0.66) {
      this.bossPhase = 2;
      this.speed *= 1.12;
      this.colossusStompInterval *= 0.82;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 26, '泰坦装甲裂开', '#ff77aa', 24));
      game.particles.spawnExplosion(this.x, this.y, 90, 28);
    } else if (this.bossPhase === 2 && hpRatio <= 0.33) {
      this.bossPhase = 3;
      this.speed *= 1.18;
      this.colossusStompInterval *= 0.72;
      this.damage *= 1.18;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 26, '泰坦核心暴走', '#ff2255', 28));
      game.particles.spawnExplosion(this.x, this.y, 130, 36);
    }

    this.colossusStompTimer -= dt;
    if (this.colossusStompTimer <= 0) {
      this._colossusStomp(p);
    }

    this.colossusRuptureTimer -= dt;
    if (this.colossusRuptureTimer <= 0) {
      this._colossusRupture();
      this.colossusRuptureTimer = this.bossPhase >= 3 ? 3.8 : 5.2;
    }

    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this._colossusSummon();
      this.summonTimer = this.bossPhase >= 3 ? 3.0 : this.summonInterval;
    }

    if (d > this.radius + p.radius + 18 && d > 0.1) {
      const moveSpeed = this._getMoveSpeed();
      const nx = this.x + (dx / d) * moveSpeed * dt;
      const ny = this.y + (dy / d) * moveSpeed * dt;
      if (game.map.isWalkable(nx, ny, this.radius)) {
        this.x = nx;
        this.y = ny;
      }
    }

    if (d < 520 && d > this.radius + p.radius) {
      const pull = (this.bossPhase >= 3 ? 34 : 22) * dt;
      const px = p.x - (dx / Math.max(1, d)) * pull;
      const py = p.y - (dy / Math.max(1, d)) * pull;
      if (game.map.isWalkable(px, py, p.radius)) {
        p.x = px;
        p.y = py;
      }
    }

    if (d < this.attackRange + p.radius && this.attackCooldown <= 0) {
      p.takeDamage(this.damage);
      this.attackCooldown = this.attackInterval;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
  }

  _updateSaboteur(dt, playerD, playerDx, playerDy) {
    const turret = this._findSabotageTarget();
    if (turret) {
      const dx = turret.x - this.x;
      const dy = turret.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const range = this.radius + turret.radius + 4;
      if (d > range && d > 0.1) {
        const moveSpeed = this._getMoveSpeed();
        const nx = this.x + (dx / d) * moveSpeed * dt;
        const ny = this.y + (dy / d) * moveSpeed * dt;
        if (game.map.isWalkable(nx, ny, this.radius)) {
          this.x = nx;
          this.y = ny;
        }
      } else if (this.attackCooldown <= 0) {
        turret.takeDamage(this.damage);
        this.attackCooldown = this.attackInterval;
        if (game.floatingTexts) {
          game.floatingTexts.push(new FloatingText(turret.x, turret.y - turret.radius - 16, '拆塔', '#d6e85a', 12));
        }
      }
      if (this.attackCooldown > 0) this.attackCooldown -= dt;
      return;
    }

    if (playerD > 0.1) {
      const moveSpeed = this._getMoveSpeed();
      const nx = this.x + (playerDx / playerD) * moveSpeed * dt;
      const ny = this.y + (playerDy / playerD) * moveSpeed * dt;
      if (game.map.isWalkable(nx, ny, this.radius)) {
        this.x = nx;
        this.y = ny;
      }
    }
    const p = game.player;
    if (playerD < this.attackRange + p.radius && this.attackCooldown <= 0) {
      p.takeDamage(this.damage);
      this.attackCooldown = this.attackInterval;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
  }

  _findSabotageTarget() {
    if (!game.turretManager || !Array.isArray(game.turretManager.turrets)) return null;
    let target = null;
    let best = 760;
    for (const turret of game.turretManager.turrets) {
      if (!turret.alive) continue;
      const d = dist(this.x, this.y, turret.x, turret.y);
      if (d < best) {
        target = turret;
        best = d;
      }
    }
    return target;
  }

  _colossusStomp(player) {
    const radius = this.bossPhase >= 3 ? 285 : 235;
    this.colossusStompTimer = this.colossusStompInterval;
    game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 18, '泰坦重踏', '#ffcc66', 24));
    game.particles.spawnExplosion(this.x, this.y, radius, 34);
    if (typeof triggerScreenShake === 'function') triggerScreenShake(16);

    const pd = dist(this.x, this.y, player.x, player.y);
    if (pd < radius + player.radius) {
      player.takeDamage(this.damage * (this.bossPhase >= 3 ? 1.15 : 0.85));
      const a = angleTo(this.x, this.y, player.x, player.y);
      const knock = 52;
      const nx = player.x + Math.cos(a) * knock;
      const ny = player.y + Math.sin(a) * knock;
      if (game.map.isWalkable(nx, ny, player.radius)) {
        player.x = nx;
        player.y = ny;
      }
    }

    for (const enemy of game.enemies) {
      if (!enemy.alive || enemy === this) continue;
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d < radius + enemy.radius) {
        enemy.applyControlEffect && enemy.applyControlEffect({ stun: 0.45 });
      }
    }
  }

  _colossusRupture() {
    const lanes = this.bossPhase >= 3 ? 8 : 5;
    for (let i = 0; i < lanes; i++) {
      const angle = (Math.PI * 2 * i) / lanes + (this.bossPhase * 0.18);
      for (let step = 1; step <= 5; step++) {
        const x = this.x + Math.cos(angle) * (this.radius + step * 46);
        const y = this.y + Math.sin(angle) * (this.radius + step * 46);
        if (!game.map.isWalkable(x, y, 8)) continue;
        game.particles.spawnExplosion(x, y, 28, 5);
        if (dist(x, y, game.player.x, game.player.y) < 34 + game.player.radius) {
          game.player.takeDamage(18);
        }
      }
    }
    game.floatingTexts.push(new FloatingText(this.x, this.y + this.radius + 18, '地裂', '#dd8866', 16));
  }

  _colossusSummon() {
    const types = this.bossPhase >= 3 ? ['runner', 'spider', 'elite'] : ['runner', 'tank', 'spitter'];
    const count = this.bossPhase >= 3 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = this.radius + 30 + Math.random() * 70;
      const sx = this.x + Math.cos(angle) * d;
      const sy = this.y + Math.sin(angle) * d;
      if (game.map.isWalkable(sx, sy, 12)) {
        game.enemies.push(new Enemy(sx, sy, randPick(types)));
      }
    }
  }

  _startCharge(dx, dy, d) {
    this.bossCharging = true;
    this.bossChargeTimer = 1.0;
    this.bossChargeDirX = dx / d;
    this.bossChargeDirY = dy / d;
    this.bossChargeSpeed = this._getMoveSpeed() * 4;
    this.bossAttackCooldown = 3.0;
    game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 15, '冲锋!', '#f88', 18));
  }

  _updateCharge(dt, p) {
    this.bossChargeTimer -= dt;
    const nx = this.x + this.bossChargeDirX * this.bossChargeSpeed * dt;
    const ny = this.y + this.bossChargeDirY * this.bossChargeSpeed * dt;

    // 撞墙或时间到则停止
    if (!game.map.isWalkable(nx, ny, this.radius) || this.bossChargeTimer <= 0) {
      this.bossCharging = false;
      this.bossChargeTimer = 0;
      // 撞墙产生冲击
      game.particles.spawnExplosion(this.x, this.y, 30, 12);
      // 小范围伤害
      for (const e of game.enemies) {
        if (e.alive && e !== this) {
          const d2 = dist(this.x, this.y, e.x, e.y);
          if (d2 < 60) e.takeDamage(40, { isVehicle: true });
        }
      }
      const pd = dist(this.x, this.y, p.x, p.y);
      if (pd < 60) p.takeDamage(25);
      return;
    }

    this.x = nx;
    this.y = ny;

    // 冲锋路径上撞到玩家
    const pd = dist(this.x, this.y, p.x, p.y);
    if (pd < this.radius + p.radius + 5) {
      p.takeDamage(this.damage * 1.5);
    }

    // 冲锋拖尾粒子
    if (Math.random() < 0.5) {
      game.particles.push(new Particle(
        this.x, this.y,
        -this.bossChargeDirX * 50 + (Math.random() - 0.5) * 30,
        -this.bossChargeDirY * 50 + (Math.random() - 0.5) * 30,
        0.3, '#ff4444', 4
      ));
    }
  }

  _startShockwave() {
    this.bossShockwaveActive = true;
    this.bossShockwaveRadius = 0;
    this.bossShockwaveMaxRadius = 200;
    this.bossShockwaveSpeed = 120;
    this.bossAttackCooldown = 5.0;
    game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 15, '震荡波!', '#ff0', 20));
  }

  _updateShockwave(dt, p) {
    this.bossShockwaveRadius += this.bossShockwaveSpeed * dt;

    // 绘制震荡波（在draw方法中处理视觉效果，这里处理伤害）
    // 检测玩家是否被击中
    const pd = dist(this.x, this.y, p.x, p.y);
    const waveThickness = 15;
    if (Math.abs(pd - this.bossShockwaveRadius) < waveThickness && !this.bossShockwaveHitPlayer) {
      p.takeDamage(20);
      this.bossShockwaveHitPlayer = true;
    }

    if (this.bossShockwaveRadius >= this.bossShockwaveMaxRadius) {
      this.bossShockwaveActive = false;
      this.bossShockwaveHitPlayer = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();

    // 朝向玩家的角度
    const angleToPlayer = angleTo(this.x, this.y, game.player.x, game.player.y);

    // 呼吸动画
    const breathe = Math.sin(Date.now() / 300 + this.x) * 1.5;
    const r = this.radius + breathe * 0.3;

    // 受伤闪烁
    let bodyColor = this.color;
    if (this.flashTimer > 0) {
      bodyColor = "#ffffff";
    }

    // Boss 护盾特效
    if (this.hasShield) {
      ctx.strokeStyle = "#88ccff";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r - 2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== 僵尸像素风绘制 =====
    ctx.translate(this.x, this.y);
    ctx.rotate(angleToPlayer);

    // 身体
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 身体纹理/破损衣物
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 边框
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // 类型专属特征
    this._drawTypeFeatures(ctx, r);

    // 眼睛（所有僵尸都有，位置随朝向）
    const eyeOffset = r * 0.35;
    const eyeSize = Math.max(2, r * 0.18);
    // 左眼
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(eyeOffset, -eyeOffset * 0.5, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(eyeOffset + 1, -eyeOffset * 0.5 - 1, eyeSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // 右眼（稍微不对称，更恐怖）
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(eyeOffset, eyeOffset * 0.6, eyeSize * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(eyeOffset + 0.5, eyeOffset * 0.6 - 0.5, eyeSize * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 嘴（张开）
    ctx.fillStyle = '#220000';
    ctx.beginPath();
    ctx.ellipse(r * 0.5, 0, r * 0.25, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 牙齿
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(r * 0.4, -r * 0.08, 3, 3);
    ctx.fillRect(r * 0.5, -r * 0.06, 2, 3);
    ctx.fillRect(r * 0.35, r * 0.02, 3, 2);

    ctx.rotate(-angleToPlayer);
    ctx.translate(-this.x, -this.y);

    // 手臂（在世界坐标绘制，伸向玩家）
    this._drawArms(ctx, angleToPlayer, r);

    // 血条
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2.2;
      const barH = 5;
      const barX = this.x - barW / 2;
      const barY = this.y - this.radius - 12;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? '#ff4444' : (hpRatio > 0.25 ? '#ff8800' : '#ff0000');
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    // 类型标签（小图标）
    if (this.type === 'colossus') {
      ctx.fillStyle = '#ff77aa';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('泰坦', this.x, this.y - this.radius - 18);
      const phaseText = this.bossPhase === 1 ? 'I' : (this.bossPhase === 2 ? 'II' : 'III');
      ctx.fillStyle = this.bossPhase === 3 ? '#ff2255' : '#ffcc66';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(phaseText, this.x, this.y + this.radius + 18);
    } else if (this.type === 'boss') {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('☠', this.x, this.y - this.radius - 16);
      // Boss 阶段指示
      const phaseText = this.bossPhase === 1 ? 'I' : (this.bossPhase === 2 ? 'II' : 'III');
      ctx.fillStyle = this.bossPhase === 3 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(phaseText, this.x, this.y + this.radius + 12);
    } else if (this.type === 'elite') {
      ctx.fillStyle = '#ff8800';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★', this.x, this.y - this.radius - 14);
    }

    // Boss 震荡波视觉效果
    if (this.type === 'boss' && this.bossShockwaveActive) {
      ctx.strokeStyle = 'rgba(255,200,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.bossShockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,100,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.bossShockwaveRadius - 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawTypeFeatures(ctx, r) {
    switch (this.type) {
      case 'runner':
        // 瘦长条纹
        ctx.fillStyle = 'rgba(255,200,0,0.3)';
        ctx.fillRect(-r * 0.3, -r + 2, r * 0.6, r * 2 - 4);
        break;
      case 'tank':
        // 装甲板
        ctx.fillStyle = 'rgba(100,100,130,0.5)';
        ctx.fillRect(-r + 3, -r * 0.5, r * 0.6, r);
        ctx.fillRect(-r + 3, -r * 0.3, r * 0.8, r * 0.6);
        // 铆钉
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(-r + 6, -r * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-r + 6, r * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bomber':
        // 爆炸物绑在身上
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-r * 0.5, -r * 0.5, 6, 6);
        ctx.fillRect(r * 0.2, r * 0.3, 5, 5);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-r * 0.5 + 2, -r * 0.5 + 2, 2, 2);
        break;
      case 'spitter':
        // 肿胀的喉咙
        ctx.fillStyle = 'rgba(0,255,0,0.3)';
        ctx.beginPath();
        ctx.arc(r * 0.3, r * 0.4, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'summoner':
        // 紫色符文
        ctx.strokeStyle = 'rgba(170,68,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(170,68,255,0.3)';
        ctx.fillRect(-2, -r * 0.5, 4, r);
        ctx.fillRect(-r * 0.5, -2, r, 4);
        break;
      case 'elite':
        // 金色边框装饰
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'boss':
        // 角
        ctx.fillStyle = '#440000';
        ctx.fillRect(-r + 2, -r + 4, 6, 10);
        ctx.fillRect(r - 8, -r + 4, 6, 10);
        ctx.fillStyle = '#660000';
        ctx.fillRect(-r + 3, -r + 2, 4, 8);
        ctx.fillRect(r - 7, -r + 2, 4, 8);
        // 额外眼睛
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-r * 0.3, r * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'colossus':
        ctx.fillStyle = 'rgba(255,80,140,0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff77aa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffccdd';
        ctx.fillRect(r * 0.18, -r * 0.12, r * 0.36, r * 0.24);
        ctx.fillStyle = '#220611';
        ctx.fillRect(-r * 0.55, -r * 0.44, r * 0.18, r * 0.36);
        ctx.fillRect(-r * 0.55, r * 0.08, r * 0.18, r * 0.36);
        break;
      default:
        // normal - 破烂衣服
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(-r * 0.5, r * 0.3, r * 0.8, r * 0.4);
        break;
    }
  }

  _drawArms(ctx, angle, r) {
    const armLen = r * 1.3;
    const armW = Math.max(3, r * 0.25);
    // 左臂
    const la1 = angle - 0.4;
    const la2 = angle - 0.15;
    const bodyColor = this.flashTimer > 0 ? '#fff' : this.color;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = armW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x + Math.cos(la1) * r * 0.6, this.y + Math.sin(la1) * r * 0.6);
    ctx.lineTo(this.x + Math.cos(la2) * armLen, this.y + Math.sin(la2) * armLen);
    ctx.stroke();
    // 右臂
    const ra1 = angle + 0.4;
    const ra2 = angle + 0.15;
    ctx.beginPath();
    ctx.moveTo(this.x + Math.cos(ra1) * r * 0.6, this.y + Math.sin(ra1) * r * 0.6);
    ctx.lineTo(this.x + Math.cos(ra2) * armLen, this.y + Math.sin(ra2) * armLen);
    ctx.stroke();
    // 手爪
    ctx.fillStyle = '#331111';
    ctx.beginPath();
    ctx.arc(this.x + Math.cos(la2) * armLen, this.y + Math.sin(la2) * armLen, armW * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + Math.cos(ra2) * armLen, this.y + Math.sin(ra2) * armLen, armW * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  takeDamage(amount, projectile) {
    if (!this.alive) return;
    if (this.markedTimer > 0) {
      amount = Math.round(amount * (this.markedDamageMult || 1));
    }

    // 护甲减伤（穿透武器和爆炸武器无视护甲）
    const hasPiercing = projectile && projectile.weaponData && (projectile.weaponData.piercing > 0 || projectile.weaponData.explosive > 0);
    if (this.armor > 0 && !hasPiercing) {
      amount = Math.round(amount * (1 - this.armor));
      if (amount > 0) {
        game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 18, "护甲", "#888", 10));
      }
    }

    // Boss 护盾：受伤时 30% 概率触发护盾，短暂无敌
    if (this.type === "boss" && !this.hasShield && Math.random() < 0.3) {
      this.hasShield = true;
      this.shieldTimer = 1.5;
    }
    if (this.hasShield && this.shieldTimer > 0) {
      // 护盾吸收伤害，显示吸收文字
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 10, "护盾!", "#88ccff", 14));
      return;
    }

    this.hp -= amount;
    this.flashTimer = 0.1;
    if (this.thornsRatio > 0 && projectile && projectile.owner && projectile.owner.takeDamage) {
      projectile.owner.takeDamage(Math.max(1, amount * this.thornsRatio));
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;

    // Bomber：死后对范围内所有敌人（包括其他僵尸）造成 60 伤害
    if (this.type === "bomber") {
      const explodeRadius = 100;
      // 视觉爆炸粒子
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 150;
        game.particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 0.5 + Math.random() * 0.3, "#ff4444", 3 + Math.random() * 4));
      }
      // 伤害范围内所有敌人
      for (const e of game.enemies) {
        if (e.alive && e !== this) {
          const d = dist(this.x, this.y, e.x, e.y);
          if (d < explodeRadius + e.radius) {
            e.takeDamage(60);
          }
        }
      }
      // 伤害玩家
      const pd = dist(this.x, this.y, game.player.x, game.player.y);
      if (pd < explodeRadius + game.player.radius) {
        game.player.takeDamage(60);
      }
    }

    // 死亡粒子
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      game.particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 0.3 + Math.random() * 0.4, this.color, 2 + Math.random() * 3));
    }

    // 地面血迹残留
    if (game.decalSystem) {
      game.decalSystem.addBlood(this.x, this.y, 2 + Math.floor(Math.random() * 3));
    }

    // 击杀奖励飘字
    const reward = this.getReward();
    game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius, `+${reward} XP`, "#ffdd44", 14));

    // 发放金币 + 分数
    if (game.player) {
      const comboMult = game.player.addKill();
      const gold = Math.round(reward * 0.5 * comboMult);
      game.player.money += gold;
      if (gold > 0) {
        game.floatingTexts.push(new FloatingText(this.x + 10, this.y - this.radius - 15, `+$${gold}`, "#ffcc00", 12));
      }
      // 累加分数
      if (game.score !== undefined) {
        const scoreGain = Math.round(reward * comboMult);
        game.score += scoreGain;
      }
    }

    // 蜘蛛分裂
    if (this.type === 'spider') {
      const splitCount = 2 + Math.floor(Math.random() * 2); // 2-3只
      for (let i = 0; i < splitCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distSpawn = 10 + Math.random() * 15;
        const sx = this.x + Math.cos(angle) * distSpawn;
        const sy = this.y + Math.sin(angle) * distSpawn;
        if (game.map.isWalkable(sx, sy, 6)) {
          const mini = new Enemy(sx, sy, 'miniSpider');
          game.enemies.push(mini);
        }
      }
      game.floatingTexts.push(new FloatingText(
        this.x, this.y - this.radius - 10,
        '分裂!', '#aa5522', 14
      ));
    }

    if (this.affixSplitCount && this.affixSplitCount > 0) {
      for (let i = 0; i < this.affixSplitCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sx = this.x + Math.cos(angle) * 18;
        const sy = this.y + Math.sin(angle) * 18;
        if (game.map.isWalkable(sx, sy, 8)) {
          game.enemies.push(new Enemy(sx, sy, 'runner'));
        }
      }
    }

    // Boss 掉落隐藏武器；重复掉落会转为该隐藏武器融合
    if ((this.type === 'boss' || this.type === 'colossus') && game.player && game.player.unlockRandomHiddenWeapon) {
      game.bossKillsThisRun = (game.bossKillsThisRun || 0) + 1;
      game.player.unlockRandomHiddenWeapon(this.type === 'colossus' ? 'colossus' : 'boss');
    }

    // 道具掉落
    if (game.pickups) {
      const pickup = rollPickupDrop(this.type, this.x, this.y);
      if (pickup) game.pickups.push(pickup);
    }
  }

  getReward() {
    const rewards = {
      normal: 10,
      runner: 15,
      tank: 30,
      bomber: 20,
      spitter: 25,
      summoner: 40,
      elite: 50,
      spider: 20,
      miniSpider: 5,
      saboteur: 35,
      boss: 200,
      colossus: 800,
    };
    return rewards[this.type] || 10;
  }
}

// ------------------------------------------------------------------
// EnemyManager — 波次管理与生成
// ------------------------------------------------------------------
class EnemyManager {
  constructor() {
    this.enemies = [];
    this.waveNumber = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.25;
    this.waveCooldown = 0;
    this.currentEvent = null;
  }

  // 根据波次计算僵尸数量和种类组合
  startWave(waveNumber) {
    this.waveNumber = waveNumber;
    this.waveActive = true;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.currentEvent = this._selectSpecialEvent(waveNumber);

    const wavePlan = this._applySpecialEventToPlan(this._buildWavePlan(waveNumber), this.currentEvent);
    for (const [type, count] of wavePlan) {
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push(type);
      }
    }

    // 打乱生成顺序，避免同类型扎堆
    this.spawnQueue.sort(() => Math.random() - 0.5);
  }

  _selectSpecialEvent(waveNumber) {
    if (waveNumber < 7) return null;
    const events = Object.values(SPECIAL_EVENT_DATA);
    return events[waveNumber % events.length];
  }

  _applySpecialEventToPlan(plan, event) {
    if (!event) return plan;
    if (event.countMult) {
      return plan.map(([type, count]) => [
        type,
        type === 'colossus' ? count : Math.max(1, Math.round(count * event.countMult)),
      ]);
    }
    return plan;
  }

  _buildWavePlan(waveNumber) {
    const plan = [];

    if (waveNumber === 1) {
      plan.push(["normal", 30]);
    } else if (waveNumber === 2) {
      plan.push(["normal", 30]);
      plan.push(["runner", 10]);
    } else if (waveNumber === 3) {
      plan.push(["normal", 20]);
      plan.push(["runner", 15]);
      plan.push(["tank", 6]);
    } else if (waveNumber === 4) {
      plan.push(["runner", 25]);
      plan.push(["tank", 8]);
      plan.push(["spitter", 8]);
      plan.push(["bomber", 4]);
    } else if (waveNumber === 5) {
      plan.push(["boss", 1]);
      plan.push(["normal", 25]);
      plan.push(["runner", 12]);
      plan.push(["tank", 5]);
    } else {
      // wave 6+
      const base = waveNumber - 5;
      if (waveNumber % 10 === 0) {
        plan.push(["colossus", 1]);
        plan.push(["elite", 5 + base]);
        plan.push(["saboteur", 2 + Math.floor(base / 3)]);
        plan.push(["summoner", 2 + Math.floor(base / 2)]);
        plan.push(["runner", 28 + base * 4]);
        plan.push(["spitter", 6 + base * 2]);
        plan.push(["tank", 6 + base * 2]);
        return plan;
      }
      plan.push(["normal", 30 + base * 10]);
      plan.push(["runner", 12 + base * 6]);
      plan.push(["tank", 4 + base * 3]);
      plan.push(["spitter", 3 + base * 2]);
      plan.push(["bomber", 2 + base * 2]);
      plan.push(["summoner", 1 + base]);
      plan.push(["elite", 1 + base]);
      // 蜘蛛从第6波开始出现
      if (waveNumber >= 6) {
        plan.push(["spider", 3 + base * 2]);
      }
      if (waveNumber >= 8) {
        plan.push(["saboteur", 1 + Math.floor(base / 3)]);
      }

      // 每 3 波一个大 Boss
      if (waveNumber % 3 === 0) {
        plan.push(["boss", 1 + Math.floor(base / 3)]);
      }
    }

    return plan;
  }

  update(dt) {
    // 波次间隔 - 由WaveManager控制下一波，此处不自动开始
    if (!this.waveActive) {
      return;
    }

    // 等待波次开场倒计时结束后再开始生成敌人
    const waveStartPending = game.waveManager && game.waveManager.waveStartTimer > 0;

    // 从队列中逐个生成
    if (!waveStartPending && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        let pos = this._findSpawnPosition();
        if (!pos) {
          pos = this._fallbackSpawnPosition();
        }
        if (!pos) {
          pos = this._extremeFallbackPosition();
        }
        if (!pos) {
          pos = this._forceSpawnPosition();
        }
        if (pos) {
          const type = this.spawnQueue[0];
          const enemy = this.spawnEnemy(type, pos.x, pos.y);
          if (enemy) {
            this.spawnQueue.shift();
            this.spawnTimer = this.spawnInterval;
          } else {
            // 生成失败，换个位置重试
            this.spawnTimer = 0.05;
          }
        } else {
          // 完全找不到位置，稍后再试（不 shift，保留在队列中）
          this.spawnTimer = 0.1;
        }
      }
    }

    // 更新所有敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      // 销毁跑出地图边界的敌人（安全网）
      if (e.alive && (e.x < 0 || e.x > game.map.width || e.y < 0 || e.y > game.map.height)) {
        e.alive = false;
      }
      if (!e.alive) {
        this.enemies.splice(i, 1);
      }
    }

    // 波次完成检测
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      this.waveCooldown = 3.0; // 3 秒后开始下一波
    }
  }

  // 从地图边缘远离玩家的位置生成
  _findSpawnPosition() {
    const p = game.player;
    const mapW = game.map.width;
    const mapH = game.map.height;
    const margin = 80;
    const minDist = 200; // 降低最小距离，增加可选范围

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = minDist + Math.random() * 600;
      const x = p.x + Math.cos(angle) * d;
      const y = p.y + Math.sin(angle) * d;
      if (x >= margin && x <= mapW - margin && y >= margin && y <= mapH - margin && game.map.isWalkable(x, y, 15)) {
        return { x, y };
      }
    }

    return null;
  }

  _fallbackSpawnPosition() {
    const p = game.player;
    const mapW = game.map.width;
    const mapH = game.map.height;
    // 在地图边缘找一个可行走位置
    for (let i = 0; i < 60; i++) {
      const edge = randInt(0, 4);
      let x, y;
      switch (edge) {
        case 0: x = rand(100, mapW - 100); y = rand(50, 150); break;
        case 1: x = rand(mapW - 150, mapW - 50); y = rand(100, mapH - 100); break;
        case 2: x = rand(100, mapW - 100); y = rand(mapH - 150, mapH - 50); break;
        case 3: x = rand(50, 150); y = rand(100, mapH - 100); break;
      }
      if (game.map.isWalkable(x, y, 15)) {
        return { x, y };
      }
    }
    // 最后手段：在玩家附近随机找
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 150 + Math.random() * 400;
      const x = Math.max(80, Math.min(mapW - 80, p.x + Math.cos(angle) * d));
      const y = Math.max(80, Math.min(mapH - 80, p.y + Math.sin(angle) * d));
      if (game.map.isWalkable(x, y, 15)) {
        return { x, y };
      }
    }
    return null;
  }

  _extremeFallbackPosition() {
    // 在玩家周围 100-400 像素螺旋搜索（必定和玩家在同一区域）
    const p = game.player;
    for (let d = 100; d < 500; d += 20) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = p.x + Math.cos(a) * d;
        const y = p.y + Math.sin(a) * d;
        if (game.map.isWalkable(x, y, 15)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  _forceSpawnPosition() {
    // 终极兜底：以玩家位置为中心向外螺旋搜索，一定能找到
    const p = game.player;
    for (let d = 50; d < 800; d += 15) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const x = p.x + Math.cos(a) * d;
        const y = p.y + Math.sin(a) * d;
        if (x >= 40 && x <= game.map.width - 40 && y >= 40 && y <= game.map.height - 40 &&
            game.map.isWalkable(x, y, 15)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  spawnEnemy(type, x, y) {
    const enemy = new Enemy(x, y, type);
    this._applyLateWaveVariants(enemy);
    // 确保位置对当前敌人可行走，如果不可行则在附近找一个
    if (!game.map.isWalkable(x, y, enemy.radius)) {
      let found = false;
      for (let r = 10; r < 500 && !found; r += 10) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const tx = x + Math.cos(a) * r;
          const ty = y + Math.sin(a) * r;
          if (game.map.isWalkable(tx, ty, enemy.radius)) {
            enemy.x = tx;
            enemy.y = ty;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        // 终极 fallback：地图随机位置
        const mapW = game.map.width;
        const mapH = game.map.height;
        for (let i = 0; i < 60; i++) {
          const tx = rand(50, mapW - 50);
          const ty = rand(50, mapH - 50);
          if (game.map.isWalkable(tx, ty, enemy.radius)) {
            enemy.x = tx;
            enemy.y = ty;
            found = true;
            break;
          }
        }
        if (!found) return null;
      }
    }
    this.enemies.push(enemy);
    return enemy;
  }

  _applyLateWaveVariants(enemy) {
    if (this.currentEvent && this.currentEvent.enemySpeedMult) {
      enemy.speed *= this.currentEvent.enemySpeedMult;
    }
    if (enemy.type === 'elite' && this.waveNumber >= 7) {
      const affixes = Object.keys(ELITE_AFFIX_DATA);
      const count = this.waveNumber >= 12 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        enemy.applyEliteAffix(affixes[(this.waveNumber + i) % affixes.length]);
      }
    }
    if (enemy.type === 'boss') {
      const mechanics = Object.keys(BOSS_MECHANIC_DATA);
      const count = this.waveNumber >= 9 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        enemy.applyBossMechanic(mechanics[(this.waveNumber + i) % mechanics.length]);
      }
    }
  }

  draw(ctx) {
    for (const e of this.enemies) {
      e.draw(ctx);
    }
  }

  getEnemyCount() {
    return this.enemies.length;
  }

  getAliveCount() {
    return this.enemies.filter(e => e.alive).length;
  }

  getRemainingCount() {
    return this.getAliveCount() + this.spawnQueue.length;
  }

  isWaveComplete() {
    return !this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0;
  }
}
