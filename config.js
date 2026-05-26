// ============================================================
// config.js — 像素俯视角射击游戏「战斗配置与常量」
// ============================================================

// ------------------------------------------------------------------
// 全局常量
// ------------------------------------------------------------------
const COMBO_TIMEOUT = 3.0;          // 连击重置时间（秒）
const COMBO_DAMAGE_BONUS = 0.05;    // 每层连击增伤 5%
const DAMAGE_SOFT_CAP = 650;        // 后期伤害软上限，避免纯数字膨胀
const DASH_SPEED_MULT = 2.0;        // 冲刺速度倍率
const DASH_DURATION = 0.3;          // 冲刺持续时间
const DASH_COOLDOWN = 1.5;          // 冲刺冷却时间
const MAX_COMBO_CAP = 50;           // 连击上限
const CHAINSAW_RANGE = 40;          // 电锯攻击范围
const FLAMETHROWER_RANGE = 180;     // 火焰喷射器射程
const FLAMETHROWER_ANGLE = Math.PI / 6; // 火焰锥形半角
const LASER_RANGE = 600;            // 激光射程
const CROSSBOW_RETRIEVE_CHANCE = 0.3; // 弩箭回收概率

// ------------------------------------------------------------------
// 英雄技能数据（Q / Shift / E）
// ------------------------------------------------------------------
const HERO_SKILL_DATA = {
  shockwave: {
    id: 'shockwave',
    key: 'KeyQ',
    keyLabel: 'Q',
    name: '震荡脉冲',
    desc: '范围伤害并击退僵尸',
    price: 600,
    cooldown: 8,
    radius: 180,
    damage: 85,
    knockback: 85,
  },
  phaseDash: {
    id: 'phaseDash',
    key: 'ShiftLeft',
    keyLabel: 'Shift',
    name: '相位突进',
    desc: '无敌位移并撕裂路径',
    price: 700,
    cooldown: 5,
    distance: 190,
    damage: 55,
    hitRadius: 45,
    invincibleDuration: 0.45,
  },
  medField: {
    id: 'medField',
    key: 'KeyE',
    keyLabel: 'E',
    name: '急救力场',
    desc: '治疗、补护甲并短暂护盾',
    price: 600,
    cooldown: 14,
    heal: 45,
    armor: 35,
    shieldDuration: 2.5,
  },
  stasisGrenade: {
    id: 'stasisGrenade',
    key: 'KeyC',
    keyLabel: 'C',
    name: '静滞手雷',
    desc: '定住一片敌人并破盾',
    price: 850,
    cooldown: 11,
    radius: 150,
    damage: 42,
    stunDuration: 2.2,
  },
  orbitalStrike: {
    id: 'orbitalStrike',
    key: 'KeyF',
    keyLabel: 'F',
    name: '轨道轰击',
    desc: '准星处连续高爆打击',
    price: 1150,
    cooldown: 16,
    radius: 105,
    damage: 170,
    pulses: 3,
  },
  nanoSwarm: {
    id: 'nanoSwarm',
    key: 'KeyV',
    keyLabel: 'V',
    name: '纳米蜂群',
    desc: '自动啃咬附近高威胁目标',
    price: 1250,
    cooldown: 20,
    duration: 8,
    radius: 260,
    dps: 42,
    tick: 0.35,
  },
};

// ------------------------------------------------------------------
// 炮台数据（托比昂式部署/升级/修理）
// ------------------------------------------------------------------
const TURRET_DATA = {
  sentry: {
    id: 'sentry',
    name: '机枪塔',
    desc: '稳定单体火力',
    price: 450,
    upgradeCost: 320,
    repairCost: 90,
    maxHp: 140,
    range: 320,
    damage: 16,
    fireRate: 4.5,
    projectileSpeed: 650,
    piercing: 0,
    color: '#66aaff',
    muzzleColor: '#ffdd55',
    maxHeat: 100,
    heatPerShot: 23,
    coolRate: 16,
    deployTime: 0.9,
  },
  flame: {
    id: 'flame',
    name: '喷火塔',
    desc: '近距离高频压制',
    price: 650,
    upgradeCost: 420,
    repairCost: 120,
    maxHp: 170,
    range: 190,
    damage: 9,
    fireRate: 9,
    projectileSpeed: 360,
    piercing: 1,
    color: '#ff8844',
    muzzleColor: '#ff5522',
    maxHeat: 100,
    heatPerShot: 13,
    coolRate: 24,
    deployTime: 1.0,
  },
  tesla: {
    id: 'tesla',
    name: '电磁塔',
    desc: '穿透并克制护甲',
    price: 850,
    upgradeCost: 520,
    repairCost: 150,
    maxHp: 150,
    range: 280,
    damage: 28,
    fireRate: 2.2,
    projectileSpeed: 850,
    piercing: 2,
    color: '#66ffff',
    muzzleColor: '#aaffff',
    maxHeat: 100,
    heatPerShot: 34,
    coolRate: 18,
    deployTime: 1.1,
  },
};

// ------------------------------------------------------------------
// 载具数据（不同底盘，不同武器放大倍率）
// ------------------------------------------------------------------
const VEHICLE_DATA = {
  buggy: {
    id: 'buggy',
    name: '突击车',
    maxHp: 200,
    radius: 22,
    width: 44,
    height: 28,
    speedMult: 2.5,
    weaponBoost: 2.0,
    weaponFireRateMult: 1.4,
    color: '#4a6',
    cabinColor: '#3a5',
  },
  apc: {
    id: 'apc',
    name: '装甲车',
    maxHp: 360,
    radius: 28,
    width: 58,
    height: 34,
    speedMult: 1.85,
    weaponBoost: 2.6,
    weaponFireRateMult: 1.2,
    color: '#65707a',
    cabinColor: '#4d5964',
  },
  railbuggy: {
    id: 'railbuggy',
    name: '电磁越野车',
    maxHp: 170,
    radius: 21,
    width: 48,
    height: 26,
    speedMult: 3.0,
    weaponBoost: 2.2,
    weaponFireRateMult: 1.7,
    color: '#4768aa',
    cabinColor: '#315099',
  },
};

// ------------------------------------------------------------------
// 宠物数据
// ------------------------------------------------------------------
const PET_DATA = {
  hound: {
    id: 'hound',
    name: '机械犬',
    desc: '近身扑咬，减速并标记目标',
    price: 500,
    range: 260,
    damage: 14,
    fireRate: 2.2,
    projectileSpeed: 540,
    color: '#88ccff',
    sprite: 'mech_hound',
    trait: '猎犬扑咬',
    biteRange: 54,
    slowDuration: 1.8,
    slowMult: 0.62,
    markDuration: 2.6,
    markDamageMult: 1.16,
  },
  drone: {
    id: 'drone',
    name: '无人机',
    desc: '空中电弧，标记高威胁目标',
    price: 800,
    range: 360,
    damage: 10,
    fireRate: 3.4,
    projectileSpeed: 720,
    color: '#ffee66',
    sprite: 'quad_drone',
    trait: '电弧标记',
    chain: true,
    markDuration: 3.0,
    markDamageMult: 1.12,
  },
  medic: {
    id: 'medic',
    name: '医疗球',
    desc: '低频治疗，兼顾补枪',
    price: 900,
    range: 230,
    damage: 8,
    fireRate: 1.8,
    projectileSpeed: 500,
    healRate: 2.5,
    color: '#66ff99',
  },
};

// ------------------------------------------------------------------
// 武器词条与隐藏武器
// ------------------------------------------------------------------
const WEAPON_AFFIX_DATA = {
  overdrive: { id: 'overdrive', name: '超频', damageMult: 1.08, fireRateMult: 1.18 },
  hollowpoint: { id: 'hollowpoint', name: '空尖', damageMult: 1.22, fireRateMult: 0.94 },
  splitter: { id: 'splitter', name: '分裂', projectileBonus: 1, damageMult: 0.92 },
  stabilizer: { id: 'stabilizer', name: '稳像', spreadMult: 0.65, fireRateMult: 1.05 },
  punchthrough: { id: 'punchthrough', name: '穿甲', piercingBonus: 1, damageMult: 1.06 },
  volatile: { id: 'volatile', name: '爆裂', explosiveBonus: 18, fireRateMult: 0.9 },
};

const HIDDEN_WEAPON_IDS = ['sunblade', 'void_lance', 'storm_cannon'];

// ------------------------------------------------------------------
// 后期波次变体
// ------------------------------------------------------------------
const ELITE_AFFIX_DATA = {
  fast: { id: 'fast', name: '快速', speedMult: 1.35 },
  shielded: { id: 'shielded', name: '护盾', shieldTime: 1.2 },
  splitter: { id: 'splitter', name: '分裂', splitOnDeath: 2 },
  toxic: { id: 'toxic', name: '毒雾', auraRadius: 80, auraDamage: 4 },
  thorns: { id: 'thorns', name: '反伤', reflectRatio: 0.12 },
  summoner: { id: 'summoner', name: '召唤', summonInterval: 5 },
};

const SPECIAL_EVENT_DATA = {
  horde: { id: 'horde', name: '尸潮', countMult: 1.35, spawnIntervalMult: 0.75 },
  night: { id: 'night', name: '夜战', enemySpeedMult: 1.08, visibility: 0.72 },
  toxic_zone: { id: 'toxic_zone', name: '毒雾区', poisonDamage: 2 },
  escort_generator: { id: 'escort_generator', name: '护送发电机', objectiveHp: 260 },
  holdout: { id: 'holdout', name: '守点 60 秒', duration: 60 },
};

const BOSS_MECHANIC_DATA = {
  armorBreak: { id: 'armorBreak', name: '破甲冲锋', chargeDamageMult: 1.25 },
  addPhase: { id: 'addPhase', name: '召唤阶段', summonCountMult: 1.5 },
  rageClock: { id: 'rageClock', name: '狂暴倒计时', rageAfter: 45 },
  shieldCycle: { id: 'shieldCycle', name: '护盾轮转', interval: 8 },
};

const META_UNLOCK_DATA = [
  { id: 'weapon_rocket', category: 'weapon', itemId: 'rocket', wave: 4 },
  { id: 'weapon_laser', category: 'weapon', itemId: 'laser', wave: 5 },
  { id: 'weapon_railgun', category: 'weapon', itemId: 'railgun', wave: 6 },
  { id: 'turret_tesla', category: 'turret', itemId: 'tesla', wave: 5 },
  { id: 'pet_drone', category: 'pet', itemId: 'drone', wave: 4 },
  { id: 'pet_medic', category: 'pet', itemId: 'medic', wave: 6 },
  { id: 'skill_phaseDash', category: 'skill', itemId: 'phaseDash', wave: 3 },
  { id: 'skill_medField', category: 'skill', itemId: 'medField', wave: 5 },
  { id: 'skill_orbitalStrike', category: 'skill', itemId: 'orbitalStrike', wave: 4 },
  { id: 'skill_nanoSwarm', category: 'skill', itemId: 'nanoSwarm', wave: 6 },
];

// ------------------------------------------------------------------
// 武器数据定义（12种）
// ------------------------------------------------------------------
const WEAPON_DATA = {
  pistol: {
    id: 'pistol',
    name: '手枪',
    damage: 15,
    fireRate: 3,
    magazine: Infinity,
    reloadTime: 1.0,
    spread: 0.05,
    projectileSpeed: 500,
    piercing: 0,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 0,
    ammoPrice: 0,
    ammoPerBuy: Infinity,
  },
  smg: {
    id: 'smg',
    name: '冲锋枪',
    damage: 8,
    fireRate: 10,
    magazine: 30,
    reloadTime: 1.5,
    spread: 0.12,
    projectileSpeed: 550,
    piercing: 0,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 200,
    ammoPrice: 50,
    ammoPerBuy: 60,
  },
  rifle: {
    id: 'rifle',
    name: '步枪',
    damage: 25,
    fireRate: 5,
    magazine: 25,
    reloadTime: 1.8,
    spread: 0.03,
    projectileSpeed: 700,
    piercing: 1,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 500,
    ammoPrice: 80,
    ammoPerBuy: 50,
  },
  shotgun: {
    id: 'shotgun',
    name: '霰弹枪',
    damage: 12,
    fireRate: 1.5,
    magazine: 8,
    reloadTime: 2.0,
    spread: 0.25,
    projectileSpeed: 450,
    piercing: 0,
    explosive: 0,
    chain: false,
    projectileCount: 6,
    continuous: false,
    melee: false,
    price: 300,
    ammoPrice: 80,
    ammoPerBuy: 16,
  },
  sniper: {
    id: 'sniper',
    name: '狙击枪',
    damage: 120,
    fireRate: 0.8,
    magazine: 5,
    reloadTime: 2.5,
    spread: 0.0,
    projectileSpeed: 1200,
    piercing: 3,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 800,
    ammoPrice: 120,
    ammoPerBuy: 10,
  },
  machinegun: {
    id: 'machinegun',
    name: '加特林',
    damage: 10,
    fireRate: 15,
    magazine: 100,
    reloadTime: 3.0,
    spread: 0.15,
    projectileSpeed: 600,
    piercing: 1,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 1200,
    ammoPrice: 150,
    ammoPerBuy: 100,
    spinUpTime: 0.5,
    spinDownTime: 0.3,
  },
  flamethrower: {
    id: 'flamethrower',
    name: '火焰喷射器',
    damage: 5,
    fireRate: 20,
    magazine: 100,
    reloadTime: 2.5,
    spread: FLAMETHROWER_ANGLE,
    projectileSpeed: 300,
    piercing: 0,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: true,
    melee: false,
    price: 400,
    ammoPrice: 80,
    ammoPerBuy: 100,
  },
  rocket: {
    id: 'rocket',
    name: '火箭筒',
    damage: 80,
    fireRate: 1,
    magazine: 4,
    reloadTime: 3.0,
    spread: 0.02,
    projectileSpeed: 350,
    piercing: 0,
    explosive: 50,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 1500,
    ammoPrice: 180,
    ammoPerBuy: 4,
  },
  laser: {
    id: 'laser',
    name: '激光枪',
    damage: 30,
    fireRate: 20,
    magazine: 50,
    reloadTime: 2.0,
    spread: 0.0,
    projectileSpeed: Infinity,
    piercing: 99,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: true,
    melee: false,
    price: 2000,
    ammoPrice: 200,
    ammoPerBuy: 50,
  },
  railgun: {
    id: 'railgun',
    name: '电磁炮',
    damage: 200,
    fireRate: 0.5,
    magazine: 3,
    reloadTime: 3.5,
    spread: 0.0,
    projectileSpeed: 2000,
    piercing: 5,
    explosive: 0,
    chain: true,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 1800,
    ammoPrice: 250,
    ammoPerBuy: 6,
  },
  crossbow: {
    id: 'crossbow',
    name: '十字弓',
    damage: 100,
    fireRate: 1.2,
    magazine: 10,
    reloadTime: 1.5,
    spread: 0.02,
    projectileSpeed: 400,
    piercing: 1,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 350,
    ammoPrice: 60,
    ammoPerBuy: 20,
    retrievable: true,
  },
  chainsaw: {
    id: 'chainsaw',
    name: '电锯',
    damage: 50,
    fireRate: 10,
    magazine: Infinity,
    reloadTime: 0,
    spread: 0,
    projectileSpeed: 0,
    piercing: 0,
    explosive: 0,
    chain: false,
    projectileCount: 1,
    continuous: true,
    melee: true,
    price: 600,
    ammoPrice: 0,
    ammoPerBuy: Infinity,
  },
  sunblade: {
    id: 'sunblade',
    name: '日冕刃',
    damage: 125,
    fireRate: 8.2,
    magazine: Infinity,
    reloadTime: 0,
    spread: 0.03,
    projectileSpeed: 760,
    piercing: 4,
    explosive: 0,
    chain: false,
    projectileCount: 3,
    continuous: false,
    melee: false,
    price: 0,
    ammoPrice: 0,
    ammoPerBuy: Infinity,
    hidden: true,
    rarity: 'hero',
    special: 'solar_blade',
    burnDamage: 18,
    burnDuration: 2.4,
    markDuration: 1.8,
    markDamageMult: 1.12,
  },
  void_lance: {
    id: 'void_lance',
    name: '虚空长矛',
    damage: 320,
    fireRate: 0.9,
    magazine: 4,
    reloadTime: 2.2,
    spread: 0,
    projectileSpeed: 1500,
    piercing: 8,
    explosive: 28,
    chain: true,
    projectileCount: 1,
    continuous: false,
    melee: false,
    price: 0,
    ammoPrice: 0,
    ammoPerBuy: 4,
    hidden: true,
    rarity: 'legendary',
    special: 'void_rift',
    riftRadius: 155,
    riftDamage: 115,
    pullStrength: 62,
  },
  storm_cannon: {
    id: 'storm_cannon',
    name: '风暴炮',
    damage: 70,
    fireRate: 7.2,
    magazine: 60,
    reloadTime: 2.4,
    spread: 0.08,
    projectileSpeed: 820,
    piercing: 2,
    explosive: 0,
    chain: true,
    projectileCount: 4,
    continuous: false,
    melee: false,
    price: 0,
    ammoPrice: 0,
    ammoPerBuy: 60,
    hidden: true,
    rarity: 'legendary',
    special: 'storm_chain',
    chainJumps: 7,
    chainRange: 190,
    chainDamageMult: 0.62,
    stunDuration: 0.25,
  },
};

// ------------------------------------------------------------------
// 伤害计算
// ------------------------------------------------------------------
function calculateDamage(baseDamage, player, isCrit) {
  let dmg = baseDamage * player.upgrades.damageMult;

  // 连击加成
  if (player.combo > 0) {
    const comboBonus = Math.min(player.combo, MAX_COMBO_CAP) * COMBO_DAMAGE_BONUS;
    dmg *= (1 + comboBonus);
  }

  // 暴击
  if (isCrit) {
    dmg *= player.upgrades.critDamage;
  }

  if (dmg > DAMAGE_SOFT_CAP) {
    const excess = dmg - DAMAGE_SOFT_CAP;
    dmg = DAMAGE_SOFT_CAP + Math.sqrt(excess * DAMAGE_SOFT_CAP) * 0.55;
  }

  return Math.max(1, Math.round(dmg));
}

function rollCrit(player) {
  return Math.random() < player.upgrades.critChance;
}
