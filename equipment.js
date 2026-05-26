// ============================================================
// equipment.js — 装备界面：双武器槽 + 武器库
// ============================================================

class EquipmentUI {
  constructor() {
    this.open = false;
    this.selectedStashIndex = null; // 选中的武器库索引
  }

  toggle() {
    this.open = !this.open;
    this.selectedStashIndex = null;
  }

  draw(ctx, player) {
    if (!this.open) return;

    const W = canvas.width;
    const H = canvas.height;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('装备配置', W / 2, 50);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('[1] 主武器  [2] 副武器  [Tab] 关闭', W / 2, 72);

    // ===== 已装备槽位 =====
    const slotW = 160;
    const slotH = 80;
    const slotGap = 40;
    const slotY = 100;
    const startX = W / 2 - slotW - slotGap / 2;

    for (let slot = 0; slot < 2; slot++) {
      const sx = startX + slot * (slotW + slotGap);
      const isActive = player.activeSlot === slot;
      const wepIdx = player.equipped[slot];
      const weapon = wepIdx !== null ? player.weapons[wepIdx] : null;

      // 槽位背景
      ctx.fillStyle = isActive ? 'rgba(100,150,255,0.3)' : 'rgba(50,50,50,0.5)';
      ctx.fillRect(sx, slotY, slotW, slotH);
      ctx.strokeStyle = isActive ? '#4488ff' : '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, slotY, slotW, slotH);

      // 槽位标签
      ctx.fillStyle = isActive ? '#4488ff' : '#888';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(slot === 0 ? '主武器 [1]' : '副武器 [2]', sx + 8, slotY + 18);

      if (weapon) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(weapon.name, sx + 8, slotY + 40);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        const stats = weapon.getEffectiveStats();
        ctx.fillText(`伤害:${stats.damage} 弹匣:${stats.magazine}`, sx + 8, slotY + 56);
        ctx.fillText(`Lv.${weapon.proficiencyLevel}`, sx + 8, slotY + 70);
      } else {
        ctx.fillStyle = '#555';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('空', sx + slotW / 2, slotY + 48);
      }
    }

    // ===== 武器库 =====
    const stashY = slotY + slotH + 30;
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('武器库 (点击选择 → 点击槽位装备)', 40, stashY);

    const cellW = 140;
    const cellH = 70;
    const cols = Math.floor((W - 80) / (cellW + 10));
    const gap = 10;

    for (let i = 0; i < player.weapons.length; i++) {
      const w = player.weapons[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 40 + col * (cellW + gap);
      const cy = stashY + 15 + row * (cellH + gap);

      const isSelected = this.selectedStashIndex === i;
      const isEquipped = player.equipped.includes(i);

      // 背景
      ctx.fillStyle = isSelected ? 'rgba(255,200,0,0.25)' : (isEquipped ? 'rgba(100,100,100,0.3)' : 'rgba(40,40,40,0.5)');
      ctx.fillRect(cx, cy, cellW, cellH);
      ctx.strokeStyle = isSelected ? '#ffcc00' : (isEquipped ? '#666' : '#444');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(cx, cy, cellW, cellH);

      // 武器信息
      ctx.fillStyle = isEquipped ? '#888' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(w.name, cx + 6, cy + 18);

      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      const stats = w.getEffectiveStats();
      ctx.fillText(`伤害:${stats.damage} 射速:${stats.fireRate.toFixed(1)}`, cx + 6, cy + 34);
      ctx.fillText(`弹匣:${stats.magazine} Lv.${w.proficiencyLevel}`, cx + 6, cy + 48);

      if (isEquipped) {
        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        const slotLabel = player.equipped[0] === i ? '[主]' : '[副]';
        ctx.fillText(slotLabel, cx + cellW - 4, cy + 14);
      }
    }
  }

  handleClick(mx, my, player) {
    if (!this.open) return false;

    const W = canvas.width;
    const slotW = 160;
    const slotH = 80;
    const slotGap = 40;
    const slotY = 100;
    const startX = W / 2 - slotW - slotGap / 2;

    // 检查点击槽位
    for (let slot = 0; slot < 2; slot++) {
      const sx = startX + slot * (slotW + slotGap);
      if (mx >= sx && mx <= sx + slotW && my >= slotY && my <= slotY + slotH) {
        if (this.selectedStashIndex !== null) {
          // 装备选中的武器到该槽位
          this._equip(player, this.selectedStashIndex, slot);
          this.selectedStashIndex = null;
        } else {
          // 点击已装备的槽位 = 卸下
          if (player.equipped[slot] !== null) {
            player.equipped[slot] = null;
            // 如果卸下的是当前使用的武器，切换到另一个槽
            if (player.activeSlot === slot) {
              const otherSlot = slot === 0 ? 1 : 0;
              if (player.equipped[otherSlot] !== null) {
                player.activeSlot = otherSlot;
              }
            }
          }
        }
        return true;
      }
    }

    // 检查点击武器库
    const stashY = slotY + slotH + 30;
    const cellW = 140;
    const cellH = 70;
    const cols = Math.floor((W - 80) / (cellW + 10));
    const gap = 10;

    for (let i = 0; i < player.weapons.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 40 + col * (cellW + gap);
      const cy = stashY + 15 + row * (cellH + gap);

      if (mx >= cx && mx <= cx + cellW && my >= cy && my <= cy + cellH) {
        this.selectedStashIndex = i;
        return true;
      }
    }

    return false;
  }

  _equip(player, stashIndex, slot) {
    // 不能重复装备同一个武器到两个槽位
    const otherSlot = slot === 0 ? 1 : 0;
    if (player.equipped[otherSlot] === stashIndex) {
      player.equipped[otherSlot] = null;
    }
    player.equipped[slot] = stashIndex;
    player.activeSlot = slot;
  }
}
