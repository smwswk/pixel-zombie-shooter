// ============================================================
// weapon_player.js — Weapon + Projectile + Player 类
// 全局变量模式，通过 script 标签按顺序加载
// ============================================================

// ------------------------------------------------------------------
// Weapon 类
// ------------------------------------------------------------------
class Weapon {
  constructor(data, options = {}) {
    this.data = data;
    this.ammo = data.magazine === Infinity ? Infinity : data.magazine;
    this.maxAmmo = data.magazine;
    this.magSize = data.magazine === Infinity ? '∞' : data.magazine;
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.reloading = false;
    this.reloadProgress = 0;

    // 兼容HUD/Shop的属性别名
    this.id = data.id;
    this.baseName = data.name;
    this.name = data.name;
    this.price = data.price || 0;
    this.damage = data.damage;
    this.ammoPrice = data.ammoPrice || 50;
    this.rarity = options.rarity || data.rarity || 'common';
    this.fusionLevel = options.fusionLevel || 0;
    this.affixes = Array.isArray(options.affixes) ? [...options.affixes] : [];

    // 机枪预热
    this.spinUp = 0;
    this.isSpinning = false;

    // 弩箭已发射数（用于回收逻辑）
    this.boltsFired = 0;

    // 熟练度系统
    this.proficiencyLevel = 1;
    this.proficiencyXP = 0;
    this.proficiencyXPToNext = this._calcXPToNext(1);
    this._syncDisplayName();
  }

  // 计算升级所需经验
  _calcXPToNext(level) {
    return Math.floor(50 * level * 1.5);
  }

  // 熟练度加成倍率
  getProficiencyBonus() {
    const level = this.proficiencyLevel;
    return {
      damageMult: 1 + (level - 1) * 0.05,      // 每级 +5% 伤害
      fireRateMult: 1 + (level - 1) * 0.03,    // 每级 +3% 射速
      reloadMult: Math.max(0.25, 1 - (level - 1) * 0.04), // 换弹下限 25%
      magMult: 1 + (level - 1) * 0.05,         // 每级 +5% 弹匣
    };
  }

  _getAffixMods() {
    const mods = {
      damageMult: 1,
      fireRateMult: 1,
      reloadMult: 1,
      magMult: 1,
      spreadMult: 1,
      projectileBonus: 0,
      piercingBonus: 0,
      explosiveBonus: 0,
    };
    for (const id of this.affixes) {
      const affix = WEAPON_AFFIX_DATA[id];
      if (!affix) continue;
      if (affix.damageMult) mods.damageMult *= affix.damageMult;
      if (affix.fireRateMult) mods.fireRateMult *= affix.fireRateMult;
      if (affix.reloadMult) mods.reloadMult *= affix.reloadMult;
      if (affix.magMult) mods.magMult *= affix.magMult;
      if (affix.spreadMult) mods.spreadMult *= affix.spreadMult;
      if (affix.projectileBonus) mods.projectileBonus += affix.projectileBonus;
      if (affix.piercingBonus) mods.piercingBonus += affix.piercingBonus;
      if (affix.explosiveBonus) mods.explosiveBonus += affix.explosiveBonus;
    }
    return mods;
  }

  _getRarityMods() {
    if (this.rarity === 'legendary') {
      return {
        damageMult: 1.45,
        fireRateMult: 1.12,
        reloadMult: 0.9,
        magMult: 1.2,
        projectileBonus: 1,
        piercingBonus: 2,
        explosiveBonus: 16,
      };
    }
    if (this.rarity === 'hero') {
      return {
        damageMult: 1.28,
        fireRateMult: 1.08,
        reloadMult: 0.94,
        magMult: 1.12,
        projectileBonus: 0,
        piercingBonus: 1,
        explosiveBonus: 8,
      };
    }
    if (this.rarity === 'fusion') {
      return {
        damageMult: 1.12,
        fireRateMult: 1.06,
        reloadMult: 0.94,
        magMult: 1.12,
        projectileBonus: 0,
        piercingBonus: 1,
        explosiveBonus: 0,
      };
    }
    return {
      damageMult: 1,
      fireRateMult: 1,
      reloadMult: 1,
      magMult: 1,
      projectileBonus: 0,
      piercingBonus: 0,
      explosiveBonus: 0,
    };
  }

  _getVisualSignature() {
    const special = this.data.special || this.data.fusionArchetype || '';
    const isFusionVisual = !!(this.data.fusionWeapon || this.fusionLevel > 0 || this.rarity === 'fusion');
    const tier = isFusionVisual ? 'fusion' : (this.rarity || 'common');
    const palette = {
      common: { trail: '#ffdd44', core: '#fff2a0', glow: '#ffdd44', impact: '#ffee88', intensity: 0 },
      hero: { trail: '#ffd84d', core: '#ffffff', glow: '#ffb000', impact: '#fff1a6', intensity: 1.15 },
      legendary: { trail: '#c084ff', core: '#ffffff', glow: '#7c3aed', impact: '#e9d5ff', intensity: 1.65 },
      fusion: { trail: '#ff9f43', core: '#ffffff', glow: '#22d3ee', impact: '#ffe08a', intensity: 1.45 },
    };
    let visual = { ...(palette[tier] || palette.common) };

    if (special.includes('void')) {
      visual = { trail: '#bb88ff', core: '#f5e8ff', glow: '#7c3aed', impact: '#ddbbff', intensity: Math.max(visual.intensity, 1.9) };
    } else if (special.includes('storm') || special.includes('chain')) {
      visual = { trail: '#66ffff', core: '#ffffff', glow: '#0891b2', impact: '#a5f3fc', intensity: Math.max(visual.intensity, 1.7) };
    } else if (special.includes('solar')) {
      visual = { trail: '#ffcc44', core: '#ffffff', glow: '#ff5a1f', impact: '#ffe8a3', intensity: Math.max(visual.intensity, 1.7) };
    } else if (special.includes('plasma')) {
      visual = { trail: '#66ffff', core: '#fff7ad', glow: '#ff8844', impact: '#ffee88', intensity: Math.max(visual.intensity, 1.8) };
    } else if (special.includes('vampire')) {
      visual = { trail: '#ff4477', core: '#ffffff', glow: '#be123c', impact: '#fecdd3', intensity: Math.max(visual.intensity, 1.55) };
    }

    return {
      visualTier: tier,
      trailColor: visual.trail,
      coreColor: visual.core,
      glowColor: visual.glow,
      impactColor: visual.impact,
      visualIntensity: visual.intensity,
    };
  }

  // 获得熟练度经验
  addProficiencyXP(amount) {
    this.proficiencyXP += amount;
    while (this.proficiencyXP >= this.proficiencyXPToNext) {
      this.proficiencyXP -= this.proficiencyXPToNext;
      this.proficiencyLevel++;
      this.proficiencyXPToNext = this._calcXPToNext(this.proficiencyLevel);
      // 升级提示
      if (typeof game !== 'undefined' && game.floatingTexts && game.player) {
        game.floatingTexts.push(new FloatingText(
          game.player.x, game.player.y - 50,
          `${this.name} 熟练度 Lv.${this.proficiencyLevel}!`, '#ffd700', 20
        ));
      }
    }
  }

  // 应用熟练度后的实际属性
  getEffectiveStats() {
    const bonus = this.getProficiencyBonus();
    const affix = this._getAffixMods();
    const rarity = this._getRarityMods();
    const fusionDamage = 1 + this.fusionLevel * 0.12;
    const fusionFireRate = 1 + this.fusionLevel * 0.08;
    const fusionMag = 1 + this.fusionLevel * 0.10;
    return {
      damage: Math.round(this.data.damage * bonus.damageMult * fusionDamage * affix.damageMult * rarity.damageMult),
      fireRate: this.data.fireRate * bonus.fireRateMult * fusionFireRate * affix.fireRateMult * rarity.fireRateMult,
      reloadTime: Math.max(0.1, this.data.reloadTime * bonus.reloadMult * affix.reloadMult * rarity.reloadMult),
      magazine: this.data.magazine === Infinity ? Infinity : Math.round(this.data.magazine * bonus.magMult * fusionMag * affix.magMult * rarity.magMult),
    };
  }

  getEffectiveWeaponData(stats = this.getEffectiveStats()) {
    const affix = this._getAffixMods();
    const rarity = this._getRarityMods();
    return {
      ...this.data,
      damage: stats.damage,
      fireRate: stats.fireRate,
      magazine: stats.magazine,
      reloadTime: stats.reloadTime,
      spread: (this.data.spread || 0) * affix.spreadMult,
      piercing: (this.data.piercing || 0) + affix.piercingBonus + rarity.piercingBonus + Math.floor(this.fusionLevel / 2),
      explosive: (this.data.explosive || 0) + affix.explosiveBonus + rarity.explosiveBonus,
      projectileCount: Math.max(1, (this.data.projectileCount || 1) + affix.projectileBonus + rarity.projectileBonus + Math.floor(this.fusionLevel / 4)),
      fusionLevel: this.fusionLevel,
      affixes: [...this.affixes],
      rarity: this.rarity,
      ...this._getVisualSignature(),
    };
  }

  addFusion(source = 'purchase') {
    this.fusionLevel++;
    const affixIds = Object.keys(WEAPON_AFFIX_DATA);
    const nextAffix = affixIds[(this.fusionLevel - 1) % affixIds.length];
    this.affixes.push(nextAffix);
    this._syncDisplayName();
    if (this.maxAmmo !== Infinity) {
      const stats = this.getEffectiveStats();
      this.maxAmmo = stats.magazine;
      this.magSize = stats.magazine;
      this.ammo = Math.min(this.maxAmmo, this.ammo + Math.ceil(this.maxAmmo * 0.35));
    }
    if (typeof game !== 'undefined' && game.floatingTexts && game.player) {
      game.floatingTexts.push(new FloatingText(
        game.player.x, game.player.y - 42,
        `${this.name} 融合 +${WEAPON_AFFIX_DATA[nextAffix].name}`, '#ffcc66', 18
      ));
    }
    return source;
  }

  _syncDisplayName() {
    const rarityPrefix = this.rarity === 'legendary' ? '传说 ' : (this.rarity === 'hero' ? '英雄 ' : '');
    const fusionSuffix = this.fusionLevel > 0 ? ` +${this.fusionLevel}` : '';
    this.name = `${rarityPrefix}${this.baseName}${fusionSuffix}`;
  }

  canFire() {
    if (this.isReloading) return false;
    if (this.ammo <= 0 && this.maxAmmo !== Infinity) return false;
    if (this.fireTimer > 0) return false;
    if (this.data.melee) return true;
    return true;
  }

  fire(player, targetX, targetY) {
    if (!this.canFire()) return [];

    const projectiles = [];
    const baseAngle = angleTo(player.x, player.y, targetX, targetY);
    const isCrit = rollCrit(player);
    const stats = this.getEffectiveStats();
    const effectiveData = this.getEffectiveWeaponData(stats);
    let baseDmg = stats.damage;
    if (player.buffs && player.buffs.damage.active) {
      baseDmg *= player.buffs.damage.mult;
    }
    const dmg = calculateDamage(baseDmg, player, isCrit);

    // 消耗弹药
    if (this.maxAmmo !== Infinity) {
      if (this.data.continuous) {
        this.ammo -= 1;
      } else {
        this.ammo -= 1;
      }
    }

    // 设置射击间隔（应用熟练度射速加成）
    const fireInterval = 1 / (stats.fireRate * player.upgrades.fireRateMult);
    this.fireTimer = fireInterval;

    // 机枪预热处理
    if (this.data.id === 'machinegun') {
      this.isSpinning = true;
      const spinMult = lerp(0.3, 1.0, Math.min(1, this.spinUp / (this.data.spinUpTime || 0.5)));
      this.fireTimer *= (2 - spinMult);
    }

    // 生成抛壳粒子 + 地面弹壳残留
    if (!this.data.melee && !this.data.continuous) {
      game.particles.spawnShell(player.x, player.y, baseAngle + Math.PI / 2);
      if (game.decalSystem && Math.random() < 0.5) {
        game.decalSystem.addShell(player.x, player.y, baseAngle + Math.PI / 2 + Math.PI);
      }
    }

    // 枪口闪光
    if (!this.data.melee) {
      const muzzleX = player.x + Math.cos(baseAngle) * (player.radius + 5);
      const muzzleY = player.y + Math.sin(baseAngle) * (player.radius + 5);
      game.particles.spawnMuzzleFlash(muzzleX, muzzleY, baseAngle);
    }

    // 近战武器（电锯）
    if (this.data.melee) {
      projectiles.push(new Projectile(
        player.x, player.y, baseAngle, effectiveData, player,
        { damage: dmg, isCrit, melee: true, life: 0.1 }
      ));
      return projectiles;
    }

    // 持续武器（火焰喷射器、激光）
    if (this.data.continuous && this.data.id !== 'chainsaw') {
      const proj = new Projectile(
        player.x, player.y, baseAngle, effectiveData, player,
        { damage: dmg, isCrit, continuous: true, life: 0.05 }
      );
      projectiles.push(proj);
      return projectiles;
    }

    // 多发武器（霰弹枪）
    const count = effectiveData.projectileCount || 1;
    const spreadReduce = player.upgrades.spreadReduce;
    const effectiveSpread = effectiveData.spread * (1 - spreadReduce);

    for (let i = 0; i < count; i++) {
      let angle = baseAngle;
      if (effectiveSpread > 0) {
        if (count === 1) {
          angle += (Math.random() - 0.5) * 2 * effectiveSpread;
        } else {
          const step = (count > 1) ? (2 * effectiveSpread) / (count - 1) : 0;
          angle = baseAngle - effectiveSpread + step * i;
          angle += (Math.random() - 0.5) * effectiveSpread * 0.3;
        }
      }

      const proj = new Projectile(
        player.x, player.y, angle, effectiveData, player,
        { damage: dmg, isCrit }
      );
      projectiles.push(proj);
    }

    // 弩箭计数
    if (this.data.id === 'crossbow') {
      this.boltsFired++;
    }

    return projectiles;
  }

  reload() {
    if (this.isReloading) return;
    if (this.maxAmmo === Infinity) return;
    if (this.ammo >= this.maxAmmo) return;
    this.isReloading = true;
    this.reloading = true;
    const stats = this.getEffectiveStats();
    this.reloadTimer = stats.reloadTime;
  }

  update(dt) {
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
      if (this.fireTimer < 0) this.fireTimer = 0;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      const stats = this.getEffectiveStats();
      this.reloadProgress = 1 - (this.reloadTimer / stats.reloadTime);
      if (this.reloadTimer <= 0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadProgress = 0;
      }
    }

    // 机枪预热/减速
    if (this.data.id === 'machinegun') {
      if (this.isSpinning) {
        this.spinUp += dt;
        if (this.spinUp > this.data.spinUpTime) this.spinUp = this.data.spinUpTime;
      } else {
        this.spinUp -= dt;
        if (this.spinUp < 0) this.spinUp = 0;
      }
    }
  }

  // 弩箭回收
  retrieveBolt() {
    if (this.data.id === 'crossbow' && this.boltsFired > 0) {
      if (Math.random() < CROSSBOW_RETRIEVE_CHANCE) {
        this.ammo = Math.min(this.maxAmmo, this.ammo + 1);
        this.boltsFired = Math.max(0, this.boltsFired - 1);
        return true;
      }
    }
    return false;
  }
}

// ------------------------------------------------------------------
// Projectile 类
// ------------------------------------------------------------------
class Projectile {
  constructor(x, y, angle, weaponData, owner, options = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.weaponData = weaponData;
    this.owner = owner;
    this.damage = options.damage || weaponData.damage;
    this.isCrit = options.isCrit || false;
    this.melee = options.melee || false;
    this.continuous = options.continuous || false;
    this.life = options.life || 3.0;
    this.maxLife = this.life;

    this.speed = weaponData.projectileSpeed;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.piercingLeft = weaponData.piercing || 0;
    this.hitEnemies = new Set();
    this.radius = this.melee ? CHAINSAW_RANGE : (this.continuous ? 4 : 3);

    // 激光：记录命中点用于绘制
    this.laserEndX = null;
    this.laserEndY = null;
    this.laserHitEnemies = [];

    // 火箭弹特殊标记
    this.isRocket = weaponData.id === 'rocket' || weaponData.special === 'solar_warhead';

    // 弩箭可回收标记
    this.retrievable = weaponData.retrievable || false;
    this.retrieved = false;

    // 火焰喷射器：锥形范围内敌人
    this.flamethrowerTargets = [];

    // 电磁链已链敌人
    this.chainedEnemies = new Set();

    this.visualTier = weaponData.visualTier || 'common';
    this.trailColor = weaponData.trailColor || '#ffdd44';
    this.coreColor = weaponData.coreColor || '#ffffff';
    this.glowColor = weaponData.glowColor || this.trailColor;
    this.impactColor = weaponData.impactColor || this.trailColor;
    this.visualIntensity = weaponData.visualIntensity || 0;
  }

  update(dt) {
    // 近战武器不移动
    if (this.melee) {
      this.life -= dt;
      this._processMelee();
      return this.life > 0;
    }

    // 持续武器（火焰喷射器、激光）
    if (this.continuous) {
      this.life -= dt;
      if (this.weaponData.id === 'flamethrower' || this.weaponData.special === 'plasma_chain_flame') {
        this._processFlamethrower(dt);
      } else if (this.weaponData.id === 'laser') {
        this._processLaser();
      } else if (this.weaponData.id === 'chainsaw') {
        this._processChainsaw();
      }
      return this.life > 0;
    }

    // 普通弹道移动
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this._spawnVisualTrail();

    // 墙壁碰撞
    if (!game.map.isWalkable(this.x, this.y, this.radius)) {
      if (this.isRocket) {
        this._explode();
      }
      return false;
    }

    // 生命周期结束
    if (this.life <= 0) {
      if (this.isRocket) {
        this._explode();
      }
      return false;
    }

    // 敌人碰撞检测
    for (const enemy of game.enemies) {
      if (this.hitEnemies.has(enemy)) continue;
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d < this.radius + enemy.radius) {
        this._hitEnemy(enemy);
        if (this.piercingLeft <= 0 && !this.isRocket) {
          if (this.retrievable) {
            this._tryRetrieve();
          }
          return false;
        }
      }
    }

    return true;
  }

  _hitEnemy(enemy) {
    this.hitEnemies.add(enemy);

    let actualDamage = this.damage;

    // 爆炸武器：触发爆炸
    if (this.isRocket || this.weaponData.special === 'solar_warhead') {
      this._explode();
      return;
    }

    // 电磁链
    if (this.weaponData.chain && this.piercingLeft > 0) {
      this._chainLightning(enemy);
    }

    if (this.weaponData.special === 'solar_blade') {
      this._applySolarBlade(enemy);
    }

    // 冰冻
    if (this.owner.upgrades.freezeChance > 0 && Math.random() < this.owner.upgrades.freezeChance) {
      enemy.frozen = true;
      enemy.frozenTimer = 2.0;
    }

    // 造成伤害
    enemy.takeDamage(actualDamage, this);

    if (this.weaponData.special === 'void_rift' || this.weaponData.special === 'void_scatter') {
      this._triggerVoidRift(enemy);
    } else if (this.weaponData.special === 'storm_chain' && enemy.applyControlEffect) {
      enemy.applyControlEffect({ stun: this.weaponData.stunDuration || 0.2 });
    }

    // 生命偷取
    if (this.owner.upgrades.lifesteal > 0) {
      const healAmount = actualDamage * this.owner.upgrades.lifesteal;
      this.owner.heal(healAmount);
    }
    if (this.weaponData.lifestealOnHit && this.owner && this.owner.heal) {
      this.owner.heal(actualDamage * this.weaponData.lifestealOnHit);
    }
    if (this.owner === game.player && this.weaponData && !String(this.weaponData.id).startsWith('turret_') && !String(this.weaponData.id).startsWith('pet_')) {
      enemy.playerFocusTimer = Math.max(enemy.playerFocusTimer || 0, 1.8);
    }

    // 金币倍率（通过击杀时处理，这里标记）

    // 穿透递减
    this.piercingLeft--;

    // 暴击飘字
    if (this.isCrit) {
      game.floatingTexts.push(new FloatingText(
        enemy.x, enemy.y - enemy.radius - 10,
        'CRIT!', '#ff4444', 18
      ));
    }

    // 伤害飘字
    game.floatingTexts.push(new FloatingText(
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y - enemy.radius - 5,
      String(actualDamage),
      this.isCrit ? '#ff6666' : '#ffffff',
      this.isCrit ? 18 : 16
    ));

    // 血液粒子
    game.particles.spawnBlood(enemy.x, enemy.y, this.isCrit ? 8 : 4);
    this._spawnImpactBurst(enemy);
  }

  _spawnVisualTrail() {
    if (!this.visualIntensity || this.visualIntensity <= 0 || !game.particles) return;
    const count = this.visualIntensity >= 1.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const side = (Math.random() - 0.5) * 8;
      const back = 4 + Math.random() * 10;
      const x = this.x - Math.cos(this.angle) * back + Math.cos(this.angle + Math.PI / 2) * side;
      const y = this.y - Math.sin(this.angle) * back + Math.sin(this.angle + Math.PI / 2) * side;
      const p = new Particle(
        x,
        y,
        -Math.cos(this.angle) * (18 + Math.random() * 38),
        -Math.sin(this.angle) * (18 + Math.random() * 38),
        0.12 + Math.random() * 0.12,
        Math.random() < 0.25 ? this.coreColor : this.trailColor,
        1.5 + Math.random() * (2.2 + this.visualIntensity)
      );
      p.friction = 0.88;
      game.particles.push(p);
    }
  }

  _spawnImpactBurst(anchor) {
    if (!this.visualIntensity || this.visualIntensity <= 0 || !game.particles) return;
    const count = Math.min(14, 3 + Math.round(this.visualIntensity * 4));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const speed = 45 + Math.random() * 105;
      const p = new Particle(
        anchor.x,
        anchor.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.16 + Math.random() * 0.18,
        i % 3 === 0 ? this.impactColor : this.trailColor,
        2 + Math.random() * (2 + this.visualIntensity)
      );
      p.friction = 0.86;
      game.particles.push(p);
    }
  }

  _explode() {
    const radius = this.weaponData.explosive * (1 + this.owner.upgrades.explodeRadius);
    game.particles.spawnExplosion(this.x, this.y, radius, 20);

    // AOE 伤害
    for (const enemy of game.enemies) {
      const d = dist(this.x, this.y, enemy.x, enemy.y);
      if (d < radius + enemy.radius) {
        const falloff = 1 - (d / (radius + enemy.radius));
        const aoeDmg = Math.round(this.damage * 0.5 * falloff);
        if (aoeDmg > 0) {
          enemy.takeDamage(aoeDmg, this);
          if (this.weaponData.special === 'solar_warhead') {
            enemy.burning = true;
            enemy.burnTimer = Math.max(enemy.burnTimer || 0, this.weaponData.burnDuration || 2.8);
            enemy.burnDps = Math.max(enemy.burnDps || 0, this.weaponData.burnDamage || Math.round(this.damage * 0.16));
            enemy.applyControlEffect && enemy.applyControlEffect({ mark: 1.4, markDamageMult: 1.1 });
          }
          game.floatingTexts.push(new FloatingText(
            enemy.x, enemy.y - enemy.radius - 5,
            String(aoeDmg), '#ffaa00', 14
          ));
        }
      }
    }

    // 爆炸飘字
    game.floatingTexts.push(new FloatingText(
      this.x, this.y - radius,
      'BOOM!', '#ff8800', 20
    ));
  }

  _applySolarBlade(enemy) {
    enemy.burning = true;
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, this.weaponData.burnDuration || 2.0);
    enemy.burnDps = Math.max(enemy.burnDps || 0, this.weaponData.burnDamage || Math.round(this.damage * 0.12));
    if (enemy.applyControlEffect) {
      enemy.applyControlEffect({
        mark: this.weaponData.markDuration || 1.6,
        markDamageMult: this.weaponData.markDamageMult || 1.1,
      });
    }
    if (game.particles && game.particles.spawnSpark) {
      game.particles.spawnSpark(enemy.x, enemy.y, 5);
    }
  }

  _triggerVoidRift(anchor) {
    const radius = this.weaponData.riftRadius || 140;
    const baseDamage = this.weaponData.riftDamage || Math.round(this.damage * 0.45);
    const pullStrength = this.weaponData.pullStrength || 45;
    if (game.particles && game.particles.spawnExplosion) {
      game.particles.spawnExplosion(anchor.x, anchor.y, radius * 0.45, 18);
    }
    game.floatingTexts.push(new FloatingText(
      anchor.x,
      anchor.y - anchor.radius - 16,
      '虚空裂隙', '#bb88ff', 16
    ));

    for (const enemy of game.enemies) {
      if (!enemy.alive || enemy === anchor) continue;
      const d = dist(anchor.x, anchor.y, enemy.x, enemy.y);
      if (d > radius + enemy.radius) continue;
      const falloff = Math.max(0.35, 1 - d / (radius + enemy.radius));
      const riftDamage = Math.max(1, Math.round(baseDamage * falloff));
      enemy.takeDamage(riftDamage, this);
      const pull = pullStrength * falloff;
      const a = angleTo(enemy.x, enemy.y, anchor.x, anchor.y);
      const nx = enemy.x + Math.cos(a) * pull;
      const ny = enemy.y + Math.sin(a) * pull;
      if (game.map.isWalkable(nx, ny, enemy.radius)) {
        enemy.x = nx;
        enemy.y = ny;
      }
      if (enemy.applyControlEffect) {
        enemy.applyControlEffect({ slow: 0.8, slowMult: 0.7 });
      }
      game.floatingTexts.push(new FloatingText(
        enemy.x,
        enemy.y - enemy.radius - 5,
        String(riftDamage), '#bb88ff', 13
      ));
    }
  }

  _chainLightning(firstEnemy) {
    const chainRange = this.weaponData.chainRange || 120;
    const chainDamage = Math.round(this.damage * (this.weaponData.chainDamageMult || 0.5));
    const jumps = this.weaponData.chainJumps || 3;
    let current = firstEnemy;
    this.chainedEnemies.add(current);

    for (let i = 0; i < jumps; i++) {
      let closest = null;
      let closestDist = chainRange;
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        if (this.chainedEnemies.has(enemy)) continue;
        const d = dist(current.x, current.y, enemy.x, enemy.y);
        if (d < closestDist) {
          closestDist = d;
          closest = enemy;
        }
      }
      if (!closest) break;

      this.chainedEnemies.add(closest);
      closest.takeDamage(chainDamage, this);
      if (this.weaponData.special === 'storm_chain' && closest.applyControlEffect) {
        closest.applyControlEffect({
          stun: this.weaponData.stunDuration || 0.2,
          mark: 1.2,
          markDamageMult: 1.08,
        });
      }

      // 链式闪电粒子效果
      const steps = Math.ceil(closestDist / 10);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = lerp(current.x, closest.x, t) + (Math.random() - 0.5) * 10;
        const py = lerp(current.y, closest.y, t) + (Math.random() - 0.5) * 10;
        game.particles.push(new Particle(
          px, py,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          0.2 + Math.random() * 0.3,
          '#00ffff', 2 + Math.random() * 2
        ));
      }

      game.floatingTexts.push(new FloatingText(
        closest.x, closest.y - closest.radius - 5,
        String(chainDamage), '#00ffff', 12
      ));

      current = closest;
    }
  }

  _processMelee() {
    // 电锯/近战：检测范围内的敌人
    const range = CHAINSAW_RANGE;
    for (const enemy of game.enemies) {
      if (this.hitEnemies.has(enemy)) continue;
      const d = dist(this.owner.x, this.owner.y, enemy.x, enemy.y);
      if (d < range + enemy.radius) {
        // 检查角度是否在正面
        const angleToEnemy = angleTo(this.owner.x, this.owner.y, enemy.x, enemy.y);
        const angleDiff = Math.abs(angleToEnemy - this.angle);
        const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
        if (normalizedDiff < Math.PI / 3) {
          this._hitEnemy(enemy);
          this.hitEnemies.add(enemy);
        }
      }
    }
    // 每帧清空命中记录，允许持续伤害
    this.hitEnemies.clear();
  }

  _processFlamethrower(dt = 1 / 60) {
    const range = FLAMETHROWER_RANGE;
    const halfAngle = FLAMETHROWER_ANGLE;
    this.flamethrowerTargets = [];

    for (const enemy of game.enemies) {
      const d = dist(this.owner.x, this.owner.y, enemy.x, enemy.y);
      if (d > range + enemy.radius) continue;

      const angleToEnemy = angleTo(this.owner.x, this.owner.y, enemy.x, enemy.y);
      const angleDiff = Math.abs(angleToEnemy - this.angle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      if (normalizedDiff < halfAngle) {
        this.flamethrowerTargets.push(enemy);
        const burnDmg = Math.round(this.damage * dt * 10); // 按帧率缩放伤害显示
        enemy.takeDamage(this.damage, this);
        enemy.burning = true;
        enemy.burnTimer = 1.0;
        enemy.burnDps = Math.max(enemy.burnDps || 0, this.weaponData.burnDamage || Math.round(this.damage * 0.35));
        if (this.weaponData.special === 'plasma_chain_flame') {
          this._plasmaChainFrom(enemy);
        }

        // 火焰伤害飘字（限制频率避免刷屏）
        if (Math.random() < 0.15) {
          game.floatingTexts.push(new FloatingText(
            enemy.x + (Math.random() - 0.5) * 15,
            enemy.y - enemy.radius - 5,
            String(burnDmg), '#ff8800', 13
          ));
        }

        // 火焰粒子
        game.particles.push(new Particle(
          enemy.x + (Math.random() - 0.5) * enemy.radius * 2,
          enemy.y + (Math.random() - 0.5) * enemy.radius * 2,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30 - 20,
          0.3 + Math.random() * 0.4,
          randPick(['#ff4400', '#ff8800', '#ffaa00', '#ffcc00']),
          3 + Math.random() * 4
        ));
      }
    }

    // 火焰轨迹粒子
    for (let i = 0; i < 3; i++) {
      const distAlong = Math.random() * range * 0.8;
      const spreadAngle = (Math.random() - 0.5) * halfAngle * 2;
      const px = this.owner.x + Math.cos(this.angle + spreadAngle) * distAlong;
      const py = this.owner.y + Math.sin(this.angle + spreadAngle) * distAlong;
      game.particles.push(new Particle(
        px, py,
        Math.cos(this.angle + spreadAngle) * 50 + (Math.random() - 0.5) * 30,
        Math.sin(this.angle + spreadAngle) * 50 + (Math.random() - 0.5) * 30,
        0.2 + Math.random() * 0.3,
        randPick(['#ff4400', '#ff6600', '#ff8800']),
        2 + Math.random() * 3
      ));
    }
  }

  _plasmaChainFrom(source) {
    if (this.chainedEnemies.has(source)) return;
    this.chainedEnemies.add(source);
    const range = this.weaponData.chainRange || 115;
    const damage = Math.max(1, Math.round(this.damage * (this.weaponData.chainDamageMult || 0.45)));
    let closest = null;
    let closestDist = range;
    for (const enemy of game.enemies) {
      if (!enemy.alive || enemy === source || this.chainedEnemies.has(enemy)) continue;
      const d = dist(source.x, source.y, enemy.x, enemy.y);
      if (d < closestDist) {
        closest = enemy;
        closestDist = d;
      }
    }
    if (!closest) return;
    this.chainedEnemies.add(closest);
    closest.takeDamage(damage, this);
    closest.burning = true;
    closest.burnTimer = Math.max(closest.burnTimer || 0, 1.2);
    closest.burnDps = Math.max(closest.burnDps || 0, Math.round(damage * 0.35));
    closest.applyControlEffect && closest.applyControlEffect({ mark: 1.0, markDamageMult: 1.08 });
    const steps = Math.max(1, Math.ceil(closestDist / 12));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      game.particles.push(new Particle(
        lerp(source.x, closest.x, t) + (Math.random() - 0.5) * 8,
        lerp(source.y, closest.y, t) + (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 28,
        0.16 + Math.random() * 0.2,
        randPick(['#ff8844', '#66ffff', '#ffee88']),
        2 + Math.random() * 2
      ));
    }
    game.floatingTexts.push(new FloatingText(
      closest.x,
      closest.y - closest.radius - 8,
      '链焰', '#66ffff', 12
    ));
  }

  _processLaser() {
    // 激光：射线检测
    const maxRange = LASER_RANGE;
    let endX = this.owner.x + Math.cos(this.angle) * maxRange;
    let endY = this.owner.y + Math.sin(this.angle) * maxRange;
    this.laserHitEnemies = [];

    // 找到所有在激光线上的敌人，按距离排序
    const hits = [];
    for (const enemy of game.enemies) {
      const d = dist(this.owner.x, this.owner.y, enemy.x, enemy.y);
      if (d > maxRange) continue;

      const angleToEnemy = angleTo(this.owner.x, this.owner.y, enemy.x, enemy.y);
      const angleDiff = Math.abs(angleToEnemy - this.angle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      // 激光宽度判定
      const perpDist = Math.abs(
        (enemy.x - this.owner.x) * Math.sin(this.angle) -
        (enemy.y - this.owner.y) * Math.cos(this.angle)
      );

      if (perpDist < enemy.radius + 4) {
        hits.push({ enemy, distance: d });
      }
    }

    hits.sort((a, b) => a.distance - b.distance);

    // 穿透所有敌人
    for (const hit of hits) {
      const enemy = hit.enemy;
      this.laserHitEnemies.push(enemy);
      enemy.takeDamage(this.damage, this);

      // 激光伤害飘字（限制频率）
      if (Math.random() < 0.2) {
        game.floatingTexts.push(new FloatingText(
          enemy.x + (Math.random() - 0.5) * 15,
          enemy.y - enemy.radius - 5,
          String(Math.round(this.damage)), '#ff4444', 13
        ));
      }

      // 激光命中粒子
      game.particles.push(new Particle(
        enemy.x + (Math.random() - 0.5) * 10,
        enemy.y + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        0.1 + Math.random() * 0.2,
        '#ff0000', 2
      ));
    }

    // 激光终点（碰到墙或最大距离）
    // 简化：取最远敌人或最大距离
    if (hits.length > 0) {
      const lastHit = hits[hits.length - 1];
      endX = lastHit.enemy.x + Math.cos(this.angle) * lastHit.enemy.radius;
      endY = lastHit.enemy.y + Math.sin(this.angle) * lastHit.enemy.radius;
    }

    // 检查墙壁
    const step = 10;
    for (let d = 0; d < maxRange; d += step) {
      const checkX = this.owner.x + Math.cos(this.angle) * d;
      const checkY = this.owner.y + Math.sin(this.angle) * d;
      if (!game.map.isWalkable(checkX, checkY, 2)) {
        endX = checkX;
        endY = checkY;
        break;
      }
    }

    this.laserEndX = endX;
    this.laserEndY = endY;

    // 激光核心粒子
    game.particles.push(new Particle(
      this.owner.x + Math.cos(this.angle) * 5,
      this.owner.y + Math.sin(this.angle) * 5,
      Math.cos(this.angle) * 100,
      Math.sin(this.angle) * 100,
      0.05,
      '#ff0000', 3
    ));
  }

  _processChainsaw() {
    // 电锯持续伤害
    this._processMelee();
  }

  _tryRetrieve() {
    if (this.retrievable && !this.retrieved) {
      this.retrieved = true;
      const weapon = this.owner.getCurrentWeapon();
      if (weapon && weapon.data.id === 'crossbow') {
        weapon.retrieveBolt();
      }
    }
  }

  draw(ctx) {
    if (this.melee) return; // 近战不绘制弹道

    if (this.continuous) {
      if (this.weaponData.id === 'laser') {
        this._drawLaser(ctx);
      } else if (this.weaponData.id === 'flamethrower') {
        this._drawFlamethrower(ctx);
      }
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const hasSignature = this.visualIntensity > 0;
    if (hasSignature) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 10 + this.visualIntensity * 5;
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = this.glowColor;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 13 + this.visualIntensity * 4, 5 + this.visualIntensity, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 根据武器类型绘制不同弹丸
    if (this.isRocket) {
      ctx.fillStyle = hasSignature ? this.trailColor : '#ff4400';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 尾焰
      ctx.fillStyle = hasSignature ? this.coreColor : '#ffaa00';
      ctx.beginPath();
      ctx.ellipse(-4, 0, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.weaponData.id === 'crossbow') {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-6, -1, 12, 2);
      // 箭头
      ctx.fillStyle = '#aaaaaa';
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 2);
      ctx.fill();
    } else if (this.weaponData.id === 'railgun') {
      ctx.fillStyle = hasSignature ? this.coreColor : '#00ffff';
      ctx.shadowColor = hasSignature ? this.glowColor : '#00ffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.weaponData.id === 'sniper') {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = hasSignature ? this.trailColor : '#ffdd44';
      ctx.beginPath();
      ctx.arc(0, 0, hasSignature ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
      if (hasSignature) {
        ctx.fillStyle = this.coreColor;
        ctx.beginPath();
        ctx.arc(2, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawLaser(ctx) {
    if (this.laserEndX === null) return;
    ctx.save();
    ctx.strokeStyle = this.visualIntensity > 0 ? this.trailColor : '#ff0000';
    ctx.lineWidth = this.visualIntensity > 0 ? 4 : 3;
    ctx.shadowColor = this.visualIntensity > 0 ? this.glowColor : '#ff0000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(this.owner.x, this.owner.y);
    ctx.lineTo(this.laserEndX, this.laserEndY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(this.owner.x, this.owner.y);
    ctx.lineTo(this.laserEndX, this.laserEndY);
    ctx.stroke();
    ctx.restore();
  }

  _drawFlamethrower(ctx) {
    // 火焰由粒子系统处理，这里不额外绘制
  }
}

// ------------------------------------------------------------------
// Player 类
// ------------------------------------------------------------------
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 200;
    this.angle = 0;

    // 武器
    this.weapons = [new Weapon(WEAPON_DATA.pistol)];
    this.equipped = [0, null];     // 两个装备槽，存 weapons 数组索引
    this.activeSlot = 0;           // 当前使用哪个槽 (0=主, 1=副)

    // 经济
    this.money = 0;

    // 连击
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;

    // 升级
    this.upgrades = {
      damageMult: 1.0,
      fireRateMult: 1.0,
      speedMult: 1.0,
      magMult: 1.0,
      critChance: 0.05,
      critDamage: 2.0,
      penetration: 0,
      lifesteal: 0,
      goldMult: 1.0,
      spreadReduce: 0,
      explodeRadius: 0,
      freezeChance: 0,
      extraLives: 0,
      damageReduction: 0,
      comboTimeBonus: 0,
      pickupRangeMult: 1,
      ricochet: 0,
      splitChance: 0,
      regen: 0,
      explosiveChance: 0,
      freezeOnCrit: false,
      freezeDuration: 0,
      chainLightning: false,
      chainDamage: 0,
      doubleShotChance: 0,
    };

    // 额外生命（直接属性，也用于HUD显示）
    this.extraLives = 0;

    // 冲刺
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDirection = { x: 0, y: 0 };

    // 无敌帧
    this.invincibleTimer = 0;

    // 护甲
    this.armor = 0;
    this.maxArmor = 100;

    // 射击状态
    this.isFiring = false;
    this.isMoving = false;

    // 临时 buff（拾取道具）
    this.buffs = {
      speed:  { active: false, timer: 0, mult: 1.5 },
      damage: { active: false, timer: 0, mult: 1.5 },
      shield: { active: false, timer: 0 },
    };
  }

  update(dt) {
    // 更新当前武器
    const weapon = this.getCurrentWeapon();
    if (weapon) {
      weapon.update(dt);
    }

    // 连击计时器
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    // 无敌帧
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer < 0) this.invincibleTimer = 0;
    }

    // Buff 计时器
    for (const key in this.buffs) {
      if (this.buffs[key].active) {
        this.buffs[key].timer -= dt;
        if (this.buffs[key].timer <= 0) {
          this.buffs[key].active = false;
        }
      }
    }

    // 冲刺冷却
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }

    // 冲刺中
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.dashTimer = 0;
      }
    }

    // 载具状态下：载具处理移动，玩家只处理射击/武器/朝向
    if (this.inVehicle) {
      this.x = this.inVehicle.x;
      this.y = this.inVehicle.y;
      this.angle = this.inVehicle.angle;

      // 载具武器射击（鼠标左键）
      if (INPUT.mouseDown) {
        this.isFiring = true;
        this.inVehicle._fireMountedWeapon();
      } else {
        this.isFiring = false;
      }

      // 载具武器不需要换弹
      // 武器切换：1/2 切换主/副武器，Q 切换下一个
      if (INPUT.keys['Digit1']) {
        this.switchWeapon(0);
        INPUT.keys['Digit1'] = false;
      }
      if (INPUT.keys['Digit2']) {
        this.switchWeapon(1);
        INPUT.keys['Digit2'] = false;
      }
      if (INPUT.keys['KeyQ']) {
        this.switchToNextWeapon();
        INPUT.keys['KeyQ'] = false;
      }
      return;
    }

    // 计算移动
    let dx = 0;
    let dy = 0;
    if (INPUT.keys['KeyW'] || INPUT.keys['ArrowUp']) dy -= 1;
    if (INPUT.keys['KeyS'] || INPUT.keys['ArrowDown']) dy += 1;
    if (INPUT.keys['KeyA'] || INPUT.keys['ArrowLeft']) dx -= 1;
    if (INPUT.keys['KeyD'] || INPUT.keys['ArrowRight']) dx += 1;

    // 冲刺触发
    if ((INPUT.keys['ShiftLeft'] || INPUT.keys['ShiftRight'] || INPUT.keys['Space']) && !this.isDashing && this.dashCooldownTimer <= 0) {
      if (dx !== 0 || dy !== 0) {
        this._startDash(dx, dy);
      }
    }

    // 移动速度
    let moveSpeed = this.speed * this.upgrades.speedMult;
    if (this.buffs.speed.active) {
      moveSpeed *= this.buffs.speed.mult;
    }
    if (this.isDashing) {
      moveSpeed *= DASH_SPEED_MULT;
      dx = this.dashDirection.x;
      dy = this.dashDirection.y;
    }

    // 归一化方向
    this.isMoving = (dx !== 0 || dy !== 0);
    if (this.isMoving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // 应用移动（带碰撞检测）
    const moveDist = moveSpeed * dt;
    let newX = this.x + dx * moveDist;
    let newY = this.y + dy * moveDist;

    // X轴碰撞
    if (game.map.isWalkable(newX, this.y, this.radius)) {
      this.x = newX;
    }
    // Y轴碰撞
    if (game.map.isWalkable(this.x, newY, this.radius)) {
      this.y = newY;
    }

    // 更新朝向（鼠标方向）
    this.angle = angleTo(this.x, this.y, INPUT.mouseWorldX, INPUT.mouseWorldY);

    // 射击
    if (INPUT.mouseDown) {
      this.isFiring = true;
      this._tryFire();
    } else {
      this.isFiring = false;
      // 机枪停止预热
      if (weapon && weapon.data.id === 'machinegun') {
        weapon.isSpinning = false;
      }
    }

    // 换弹
    if (INPUT.keys['KeyR']) {
      this.reload();
      INPUT.keys['KeyR'] = false;
    }

    // 武器切换：1/2 切换主/副武器，Q 切换下一个
    if (INPUT.keys['Digit1']) {
      this.switchWeapon(0);
      INPUT.keys['Digit1'] = false;
    }
    if (INPUT.keys['Digit2']) {
      this.switchWeapon(1);
      INPUT.keys['Digit2'] = false;
    }
    if (INPUT.keys['KeyQ']) {
      this.switchToNextWeapon();
      INPUT.keys['KeyQ'] = false;
    }
  }

  _startDash(dx, dy) {
    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;
    const len = Math.sqrt(dx * dx + dy * dy);
    this.dashDirection = { x: dx / len, y: dy / len };
    this.invincibleTimer = DASH_DURATION;

    // 冲刺粒子
    game.particles.spawnExplosion(this.x, this.y, 20, 5);
  }

  _tryFire() {
    const weapon = this.getCurrentWeapon();
    if (!weapon) return;

    if (weapon.canFire()) {
      const projs = weapon.fire(this, INPUT.mouseWorldX, INPUT.mouseWorldY);
      for (const p of projs) {
        game.projectiles.push(p);
      }
    } else if (weapon.ammo <= 0 && !weapon.isReloading && weapon.maxAmmo !== Infinity) {
      weapon.reload();
    }
  }

  takeDamage(amount) {
    if (this.inVehicle) {
      this.inVehicle.takeDamage(amount);
      return;
    }

    if (this.invincibleTimer > 0) return;

    // 护盾：完全免疫
    if (this.buffs.shield.active) {
      game.floatingTexts.push(new FloatingText(
        this.x, this.y - this.radius - 15,
        '护盾抵消!', '#a0f', 14
      ));
      return;
    }

    // 护甲减伤
    if (this.upgrades.damageReduction > 0) {
      amount *= (1 - Math.min(0.8, this.upgrades.damageReduction));
    }
    // 护甲吸收
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.hp -= amount;
    this.invincibleTimer = 0.3;

    // 受伤粒子
    game.particles.spawnBlood(this.x, this.y, 6);

    // 受伤飘字
    game.floatingTexts.push(new FloatingText(
      this.x, this.y - this.radius - 10,
      `-${amount}`, '#ff0000', 16
    ));

    // 连击中断
    this.combo = 0;
    this.comboTimer = 0;

    if (this.hp <= 0) {
      this.hp = 0;
      // 死亡处理由游戏主循环处理
    }
  }

  heal(amount) {
    const actualHeal = Math.min(amount, this.maxHp - this.hp);
    this.hp += actualHeal;
    if (actualHeal > 0) {
      game.floatingTexts.push(new FloatingText(
        this.x, this.y - this.radius - 15,
        `+${Math.round(actualHeal)}`, '#00ff00', 14
      ));
    }
  }

  addCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.comboTimer = COMBO_TIMEOUT;

    // 连击里程碑飘字
    if (this.combo > 0 && this.combo % 10 === 0) {
      game.floatingTexts.push(new FloatingText(
        this.x, this.y - this.radius - 25,
        `${this.combo} COMBO!`, '#ffaa00', 20
      ));
    }
  }

  addKill() {
    this.addCombo();
    if (game.comboSystem) game.comboSystem.onKill();
    // 给当前武器加熟练度经验
    const weapon = this.getCurrentWeapon();
    if (weapon) {
      weapon.addProficiencyXP(10);
    }
    return game.comboSystem ? game.comboSystem.getMultiplier() : 1;
  }

  addMoney(amount) {
    const actual = Math.round(amount * this.upgrades.goldMult);
    this.money += actual;
    game.floatingTexts.push(new FloatingText(
      this.x + (Math.random() - 0.5) * 30,
      this.y - this.radius - 20,
      `+$${actual}`, '#ffd700', 14
    ));
    return actual;
  }

  switchWeapon(slot) {
    if (slot < 0 || slot > 1) return false;
    if (this.equipped[slot] === null) return false;
    this.activeSlot = slot;
    return true;
  }

  switchToNextWeapon() {
    if (this.weapons.length <= 1) return false;
    const currentIndex = this.equipped[this.activeSlot] ?? 0;
    const currentPos = this.weapons[currentIndex] ? currentIndex : 0;
    const nextWeaponIndex = (currentPos + 1) % this.weapons.length;
    const equippedSlot = this.equipped.findIndex(index => index === nextWeaponIndex);
    if (equippedSlot >= 0) {
      this.activeSlot = equippedSlot;
    } else {
      this.equipped[this.activeSlot] = nextWeaponIndex;
    }
    return true;
  }

  buyWeapon(weaponId) {
    const data = WEAPON_DATA[weaponId];
    if (!data) return false;

    // 检查是否已拥有
    const existing = this.weapons.find(w => w.data.id === weaponId);
    if (existing) {
      return false;
    }

    if (this.money < data.price) return false;

    this.money -= data.price;
    const weapon = new Weapon(data);
    this.weapons.push(weapon);
    const weaponIndex = this.weapons.length - 1;
    const emptySlot = this.equipped.findIndex(slot => slot === null);
    if (emptySlot >= 0) {
      this.equipped[emptySlot] = weaponIndex;
    }

    game.floatingTexts.push(new FloatingText(
      this.x, this.y - this.radius - 20,
      `Bought ${data.name}!`, '#00ff00', 16
    ));

    return true;
  }

  fuseWeapons(indexA, indexB) {
    if (indexA === indexB) return null;
    const weaponA = this.weapons[indexA];
    const weaponB = this.weapons[indexB];
    if (!weaponA || !weaponB) return null;

    const data = this._createFusionWeaponData(weaponA, weaponB);
    const fusionWeapon = new Weapon(data, {
      rarity: data.rarity,
      fusionLevel: Math.max(1, weaponA.fusionLevel, weaponB.fusionLevel),
      affixes: this._mergeFusionAffixes(weaponA, weaponB),
    });
    fusionWeapon.proficiencyLevel = Math.max(1, Math.floor((weaponA.proficiencyLevel + weaponB.proficiencyLevel) / 2));
    fusionWeapon.proficiencyXP = 0;
    fusionWeapon.proficiencyXPToNext = fusionWeapon._calcXPToNext(fusionWeapon.proficiencyLevel);

    const removeIndexes = [indexA, indexB].sort((a, b) => b - a);
    for (const index of removeIndexes) {
      this.weapons.splice(index, 1);
    }
    this.weapons.push(fusionWeapon);
    const fusionIndex = this.weapons.length - 1;

    this.equipped = this.equipped.map(slot => {
      if (slot === indexA || slot === indexB) return fusionIndex;
      let adjusted = slot;
      for (const removed of removeIndexes.slice().sort((a, b) => a - b)) {
        if (adjusted !== null && adjusted > removed) adjusted--;
      }
      return adjusted;
    });
    if (!this.equipped.includes(fusionIndex)) {
      this.equipped[this.activeSlot] = fusionIndex;
    }

    game.floatingTexts.push(new FloatingText(
      this.x, this.y - this.radius - 36,
      `${fusionWeapon.name} 合成!`, '#ffcc66', 20
    ));
    return fusionWeapon;
  }

  _mergeFusionAffixes(weaponA, weaponB) {
    const merged = [...(weaponA.affixes || []), ...(weaponB.affixes || [])];
    const unique = [...new Set(merged)];
    const affixIds = Object.keys(WEAPON_AFFIX_DATA);
    if (unique.length < 2) {
      const seed = (weaponA.data.id.length + weaponB.data.id.length + unique.length) % affixIds.length;
      unique.push(affixIds[seed]);
    }
    return unique.slice(0, 4);
  }

  _createFusionWeaponData(weaponA, weaponB) {
    const dataA = weaponA.getEffectiveWeaponData();
    const dataB = weaponB.getEffectiveWeaponData();
    const idA = weaponA.data.id;
    const idB = weaponB.data.id;
    const nameA = weaponA.baseName || weaponA.data.name;
    const nameB = weaponB.baseName || weaponB.data.name;
    const finiteMags = [dataA.magazine, dataB.magazine].filter(Number.isFinite);
    const magazine = finiteMags.length === 0
      ? Infinity
      : Math.max(1, Math.round(Math.max(...finiteMags) + Math.min(...finiteMags) * (finiteMags.length > 1 ? 0.35 : 0.25)));
    const finiteSpeeds = [dataA.projectileSpeed, dataB.projectileSpeed]
      .map(speed => Number.isFinite(speed) ? speed : 1400)
      .filter(speed => speed > 0);
    const projectileSpeed = Math.max(520, Math.min(2200, Math.round((finiteSpeeds.length ? Math.max(...finiteSpeeds) : 620) * 1.05)));
    const maxDamage = Math.max(dataA.damage, dataB.damage);
    const minDamage = Math.min(dataA.damage, dataB.damage);
    const maxFireRate = Math.max(dataA.fireRate, dataB.fireRate);
    const avgFireRate = (dataA.fireRate + dataB.fireRate) / 2;
    const projectileCount = Math.max(dataA.projectileCount || 1, dataB.projectileCount || 1)
      + (((dataA.projectileCount || 1) > 1 || (dataB.projectileCount || 1) > 1) ? 1 : 0);
    const explosive = Math.round(Math.max(dataA.explosive || 0, dataB.explosive || 0) + Math.min(dataA.explosive || 0, dataB.explosive || 0) * 0.35);
    const rarity = (weaponA.rarity === 'legendary' || weaponB.rarity === 'legendary')
      ? 'legendary'
      : ((weaponA.rarity === 'hero' || weaponB.rarity === 'hero') ? 'hero' : 'fusion');

    const fusionData = {
      id: `fusion_${idA}_${idB}_${Date.now().toString(36)}`,
      name: `${nameA}+${nameB}`,
      damage: Math.max(1, Math.round(maxDamage * 1.18 + minDamage * 0.72)),
      fireRate: Math.max(0.2, maxFireRate * 0.85 + avgFireRate * 0.2),
      magazine,
      reloadTime: Math.max(0.3, Math.min(dataA.reloadTime || 1, dataB.reloadTime || 1) * 0.85),
      spread: Math.min(dataA.spread || 0, dataB.spread || 0) * 0.9,
      projectileSpeed,
      piercing: Math.max(dataA.piercing || 0, dataB.piercing || 0) + 1,
      explosive,
      chain: !!(dataA.chain || dataB.chain),
      projectileCount,
      continuous: false,
      melee: false,
      price: 0,
      ammoPrice: 0,
      ammoPerBuy: magazine,
      hidden: true,
      fusionWeapon: true,
      components: [idA, idB],
      rarity,
    };
    return this._applyFusionArchetype(fusionData, weaponA, weaponB, dataA, dataB);
  }

  _applyFusionArchetype(fusionData, weaponA, weaponB, dataA, dataB) {
    const ids = [weaponA.data.id, weaponB.data.id];
    const has = (...needles) => needles.some(id => ids.includes(id));

    if (has('flamethrower') && has('railgun')) {
      return {
        ...fusionData,
        name: '等离子链焰',
        damage: Math.max(fusionData.damage, 42),
        fireRate: Math.max(fusionData.fireRate, 15),
        magazine: Infinity,
        reloadTime: 0,
        spread: FLAMETHROWER_ANGLE,
        projectileSpeed: 560,
        piercing: Math.max(fusionData.piercing, 2),
        explosive: 0,
        chain: true,
        projectileCount: 1,
        continuous: true,
        special: 'plasma_chain_flame',
        fusionArchetype: 'plasma_chain_flame',
        chainRange: 125,
        chainDamageMult: 0.52,
        burnDamage: 16,
      };
    }

    if (has('shotgun') && has('void_lance')) {
      return {
        ...fusionData,
        name: '黑洞散射',
        damage: Math.max(fusionData.damage, Math.round(Math.max(dataA.damage, dataB.damage) * 0.82)),
        fireRate: Math.max(0.85, fusionData.fireRate * 0.78),
        spread: Math.max(fusionData.spread, 0.24),
        projectileSpeed: Math.max(820, fusionData.projectileSpeed),
        piercing: Math.max(fusionData.piercing, 4),
        explosive: Math.max(fusionData.explosive, 18),
        chain: false,
        projectileCount: Math.max(fusionData.projectileCount, 9),
        continuous: false,
        special: 'void_scatter',
        fusionArchetype: 'void_scatter',
        riftRadius: 135,
        riftDamage: 82,
        pullStrength: 48,
      };
    }

    if ((has('sniper') || has('rifle') || has('crossbow')) && (has('storm_cannon') || has('railgun'))) {
      return {
        ...fusionData,
        name: '雷暴穿刺',
        damage: Math.max(fusionData.damage, Math.round(Math.max(dataA.damage, dataB.damage) * 1.15)),
        fireRate: Math.max(fusionData.fireRate, 2.1),
        spread: Math.min(fusionData.spread, 0.02),
        projectileSpeed: Math.max(fusionData.projectileSpeed, 1500),
        piercing: Math.max(fusionData.piercing, 8),
        chain: true,
        projectileCount: Math.max(fusionData.projectileCount, 2),
        continuous: false,
        special: 'storm_chain',
        fusionArchetype: 'storm_lance',
        chainJumps: 8,
        chainRange: 230,
        chainDamageMult: 0.68,
        stunDuration: 0.32,
      };
    }

    if (has('rocket') && has('sunblade')) {
      return {
        ...fusionData,
        name: '太阳弹头',
        damage: Math.max(fusionData.damage, Math.round(Math.max(dataA.damage, dataB.damage) * 1.1)),
        fireRate: Math.max(0.7, fusionData.fireRate * 0.76),
        spread: Math.min(fusionData.spread, 0.04),
        projectileSpeed: Math.max(fusionData.projectileSpeed, 620),
        piercing: Math.max(fusionData.piercing, 2),
        explosive: Math.max(fusionData.explosive, 92),
        chain: false,
        projectileCount: 1,
        continuous: false,
        special: 'solar_warhead',
        fusionArchetype: 'solar_warhead',
        burnDamage: 28,
        burnDuration: 3.4,
      };
    }

    if (has('chainsaw')) {
      return {
        ...fusionData,
        name: '血肉绞盘',
        damage: Math.max(fusionData.damage, Math.round(Math.max(dataA.damage, dataB.damage) * 1.05)),
        fireRate: Math.max(fusionData.fireRate, 11),
        magazine: Infinity,
        reloadTime: 0,
        spread: 0,
        projectileSpeed: 0,
        piercing: Math.max(fusionData.piercing, 2),
        explosive: 0,
        chain: false,
        projectileCount: 1,
        continuous: true,
        melee: true,
        special: 'vampire_saw',
        fusionArchetype: 'vampire_saw',
        lifestealOnHit: 0.08,
      };
    }

    return {
      ...fusionData,
      special: fusionData.chain ? 'fusion_chain' : (fusionData.explosive > 0 ? 'fusion_burst' : 'fusion_core'),
      fusionArchetype: fusionData.chain ? 'chain_core' : (fusionData.explosive > 0 ? 'burst_core' : 'kinetic_core'),
    };
  }

  getFusionCost(weapon) {
    const basePrice = weapon.data.price || 150;
    return Math.max(150, Math.round(basePrice * (0.75 + weapon.fusionLevel * 0.45)));
  }

  unlockHiddenWeapon(weaponId, source = 'hidden') {
    const data = WEAPON_DATA[weaponId];
    if (!data || !data.hidden) return false;
    const existing = this.weapons.find(w => w.data.id === weaponId);
    if (existing) {
      existing.addFusion(source);
      return true;
    }

    const weapon = new Weapon(data, { rarity: data.rarity || 'hero' });
    this.weapons.push(weapon);
    const emptySlot = this.equipped.findIndex(slot => slot === null);
    if (emptySlot >= 0) {
      this.equipped[emptySlot] = this.weapons.length - 1;
    }
    game.floatingTexts.push(new FloatingText(
      this.x, this.y - this.radius - 34,
      `${weapon.name} 解锁!`, data.rarity === 'legendary' ? '#ff66ff' : '#ffdd55', 20
    ));
    return true;
  }

  unlockRandomHiddenWeapon(source = 'boss') {
    const ownedHiddenIds = new Set(this.weapons.filter(w => w.data.hidden).map(w => w.data.id));
    const candidate = HIDDEN_WEAPON_IDS.find(id => !ownedHiddenIds.has(id)) || HIDDEN_WEAPON_IDS[0];
    return this.unlockHiddenWeapon(candidate, source);
  }

  buyAmmo(weaponId) {
    const weapon = this.weapons.find(w => w.data.id === weaponId);
    if (!weapon) return false;

    const data = weapon.data;
    if (data.ammoPrice <= 0 || data.ammoPerBuy === Infinity) return false;
    if (this.money < data.ammoPrice) return false;

    this.money -= data.ammoPrice;
    weapon.ammo = Math.min(weapon.maxAmmo, weapon.ammo + data.ammoPerBuy);

    game.floatingTexts.push(new FloatingText(
      this.x, this.y - this.radius - 20,
      `Ammo +${data.ammoPerBuy}`, '#00aaff', 14
    ));

    return true;
  }

  reload() {
    const weapon = this.getCurrentWeapon();
    if (weapon) {
      weapon.reload();
    }
  }

  getCurrentWeapon() {
    const idx = this.equipped[this.activeSlot];
    return idx !== null ? this.weapons[idx] : null;
  }

  applyPickup(pickup) {
    const type = pickup.type;
    const data = pickup.data;

    switch (data.effect) {
      case 'heal':
        this.heal(data.value);
        game.floatingTexts.push(new FloatingText(
          this.x, this.y - this.radius - 25,
          `+${data.value} HP`, '#0f0', 18
        ));
        break;

      case 'ammo': {
        const weapon = this.getCurrentWeapon();
        if (weapon && weapon.maxAmmo !== Infinity) {
          const refill = Math.ceil(weapon.maxAmmo * 0.3);
          weapon.ammo = Math.min(weapon.maxAmmo, weapon.ammo + refill);
          game.floatingTexts.push(new FloatingText(
            this.x, this.y - this.radius - 25,
            `弹药 +${refill}`, '#ff0', 16
          ));
        }
        break;
      }

      case 'speed':
        this.buffs.speed.active = true;
        this.buffs.speed.timer = data.duration;
        game.floatingTexts.push(new FloatingText(
          this.x, this.y - this.radius - 25,
          '加速!', '#0af', 18
        ));
        break;

      case 'damage':
        this.buffs.damage.active = true;
        this.buffs.damage.timer = data.duration;
        game.floatingTexts.push(new FloatingText(
          this.x, this.y - this.radius - 25,
          '狂暴!', '#f44', 18
        ));
        break;

      case 'shield':
        this.buffs.shield.active = true;
        this.buffs.shield.timer = data.duration;
        game.floatingTexts.push(new FloatingText(
          this.x, this.y - this.radius - 25,
          '护盾!', '#a0f', 18
        ));
        break;
    }

    // 拾取粒子
    game.particles.spawnSpark(pickup.x, pickup.y, 8);
  }

  isAlive() {
    return this.hp > 0;
  }

  draw(ctx) {
    // 载具状态下不绘制玩家身体（载具自己绘制）
    if (this.inVehicle) {
      // 只绘制血条和冲刺冷却
      const barW = 30, barH = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW, barH);
      ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#ff4444' : '#ff0000';
      ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW * (this.hp / this.maxHp), barH);
      return;
    }

    ctx.save();
    this._drawPseudo3DPlayer(ctx);
    ctx.restore();

    // 加速拖尾效果（在世界坐标绘制，不在旋转坐标系）
    if (this.buffs.speed.active) {
      ctx.fillStyle = 'rgba(0,170,255,0.2)';
      const trailCount = 3;
      for (let i = 1; i <= trailCount; i++) {
        const offset = i * 8;
        const tx = this.x - Math.cos(this.angle) * offset;
        const ty = this.y - Math.sin(this.angle) * offset;
        const alpha = 0.25 - i * 0.06;
        ctx.fillStyle = `rgba(0,170,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, this.radius * (1 - i * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 血条
    const barW = 30, barH = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW, barH);
    ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#ff4444' : '#ff0000';
    ctx.fillRect(this.x - barW/2, this.y - this.radius - 10, barW * (this.hp / this.maxHp), barH);

    // 冲刺冷却指示
    if (this.dashCooldownTimer > 0) {
      const cdRatio = this.dashCooldownTimer / DASH_COOLDOWN;
      ctx.fillStyle = 'rgba(100,200,255,0.3)';
      ctx.fillRect(this.x - 15, this.y + this.radius + 4, 30 * cdRatio, 3);
    }
  }

  _getFacingPose(angle) {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const sideness = Math.abs(x);
    const frontness = Math.max(0, y);
    const backness = Math.max(0, -y);
    return {
      x,
      y,
      sideness,
      frontness,
      backness,
      sideSign: x >= 0 ? 1 : -1,
      torsoWidth: 18 - sideness * 5,
      headWidth: 14 - sideness * 4,
    };
  }

  _drawPseudo3DPlayer(ctx) {
    const pose = this._getFacingPose(this.angle);
    const bob = this.isMoving ? Math.sin(Date.now() / 80) * 2 : 0;

    ctx.translate(this.x, this.y);

    if (this.buffs.shield.active) {
      ctx.strokeStyle = '#a0f';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    if (this.buffs.damage.active) {
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.invincibleTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const legSpread = 4 + pose.sideness * 2;
    const farLegX = -pose.sideSign * legSpread + bob;
    const nearLegX = pose.sideSign * legSpread - bob;
    this._drawLeg(ctx, farLegX, 5, '#1d3c78');
    this._drawLeg(ctx, nearLegX, 6, '#2850a0');

    const torsoW = pose.torsoWidth;
    const torsoX = -torsoW / 2;
    ctx.fillStyle = '#223366';
    ctx.fillRect(torsoX - 1, -5, torsoW + 2, 15);
    ctx.fillStyle = pose.backness > 0.55 ? '#26305a' : '#3355aa';
    ctx.fillRect(torsoX, -6, torsoW, 14);
    ctx.fillStyle = pose.backness > 0.55 ? '#1b2448' : '#4488ff';
    ctx.fillRect(torsoX + 2, -3, torsoW - 4, 9);
    ctx.fillStyle = '#172348';
    ctx.fillRect(torsoX + 3, 1, torsoW - 6, 2);
    if (pose.backness > 0.35) {
      ctx.fillStyle = '#1a1f34';
      ctx.fillRect(torsoX + 3, -4, torsoW - 6, 10);
    }

    if (pose.backness > 0.45) {
      this._drawAimRig(ctx, pose, true);
    }

    const headW = pose.headWidth;
    const headX = -headW / 2 + pose.sideSign * pose.sideness * 1.5;
    ctx.fillStyle = pose.backness > 0.6 ? '#d9a56d' : '#ffcc88';
    ctx.fillRect(headX, -18, headW, 13);
    ctx.fillStyle = '#224488';
    ctx.fillRect(headX - 2, -22, headW + 4, 7);
    ctx.fillStyle = '#1b3568';
    ctx.fillRect(headX - 2, -17, 3, 8);
    ctx.fillRect(headX + headW - 1, -17, 3, 8);

    if (pose.backness > 0.65) {
      ctx.fillStyle = '#162a54';
      ctx.fillRect(headX + 2, -17, headW - 4, 3);
    } else if (pose.sideness > 0.65) {
      const eyeX = pose.sideSign > 0 ? headX + headW - 5 : headX + 1;
      ctx.fillStyle = '#88ccff';
      ctx.fillRect(eyeX, -15, 5, 4);
      ctx.fillStyle = '#4488aa';
      ctx.fillRect(eyeX + 1, -14, 3, 2);
    } else {
      ctx.fillStyle = '#88ccff';
      ctx.fillRect(headX + 3, -15, headW - 6, 4);
      ctx.fillStyle = '#4488aa';
      ctx.fillRect(headX + 5, -14, headW - 10, 2);
    }

    if (pose.backness <= 0.45) {
      this._drawAimRig(ctx, pose, false);
    }
  }

  _drawLeg(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2.5, y, 5, 9);
    ctx.fillStyle = '#332211';
    ctx.fillRect(x - 3.5, y + 8, 7, 3);
  }

  _drawAimRig(ctx, pose, behindBody) {
    const weapon = this.getCurrentWeapon();
    const shoulderX = pose.sideSign * (5 + pose.sideness * 3);
    const shoulderY = -2 - pose.backness * 4 + pose.frontness * 2;

    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(this.angle);
    ctx.fillStyle = behindBody ? '#d6a06a' : '#ffcc88';
    ctx.fillRect(-2, -4, 12, 4);
    ctx.fillRect(-2, 1, 10, 4);
    if (weapon && !weapon.data.melee) {
      this._drawWeapon(ctx, weapon);
    } else if (weapon && weapon.data.melee) {
      this._drawChainsaw(ctx);
    }
    ctx.restore();
  }

  _drawChainsaw(ctx) {
    ctx.fillStyle = '#444';
    ctx.fillRect(10, -4, 8, 4);
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(16, -10, 4, 16);
    ctx.fillStyle = '#aaa';
    for (let i = 0; i < 4; i++) {
      const yOff = -8 + i * 4 + (Date.now() / 20 % 4);
      ctx.fillRect(18, yOff, 3, 2);
    }
  }

  _drawWeapon(ctx, weapon) {
    const id = weapon.data.id;
    // 通用枪托
    ctx.fillStyle = '#555';
    ctx.fillRect(4, 1, 8, 3);
    switch (id) {
      case 'pistol':
        ctx.fillStyle = '#666';
        ctx.fillRect(10, -1, 10, 3);
        ctx.fillStyle = '#444';
        ctx.fillRect(18, -2, 3, 5);
        break;
      case 'smg':
        ctx.fillStyle = '#777';
        ctx.fillRect(10, -2, 12, 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(14, 2, 6, 2);
        break;
      case 'shotgun':
        ctx.fillStyle = '#664422';
        ctx.fillRect(10, -2, 16, 5);
        ctx.fillStyle = '#444';
        ctx.fillRect(24, -1, 4, 3);
        break;
      case 'assault':
        ctx.fillStyle = '#3a5';
        ctx.fillRect(10, -2, 16, 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(12, 2, 8, 2);
        break;
      case 'sniper':
        ctx.fillStyle = '#2a2';
        ctx.fillRect(10, -2, 22, 4);
        ctx.fillStyle = '#111';
        ctx.fillRect(30, -3, 4, 6);
        break;
      case 'machinegun':
        ctx.fillStyle = '#444';
        ctx.fillRect(10, -3, 16, 6);
        ctx.fillStyle = '#666';
        ctx.fillRect(14, -5, 8, 2);
        break;
      case 'rocket':
        ctx.fillStyle = '#662222';
        ctx.fillRect(10, -3, 14, 6);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(22, -2, 6, 4);
        break;
      case 'flamethrower':
        ctx.fillStyle = '#aa4400';
        ctx.fillRect(10, -2, 14, 5);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(22, -1, 4, 3);
        break;
      case 'laser':
        ctx.fillStyle = '#444';
        ctx.fillRect(10, -2, 12, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(20, -1, 8, 2);
        break;
      case 'railgun':
        ctx.fillStyle = '#2266aa';
        ctx.fillRect(10, -2, 20, 4);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(28, -1, 4, 2);
        break;
      case 'crossbow':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(10, -1, 14, 3);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(22, -3, 2, 7);
        break;
      default:
        ctx.fillStyle = '#888';
        ctx.fillRect(10, -2, 14, 4);
    }
  }
}
