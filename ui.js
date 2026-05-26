// ============================================================
// ui.js — UI系统：商店、升级、波次、连击、圣遗物、存档
// 像素僵尸射击游戏模块
// 全局变量模式：依赖 game, canvas, ctx, INPUT, FloatingText
// ============================================================

// ============================================================
// 1. ShopSystem — CS式购买菜单
// ============================================================
class ShopSystem {
  constructor() {
    this.open = false;
    this.weapons = [
      { id: 'pistol',      name: '手枪',      price: 0,    damage: 15,  magSize: 12, owned: true,  ammoPrice: 30 },
      { id: 'smg',         name: '冲锋枪',    price: 200,  damage: 10,  magSize: 30, owned: false, ammoPrice: 50 },
      { id: 'shotgun',     name: '霰弹枪',    price: 300,  damage: 8,   magSize: 8,  owned: false, ammoPrice: 80 },
      { id: 'rifle',       name: '步枪',      price: 500,  damage: 35,  magSize: 25, owned: false, ammoPrice: 80 },
      { id: 'sniper',      name: '狙击枪',    price: 800,  damage: 80,  magSize: 5,  owned: false, ammoPrice: 120 },
      { id: 'machinegun',  name: '加特林',    price: 1200, damage: 12,  magSize: 100,owned: false, ammoPrice: 150 },
      { id: 'railgun',     name: '电磁炮',    price: 1800, damage: 150, magSize: 3,  owned: false, ammoPrice: 250 },
      { id: 'rocket',      name: '火箭筒',    price: 1500, damage: 200, magSize: 1,  owned: false, ammoPrice: 180 },
      { id: 'laser',       name: '激光枪',    price: 2000, damage: 25,  magSize: 50, owned: false, ammoPrice: 200 },
      { id: 'flamethrower',name: '火焰喷射器',price: 400,  damage: 5,   magSize: 100,owned: false, ammoPrice: 80 },
      { id: 'crossbow',    name: '十字弓',    price: 350,  damage: 100, magSize: 10, owned: false, ammoPrice: 60 },
      { id: 'chainsaw',    name: '电锯',      price: 600,  damage: 50,  magSize: '∞',owned: false, ammoPrice: 0 },
    ];
    this.cols = 3;
    this.cellW = 220;
    this.cellH = 110;
    this.padding = 15;
    this.hoverIndex = -1;
    this.skills = Object.values(HERO_SKILL_DATA);
    this.skillCellH = 76;
    this.turrets = Object.values(TURRET_DATA);
    this.turretCellH = 76;
    this.pets = Object.values(PET_DATA);
    this.petCellH = 70;
    this.tabs = [
      { id: 'weapons', label: '武器' },
      { id: 'skills', label: '技能' },
      { id: 'turrets', label: '炮台' },
      { id: 'pets', label: '宠物' },
      { id: 'fusion', label: '融合' },
    ];
    this.activeTab = 'weapons';
    this.tabH = 34;
    this.fusionSlots = { A: null, B: null };
    this.draggingFusionIndex = null;
  }

  toggle() {
    this.open = !this.open;
  }

  buyWeapon(id) {
    const w = this.weapons.find(x => x.id === id);
    if (!w || w.owned) return false;
    // Player.buyWeapon 内部会检查金钱并扣款
    if (!game.player.buyWeapon(id)) return false;
    w.owned = true;
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 30,
      `购买 ${w.name}!`, '#0f0', 24, 1500
    ));
    return true;
  }

  buyAmmo(id) {
    const w = this.weapons.find(x => x.id === id);
    if (!w || !w.owned) return false;
    if (game.player.money < w.ammoPrice) return false;
    game.player.money -= w.ammoPrice;
    // 补满该武器弹药（通过 weapon 引用）
    const playerWep = game.player.weapons.find(pw => pw.data.id === id);
    if (playerWep && playerWep.maxAmmo !== Infinity) {
      playerWep.ammo = playerWep.maxAmmo;
    }
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 30,
      `${w.name} 弹药补满`, '#0ff', 20, 1200
    ));
    return true;
  }

  buyArmor() {
    const price = 1000;
    if (game.player.money < price) return false;
    if (game.player.armor >= game.player.maxArmor) return false;
    game.player.money -= price;
    game.player.armor = Math.min(game.player.armor + 50, game.player.maxArmor);
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 30,
      '护甲修复 +50', '#48f', 20, 1200
    ));
    return true;
  }

  buySkill(id) {
    if (!game.heroSkillSystem) return false;
    const ok = game.heroSkillSystem.unlockSkill(id, game.player);
    return ok;
  }

  buyTurret(id) {
    if (!game.turretManager) return false;
    return game.turretManager.build(id, game.player);
  }

  buyPet(id) {
    if (!game.petManager) return false;
    return game.petManager.unlockPet(id, game.player);
  }

  isUnlocked(category, id) {
    if (!game.metaProgression) return true;
    return game.metaProgression.isUnlocked(category, id);
  }

  getVisibleWeapons(player = game.player) {
    return this.weapons.filter(w => w.owned || (player && player.weapons.some(pw => pw.data.id === w.id)) || this.isUnlocked('weapon', w.id));
  }

  getVisibleSkills() {
    return this.skills.filter(s => this.isUnlocked('skill', s.id));
  }

  getVisibleTurrets() {
    return this.turrets.filter(t => this.isUnlocked('turret', t.id));
  }

  getVisiblePets() {
    return this.pets.filter(p => this.isUnlocked('pet', p.id));
  }

  setActiveTab(id) {
    if (!this.tabs.some(t => t.id === id)) return false;
    this.activeTab = id;
    this.draggingFusionIndex = null;
    return true;
  }

  isCompactLayout() {
    return canvas.width <= 640 || canvas.height <= 520;
  }

  getLayoutPadding() {
    return this.isCompactLayout() ? 8 : this.padding;
  }

  getLayoutCols() {
    return this.isCompactLayout() ? 2 : this.cols;
  }

  getPanelWidth() {
    if (this.isCompactLayout()) {
      return Math.max(0, canvas.width - 16);
    }
    return this.cols * this.cellW + (this.cols + 1) * this.padding;
  }

  getLayoutCellW() {
    if (!this.isCompactLayout()) return this.cellW;
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    return Math.floor((this.getPanelWidth() - (cols + 1) * p) / cols);
  }

  getWeaponCellH() {
    return this.isCompactLayout() ? 70 : this.cellH;
  }

  getSkillCellH() {
    return this.isCompactLayout() ? 64 : this.skillCellH;
  }

  getTurretCellH() {
    return this.isCompactLayout() ? 64 : this.turretCellH;
  }

  getPetCellH() {
    return this.isCompactLayout() ? 62 : this.petCellH;
  }

  getActiveRowH() {
    if (this.activeTab === 'skills') return this.getSkillCellH();
    if (this.activeTab === 'turrets') return this.getTurretCellH();
    if (this.activeTab === 'pets') return this.getPetCellH();
    if (this.activeTab === 'fusion') return this.isCompactLayout() ? 60 : 86;
    return this.getWeaponCellH();
  }

  getCloseRect(panelX, panelY) {
    if (!this.isCompactLayout()) return null;
    return { x: panelX + this.getPanelWidth() - 38, y: panelY + 8, w: 30, h: 30 };
  }

  getTabRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const closeReserve = this.isCompactLayout() ? 38 : 0;
    const tabAreaW = this.getPanelWidth() - p * 2 - closeReserve;
    const tabW = Math.floor(tabAreaW / this.tabs.length);
    const x = panelX + p + index * tabW;
    const y = panelY + p;
    return { x, y, w: tabW - 4, h: this.tabH };
  }

  getContentY(panelY) {
    const p = this.getLayoutPadding();
    return panelY + p + this.tabH + p;
  }

  getVisibleRows() {
    const cols = this.getLayoutCols();
    if (this.activeTab === 'weapons') return Math.ceil(this.getVisibleWeapons().length / cols);
    if (this.activeTab === 'fusion') return 4;
    if (this.activeTab === 'skills') return Math.ceil(this.getVisibleSkills().length / cols);
    if (this.activeTab === 'turrets') return Math.ceil(this.getVisibleTurrets().length / cols);
    if (this.activeTab === 'pets') return Math.ceil(this.getVisiblePets().length / cols);
    return 2;
  }

  getPanelRect() {
    const p = this.getLayoutPadding();
    const pw = this.getPanelWidth();
    const rowH = this.getActiveRowH();
    const rows = this.getVisibleRows();
    const footerH = this.isCompactLayout() ? 82 : 100;
    const ph = Math.min(
      canvas.height - (this.isCompactLayout() ? 16 : 36),
      p * 4 + this.tabH + rows * rowH + Math.max(0, rows - 1) * p + footerH
    );
    const px = Math.max(8, (canvas.width - pw) / 2);
    const py = Math.max(8, (canvas.height - ph) / 2);
    return { x: px, y: py, w: pw, h: ph };
  }

  getWeaponRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    const cellW = this.getLayoutCellW();
    const cellH = this.getWeaponCellH();
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panelX + p + col * (cellW + p);
    const y = this.getContentY(panelY) + row * (cellH + p);
    return { x, y, w: cellW, h: cellH };
  }

  getSkillRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    const cellW = this.getLayoutCellW();
    const cellH = this.getSkillCellH();
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panelX + p + col * (cellW + p);
    const y = this.getContentY(panelY) + row * (cellH + p);
    return { x, y, w: cellW, h: cellH };
  }

  getTurretRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    const cellW = this.getLayoutCellW();
    const cellH = this.getTurretCellH();
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panelX + p + col * (cellW + p);
    const y = this.getContentY(panelY) + row * (cellH + p);
    return { x, y, w: cellW, h: cellH };
  }

  getPetRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    const cellW = this.getLayoutCellW();
    const cellH = this.getPetCellH();
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panelX + p + col * (cellW + p);
    const y = this.getContentY(panelY) + row * (cellH + p);
    return { x, y, w: cellW, h: cellH };
  }

  getFusionSlotRect(slot, panelX, panelY) {
    const p = this.getLayoutPadding();
    const y = this.getContentY(panelY);
    const cellW = this.getLayoutCellW();
    const x = panelX + p + (slot === 'A' ? 0 : cellW + p);
    return { x, y, w: cellW, h: this.isCompactLayout() ? 62 : 74 };
  }

  getFusionButtonRect(panelX, panelY) {
    if (this.isCompactLayout()) {
      const p = this.getLayoutPadding();
      const y = this.getContentY(panelY) + 70;
      return { x: panelX + p, y, w: this.getPanelWidth() - p * 2, h: 50 };
    }
    const y = this.getContentY(panelY);
    return { x: panelX + this.padding + (this.cellW + this.padding) * 2, y, w: this.cellW, h: 74 };
  }

  getFusionWeaponRect(index, panelX, panelY) {
    const p = this.getLayoutPadding();
    const cols = this.getLayoutCols();
    const cellW = this.getLayoutCellW();
    const col = index % cols;
    const row = Math.floor(index / cols);
    const topOffset = this.isCompactLayout() ? 128 : 90;
    const h = this.isCompactLayout() ? 48 : 58;
    const x = panelX + p + col * (cellW + p);
    const y = this.getContentY(panelY) + topOffset + row * (h + p);
    return { x, y, w: cellW, h };
  }

  getBottomLayout(panelX, panelY) {
    const { w: pw, h: ph } = this.getPanelRect();
    const p = this.getLayoutPadding();
    const compact = this.isCompactLayout();
    const bottomY = panelY + ph - (compact ? 78 : 90);
    if (compact) {
      const gap = 6;
      const btnW = Math.floor((pw - p * 2 - gap * 3) / 4);
      const y = bottomY + 30;
      return {
        bottomY,
        barH: 68,
        row1Y: bottomY + 18,
        row2Y: bottomY + 64,
        upgradeBtn: { x: panelX + p, y, w: btnW, h: 30 },
        repairBtn: { x: panelX + p + btnW + gap, y, w: btnW, h: 30 },
        moveBtn: { x: panelX + p + (btnW + gap) * 2, y, w: btnW, h: 30 },
        armorBtn: { x: panelX + p + (btnW + gap) * 3, y, w: btnW, h: 30 },
      };
    }
    return {
      bottomY,
      barH: 75,
      row1Y: bottomY + 22,
      row2Y: bottomY + 55,
      upgradeBtn: { x: panelX + pw - this.padding - 520, y: bottomY + 6, w: 120, h: 32 },
      repairBtn: { x: panelX + pw - this.padding - 390, y: bottomY + 6, w: 120, h: 32 },
      moveBtn: { x: panelX + pw - this.padding - 260, y: bottomY + 6, w: 120, h: 32 },
      armorBtn: { x: panelX + pw - this.padding - 130, y: bottomY + 6, w: 120, h: 32 },
    };
  }

  beginFusionDrag(weaponIndex) {
    if (!game.player || !game.player.weapons[weaponIndex]) return false;
    this.draggingFusionIndex = weaponIndex;
    return true;
  }

  dropFusionDrag(slot) {
    if (this.draggingFusionIndex === null) return false;
    if (slot !== 'A' && slot !== 'B') return false;
    this.fusionSlots[slot] = this.draggingFusionIndex;
    if (this.fusionSlots.A === this.fusionSlots.B) {
      const other = slot === 'A' ? 'B' : 'A';
      this.fusionSlots[other] = null;
    }
    this.draggingFusionIndex = null;
    return true;
  }

  confirmFusion(player) {
    if (this.fusionSlots.A === null || this.fusionSlots.B === null) return false;
    const result = player.fuseWeapons(this.fusionSlots.A, this.fusionSlots.B);
    if (!result) return false;
    this.fusionSlots = { A: null, B: null };
    this.draggingFusionIndex = null;
    return true;
  }

  draw(ctx, player) {
    if (!this.open) return;

    const { x: px, y: py, w: pw, h: ph } = this.getPanelRect();

    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 面板背景
    ctx.fillStyle = 'rgba(20,20,30,0.95)';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);

    const compact = this.isCompactLayout();

    // 标题
    if (!compact) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('武器商店 [B]关闭', px + pw / 2, py - 10);
    }

    this.hoverIndex = -1;
    const mx = INPUT.mouseX;
    const my = INPUT.mouseY;

    this.tabs.forEach((tab, i) => {
      const r = this.getTabRect(i, px, py);
      const active = this.activeTab === tab.id;
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      ctx.fillStyle = active ? 'rgba(80,110,150,0.65)' : (hovered ? 'rgba(60,60,70,0.65)' : 'rgba(35,35,45,0.75)');
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = active ? '#8cf' : '#555';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = active ? '#fff' : '#aaa';
      ctx.font = compact ? 'bold 12px monospace' : 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, r.x + r.w / 2, r.y + 22);
    });

    const closeRect = this.getCloseRect(px, py);
    if (closeRect) {
      const hovered = mx >= closeRect.x && mx <= closeRect.x + closeRect.w &&
                      my >= closeRect.y && my <= closeRect.y + closeRect.h;
      ctx.fillStyle = hovered ? 'rgba(120,60,60,0.75)' : 'rgba(60,45,45,0.75)';
      ctx.fillRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
      ctx.strokeStyle = '#b77';
      ctx.strokeRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('X', closeRect.x + closeRect.w / 2, closeRect.y + 21);
    }

    if (this.activeTab === 'weapons') {
    this.getVisibleWeapons(player).forEach((w, i) => {
      const r = this.getWeaponRect(i, px, py);
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      if (hovered) this.hoverIndex = i;

      let bg, textColor;
      if (w.owned) {
        bg = hovered ? 'rgba(0,180,0,0.4)' : 'rgba(0,120,0,0.25)';
        textColor = '#0f0';
      } else if (player.money >= w.price) {
        bg = hovered ? 'rgba(200,200,200,0.25)' : 'rgba(100,100,100,0.15)';
        textColor = '#fff';
      } else {
        bg = 'rgba(60,60,60,0.2)';
        textColor = '#666';
      }

      // 单元格背景
      ctx.fillStyle = bg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = w.owned ? '#0a0' : (player.money >= w.price ? '#666' : '#333');
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // 武器名称
      ctx.fillStyle = textColor;
      ctx.font = compact ? 'bold 12px monospace' : 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(w.name, r.x + 8, r.y + 18);

      // 价格或已拥有
      ctx.font = compact ? '10px monospace' : '12px monospace';
      if (w.owned) {
        ctx.fillStyle = '#0f0';
        ctx.fillText('[已拥有]', r.x + 8, r.y + 34);
        const playerWep = player.weapons.find(pw => pw.data.id === w.id);
        const ammoVal = playerWep ? (playerWep.ammo === Infinity ? '∞' : playerWep.ammo) : '';
        const magVal = playerWep ? (playerWep.maxAmmo === Infinity ? '∞' : playerWep.magSize) : '';
        const ammoStr = playerWep ? `${ammoVal}/${magVal}` : '';
        ctx.fillStyle = '#ccc';
        ctx.fillText(`弹药: ${ammoStr}`, r.x + 8, r.y + 50);
        if (!compact) {
          const fusionCost = playerWep && player.getFusionCost ? player.getFusionCost(playerWep) : w.price;
          ctx.fillStyle = player.money >= fusionCost ? '#fc6' : '#844';
          ctx.fillText(`[融合 $${fusionCost}]`, r.x + 8, r.y + 66);
          ctx.fillStyle = '#0ff';
          ctx.fillText(`[右键补弹 $${w.ammoPrice}]`, r.x + 8, r.y + 82);
        }
      } else {
        ctx.fillStyle = player.money >= w.price ? '#ff0' : '#844';
        ctx.fillText(`$${w.price}`, r.x + 8, r.y + 34);
        ctx.fillStyle = textColor;
        ctx.fillText(`伤害: ${w.damage}`, r.x + 8, r.y + 50);
        if (!compact) ctx.fillText(`弹匣: ${w.magSize}`, r.x + 8, r.y + 66);
      }

      // 快捷键提示
      if (w.owned && i < 9) {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`[${i + 1}]`, r.x + r.w - 6, r.y + 14);
      }
    });
    }

    // 英雄技能购买区
    if (this.activeTab === 'skills') {
    this.getVisibleSkills().forEach((s, i) => {
      const r = this.getSkillRect(i, px, py);
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      const unlocked = game.heroSkillSystem && game.heroSkillSystem.isUnlocked(s.id);
      const canBuy = !unlocked && player.money >= s.price;
      ctx.fillStyle = unlocked
        ? (hovered ? 'rgba(40,130,180,0.45)' : 'rgba(30,90,140,0.28)')
        : (canBuy ? (hovered ? 'rgba(180,180,80,0.28)' : 'rgba(120,120,60,0.18)') : 'rgba(45,45,45,0.25)');
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = unlocked ? '#4af' : (canBuy ? '#aa4' : '#444');
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = unlocked ? '#7cf' : (canBuy ? '#ff0' : '#666');
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${s.keyLabel}] ${s.name}`, r.x + 8, r.y + 18);
      ctx.fillStyle = unlocked ? '#ccc' : '#888';
      ctx.font = '10px monospace';
      ctx.fillText(s.desc, r.x + 8, r.y + 36);
      ctx.fillText(`冷却 ${s.cooldown}s`, r.x + 8, r.y + 52);
      ctx.fillStyle = unlocked ? '#0f0' : (canBuy ? '#ff0' : '#844');
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(unlocked ? '已解锁' : `$${s.price}`, r.x + r.w - 8, r.y + 58);
    });
    }

    // 炮台购买区
    if (this.activeTab === 'turrets') {
    this.getVisibleTurrets().forEach((t, i) => {
      const r = this.getTurretRect(i, px, py);
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      const turretCount = game.turretManager ? game.turretManager.turrets.length : 0;
      const atLimit = game.turretManager && turretCount >= game.turretManager.maxTurrets;
      const canBuy = player.money >= t.price && !atLimit;

      ctx.fillStyle = canBuy
        ? (hovered ? 'rgba(70,120,90,0.38)' : 'rgba(55,90,70,0.24)')
        : 'rgba(45,45,45,0.25)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = canBuy ? t.color : '#444';
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = canBuy ? t.color : '#666';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[部署] ${t.name}`, r.x + 8, r.y + 18);
      ctx.fillStyle = canBuy ? '#ccc' : '#888';
      ctx.font = '10px monospace';
      ctx.fillText(t.desc, r.x + 8, r.y + 36);
      ctx.fillText(`伤害 ${t.damage}  射程 ${t.range}`, r.x + 8, r.y + 52);
      ctx.fillStyle = canBuy ? '#ff0' : '#844';
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(atLimit ? '已满' : `$${t.price}`, r.x + r.w - 8, r.y + 58);
    });
    }

    // 宠物购买区
    if (this.activeTab === 'pets') {
    this.getVisiblePets().forEach((p, i) => {
      const r = this.getPetRect(i, px, py);
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      const existing = game.petManager ? game.petManager.pets.find(pet => pet.type === p.id) : null;
      const atLimit = game.petManager && !existing && game.petManager.pets.length >= game.petManager.maxPets;
      const cost = existing ? Math.round(p.price * (0.55 + existing.level * 0.3)) : p.price;
      const canBuy = player.money >= cost && !atLimit;

      ctx.fillStyle = canBuy
        ? (hovered ? 'rgba(90,90,130,0.38)' : 'rgba(55,55,90,0.24)')
        : 'rgba(45,45,45,0.25)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = canBuy ? p.color : '#444';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = canBuy ? p.color : '#666';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${existing ? `[升级 Lv.${existing.level + 1}]` : '[宠物]'} ${p.name}`, r.x + 8, r.y + 18);
      ctx.fillStyle = canBuy ? '#ccc' : '#888';
      ctx.font = '10px monospace';
      ctx.fillText(p.desc, r.x + 8, r.y + 36);
      ctx.fillText(`伤害 ${p.damage}  射程 ${p.range}`, r.x + 8, r.y + 52);
      ctx.fillStyle = canBuy ? '#ff0' : '#844';
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(atLimit ? '已满' : `$${cost}`, r.x + r.w - 8, r.y + 55);
    });
    }

    if (this.activeTab === 'fusion') {
      this.drawFusionSection(ctx, player, px, py, mx, my);
    }

    // 底部信息栏 — 桌面双行，手机紧凑按钮
    const bottom = this.getBottomLayout(px, py);
    const { bottomY, barH, row1Y, row2Y, upgradeBtn, repairBtn, moveBtn, armorBtn } = bottom;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px + this.getLayoutPadding(), bottomY, pw - this.getLayoutPadding() * 2, barH);

    ctx.fillStyle = '#ff0';
    ctx.font = compact ? 'bold 13px monospace' : 'bold 16px monospace';
    ctx.textAlign = compact ? 'center' : 'left';
    ctx.fillText(`当前金钱: $${player.money}`,
                 compact ? px + pw / 2 : px + this.padding + 12,
                 row1Y);

    // 炮台升级/修理 + 护甲购买按钮
    const nearestUpgradable = game.turretManager ? game.turretManager.getNearestTurret(player, 190, t => t.level < 3) : null;
    const nearestDamaged = game.turretManager ? game.turretManager.getNearestTurret(player, 190, t => t.hp < t.maxHp) : null;

    const upgradeHover = mx >= upgradeBtn.x && mx <= upgradeBtn.x + upgradeBtn.w &&
                         my >= upgradeBtn.y && my <= upgradeBtn.y + upgradeBtn.h;
    const canUpgrade = !!nearestUpgradable && player.money >= nearestUpgradable.data.upgradeCost;
    ctx.fillStyle = canUpgrade
      ? (upgradeHover ? 'rgba(90,120,200,0.6)' : 'rgba(60,90,160,0.35)')
      : 'rgba(60,60,60,0.3)';
    ctx.fillRect(upgradeBtn.x, upgradeBtn.y, upgradeBtn.w, upgradeBtn.h);
    ctx.strokeStyle = canUpgrade ? '#6af' : '#444';
    ctx.strokeRect(upgradeBtn.x, upgradeBtn.y, upgradeBtn.w, upgradeBtn.h);
    ctx.fillStyle = canUpgrade ? '#acf' : '#666';
    ctx.font = compact ? '10px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(compact ? '升级' : (nearestUpgradable ? `升级炮台 $${nearestUpgradable.data.upgradeCost}` : '升级炮台'),
                 upgradeBtn.x + upgradeBtn.w / 2, upgradeBtn.y + 20);

    const repairHover = mx >= repairBtn.x && mx <= repairBtn.x + repairBtn.w &&
                        my >= repairBtn.y && my <= repairBtn.y + repairBtn.h;
    const canRepair = !!nearestDamaged && player.money >= nearestDamaged.data.repairCost;
    ctx.fillStyle = canRepair
      ? (repairHover ? 'rgba(60,140,70,0.6)' : 'rgba(40,110,55,0.35)')
      : 'rgba(60,60,60,0.3)';
    ctx.fillRect(repairBtn.x, repairBtn.y, repairBtn.w, repairBtn.h);
    ctx.strokeStyle = canRepair ? '#6d7' : '#444';
    ctx.strokeRect(repairBtn.x, repairBtn.y, repairBtn.w, repairBtn.h);
    ctx.fillStyle = canRepair ? '#9f9' : '#666';
    ctx.font = compact ? '10px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(compact ? '修理' : (nearestDamaged ? `修理炮台 $${nearestDamaged.data.repairCost}` : '修理炮台'),
                 repairBtn.x + repairBtn.w / 2, repairBtn.y + 20);

    const nearestMovable = game.turretManager ? game.turretManager.getNearestTurret(player, 420) : null;
    const moveHover = mx >= moveBtn.x && mx <= moveBtn.x + moveBtn.w &&
                      my >= moveBtn.y && my <= moveBtn.y + moveBtn.h;
    ctx.fillStyle = nearestMovable
      ? (moveHover ? 'rgba(150,110,55,0.6)' : 'rgba(120,85,45,0.35)')
      : 'rgba(60,60,60,0.3)';
    ctx.fillRect(moveBtn.x, moveBtn.y, moveBtn.w, moveBtn.h);
    ctx.strokeStyle = nearestMovable ? '#fc6' : '#444';
    ctx.strokeRect(moveBtn.x, moveBtn.y, moveBtn.w, moveBtn.h);
    ctx.fillStyle = nearestMovable ? '#ffd27a' : '#666';
    ctx.font = compact ? '10px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(compact ? '移动' : '移动炮台 [T]', moveBtn.x + moveBtn.w / 2, moveBtn.y + 20);

    const armorHover = mx >= armorBtn.x && mx <= armorBtn.x + armorBtn.w &&
                       my >= armorBtn.y && my <= armorBtn.y + armorBtn.h;
    const canBuyArmor = player.money >= 1000 && player.armor < player.maxArmor;
    ctx.fillStyle = canBuyArmor
      ? (armorHover ? 'rgba(0,100,200,0.6)' : 'rgba(0,80,160,0.35)')
      : 'rgba(60,60,60,0.3)';
    ctx.fillRect(armorBtn.x, armorBtn.y, armorBtn.w, armorBtn.h);
    ctx.strokeStyle = canBuyArmor ? '#48f' : '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(armorBtn.x, armorBtn.y, armorBtn.w, armorBtn.h);
    ctx.fillStyle = canBuyArmor ? '#8cf' : '#666';
    ctx.font = compact ? '10px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(compact ? '护甲' : '修复护甲 $1000', armorBtn.x + armorBtn.w / 2, armorBtn.y + 20);

    // 第二行：操作提示（单独一行，居中）
    ctx.fillStyle = '#999';
    ctx.font = compact ? '10px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(compact ? '点卡片购买/部署  炮台可移动  拖动融合' : '左键购买/部署  |  右键补弹药  |  T移动炮台 / Y切目标',
                 px + pw / 2, row2Y);
  }

  drawFusionSection(ctx, player, px, py, mx, my) {
    const slotA = this.getFusionSlotRect('A', px, py);
    const slotB = this.getFusionSlotRect('B', px, py);
    const fuseBtn = this.getFusionButtonRect(px, py);
    const drawSlot = (slot, r) => {
      const weaponIndex = this.fusionSlots[slot];
      const weapon = weaponIndex !== null ? player.weapons[weaponIndex] : null;
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      ctx.fillStyle = hovered ? 'rgba(120,90,45,0.55)' : 'rgba(80,60,35,0.35)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = weapon ? '#fc6' : '#765';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#fc6';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`槽位 ${slot}`, r.x + 8, r.y + 18);
      ctx.fillStyle = weapon ? '#fff' : '#998';
      ctx.font = weapon ? 'bold 14px monospace' : '12px monospace';
      ctx.fillText(weapon ? weapon.name : '拖入一把武器', r.x + 8, r.y + 42);
      if (weapon) {
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`Lv.${weapon.proficiencyLevel}  ${weapon.data.id}`, r.x + 8, r.y + 60);
      }
    };
    drawSlot('A', slotA);
    drawSlot('B', slotB);

    const canFuse = this.fusionSlots.A !== null && this.fusionSlots.B !== null && this.fusionSlots.A !== this.fusionSlots.B;
    const fuseHover = mx >= fuseBtn.x && mx <= fuseBtn.x + fuseBtn.w && my >= fuseBtn.y && my <= fuseBtn.y + fuseBtn.h;
    ctx.fillStyle = canFuse ? (fuseHover ? 'rgba(180,110,40,0.7)' : 'rgba(140,80,30,0.55)') : 'rgba(60,60,60,0.3)';
    ctx.fillRect(fuseBtn.x, fuseBtn.y, fuseBtn.w, fuseBtn.h);
    ctx.strokeStyle = canFuse ? '#fc6' : '#555';
    ctx.strokeRect(fuseBtn.x, fuseBtn.y, fuseBtn.w, fuseBtn.h);
    ctx.fillStyle = canFuse ? '#ffd27a' : '#777';
    ctx.font = this.isCompactLayout() ? 'bold 14px monospace' : 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('生成融合武器', fuseBtn.x + fuseBtn.w / 2, fuseBtn.y + (this.isCompactLayout() ? 30 : 32));
    if (!this.isCompactLayout()) {
      ctx.font = '11px monospace';
      ctx.fillText('消耗 A + B', fuseBtn.x + fuseBtn.w / 2, fuseBtn.y + 52);
    }

    player.weapons.forEach((weapon, i) => {
      const r = this.getFusionWeaponRect(i, px, py);
      const selected = this.fusionSlots.A === i || this.fusionSlots.B === i || this.draggingFusionIndex === i;
      const hovered = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      ctx.fillStyle = selected
        ? 'rgba(180,120,40,0.42)'
        : (hovered ? 'rgba(70,70,90,0.45)' : 'rgba(40,40,55,0.35)');
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = selected ? '#fc6' : '#555';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = weapon.data.fusionWeapon ? '#fc6' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(weapon.name, r.x + 8, r.y + 18);
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`Lv.${weapon.proficiencyLevel}  伤害 ${weapon.getEffectiveStats().damage}`, r.x + 8, r.y + 38);
    });
  }

  handleClick(mx, my, player, button) {
    if (!this.open) return false;
    const { x: px, y: py } = this.getPanelRect();

    const closeRect = this.getCloseRect(px, py);
    if (closeRect && mx >= closeRect.x && mx <= closeRect.x + closeRect.w &&
        my >= closeRect.y && my <= closeRect.y + closeRect.h) {
      this.open = false;
      this.draggingFusionIndex = null;
      return true;
    }

    for (let i = 0; i < this.tabs.length; i++) {
      const r = this.getTabRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.setActiveTab(this.tabs[i].id);
        return true;
      }
    }

    // 检查武器格子
    if (this.activeTab === 'weapons') {
    const visibleWeapons = this.getVisibleWeapons(player);
    for (let i = 0; i < visibleWeapons.length; i++) {
      const r = this.getWeaponRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const w = visibleWeapons[i];
        if (button === 2) {
          // 右键：买弹药
          if (w.owned) this.buyAmmo(w.id);
        } else {
          // 左键：买武器
          if (!w.owned) {
            this.buyWeapon(w.id);
          } else {
            // 已拥有的，再买一次就是融合
            this.buyWeapon(w.id);
          }
        }
        return true;
      }
    }
    }

    // 英雄技能格子
    if (this.activeTab === 'skills') {
    const visibleSkills = this.getVisibleSkills();
    for (let i = 0; i < visibleSkills.length; i++) {
      const r = this.getSkillRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.buySkill(visibleSkills[i].id);
        return true;
      }
    }
    }

    // 炮台格子
    if (this.activeTab === 'turrets') {
    const visibleTurrets = this.getVisibleTurrets();
    for (let i = 0; i < visibleTurrets.length; i++) {
      const r = this.getTurretRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (button !== 2) this.buyTurret(visibleTurrets[i].id);
        return true;
      }
    }
    }

    // 宠物格子
    if (this.activeTab === 'pets') {
    const visiblePets = this.getVisiblePets();
    for (let i = 0; i < visiblePets.length; i++) {
      const r = this.getPetRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (button !== 2) this.buyPet(visiblePets[i].id);
        return true;
      }
    }
    }

    if (this.activeTab === 'fusion') {
      const fuseBtn = this.getFusionButtonRect(px, py);
      if (button !== 2 && mx >= fuseBtn.x && mx <= fuseBtn.x + fuseBtn.w &&
          my >= fuseBtn.y && my <= fuseBtn.y + fuseBtn.h) {
        this.confirmFusion(player);
        return true;
      }
    }

    // 护甲按钮
    const { upgradeBtn, repairBtn, moveBtn, armorBtn } = this.getBottomLayout(px, py);
    if (mx >= upgradeBtn.x && mx <= upgradeBtn.x + upgradeBtn.w &&
        my >= upgradeBtn.y && my <= upgradeBtn.y + upgradeBtn.h) {
      if (game.turretManager) game.turretManager.upgradeNearest(player);
      return true;
    }
    if (mx >= repairBtn.x && mx <= repairBtn.x + repairBtn.w &&
        my >= repairBtn.y && my <= repairBtn.y + repairBtn.h) {
      if (game.turretManager) game.turretManager.repairNearest(player);
      return true;
    }
    if (mx >= moveBtn.x && mx <= moveBtn.x + moveBtn.w &&
        my >= moveBtn.y && my <= moveBtn.y + moveBtn.h) {
      if (game.turretManager) game.turretManager.redeployNearest(player);
      return true;
    }
    if (mx >= armorBtn.x && mx <= armorBtn.x + armorBtn.w &&
        my >= armorBtn.y && my <= armorBtn.y + armorBtn.h) {
      this.buyArmor();
      return true;
    }

    return false;
  }

  handleMouseDown(mx, my, player, button) {
    if (!this.open || this.activeTab !== 'fusion' || button === 2) return false;
    const { x: px, y: py } = this.getPanelRect();
    for (let i = 0; i < player.weapons.length; i++) {
      const r = this.getFusionWeaponRect(i, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        return this.beginFusionDrag(i);
      }
    }
    return false;
  }

  handleMouseUp(mx, my, player) {
    if (!this.open || this.activeTab !== 'fusion' || this.draggingFusionIndex === null) return false;
    const { x: px, y: py } = this.getPanelRect();
    for (const slot of ['A', 'B']) {
      const r = this.getFusionSlotRect(slot, px, py);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        return this.dropFusionDrag(slot);
      }
    }
    this.draggingFusionIndex = null;
    return false;
  }
}

// ============================================================
// 2. HeroSkillSystem — Q / Shift / E 主动技能
// ============================================================
class HeroSkillSystem {
  constructor() {
    this.skills = HERO_SKILL_DATA;
    this.unlocked = {};
    this.cooldowns = {};
    this.noticeTimers = {};
    this.activeEffects = [];
    for (const id of Object.keys(this.skills)) {
      this.unlocked[id] = false;
      this.cooldowns[id] = 0;
      this.noticeTimers[id] = 0;
    }
  }

  update(dt) {
    for (const id of Object.keys(this.cooldowns)) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
      this.noticeTimers[id] = Math.max(0, this.noticeTimers[id] - dt);
    }
    this.activeEffects = this.activeEffects.filter(effect => this._updateActiveEffect(effect, dt));
  }

  isUnlocked(id) {
    return !!this.unlocked[id];
  }

  getUnlockedIds() {
    return Object.keys(this.skills).filter(id => this.unlocked[id]);
  }

  restoreUnlocked(ids) {
    for (const id of Object.keys(this.unlocked)) {
      this.unlocked[id] = false;
      this.cooldowns[id] = 0;
    }
    if (!Array.isArray(ids)) return;
    for (const id of ids) {
      if (this.skills[id]) this.unlocked[id] = true;
    }
  }

  unlockSkill(id, player) {
    const skill = this.skills[id];
    if (!skill || !player || this.unlocked[id]) return false;
    if (player.money < skill.price) return false;
    player.money -= skill.price;
    this.unlocked[id] = true;
    this.cooldowns[id] = 0;
    game.floatingTexts.push(new FloatingText(
      player.x, player.y - player.radius - 26,
      `解锁 ${skill.name}`, '#7cf', 18
    ));
    return true;
  }

  handlePrimaryInputs(player) {
    if (!player || game.gameOver) return;

    this._consumeSkillKey('shockwave', player);
    this._consumeSkillKey('phaseDash', player);
    this._consumeSkillKey('stasisGrenade', player);
    this._consumeSkillKey('orbitalStrike', player);
    this._consumeSkillKey('nanoSwarm', player);
  }

  handleDeferredInputs(player) {
    if (!player || game.gameOver) return;

    this._consumeSkillKey('medField', player);
  }

  _consumeSkillKey(id, player) {
    const skill = this.skills[id];
    if (!skill || !this.isUnlocked(id)) return false;
    const keys = skill.key === 'ShiftLeft' ? ['ShiftLeft', 'ShiftRight'] : [skill.key];
    if (!keys.some(key => INPUT.keys[key])) return false;
    this.useSkill(id, player);
    for (const key of keys) INPUT.keys[key] = false;
    return true;
  }

  useBestTouchSkill(player) {
    if (!player || game.gameOver) return false;
    const enemies = (game.enemies || []).filter(e => e.alive);
    const ready = id => this.isUnlocked(id) && this.cooldowns[id] <= 0;
    const closeEnemies = enemies.filter(e => dist(player.x, player.y, e.x, e.y) < 170 + e.radius);
    if ((player.hp < player.maxHp * 0.55 || player.armor < player.maxArmor * 0.25) && ready('medField')) {
      return this.useSkill('medField', player);
    }
    if (closeEnemies.length >= 4 && ready('shockwave')) {
      return this.useSkill('shockwave', player);
    }
    if (enemies.length >= 5 && ready('nanoSwarm')) {
      return this.useSkill('nanoSwarm', player);
    }
    if (enemies.length >= 2 && ready('stasisGrenade')) {
      return this.useSkill('stasisGrenade', player);
    }
    if (enemies.length >= 1 && ready('orbitalStrike')) {
      return this.useSkill('orbitalStrike', player);
    }
    if (ready('phaseDash')) {
      return this.useSkill('phaseDash', player);
    }
    if (ready('shockwave')) {
      return this.useSkill('shockwave', player);
    }
    return false;
  }

  useSkill(id, player) {
    const skill = this.skills[id];
    if (!skill || !this.unlocked[id]) return false;

    if (this.cooldowns[id] > 0) {
      this._showCooldownNotice(skill);
      return false;
    }

    let used = false;
    if (id === 'shockwave') used = this._useShockwave(player, skill);
    if (id === 'phaseDash') used = this._usePhaseDash(player, skill);
    if (id === 'medField') used = this._useMedField(player, skill);
    if (id === 'stasisGrenade') used = this._useStasisGrenade(player, skill);
    if (id === 'orbitalStrike') used = this._useOrbitalStrike(player, skill);
    if (id === 'nanoSwarm') used = this._useNanoSwarm(player, skill);

    if (used) {
      this.cooldowns[id] = skill.cooldown;
    }
    return used;
  }

  _showCooldownNotice(skill) {
    if (this.noticeTimers[skill.id] > 0) return;
    this.noticeTimers[skill.id] = 0.4;
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - game.player.radius - 24,
      `${skill.name} 冷却 ${Math.ceil(this.cooldowns[skill.id])}s`, '#aaa', 12
    ));
  }

  _useShockwave(player, skill) {
    let hits = 0;
    const damageSource = { weaponData: { piercing: 99, explosive: 1 } };
    for (const enemy of [...game.enemies]) {
      if (!enemy.alive) continue;
      const d = dist(player.x, player.y, enemy.x, enemy.y);
      if (d > skill.radius + enemy.radius) continue;
      const falloff = 1 - Math.min(0.55, d / (skill.radius + enemy.radius) * 0.45);
      const damage = Math.round(skill.damage * falloff);
      enemy.takeDamage(damage, damageSource);
      if (enemy.alive) {
        const a = angleTo(player.x, player.y, enemy.x, enemy.y);
        const push = skill.knockback * falloff;
        const nx = enemy.x + Math.cos(a) * push;
        const ny = enemy.y + Math.sin(a) * push;
        if (game.map.isWalkable(nx, ny, enemy.radius)) {
          enemy.x = nx;
          enemy.y = ny;
        }
      }
      hits++;
      game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - enemy.radius - 10, String(damage), '#7cf', 16));
    }

    game.particles.spawnExplosion(player.x, player.y, skill.radius, 28);
    if (typeof triggerScreenShake === 'function') triggerScreenShake(8);
    game.floatingTexts.push(new FloatingText(
      player.x, player.y - player.radius - 30,
      hits > 0 ? `震荡脉冲 x${hits}` : '震荡脉冲', '#7cf', 20
    ));
    return true;
  }

  _usePhaseDash(player, skill) {
    let dx = 0;
    let dy = 0;
    if (INPUT.keys['KeyW'] || INPUT.keys['ArrowUp']) dy -= 1;
    if (INPUT.keys['KeyS'] || INPUT.keys['ArrowDown']) dy += 1;
    if (INPUT.keys['KeyA'] || INPUT.keys['ArrowLeft']) dx -= 1;
    if (INPUT.keys['KeyD'] || INPUT.keys['ArrowRight']) dx += 1;

    if (dx === 0 && dy === 0) {
      const a = angleTo(player.x, player.y, INPUT.mouseWorldX, INPUT.mouseWorldY);
      dx = Math.cos(a);
      dy = Math.sin(a);
    } else {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const startX = player.x;
    const startY = player.y;
    const steps = 12;
    const stepDist = skill.distance / steps;
    for (let i = 0; i < steps; i++) {
      const nx = player.x + dx * stepDist;
      const ny = player.y + dy * stepDist;
      if (!game.map.isWalkable(nx, ny, player.radius)) break;
      player.x = nx;
      player.y = ny;
      if (i % 2 === 0) {
        game.particles.push(new Particle(
          player.x, player.y,
          -dx * 60 + (Math.random() - 0.5) * 40,
          -dy * 60 + (Math.random() - 0.5) * 40,
          0.25, '#66ccff', 4
        ));
      }
    }

    player.invincibleTimer = Math.max(player.invincibleTimer, skill.invincibleDuration);
    player.angle = angleTo(player.x, player.y, INPUT.mouseWorldX, INPUT.mouseWorldY);

    const damageSource = { weaponData: { piercing: 99, explosive: 1 } };
    for (const enemy of [...game.enemies]) {
      if (!enemy.alive) continue;
      const d = this._distanceToSegment(enemy.x, enemy.y, startX, startY, player.x, player.y);
      if (d < skill.hitRadius + enemy.radius) {
        enemy.takeDamage(skill.damage, damageSource);
        game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - enemy.radius - 8, String(skill.damage), '#66ccff', 14));
      }
    }

    game.particles.spawnSpark(startX, startY, 10);
    game.particles.spawnSpark(player.x, player.y, 14);
    game.floatingTexts.push(new FloatingText(player.x, player.y - player.radius - 26, '相位突进', '#66ccff', 18));
    return true;
  }

  _distanceToSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const lenSq = vx * vx + vy * vy;
    if (lenSq === 0) return dist(px, py, x1, y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
    const sx = x1 + vx * t;
    const sy = y1 + vy * t;
    return dist(px, py, sx, sy);
  }

  _getTargetPoint(player) {
    const x = Number.isFinite(INPUT.mouseWorldX) ? INPUT.mouseWorldX : player.x + Math.cos(player.angle || 0) * 180;
    const y = Number.isFinite(INPUT.mouseWorldY) ? INPUT.mouseWorldY : player.y + Math.sin(player.angle || 0) * 180;
    return { x, y };
  }

  _useStasisGrenade(player, skill) {
    const target = this._getTargetPoint(player);
    let hits = 0;
    const source = { weaponData: { piercing: 99, explosive: 1 } };
    for (const enemy of [...game.enemies]) {
      if (!enemy.alive) continue;
      const d = dist(target.x, target.y, enemy.x, enemy.y);
      if (d > skill.radius + enemy.radius) continue;
      enemy.hasShield = false;
      enemy.shieldTimer = 0;
      enemy.applyControlEffect && enemy.applyControlEffect({ stun: skill.stunDuration });
      enemy.takeDamage(skill.damage, source);
      hits++;
    }
    game.particles.spawnExplosion(target.x, target.y, skill.radius, 18);
    game.floatingTexts.push(new FloatingText(target.x, target.y - 18, hits ? `静滞 x${hits}` : '静滞手雷', '#a78bfa', 18));
    return true;
  }

  _useOrbitalStrike(player, skill) {
    const target = this._getTargetPoint(player);
    const source = { weaponData: { piercing: 99, explosive: skill.radius } };
    let hits = 0;
    for (let pulse = 0; pulse < skill.pulses; pulse++) {
      const pulseRadius = skill.radius * (0.72 + pulse * 0.14);
      for (const enemy of [...game.enemies]) {
        if (!enemy.alive) continue;
        const d = dist(target.x, target.y, enemy.x, enemy.y);
        if (d > pulseRadius + enemy.radius) continue;
        const falloff = 1 - Math.min(0.55, d / (pulseRadius + enemy.radius) * 0.45);
        enemy.takeDamage(Math.round(skill.damage * falloff), source);
        hits++;
      }
      game.particles.spawnExplosion(target.x, target.y, pulseRadius, 12);
    }
    if (typeof triggerScreenShake === 'function') triggerScreenShake(10);
    game.floatingTexts.push(new FloatingText(target.x, target.y - 24, hits ? `轨道轰击 x${hits}` : '轨道轰击', '#ffcc66', 20));
    return true;
  }

  _useNanoSwarm(player, skill) {
    this.activeEffects.push({
      type: 'nanoSwarm',
      skill,
      timer: skill.duration,
      tickTimer: 0,
    });
    game.floatingTexts.push(new FloatingText(player.x, player.y - player.radius - 28, '纳米蜂群', '#66ffcc', 18));
    game.particles.spawnSpark(player.x, player.y, 16);
    return true;
  }

  _updateActiveEffect(effect, dt) {
    effect.timer -= dt;
    if (effect.type === 'nanoSwarm') {
      effect.tickTimer -= dt;
      while (effect.tickTimer <= 0 && effect.timer > 0) {
        effect.tickTimer += effect.skill.tick;
        this._tickNanoSwarm(effect.skill);
      }
    }
    return effect.timer > 0;
  }

  _tickNanoSwarm(skill) {
    const player = game.player;
    if (!player) return;
    let target = null;
    let score = Infinity;
    for (const enemy of game.enemies || []) {
      if (!enemy.alive) continue;
      const d = dist(player.x, player.y, enemy.x, enemy.y);
      if (d > skill.radius + enemy.radius) continue;
      const s = d - (enemy.maxHp || enemy.hp || 0) * 0.18;
      if (s < score) {
        score = s;
        target = enemy;
      }
    }
    if (!target) return;
    target.applyControlEffect && target.applyControlEffect({ mark: 1.4, markDamageMult: 1.1 });
    const damage = Math.round(skill.dps * skill.tick);
    target.takeDamage(damage, { weaponData: { id: 'nanoSwarm', piercing: 2, explosive: 0 } });
    if (game.particles) game.particles.spawnSpark(target.x, target.y, 3);
    if (game.floatingTexts && Math.random() < 0.45) {
      game.floatingTexts.push(new FloatingText(target.x, target.y - target.radius - 6, String(damage), '#66ffcc', 12));
    }
  }

  _useMedField(player, skill) {
    player.heal(skill.heal);
    player.armor = Math.min(player.maxArmor, player.armor + skill.armor);
    player.buffs.shield.active = true;
    player.buffs.shield.timer = Math.max(player.buffs.shield.timer, skill.shieldDuration);

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 35;
      game.particles.push(new Particle(
        player.x + Math.cos(a) * r,
        player.y + Math.sin(a) * r,
        Math.cos(a) * 20,
        Math.sin(a) * 20,
        0.35 + Math.random() * 0.25,
        '#55ff99',
        3
      ));
    }
    game.floatingTexts.push(new FloatingText(player.x, player.y - player.radius - 28, '急救力场', '#55ff99', 18));
    return true;
  }

  drawHUD(ctx) {
    const W = canvas.width;
    const ids = Object.keys(this.skills);
    const visibleCount = ids.length;
    const startX = W - Math.max(250, visibleCount * 36 + 20);
    const y = canvas.height - 132;
    const size = visibleCount > 5 ? 30 : 34;
    const gap = 6;

    ids.forEach((id, i) => {
      const skill = this.skills[id];
      const x = startX + i * (size + gap);
      const unlocked = this.unlocked[id];
      const cooldown = this.cooldowns[id];
      ctx.fillStyle = unlocked ? 'rgba(20,80,120,0.65)' : 'rgba(40,40,40,0.5)';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = unlocked ? '#4af' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = unlocked ? '#fff' : '#777';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(skill.keyLabel === 'Shift' ? 'S' : skill.keyLabel, x + size / 2, y + 13);
      ctx.font = '8px monospace';
      ctx.fillText(skill.name.slice(0, 3), x + size / 2, y + 25);
      if (!unlocked) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#888';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('LOCK', x + size / 2, y + 20);
      } else if (cooldown > 0) {
        const ratio = cooldown / skill.cooldown;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x, y, size, size * ratio);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(String(Math.ceil(cooldown)), x + size / 2, y + 22);
      }
    });
  }
}

// ============================================================
// 3. UpgradeSystem — 肉鸽升级，每波结束3选1
// ============================================================
class UpgradeSystem {
  constructor() {
    this.open = false;
    this.choices = [];
    this.allUpgrades = this.defineUpgrades();
  }

  defineUpgrades() {
    return [
      {
        id: 'damage_plus', name: '火力强化', desc: '伤害 +20%',
        rarity: 1, apply: (p) => { p.upgrades.damageMult = (p.upgrades.damageMult || 1) * 1.2; }
      },
      {
        id: 'speed_plus', name: '疾跑', desc: '移动速度 +15%',
        rarity: 1, apply: (p) => { p.upgrades.speedMult = (p.upgrades.speedMult || 1) * 1.15; }
      },
      {
        id: 'firerate_plus', name: '快速射击', desc: '射速 +15%',
        rarity: 1, apply: (p) => { p.upgrades.fireRateMult = (p.upgrades.fireRateMult || 1) * 1.15; }
      },
      {
        id: 'mag_plus', name: '扩容弹匣', desc: '弹匣容量 +30%',
        rarity: 1, apply: (p) => {
          p.weapons.forEach(w => {
            if (w.maxAmmo !== Infinity) {
              w.maxAmmo = Math.floor(w.maxAmmo * 1.3);
              w.ammo = w.maxAmmo;
              w.magSize = w.maxAmmo;
            }
          });
        }
      },
      {
        id: 'crit_chance', name: '精准打击', desc: '暴击率 +8%',
        rarity: 1, apply: (p) => { p.upgrades.critChance = (p.upgrades.critChance || 0) + 0.08; }
      },
      {
        id: 'crit_damage', name: '致命一击', desc: '暴击伤害 +40%',
        rarity: 2, apply: (p) => { p.upgrades.critDamage = (p.upgrades.critDamage || 2) + 0.4; }
      },
      {
        id: 'pierce_plus', name: '穿甲弹', desc: '子弹穿透 +1',
        rarity: 2, apply: (p) => { p.upgrades.penetration = (p.upgrades.penetration || 0) + 1; }
      },
      {
        id: 'lifesteal', name: '生命汲取', desc: '攻击吸血 3%',
        rarity: 2, apply: (p) => { p.upgrades.lifesteal = (p.upgrades.lifesteal || 0) + 0.03; }
      },
      {
        id: 'gold_plus', name: '贪婪之手', desc: '金币获取 +30%',
        rarity: 1, apply: (p) => { p.upgrades.goldMult = (p.upgrades.goldMult || 1) * 1.3; }
      },
      {
        id: 'combo_time', name: '节奏大师', desc: '连击持续时间 +2秒',
        rarity: 1, apply: (p) => { p.upgrades.comboTimeBonus = (p.upgrades.comboTimeBonus || 0) + 2; }
      },
      {
        id: 'pickup_range', name: '磁力吸引', desc: '拾取范围 +50%',
        rarity: 1, apply: (p) => { p.upgrades.pickupRangeMult = (p.upgrades.pickupRangeMult || 1) * 1.5; }
      },
      {
        id: 'armor_plus', name: '钢筋铁骨', desc: '受到伤害 -15%',
        rarity: 2, apply: (p) => { p.upgrades.damageReduction = (p.upgrades.damageReduction || 0) + 0.15; }
      },
      {
        id: 'ricochet', name: '弹跳子弹', desc: '子弹反弹 1次',
        rarity: 2, apply: (p) => { p.upgrades.ricochet = (p.upgrades.ricochet || 0) + 1; }
      },
      {
        id: 'split_shot', name: '分裂弹', desc: '20%概率分裂出额外子弹',
        rarity: 2, apply: (p) => { p.upgrades.splitChance = (p.upgrades.splitChance || 0) + 0.2; }
      },
      {
        id: 'regen', name: '再生细胞', desc: '每秒恢复 1HP',
        rarity: 2, apply: (p) => { p.upgrades.regen = (p.upgrades.regen || 0) + 1; }
      },
      {
        id: 'explosive', name: '爆裂弹头', desc: '击杀20%概率爆炸',
        rarity: 2, apply: (p) => { p.upgrades.explosiveChance = (p.upgrades.explosiveChance || 0) + 0.2; }
      },
      {
        id: 'freeze', name: '极寒暴击', desc: '暴击冰冻敌人1秒',
        rarity: 2, apply: (p) => { p.upgrades.freezeOnCrit = true; p.upgrades.freezeDuration = (p.upgrades.freezeDuration || 0) + 1; }
      },
      {
        id: 'chain_lightning', name: '电磁链', desc: '电磁武器激活连锁闪电（需电磁武器）',
        rarity: 3, apply: (p) => { p.upgrades.chainLightning = true; p.upgrades.chainDamage = (p.upgrades.chainDamage || 0) + 20; }
      },
      {
        id: 'double_shot', name: '双发模式', desc: '30%概率双发',
        rarity: 3, apply: (p) => { p.upgrades.doubleShotChance = (p.upgrades.doubleShotChance || 0) + 0.3; }
      },
      {
        id: 'extra_life', name: '额外生命', desc: '额外生命 +1',
        rarity: 3, apply: (p) => { p.extraLives = (p.extraLives || 0) + 1; }
      },
    ];
  }

  showChoices(player) {
    this.open = true;
    // 随机抽取3个不重复的升级
    const pool = [...this.allUpgrades];
    this.choices = [];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      this.choices.push(pool.splice(idx, 1)[0]);
    }
  }

  apply(choiceIndex) {
    if (choiceIndex < 0 || choiceIndex >= this.choices.length) return false;
    const upg = this.choices[choiceIndex];
    upg.apply(game.player);
    this.open = false;
    this.choices = [];

    // 浮动文字提示
    game.floatingTexts.push(new FloatingText(
      canvas.width / 2, canvas.height / 2 - 50,
      `获得: ${upg.name}`, this.getRarityColor(upg.rarity), 28, 2000
    ));

    return true;
  }

  getRarityColor(r) {
    return r === 3 ? '#ffd700' : (r === 2 ? '#4488ff' : '#ffffff');
  }

  getRarityName(r) {
    return r === 3 ? '传说' : (r === 2 ? '稀有' : '普通');
  }

  getChoiceCardRects() {
    const count = this.choices.length || 3;
    const mobile = INPUT && INPUT.isMobileLayout && INPUT.isMobileLayout();
    if (mobile && canvas.width <= 520) {
      const margin = 18;
      const gap = 10;
      const cardW = canvas.width - margin * 2;
      const availableH = canvas.height - 150;
      const cardH = Math.max(132, Math.min(156, Math.floor((availableH - gap * (count - 1)) / count)));
      const totalH = count * cardH + (count - 1) * gap;
      const startY = Math.max(92, Math.floor((canvas.height - totalH) / 2) + 24);
      return Array.from({ length: count }, (_, i) => ({
        x: margin,
        y: startY + i * (cardH + gap),
        w: cardW,
        h: cardH,
      }));
    }

    const cardW = mobile ? Math.min(190, Math.max(156, Math.floor(canvas.width * 0.29))) : 220;
    const cardH = mobile ? 146 : 160;
    const gap = mobile ? 12 : 25;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = (canvas.width - totalW) / 2;
    const cardY = canvas.height / 2 - cardH / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: startX + i * (cardW + gap),
      y: cardY,
      w: cardW,
      h: cardH,
    }));
  }

  draw(ctx) {
    if (!this.open || this.choices.length === 0) return;
    const mobile = INPUT && INPUT.isMobileLayout && INPUT.isMobileLayout();
    const rects = this.getChoiceCardRects();

    // 背景遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = mobile ? 'bold 22px monospace' : 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择一项升级', canvas.width / 2, mobile ? 54 : canvas.height / 2 - 180);
    ctx.font = mobile ? '12px monospace' : '14px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(mobile ? '点选卡片' : '按 1 / 2 / 3 选择 | 点击选择', canvas.width / 2, mobile ? 76 : canvas.height / 2 - 155);

    const mx = INPUT.mouseX;
    const my = INPUT.mouseY;

    this.choices.forEach((c, i) => {
      const { x, y, w: cardW, h: cardH } = rects[i];
      const cardY = y;
      const hovered = mx >= x && mx <= x + cardW && my >= cardY && my <= cardY + cardH;
      const rarityColor = this.getRarityColor(c.rarity);

      // 卡片背景
      ctx.fillStyle = hovered ? 'rgba(40,40,55,0.95)' : 'rgba(25,25,35,0.9)';
      ctx.fillRect(x, cardY, cardW, cardH);

      // 边框颜色按稀有度
      ctx.strokeStyle = hovered ? rarityColor : this.adjustAlpha(rarityColor, 0.5);
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.strokeRect(x, cardY, cardW, cardH);

      // 稀有度标签
      ctx.fillStyle = rarityColor;
      ctx.font = mobile ? 'bold 10px monospace' : 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${this.getRarityName(c.rarity)}]`, x + 12, cardY + 22);

      // 升级名称
      ctx.fillStyle = '#fff';
      ctx.font = mobile ? 'bold 16px monospace' : 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, x + cardW / 2, cardY + (mobile ? 48 : 55));

      // 描述
      ctx.fillStyle = '#bbb';
      ctx.font = mobile ? '12px monospace' : '13px monospace';
      const desc = c.desc.length > 24 && mobile ? `${c.desc.slice(0, 23)}...` : c.desc;
      ctx.fillText(desc, x + cardW / 2, cardY + (mobile ? 76 : 85));

      // 快捷键
      ctx.fillStyle = '#666';
      ctx.font = mobile ? 'bold 13px monospace' : 'bold 14px monospace';
      ctx.fillText(mobile ? '选择' : `[${i + 1}]`, x + cardW / 2, cardY + cardH - 24);
    });
  }

  adjustAlpha(hex, alpha) {
    // 简单处理 #rrggbb 格式
    if (hex.startsWith('#') && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return hex;
  }

  handleClick(mx, my) {
    if (!this.open) return false;
    const rects = this.getChoiceCardRects();

    for (let i = 0; i < this.choices.length; i++) {
      const r = rects[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.apply(i);
        return true;
      }
    }
    return false;
  }
}

// ============================================================
// 3. WaveManager — 波次管理
// ============================================================
class WaveManager {
  constructor() {
    this.wave = 0;
    this.active = false;
    this.intermission = false;
    this.intermissionTimer = 0;
    this.intermissionDuration = 5;
    this.waveStartDelay = 2;
    this.waveStartTimer = 0;
    this.waveDisplayTimer = 0;
    this.waveDisplayDuration = 3;
  }

  startNextWave() {
    this.wave++;
    this.active = true;
    this.intermission = false;
    this.intermissionTimer = 0;
    this.waveStartTimer = this.waveStartDelay;
    this.waveDisplayTimer = this.waveDisplayDuration;

    // 每2波切换地图主题
    if (this.wave % 2 === 1 && this.wave > 1) {
      if (typeof rotateMapTheme === 'function') {
        rotateMapTheme();
      }
    }

    if (game.enemyManager) {
      // 清理上一波残留敌人（防止密室卡住导致波次无法推进）
      // 必须清空数组而不是替换，否则 game.enemies 引用会断开
      game.enemyManager.enemies.length = 0;
      game.enemyManager.startWave(this.wave);
    }

    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 50,
      `第 ${this.wave} 波来袭!`, '#f44', 32, 2000
    ));
  }

  endWave() {
    if (!this.active) return;
    this.active = false;
    this.intermission = true;
    this.intermissionTimer = this.intermissionDuration;

    const waveBonus = this.wave * 100;
    game.player.money += waveBonus;
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 50,
      `波次完成! +$${waveBonus}`, '#ff0', 26, 2000
    ));

    // 自动存档
    if (game.saveSystem) game.saveSystem.save(game);

    setTimeout(() => {
      if (game.upgradeSystem) {
        game.upgradeSystem.showChoices(game.player);
      }
    }, 500);
  }

  update(dt) {
    if (this.waveStartTimer > 0) this.waveStartTimer -= dt;
    if (this.waveDisplayTimer > 0) this.waveDisplayTimer -= dt;

    if (this.active) {
      if (game.enemyManager && game.enemyManager.isWaveComplete()) {
        this.endWave();
      }
    }

    if (this.intermission) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0 && !game.upgradeSystem.open) {
        this.startNextWave();
      }
    }
  }

  draw(ctx) {
    // 波次开始大字显示
    if (this.waveDisplayTimer > 0 && this.wave > 0) {
      const alpha = Math.min(1, this.waveDisplayTimer / 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${this.wave}`, canvas.width / 2, canvas.height / 2 - 60);
      ctx.restore();
    }

    // 波间准备倒计时
    if (this.intermission && this.intermissionTimer > 0 && !game.upgradeSystem.open) {
      const secs = Math.ceil(this.intermissionTimer);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(canvas.width / 2 - 100, 60, 200, 40);
      ctx.fillStyle = '#ff0';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`下一波: ${secs}s (按U立即)`, canvas.width / 2, 85);
    }
  }

  skipIntermission() {
    if (this.intermission) {
      this.intermissionTimer = 0;
    }
  }
}

// ============================================================
// 4. ComboSystem — 连击系统
// ============================================================
class ComboSystem {
  constructor() {
    this.combo = 0;
    this.comboTimer = 0;
    this.baseComboTime = 3;
    this.maxComboDisplay = 0; // 用于显示最高连击
  }

  onKill() {
    this.combo++;
    this.comboTimer = this.baseComboTime + (game.player.upgrades.comboTimeBonus || 0);
    if (this.combo > this.maxComboDisplay) {
      this.maxComboDisplay = this.combo;
    }
  }

  getMultiplier() {
    if (this.combo >= 50) return 5;
    if (this.combo >= 21) return 4;
    if (this.combo >= 11) return 3;
    if (this.combo >= 6)  return 2;
    return 1;
  }

  calculateGold(baseReward) {
    const mult = this.getMultiplier();
    const goldMult = game.player.goldMult || 1;
    return Math.floor(baseReward * mult * goldMult);
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
  }

  getComboColor() {
    const m = this.getMultiplier();
    if (m >= 5) return '#ff00ff'; // 紫
    if (m >= 4) return '#ff4400'; // 橙红
    if (m >= 3) return '#ffcc00'; // 金
    if (m >= 2) return '#44ff44'; // 绿
    return '#ffffff';
  }

  draw(ctx) {
    if (this.combo <= 0) return;

    const x = canvas.width / 2 + 120;
    const y = 35;
    const color = this.getComboColor();
    const mult = this.getMultiplier();

    ctx.save();

    // Combo 数字
    ctx.fillStyle = color;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.combo}x`, x, y);

    // 倍率
    ctx.font = '14px monospace';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fillText(`x${mult} 金币`, x + 45, y);

    // 倒计时条
    const barW = 80;
    const barH = 4;
    const ratio = this.comboTimer / (this.baseComboTime + (game.player.upgrades.comboTimeBonus || 0));
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y + 8, barW, barH);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y + 8, barW * ratio, barH);

    ctx.restore();
  }
}

// ============================================================
// 5. RelicSystem — 圣遗物（死亡保留一项升级）
// ============================================================
class RelicSystem {
  constructor() {
    this.relics = {};
    this.showChoice = false;
    this.choices = [];
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem('zombieShooter_relics');
      if (data) this.relics = JSON.parse(data);
    } catch (e) {}
  }

  save() {
    localStorage.setItem('zombieShooter_relics', JSON.stringify(this.relics));
  }

  getUpgradeDiff(upgrades) {
    const defaults = {
      damageMult: 1, fireRateMult: 1, speedMult: 1, magMult: 1,
      critChance: 0.05, critDamage: 2, penetration: 0, lifesteal: 0,
      goldMult: 1, spreadReduce: 0, explodeRadius: 0, freezeChance: 0,
      extraLives: 0, damageReduction: 0, comboTimeBonus: 0,
      pickupRangeMult: 1, ricochet: 0, splitChance: 0, regen: 0,
      explosiveChance: 0, freezeOnCrit: false, freezeDuration: 0,
      chainLightning: false, chainDamage: 0, doubleShotChance: 0,
    };
    const diff = [];
    const names = {
      damageMult: '伤害加成', fireRateMult: '射速加成', speedMult: '移速加成',
      magMult: '弹匣加成', critChance: '暴击率', critDamage: '暴击伤害',
      penetration: '穿透', lifesteal: '吸血', goldMult: '金币加成',
      spreadReduce: '散射缩减', explodeRadius: '爆炸范围', freezeChance: '冰冻概率',
      extraLives: '额外生命', damageReduction: '伤害减免', comboTimeBonus: '连击时间',
      pickupRangeMult: '拾取范围', ricochet: '弹跳', splitChance: '分裂概率',
      regen: '生命恢复', explosiveChance: '爆炸概率', freezeOnCrit: '冰冻暴击',
      freezeDuration: '冰冻时间', chainLightning: '连锁闪电', chainDamage: '链伤',
      doubleShotChance: '双发概率',
    };
    for (const key in upgrades) {
      if (upgrades[key] !== defaults[key]) {
        let value = upgrades[key];
        let display = '';
        if (typeof value === 'number') {
          if (key.includes('Mult') || key.includes('Chance')) {
            display = value >= 1 ? `x${value.toFixed(2)}` : `${(value * 100).toFixed(0)}%`;
          } else {
            display = value.toFixed(1);
          }
        } else {
          display = value ? '已激活' : '未激活';
        }
        diff.push({ key, name: names[key] || key, value, display });
      }
    }
    return diff;
  }

  onDeath(upgrades) {
    const diff = this.getUpgradeDiff(upgrades);
    if (diff.length === 0) return false;
    this.choices = diff.slice(0, 3);
    this.showChoice = true;
    return true;
  }

  choose(index) {
    if (index < 0 || index >= this.choices.length) return;
    const c = this.choices[index];
    this.relics[c.key] = c.value;
    this.save();
    this.showChoice = false;
    this.choices = [];
  }

  applyTo(player) {
    for (const key in this.relics) {
      if (player.upgrades[key] !== undefined) {
        player.upgrades[key] = this.relics[key];
      }
    }
  }

  draw(ctx) {
    if (!this.showChoice || this.choices.length === 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择一项圣遗物永久保留', canvas.width / 2, canvas.height / 2 - 120);
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('死亡不是终点，你的力量将延续', canvas.width / 2, canvas.height / 2 - 95);
    ctx.fillText('按 1 / 2 / 3 选择 | 点击选择', canvas.width / 2, canvas.height / 2 - 78);

    const cardW = 200;
    const cardH = 90;
    const gap = 25;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    const startX = (canvas.width - totalW) / 2;
    const cardY = canvas.height / 2 - 40;

    this.choices.forEach((c, i) => {
      const x = startX + i * (cardW + gap);
      ctx.fillStyle = 'rgba(40,30,10,0.95)';
      ctx.fillRect(x, cardY, cardW, cardH);
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, cardY, cardW, cardH);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, x + cardW / 2, cardY + 32);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(c.display, x + cardW / 2, cardY + 58);
      ctx.fillStyle = '#666';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`[${i + 1}]`, x + cardW / 2, cardY + 78);
    });
  }

  handleClick(mx, my) {
    if (!this.showChoice) return false;
    const cardW = 200;
    const cardH = 90;
    const gap = 25;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    const startX = (canvas.width - totalW) / 2;
    const cardY = canvas.height / 2 - 40;
    for (let i = 0; i < this.choices.length; i++) {
      const x = startX + i * (cardW + gap);
      if (mx >= x && mx <= x + cardW && my >= cardY && my <= cardY + cardH) {
        this.choose(i);
        return true;
      }
    }
    return false;
  }

  reset() {
    this.relics = {};
    this.save();
  }
}

// ============================================================
// 6. SaveSystem — 存档
// ============================================================
class SaveSystem {
  save(game) {
    const data = {
      wave: game.waveManager.wave,
      money: game.player.money,
      ownedWeapons: game.player.weapons.map(w => w.data.id),
      equipped: game.player.equipped,
      activeSlot: game.player.activeSlot,
      weaponLoadout: game.player.weapons.map(w => ({
        data: w.data,
        level: w.proficiencyLevel,
        xp: w.proficiencyXP,
        fusionLevel: w.fusionLevel || 0,
        affixes: w.affixes || [],
        rarity: w.rarity || w.data.rarity || 'common',
      })),
      weaponProficiency: game.player.weapons.map(w => ({
        id: w.data.id,
        level: w.proficiencyLevel,
        xp: w.proficiencyXP,
        fusionLevel: w.fusionLevel || 0,
        affixes: w.affixes || [],
        rarity: w.rarity || w.data.rarity || 'common',
      })),
      upgrades: game.player.upgrades,
      unlockedSkills: game.heroSkillSystem ? game.heroSkillSystem.getUnlockedIds() : [],
      turrets: game.turretManager ? game.turretManager.serialize() : [],
      pets: game.petManager ? game.petManager.serialize() : [],
      score: game.score,
      timestamp: Date.now(),
    };
    localStorage.setItem('zombieShooter_save', JSON.stringify(data));
  }

  load() {
    try {
      const data = localStorage.getItem('zombieShooter_save');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  clear() {
    localStorage.removeItem('zombieShooter_save');
  }

  hasSave() {
    return !!this.load();
  }
}
