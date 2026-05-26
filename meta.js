// ============================================================
// meta.js — 局外成长、图鉴与商店解锁
// ============================================================

class MetaProgression {
  constructor() {
    this.storageKey = 'zombieShooter_meta';
    this.defaultUnlocked = {
      weapon: ['pistol', 'smg', 'shotgun', 'rifle', 'flamethrower', 'crossbow', 'chainsaw', 'sniper', 'machinegun', 'railgun'],
      skill: ['shockwave', 'phaseDash', 'medField', 'stasisGrenade', 'orbitalStrike', 'nanoSwarm'],
      turret: ['sentry', 'flame'],
      pet: ['hound', 'drone'],
    };
    this.unlocked = {
      weapon: new Set(this.defaultUnlocked.weapon),
      skill: new Set(this.defaultUnlocked.skill),
      turret: new Set(this.defaultUnlocked.turret),
      pet: new Set(this.defaultUnlocked.pet),
    };
    this.codex = {
      pets: {},
      vehicles: {},
      turrets: {},
      bossKills: 0,
      bestWave: 0,
    };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const category of Object.keys(this.unlocked)) {
        const ids = data.unlocked && data.unlocked[category];
        if (Array.isArray(ids)) {
          this.unlocked[category] = new Set([...this.defaultUnlocked[category], ...ids]);
        }
      }
      if (data.codex) {
        this.codex = { ...this.codex, ...data.codex };
      }
    } catch (e) {}
  }

  save() {
    const data = {
      unlocked: {},
      codex: this.codex,
    };
    for (const category of Object.keys(this.unlocked)) {
      data.unlocked[category] = [...this.unlocked[category]];
    }
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  isUnlocked(category, itemId) {
    if (!this.unlocked[category]) return true;
    return this.unlocked[category].has(itemId);
  }

  unlock(category, itemId) {
    if (!this.unlocked[category]) return false;
    const before = this.unlocked[category].size;
    this.unlocked[category].add(itemId);
    const changed = this.unlocked[category].size !== before;
    if (changed) this.save();
    return changed;
  }

  recordRunDeath(summary = {}) {
    const wave = summary.wave || 0;
    const bossKills = summary.bossKills || 0;
    this.codex.bestWave = Math.max(this.codex.bestWave || 0, wave);
    this.codex.bossKills = (this.codex.bossKills || 0) + bossKills;

    const unlockedNow = [];
    for (const item of META_UNLOCK_DATA) {
      if (wave >= item.wave && this.unlock(item.category, item.itemId)) {
        unlockedNow.push(item);
      }
    }
    if (bossKills > 0) {
      for (const id of HIDDEN_WEAPON_IDS) {
        if (this.unlock('weapon', id)) {
          unlockedNow.push({ category: 'weapon', itemId: id, source: 'boss' });
          break;
        }
      }
    }
    this.save();
    return unlockedNow;
  }

  recordPet(type) {
    this.codex.pets[type] = true;
    this.save();
  }

  recordVehicle(type) {
    this.codex.vehicles[type] = true;
    this.save();
  }

  recordTurret(type) {
    this.codex.turrets[type] = true;
    this.save();
  }

  reset() {
    localStorage.removeItem(this.storageKey);
    this.unlocked = {
      weapon: new Set(this.defaultUnlocked.weapon),
      skill: new Set(this.defaultUnlocked.skill),
      turret: new Set(this.defaultUnlocked.turret),
      pet: new Set(this.defaultUnlocked.pet),
    };
    this.codex = { pets: {}, vehicles: {}, turrets: {}, bossKills: 0, bestWave: 0 };
  }
}
