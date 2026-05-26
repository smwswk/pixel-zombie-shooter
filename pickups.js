// ============================================================
// pickups.js — 拾取道具系统
// ============================================================

const PICKUP_TYPES = {
  health:  { name: '生命包',  color: '#0f0', symbol: '+', effect: 'heal',     value: 30, duration: 0 },
  ammo:    { name: '弹药箱',  color: '#ff0', symbol: 'A', effect: 'ammo',     value: 0,  duration: 0 },
  speed:   { name: '加速',    color: '#0af', symbol: 'S', effect: 'speed',    value: 1.5, duration: 10 },
  damage:  { name: '狂暴',    color: '#f44', symbol: 'D', effect: 'damage',   value: 1.5, duration: 10 },
  shield:  { name: '护盾',    color: '#a0f', symbol: 'P', effect: 'shield',   value: 0,  duration: 5 },
};

class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.data = PICKUP_TYPES[type];
    this.life = 25;        // 25秒后消失
    this.maxLife = 25;
    this.radius = 12;
    this.floatTime = 0;
    this.pulseScale = 1;
  }

  update(dt) {
    this.life -= dt;
    this.floatTime += dt * 3;
    this.pulseScale = 1 + Math.sin(this.floatTime) * 0.15;
    return this.life > 0;
  }

  draw(ctx) {
    const pulse = this.pulseScale;
    const alpha = Math.min(1, this.life / 2);
    ctx.save();
    ctx.globalAlpha = alpha;

    // 外发光
    ctx.shadowColor = this.data.color;
    ctx.shadowBlur = 8;

    // 底色圆
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 主色圆
    ctx.fillStyle = this.data.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // 符号
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${10 * pulse}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.symbol, this.x, this.y);

    ctx.restore();
  }
}

// 掉落概率配置
const DROP_RATES = {
  normal:   0.08,
  runner:   0.05,
  tank:     0.15,
  bomber:   0.10,
  spitter:  0.10,
  summoner: 0.20,
  elite:    0.20,
  spider:   0.10,
  miniSpider: 0.05,
  boss:     0.50,
};

function rollPickupDrop(enemyType, x, y) {
  const rate = DROP_RATES[enemyType] || 0;
  if (Math.random() >= rate) return null;

  // 根据敌人类型决定掉落类型权重
  let pool = ['health', 'ammo', 'speed', 'damage', 'shield'];
  if (enemyType === 'boss') {
    pool = ['health', 'health', 'ammo', 'damage', 'shield'];
  }
  const type = pool[Math.floor(Math.random() * pool.length)];
  return new Pickup(x, y, type);
}
