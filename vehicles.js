// ============================================================
// vehicles.js — 载具系统
// ============================================================

class Vehicle {
  constructor(x, y, type = 'buggy') {
    const data = VEHICLE_DATA[type] || VEHICLE_DATA.buggy;
    this.type = data.id;
    this.data = data;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.turretAngle = this.angle;
    this.hp = data.maxHp;
    this.maxHp = data.maxHp;
    this.radius = data.radius;
    this.width = data.width;
    this.height = data.height;
    this.speedMult = data.speedMult;
    this.weaponBoost = data.weaponBoost;
    this.weaponFireRateMult = data.weaponFireRateMult;
    this.driver = null;
    this.enterCooldown = 0;
    this.color = data.color;
    this.cabinColor = data.cabinColor;
    this.wheelColor = '#222';
    this.alive = true;

    // 载具武器（机枪）
    this.mountedWeapon = {
      fireTimer: 0,
      fireRate: 12,       // 每秒12发
      damage: 15,
      spread: 0.15,
      piercing: 2,
      color: '#ffdd44',
    };
  }

  update(dt) {
    if (this.enterCooldown > 0) this.enterCooldown -= dt;

    // 载具武器冷却
    if (this.mountedWeapon.fireTimer > 0) {
      this.mountedWeapon.fireTimer -= dt;
    }

    if (this.driver) {
      this.turretAngle = angleTo(this.x, this.y, INPUT.mouseWorldX, INPUT.mouseWorldY);

      // 载具移动 — 保持WASD绝对方向控制，但速度更快
      let dx = 0, dy = 0;
      if (INPUT.keys['KeyW'] || INPUT.keys['ArrowUp']) dy -= 1;
      if (INPUT.keys['KeyS'] || INPUT.keys['ArrowDown']) dy += 1;
      if (INPUT.keys['KeyA'] || INPUT.keys['ArrowLeft']) dx -= 1;
      if (INPUT.keys['KeyD'] || INPUT.keys['ArrowRight']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        this.angle = Math.atan2(dy, dx);

        let speed = this.driver.speed * this.driver.upgrades.speedMult * this.speedMult;
        if (this.driver.buffs.speed.active) speed *= this.driver.buffs.speed.mult;

        const newX = this.x + dx * speed * dt;
        const newY = this.y + dy * speed * dt;

        if (game.map.isWalkable(newX, this.y, this.radius)) this.x = newX;
        if (game.map.isWalkable(this.x, newY, this.radius)) this.y = newY;

        // 同步玩家位置
        this.driver.x = this.x;
        this.driver.y = this.y;

        // 碾压敌人
        for (const enemy of game.enemies) {
          if (!enemy.alive) continue;
          const d = dist(this.x, this.y, enemy.x, enemy.y);
          if (d < this.radius + enemy.radius - 5) {
            const runoverDmg = enemy.type === 'tank' || enemy.type === 'boss' ? 30 : 80;
            enemy.takeDamage(runoverDmg, { isVehicle: true });
            this.hp -= enemy.type === 'tank' || enemy.type === 'boss' ? 15 : 5;
            // 击退
            const kbAngle = angleTo(this.x, this.y, enemy.x, enemy.y);
            enemy.x += Math.cos(kbAngle) * 40;
            enemy.y += Math.sin(kbAngle) * 40;
            // 血液
            game.particles.spawnBlood(enemy.x, enemy.y, 5);
          }
        }
      }

      // E键下车
      if (INPUT.keys['KeyE'] && this.enterCooldown <= 0) {
        this.exit();
        INPUT.keys['KeyE'] = false;
      }
    }
  }

  enter(player) {
    if (this.enterCooldown > 0) return false;
    if (this.driver) return false;
    this.driver = player;
    player.inVehicle = this;
    this.enterCooldown = 0.5;
    if (game.metaProgression) game.metaProgression.recordVehicle(this.type);
    return true;
  }

  exit() {
    if (!this.driver) return;
    // 找下车位置
    const offsets = [
      { x: Math.cos(this.angle + Math.PI / 2) * 45, y: Math.sin(this.angle + Math.PI / 2) * 45 },
      { x: -Math.cos(this.angle + Math.PI / 2) * 45, y: -Math.sin(this.angle + Math.PI / 2) * 45 },
      { x: Math.cos(this.angle) * 45, y: Math.sin(this.angle) * 45 },
      { x: -Math.cos(this.angle) * 45, y: -Math.sin(this.angle) * 45 },
    ];
    let exitPos = null;
    for (const off of offsets) {
      const ex = this.x + off.x;
      const ey = this.y + off.y;
      if (game.map.isWalkable(ex, ey, this.driver.radius)) {
        exitPos = { x: ex, y: ey };
        break;
      }
    }
    this.driver.x = exitPos ? exitPos.x : this.x;
    this.driver.y = exitPos ? exitPos.y : this.y;
    this.driver.inVehicle = null;
    this.driver = null;
    this.enterCooldown = 0.5;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.alive = false;
    game.particles.spawnExplosion(this.x, this.y, 50, 25);
    if (this.driver) {
      this.driver.x = this.x;
      this.driver.y = this.y;
      this.driver.inVehicle = null;
      this.driver.invincibleTimer = 1.5;
      this.driver = null;
    }
    game.floatingTexts.push(new FloatingText(
      this.x, this.y - 30,
      '载具损毁!', '#f44', 20
    ));
  }

  _fireMountedWeapon() {
    const mw = this.mountedWeapon;
    if (mw.fireTimer > 0) return;

    const driverWeapon = this.driver && this.driver.getCurrentWeapon ? this.driver.getCurrentWeapon() : null;
    const currentStats = driverWeapon ? driverWeapon.getEffectiveStats() : null;
    const baseData = driverWeapon ? driverWeapon.getEffectiveWeaponData(currentStats) : {
      id: 'mounted',
      name: '载具机枪',
      damage: mw.damage,
      fireRate: mw.fireRate,
      magazine: Infinity,
      reloadTime: 0,
      projectileSpeed: 500,
      piercing: mw.piercing,
      spread: mw.spread,
      projectileCount: 1,
      continuous: false,
      melee: false,
      explosive: 0,
      chain: false,
    };

    const boostedFireRate = (currentStats ? currentStats.fireRate : mw.fireRate) * this.weaponFireRateMult;
    mw.fireTimer = 1 / boostedFireRate;

    this.turretAngle = angleTo(this.x, this.y, INPUT.mouseWorldX, INPUT.mouseWorldY);
    const projectileCount = Math.max(1, baseData.projectileCount || 1);
    const spread = baseData.spread || mw.spread || 0;
    const boostedDamage = Math.round((currentStats ? currentStats.damage : mw.damage) * this.weaponBoost);
    const projectileData = {
      ...baseData,
      damage: boostedDamage,
      fireRate: boostedFireRate,
      projectileSpeed: baseData.projectileSpeed === Infinity ? Infinity : baseData.projectileSpeed * 1.15,
      piercing: (baseData.piercing || 0) + 1,
      vehicleBoosted: true,
      sourceWeaponId: driverWeapon ? driverWeapon.data.id : 'mounted',
    };
    const isCrit = this.driver ? rollCrit(this.driver) : false;
    const damage = this.driver ? calculateDamage(boostedDamage, this.driver, isCrit) : boostedDamage;
    const originX = this.x + Math.cos(this.turretAngle) * (this.width / 2 + 8);
    const originY = this.y + Math.sin(this.turretAngle) * (this.height / 2 + 8);

    for (let i = 0; i < projectileCount; i++) {
      let angle = this.turretAngle;
      if (spread > 0) {
        if (projectileCount === 1) {
          angle += (Math.random() - 0.5) * 2 * spread;
        } else {
          const step = (2 * spread) / Math.max(1, projectileCount - 1);
          angle = this.turretAngle - spread + step * i;
        }
      }
      const muzzleX = originX + Math.cos(angle) * 2;
      const muzzleY = originY + Math.sin(angle) * 2;

      const proj = new Projectile(
        muzzleX,
        muzzleY,
        angle,
        projectileData,
        this.driver,
        {
          damage,
          isCrit,
          continuous: projectileData.continuous && !projectileData.melee,
          melee: projectileData.melee,
          life: projectileData.continuous ? 0.05 : (projectileData.melee ? 0.1 : 3.0),
        }
      );
      game.projectiles.push(proj);

      game.particles.spawnMuzzleFlash(muzzleX, muzzleY, angle);
      if (!projectileData.continuous && !projectileData.melee) {
        game.particles.spawnShell(muzzleX, muzzleY, angle + Math.PI / 2);
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 车身阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width, this.height);

    // 车身
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // 车顶/细节
    ctx.fillStyle = this.cabinColor;
    ctx.fillRect(-8, -this.height / 2 + 4, 20, this.height - 8);

    // 挡风玻璃
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(6, -this.height / 2 + 3, 10, this.height - 6);

    // 车灯
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(this.width / 2 - 2, -this.height / 2 + 2, 3, 5);
    ctx.fillRect(this.width / 2 - 2, this.height / 2 - 7, 3, 5);

    // 车轮
    ctx.fillStyle = this.wheelColor;
    ctx.fillRect(-16, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(8, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(-16, this.height / 2 - 1, 10, 4);
    ctx.fillRect(8, this.height / 2 - 1, 10, 4);

    ctx.restore();

    // 独立旋转的车载机枪炮塔
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = '#263238';
    ctx.fillRect(-4, -5, 13, 10);
    ctx.fillStyle = '#111';
    ctx.fillRect(4, -3, 24, 6);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(25, -2, 4, 4);
    ctx.restore();

    // 载具血条
    if (this.hp < this.maxHp) {
      const barW = 44, barH = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, barH);
      ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#4a6' : '#a44';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * (this.hp / this.maxHp), barH);
    }

    // 驾驶提示
    if (!this.driver) {
      const d = dist(game.player.x, game.player.y, this.x, this.y);
      if (d < this.radius + game.player.radius + 25) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[E] 驾驶', this.x, this.y - this.radius - 16);
      }
    }
  }
}

class VehicleManager {
  constructor() {
    this.vehicles = [];
  }

  spawn(count) {
    this.vehicles = this.vehicles.filter(v => v.alive && v.driver);
    while (this.vehicles.length < count) {
      const pos = this._findSpawnPosition();
      if (!pos) break;
      this.vehicles.push(new Vehicle(pos.x, pos.y, this._pickVehicleType()));
    }
  }

  _pickVehicleType() {
    const ids = Object.keys(VEHICLE_DATA);
    return ids[Math.floor(Math.random() * ids.length)];
  }

  _findSpawnPosition() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = 80 + Math.random() * (game.map.width - 160);
      const y = 80 + Math.random() * (game.map.height - 160);
      if (game.map.isWalkable(x, y, 25)) {
        // 确保离玩家不太近
        const d = dist(x, y, game.player.x, game.player.y);
        if (d > 200) {
          return { x, y };
        }
      }
    }
    return null;
  }

  update(dt) {
    for (const v of this.vehicles) {
      v.update(dt);
    }
    this.vehicles = this.vehicles.filter(v => v.alive);
  }

  draw(ctx) {
    for (const v of this.vehicles) {
      v.draw(ctx);
    }
  }

  checkPlayerInteraction(player) {
    if (player.inVehicle) return;
    for (const v of this.vehicles) {
      if (!v.alive || v.driver) continue;
      const d = dist(player.x, player.y, v.x, v.y);
      if (d < v.radius + player.radius + 15 && INPUT.keys['KeyE']) {
        if (v.enter(player)) {
          INPUT.keys['KeyE'] = false;
          game.floatingTexts.push(new FloatingText(
            player.x, player.y - 40,
            '进入载具!', '#4a6', 18
          ));
        }
      }
    }
  }
}
