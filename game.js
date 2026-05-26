// ============================================================
// game.js - 游戏入口与主循环
// ============================================================

let canvas, ctx;
let game = {};
let lastTimestamp = 0;
let screenShake = { x: 0, y: 0, intensity: 0 };

function initCanvas() {
  canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
  canvas.id = 'gameCanvas';
  ctx = canvas.getContext('2d');
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#111';
  if (!canvas.parentNode) document.body.appendChild(canvas);
  resizeCanvas();
}

function getViewportSize() {
  const viewport = window.visualViewport;
  const width = Math.floor((viewport && viewport.width) || window.innerWidth || 800);
  const height = Math.floor((viewport && viewport.height) || window.innerHeight || 600);
  return {
    width: Math.max(240, width),
    height: Math.max(240, height),
  };
}

function resizeCanvas() {
  if (!canvas) return;
  const { width, height } = getViewportSize();
  canvas.width = width;
  canvas.height = height;
  if (canvas.style) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  if (game && game.camera) {
    game.camera.w = width;
    game.camera.h = height;
  }
}

function initGame() {
  initCanvas();

  // 创建游戏主对象
  game = {
    canvas: canvas,
    ctx: ctx,
    player: null,
    camera: null,
    map: null,
    enemyManager: null,
    projectiles: [],
    particles: null,
    floatingTexts: [],
    decalSystem: null,
    metaProgression: null,
    shopSystem: null,
    heroSkillSystem: null,
    upgradeSystem: null,
    equipmentUI: null,
    waveManager: null,
    comboSystem: null,
    relicSystem: null,
    saveSystem: null,
    input: null,
    pickups: [],
    vehicleManager: null,
    turretManager: null,
    petManager: null,
    paused: false,
    gameOver: false,
    score: 0,
    bossKillsThisRun: 0,
    screenShake: { x: 0, y: 0, intensity: 0 },
  };

  // 暴露全局引用
  window.game = game;
  window.canvas = canvas;
  window.ctx = ctx;

  // 初始化输入
  game.input = new Input(canvas);
  window.INPUT = game.input;

  // 初始化地图
  game.map = new Map(canvas.width * 2, canvas.height * 2, 40);
  game.map.generate('grass');

  // 初始化相机
  game.camera = new Camera(canvas.width, canvas.height);

  // 初始化玩家（地图中央，确保不在墙壁里）
  let startX = game.map.width / 2;
  let startY = game.map.height / 2;
  game.player = new Player(startX, startY);

  // 如果中心被建筑物覆盖，向外螺旋搜索可行走位置
  if (!game.map.isWalkable(startX, startY, game.player.radius)) {
    let found = false;
    for (let radius = 50; radius < 600 && !found; radius += 30) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const tx = startX + Math.cos(angle) * radius;
        const ty = startY + Math.sin(angle) * radius;
        if (game.map.isWalkable(tx, ty, game.player.radius)) {
          game.player.x = tx;
          game.player.y = ty;
          found = true;
          break;
        }
      }
    }
  }

  // 初始化敌人管理器
  game.enemyManager = new EnemyManager();
  game.enemies = game.enemyManager.enemies;

  // 初始化粒子系统
  game.particles = new ParticleSystem();

  // 初始化地面残留系统
  game.decalSystem = new DecalSystem();

  // 初始化局外成长
  game.metaProgression = new MetaProgression();

  // 初始化商店
  game.shopSystem = new ShopSystem();

  // 初始化英雄技能
  game.heroSkillSystem = new HeroSkillSystem();

  // 初始化装备界面
  game.equipmentUI = new EquipmentUI();

  // 初始化升级系统
  game.upgradeSystem = new UpgradeSystem();

  // 初始化波次管理器
  game.waveManager = new WaveManager();

  // 初始化连击系统
  game.comboSystem = new ComboSystem();

  // 初始化圣遗物系统
  game.relicSystem = new RelicSystem();
  // 应用圣遗物到玩家
  game.relicSystem.applyTo(game.player);

  // 初始化载具管理器
  game.vehicleManager = new VehicleManager();
  game.vehicleManager.spawn(2);

  // 初始化炮台管理器
  game.turretManager = new TurretManager();

  // 初始化宠物管理器
  game.petManager = new PetManager();

  // 初始化存档系统
  game.saveSystem = new SaveSystem();

  // 加载存档（如果有）
  const saveData = game.saveSystem.load();
  if (saveData) {
    // 恢复金钱
    game.player.money = saveData.money || 0;
    // 恢复 upgrades
    if (saveData.upgrades) {
      for (const key in saveData.upgrades) {
        if (game.player.upgrades[key] !== undefined) {
          game.player.upgrades[key] = saveData.upgrades[key];
        }
      }
    }
    // 恢复已购买武器（直接恢复，不扣款）
    if (saveData.ownedWeapons) {
      for (const wid of saveData.ownedWeapons) {
        if (wid !== 'pistol') {
          const data = WEAPON_DATA[wid];
          if (data) {
            game.player.weapons.push(new Weapon(data));
          }
          const shopWep = game.shopSystem.weapons.find(w => w.id === wid);
          if (shopWep) shopWep.owned = true;
        }
      }
    }
    // 恢复武器熟练度
    if (saveData.weaponProficiency) {
      for (const prof of saveData.weaponProficiency) {
        const weapon = game.player.weapons.find(w => w.data.id === prof.id);
        if (weapon) {
          weapon.proficiencyLevel = prof.level;
          weapon.proficiencyXP = prof.xp;
          weapon.proficiencyXPToNext = weapon._calcXPToNext(prof.level);
          weapon.fusionLevel = prof.fusionLevel || 0;
          weapon.affixes = Array.isArray(prof.affixes) ? [...prof.affixes] : [];
          weapon.rarity = prof.rarity || weapon.data.rarity || 'common';
          if (weapon._syncDisplayName) weapon._syncDisplayName();
        }
      }
    }
    restorePlayerWeaponsFromSave(saveData);
    // 恢复英雄技能解锁
    if (saveData.unlockedSkills && game.heroSkillSystem) {
      game.heroSkillSystem.restoreUnlocked(saveData.unlockedSkills);
    }
    // 恢复炮台
    if (saveData.turrets && game.turretManager) {
      game.turretManager.restore(saveData.turrets);
    }
    // 恢复宠物
    if (saveData.pets && game.petManager) {
      game.petManager.restore(saveData.pets);
    }
    // 从存档波次开始
    if (saveData.wave && saveData.wave > 1) {
      game.waveManager.wave = saveData.wave - 1;
    }
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 60,
      '存档已恢复', '#0f0', 20, 2000
    ));
  }

  // 开始第1波（或存档波次）
  game.waveManager.startNextWave();

  // 绑定事件
  bindEvents();

  // 隐藏标题屏幕
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  // 启动主循环
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

function bindEvents() {
  // 键盘事件
  window.addEventListener('keydown', (e) => {
    // Tab键：装备界面
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!game.upgradeSystem.open && !game.shopSystem.open && !game.gameOver) {
        game.equipmentUI.toggle();
      }
    }

    // B键：商店
    if (e.key === 'b' || e.key === 'B') {
      if (!game.upgradeSystem.open && !game.equipmentUI.open && !game.gameOver) {
        game.shopSystem.toggle();
      }
    }

    // U键：跳过波间准备
    if (e.key === 'u' || e.key === 'U') {
      if (game.waveManager && game.waveManager.intermission) {
        game.waveManager.skipIntermission();
      }
    }

    // T/Y：快速调整最近炮台
    if ((e.key === 't' || e.key === 'T') && !game.upgradeSystem.open && !game.equipmentUI.open && !game.shopSystem.open && !game.gameOver) {
      if (game.turretManager) game.turretManager.redeployNearest(game.player);
    }

    if ((e.key === 'y' || e.key === 'Y') && !game.upgradeSystem.open && !game.equipmentUI.open && !game.shopSystem.open && !game.gameOver) {
      if (game.turretManager) game.turretManager.cycleTargetModeNearest(game.player);
    }

    // 数字键1-2：切换主/副武器（只在未打开菜单时）
    if ((e.key === '1' || e.key === '2') && !game.equipmentUI.open && !game.shopSystem.open && !game.upgradeSystem.open) {
      const slot = parseInt(e.key) - 1;
      game.player.switchWeapon(slot);
    }

    // 升级选择 1-3
    if (e.key >= '1' && e.key <= '3' && game.upgradeSystem.open) {
      game.upgradeSystem.apply(parseInt(e.key) - 1);
    }

    // 圣遗物选择 1-3
    if (e.key >= '1' && e.key <= '3' && game.relicSystem && game.relicSystem.showChoice) {
      game.relicSystem.choose(parseInt(e.key) - 1);
      if (!game.relicSystem.showChoice) {
        game.gameOver = true;
        game.score = game.waveManager.wave * 1000 + game.player.money;
      }
    }

    // R键：重新开始
    if ((e.key === 'r' || e.key === 'R') && game.gameOver) {
      restartGame();
    }

    // Ctrl/⌘ + Shift + C：清除存档和圣遗物（避免和 C 技能冲突）
    if ((e.key === 'c' || e.key === 'C') && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (game.relicSystem) game.relicSystem.reset();
      if (game.saveSystem) game.saveSystem.clear();
      restartGame();
    }
  });

  // 鼠标点击（商店/升级菜单/圣遗物）
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (game.gameOver) {
      handleGameOverPointer(mx, my);
      return;
    }

    // 圣遗物选择优先
    if (game.relicSystem && game.relicSystem.showChoice) {
      if (game.relicSystem.handleClick(mx, my)) {
        if (!game.relicSystem.showChoice) {
          game.gameOver = true;
          game.score = game.waveManager.wave * 1000 + game.player.money;
        }
        return;
      }
    }

    if (game.upgradeSystem.open) {
      if (game.upgradeSystem.handleClick(mx, my)) return;
    }

    if (game.equipmentUI.open) {
      if (game.equipmentUI.handleClick(mx, my, game.player)) return;
    }

    if (game.shopSystem.open) {
      if (game.shopSystem.handleMouseDown && game.shopSystem.handleMouseDown(mx, my, game.player, e.button)) return;
      if (game.shopSystem.handleClick(mx, my, game.player, e.button)) return;
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (game.gameOver || !game.shopSystem || !game.shopSystem.open || !game.shopSystem.handleMouseUp) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    game.shopSystem.handleMouseUp(mx, my, game.player);
  });

  const handleTouchMenuDown = (mx, my) => {
    if (game.gameOver) return handleGameOverPointer(mx, my);

    if (game.relicSystem && game.relicSystem.showChoice) {
      if (game.relicSystem.handleClick(mx, my)) {
        if (!game.relicSystem.showChoice) {
          game.gameOver = true;
          game.score = game.waveManager.wave * 1000 + game.player.money;
        }
        return true;
      }
    }

    if (game.upgradeSystem.open) {
      return game.upgradeSystem.handleClick(mx, my);
    }

    if (game.equipmentUI.open) {
      return game.equipmentUI.handleClick(mx, my, game.player);
    }

    if (game.shopSystem.open) {
      if (game.shopSystem.handleMouseDown && game.shopSystem.handleMouseDown(mx, my, game.player, 0)) return true;
      return game.shopSystem.handleClick(mx, my, game.player, 0);
    }

    return false;
  };

  canvas.addEventListener('touchstart', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    for (const touch of Array.from(e.changedTouches)) {
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      if (handleTouchMenuDown(mx, my)) {
        e.preventDefault();
        return;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (game.gameOver || !game.shopSystem || !game.shopSystem.open || !game.shopSystem.handleMouseUp) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    if (game.shopSystem.handleMouseUp(mx, my, game.player)) e.preventDefault();
  }, { passive: false });

  // 阻止右键菜单
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 窗口大小调整
  window.addEventListener('resize', resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
    window.visualViewport.addEventListener('scroll', resizeCanvas);
  }
}

function restorePlayerWeaponsFromSave(saveData) {
  if (!saveData || !Array.isArray(saveData.weaponLoadout)) return;
  game.player.weapons = [];
  for (const item of saveData.weaponLoadout) {
    if (!item || !item.data) continue;
    const baseData = item.data.fusionWeapon ? item.data : (WEAPON_DATA[item.data.id] || item.data);
    const weapon = new Weapon(baseData, {
      rarity: item.rarity || baseData.rarity || 'common',
      fusionLevel: item.fusionLevel || 0,
      affixes: item.affixes || [],
    });
    weapon.proficiencyLevel = item.level || 1;
    weapon.proficiencyXP = item.xp || 0;
    weapon.proficiencyXPToNext = weapon._calcXPToNext(weapon.proficiencyLevel);
    if (weapon._syncDisplayName) weapon._syncDisplayName();
    game.player.weapons.push(weapon);
    const shopWep = game.shopSystem.weapons.find(w => w.id === baseData.id);
    if (shopWep) shopWep.owned = true;
  }
  if (game.player.weapons.length === 0) {
    game.player.weapons = [new Weapon(WEAPON_DATA.pistol)];
  }
  game.player.equipped = Array.isArray(saveData.equipped) ? [...saveData.equipped] : [0, null];
  game.player.equipped = game.player.equipped.map(index => (
    index !== null && game.player.weapons[index] ? index : null
  ));
  if (game.player.equipped[0] === null) game.player.equipped[0] = 0;
  game.player.activeSlot = saveData.activeSlot === 1 && game.player.equipped[1] !== null ? 1 : 0;
}

function restartGame() {
  // 清理旧状态
  game.projectiles = [];
  game.floatingTexts = [];
  game.pickups = [];
  game.gameOver = false;
  game.score = 0;
  game.bossKillsThisRun = 0;
  game.paused = false;
  game.screenShake = { x: 0, y: 0, intensity: 0 };

  // 重新初始化各系统
  let startX = game.map.width / 2;
  let startY = game.map.height / 2;
  game.player = new Player(startX, startY);

  // 如果中心被建筑物覆盖，向外螺旋搜索可行走位置
  if (!game.map.isWalkable(startX, startY, game.player.radius)) {
    let found = false;
    for (let radius = 50; radius < 600 && !found; radius += 30) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const tx = startX + Math.cos(angle) * radius;
        const ty = startY + Math.sin(angle) * radius;
        if (game.map.isWalkable(tx, ty, game.player.radius)) {
          game.player.x = tx;
          game.player.y = ty;
          found = true;
          break;
        }
      }
    }
  }

  game.enemyManager = new EnemyManager();
  game.enemies = game.enemyManager.enemies;
  game.particles = new ParticleSystem();
  game.decalSystem = new DecalSystem();
  game.metaProgression = game.metaProgression || new MetaProgression();
  game.shopSystem = new ShopSystem();
  game.heroSkillSystem = new HeroSkillSystem();
  game.upgradeSystem = new UpgradeSystem();
  game.waveManager = new WaveManager();
  game.comboSystem = new ComboSystem();

  // 重新生成载具
  game.vehicleManager = new VehicleManager();
  game.vehicleManager.spawn(2);
  game.turretManager = new TurretManager();
  game.petManager = new PetManager();

  // 应用圣遗物
  if (game.relicSystem) game.relicSystem.applyTo(game.player);

  // 加载存档
  if (game.saveSystem) {
    const saveData = game.saveSystem.load();
    if (saveData) {
      game.player.money = saveData.money || 0;
      if (saveData.upgrades) {
        for (const key in saveData.upgrades) {
          if (game.player.upgrades[key] !== undefined) {
            game.player.upgrades[key] = saveData.upgrades[key];
          }
        }
      }
      if (saveData.ownedWeapons) {
        for (const wid of saveData.ownedWeapons) {
          if (wid !== 'pistol') {
            const data = WEAPON_DATA[wid];
            if (data) {
              game.player.weapons.push(new Weapon(data));
            }
            const shopWep = game.shopSystem.weapons.find(w => w.id === wid);
            if (shopWep) shopWep.owned = true;
          }
        }
      }
      // 恢复武器熟练度
      if (saveData.weaponProficiency) {
        for (const prof of saveData.weaponProficiency) {
          const weapon = game.player.weapons.find(w => w.data.id === prof.id);
          if (weapon) {
            weapon.proficiencyLevel = prof.level;
            weapon.proficiencyXP = prof.xp;
            weapon.proficiencyXPToNext = weapon._calcXPToNext(prof.level);
            weapon.fusionLevel = prof.fusionLevel || 0;
            weapon.affixes = Array.isArray(prof.affixes) ? [...prof.affixes] : [];
            weapon.rarity = prof.rarity || weapon.data.rarity || 'common';
            if (weapon._syncDisplayName) weapon._syncDisplayName();
          }
        }
      }
      restorePlayerWeaponsFromSave(saveData);
      if (saveData.unlockedSkills && game.heroSkillSystem) {
        game.heroSkillSystem.restoreUnlocked(saveData.unlockedSkills);
      }
      if (saveData.turrets && game.turretManager) {
        game.turretManager.restore(saveData.turrets);
      }
      if (saveData.pets && game.petManager) {
        game.petManager.restore(saveData.pets);
      }
      if (saveData.wave && saveData.wave > 1) {
        game.waveManager.wave = saveData.wave - 1;
      }
    }
  }

  game.waveManager.startNextWave();
}

function triggerScreenShake(intensity) {
  game.screenShake.intensity = Math.max(game.screenShake.intensity, intensity);
}

function rotateMapTheme() {
  const themes = ['grass', 'desert', 'snow', 'ruins'];
  const currentIndex = themes.indexOf(game.map.theme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];

  game.map.generate(nextTheme);

  // 清理地面残留（血迹弹壳），避免旧地图痕迹
  if (game.decalSystem) game.decalSystem.clear();

  // 确保玩家/正在驾驶的载具不在墙壁里
  const activeVehicle = game.player.inVehicle;
  const playerCollisionRadius = activeVehicle ? activeVehicle.radius : game.player.radius;
  if (!game.map.isWalkable(game.player.x, game.player.y, playerCollisionRadius)) {
    let found = false;
    for (let r = 50; r < 600 && !found; r += 30) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const tx = game.player.x + Math.cos(a) * r;
        const ty = game.player.y + Math.sin(a) * r;
        if (game.map.isWalkable(tx, ty, playerCollisionRadius)) {
          game.player.x = tx;
          game.player.y = ty;
          if (activeVehicle) {
            activeVehicle.x = tx;
            activeVehicle.y = ty;
          }
          found = true;
          break;
        }
      }
    }
  } else if (activeVehicle) {
    activeVehicle.x = game.player.x;
    activeVehicle.y = game.player.y;
  }
  clearMapAreaForPlayer(game.player.x, game.player.y, playerCollisionRadius + 90);

  // 传送所有存活的敌人到可行走位置（避免卡在新墙里）
  if (game.enemyManager) {
    for (const e of game.enemyManager.enemies) {
      if (e.alive && !game.map.isWalkable(e.x, e.y, e.radius)) {
        let found = false;
        for (let r = 20; r < 400 && !found; r += 20) {
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const tx = e.x + Math.cos(a) * r;
            const ty = e.y + Math.sin(a) * r;
            if (game.map.isWalkable(tx, ty, e.radius)) {
              e.x = tx;
              e.y = ty;
              found = true;
              break;
            }
          }
        }
      }
    }
  }

  // 传送炮台到可部署位置，避免切图后卡进新墙体
  if (game.turretManager) {
    for (const turret of game.turretManager.turrets) {
      if (!turret.alive || game.map.isWalkable(turret.x, turret.y, turret.radius)) continue;
      let found = false;
      for (let r = 30; r < 360 && !found; r += 30) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const tx = game.player.x + Math.cos(a) * r;
          const ty = game.player.y + Math.sin(a) * r;
          if (game.map.isWalkable(tx, ty, turret.radius)) {
            turret.x = tx;
            turret.y = ty;
            found = true;
            break;
          }
        }
      }
    }
  }

  // 重新生成载具
  if (game.vehicleManager) {
    game.vehicleManager.spawn(2);
  }

  // 浮动文字提示
  game.floatingTexts.push(new FloatingText(
    game.player.x, game.player.y - 60,
    `地形切换: ${nextTheme === 'grass' ? '草地' : nextTheme === 'desert' ? '沙漠' : nextTheme === 'snow' ? '雪地' : '废墟'}`,
    '#ffd700', 28, 2500
  ));
}

function clearMapAreaForPlayer(x, y, radius) {
  if (!game.map || !Array.isArray(game.map.walls)) return;
  const b = game.map.borderWidth || 0;
  game.map.walls = game.map.walls.filter(wall => {
    const isBorder = wall.x <= 0 || wall.y <= 0 ||
      wall.x + wall.w >= game.map.width || wall.y + wall.h >= game.map.height;
    if (isBorder) return true;
    return !circleRectCollision(x, y, radius, wall.x, wall.y, wall.w, wall.h);
  });
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // 限制最大dt防止卡顿跳帧
  lastTimestamp = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (game.gameOver) return;

  // 1. 输入更新
  INPUT.update(game.camera);
  handleMobileActions();
  if (game.heroSkillSystem) {
    game.heroSkillSystem.update(dt);
  }

  // 2. 圣遗物选择中，只更新视觉效果
  if (game.relicSystem && game.relicSystem.showChoice) {
    game.particles.update(dt);
    if (game.decalSystem) game.decalSystem.update(dt);
    clearMobilePulseKeys();
    return;
  }

  // 3. 如果商店、升级或装备菜单打开，只更新UI和输入
  const menuOpen = game.shopSystem.open || game.upgradeSystem.open || game.equipmentUI.open;

  if (menuOpen) {
    // 只更新浮动文字、粒子和地面残留（视觉效果）
    game.floatingTexts.forEach(t => t.update(dt));
    game.floatingTexts = game.floatingTexts.filter(t => t.life > 0);
    game.particles.update(dt);
    if (game.decalSystem) game.decalSystem.update(dt);
    clearMobilePulseKeys();
    return;
  }

  // 3. 英雄技能优先处理 Q / Shift，避免和换枪、基础冲刺冲突
  if (game.heroSkillSystem) {
    game.heroSkillSystem.handlePrimaryInputs(game.player);
  }

  // 4. 玩家更新
  game.player.update(dt);

  // 玩家回血（再生细胞升级）
  if (game.player.upgrades.regen && game.player.upgrades.regen > 0) {
    game.player.hp = Math.min(game.player.hp + game.player.upgrades.regen * dt, game.player.maxHp);
  }

  // 5. 敌人管理器更新
  game.enemyManager.update(dt);

  // 5.5 炮台更新
  if (game.turretManager) {
    game.turretManager.update(dt);
  }

  // 5.6 宠物更新
  if (game.petManager) {
    game.petManager.update(dt);
  }

  // 6. 投射物更新
  game.projectiles = game.projectiles.filter(p => p.update(dt));

  // 7. 粒子系统更新
  game.particles.update(dt);

  // 7.5 地面残留更新
  if (game.decalSystem) game.decalSystem.update(dt);

  // 8. 浮动文字更新
  game.floatingTexts.forEach(t => t.update(dt));
  game.floatingTexts = game.floatingTexts.filter(t => t.life > 0);

  // 9. 波次管理器更新
  game.waveManager.update(dt);

  // 10. 连击系统更新
  game.comboSystem.update(dt);

  // 11. 载具更新与交互检测
  if (game.vehicleManager) {
    game.vehicleManager.update(dt);
    game.vehicleManager.checkPlayerInteraction(game.player);
  }

  // E键技能延后处理，确保载具上/下车优先消费E
  if (game.heroSkillSystem) {
    game.heroSkillSystem.handleDeferredInputs(game.player);
  }

  // 12. 道具更新与拾取检测
  if (game.pickups) {
    game.pickups = game.pickups.filter(p => p.update(dt));
    for (const p of game.pickups) {
      const d = dist(game.player.x, game.player.y, p.x, p.y);
      if (d < game.player.radius + p.radius + 15) {
        // 拾取道具
        game.player.applyPickup(p);
        p.life = 0; // 标记销毁
      }
    }
  }

  // 10. 屏幕震动衰减
  if (game.screenShake.intensity > 0) {
    game.screenShake.intensity *= 0.9;
    if (game.screenShake.intensity < 0.5) {
      game.screenShake.intensity = 0;
    }
    game.screenShake.x = (Math.random() - 0.5) * game.screenShake.intensity;
    game.screenShake.y = (Math.random() - 0.5) * game.screenShake.intensity;
  } else {
    game.screenShake.x = 0;
    game.screenShake.y = 0;
  }

  // 11. 相机跟随
  game.camera.follow(game.player);

  // 检查游戏结束
  if (game.player.hp <= 0) {
    handlePlayerDeath();
  }
  clearMobilePulseKeys();
}

function handlePlayerDeath() {
  if (game.player.extraLives && game.player.extraLives > 0) {
    // 消耗额外生命
    game.player.extraLives--;
    game.player.hp = game.player.maxHp * 0.5;
    game.floatingTexts.push(new FloatingText(
      game.player.x, game.player.y - 40,
      '额外生命激活!', '#f0f', 28, 2000
    ));
    // 短暂无敌
    game.player.invincibleTimer = 2;
  } else {
    // 尝试弹出圣遗物选择
    if (game.relicSystem && game.relicSystem.onDeath(game.player.upgrades)) {
      // 圣遗物选择界面弹出，暂不 game over
      // 保存当前状态到存档
      if (game.saveSystem) game.saveSystem.save(game);
      return;
    }
    if (game.metaProgression) {
      const unlocked = game.metaProgression.recordRunDeath({
        wave: game.waveManager ? game.waveManager.wave : 0,
        bossKills: game.bossKillsThisRun || 0,
      });
      if (unlocked.length > 0) {
        game.floatingTexts.push(new FloatingText(
          game.player.x, game.player.y - 60,
          `局外解锁 +${unlocked.length}`, '#ffd700', 22
        ));
      }
    }
    // 没有可保留的升级，直接 game over
    game.gameOver = true;
    game.score = game.waveManager.wave * 1000 + game.player.money;
    // 清空存档（彻底死亡）
    if (game.saveSystem) game.saveSystem.clear();
  }
}

function render() {
  // 1. 清屏
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 保存ctx，应用camera变换 + 屏幕震动
  ctx.save();
  ctx.translate(
    -game.camera.x + game.screenShake.x,
    -game.camera.y + game.screenShake.y
  );

  // 3. 地图绘制
  game.map.draw(ctx, game.camera);

  // 3.5 地面残留（血迹、弹壳）
  if (game.decalSystem) game.decalSystem.draw(ctx);

  // 4. 粒子（地面层）
  game.particles.draw(ctx, 'ground');

  // 5. 投射物
  game.projectiles.forEach(p => p.draw(ctx));

  // 6. 敌人
  game.enemyManager.draw(ctx);

  // 6.5 拾取道具
  if (game.pickups) {
    for (const p of game.pickups) {
      p.draw(ctx);
    }
  }

  // 6.8 载具（玩家在载具中时，载具已在别处绘制，但空载具需要绘制）
  if (game.vehicleManager) {
    game.vehicleManager.draw(ctx);
  }

  // 6.9 炮台
  if (game.turretManager) {
    game.turretManager.draw(ctx);
  }

  // 6.95 宠物
  if (game.petManager) {
    game.petManager.draw(ctx);
  }

  // 7. 玩家
  game.player.draw(ctx);

  // 8. 粒子（前景层）
  game.particles.draw(ctx, 'foreground');

  // 9. 浮动文字
  game.floatingTexts.forEach(t => t.draw(ctx));

  // 10. 恢复ctx
  ctx.restore();

  // 11. HUD绘制
  drawHUD(ctx, game.player, game.waveManager);

  // 12. 商店菜单
  if (game.shopSystem.open) {
    game.shopSystem.draw(ctx, game.player);
  }

  // 12.5 装备界面
  if (game.equipmentUI.open) {
    game.equipmentUI.draw(ctx, game.player);
  }

  // 13. 升级菜单
  if (game.upgradeSystem.open) {
    game.upgradeSystem.draw(ctx);
  }

  // 14. 圣遗物选择界面
  if (game.relicSystem && game.relicSystem.showChoice) {
    game.relicSystem.draw(ctx);
  }

  // 15. 游戏结束画面
  if (game.gameOver) {
    drawGameOver(ctx);
  }

  if (INPUT && INPUT.drawMobileControls && !game.shopSystem.open && !game.upgradeSystem.open && !game.equipmentUI.open && !(game.relicSystem && game.relicSystem.showChoice) && !game.gameOver) {
    INPUT.drawMobileControls(ctx);
  }
}

function handleMobileActions() {
  if (!INPUT || !INPUT.consumeAction) return;
  if (!INPUT.mobilePulseKeys) INPUT.mobilePulseKeys = new Set();
  if (INPUT.consumeAction('shop')) {
    if (!game.upgradeSystem.open && !game.equipmentUI.open && !game.gameOver) {
      game.shopSystem.toggle();
    }
  }
  if (INPUT.consumeAction('dash')) {
    INPUT.keys.ShiftLeft = true;
    INPUT.mobilePulseKeys.add('ShiftLeft');
  }
  if (game.heroSkillSystem && typeof HERO_SKILL_DATA !== 'undefined') {
    for (const id of Object.keys(HERO_SKILL_DATA)) {
      if (INPUT.consumeAction(`skill:${id}`)) {
        game.heroSkillSystem.useSkill(id, game.player);
      }
    }
  }
  if (INPUT.consumeAction('skillQ')) {
    const usedSmartSkill = game.heroSkillSystem && game.heroSkillSystem.useBestTouchSkill(game.player);
    if (!usedSmartSkill) {
      INPUT.keys.KeyQ = true;
      INPUT.mobilePulseKeys.add('KeyQ');
    }
  }
  if (INPUT.consumeAction('interact')) {
    INPUT.keys.KeyE = true;
    INPUT.mobilePulseKeys.add('KeyE');
  }
  if (INPUT.consumeAction('nextWeapon')) {
    if (game.player && !game.shopSystem.open && !game.equipmentUI.open && !game.upgradeSystem.open) {
      game.player.switchToNextWeapon();
    }
  }
}

function clearMobilePulseKeys() {
  if (!INPUT || !INPUT.mobilePulseKeys) return;
  for (const key of INPUT.mobilePulseKeys) {
    INPUT.keys[key] = false;
  }
  INPUT.mobilePulseKeys.clear();
}

function getGameOverActionRects() {
  const W = canvas.width;
  const H = canvas.height;
  const mobile = INPUT && INPUT.isMobileLayout && INPUT.isMobileLayout();
  const btnW = mobile ? Math.min(168, W * 0.42) : 190;
  const btnH = mobile ? 46 : 40;
  const gap = mobile ? 12 : 16;
  const y = Math.min(H - btnH - 26, H / 2 + (mobile ? 128 : 170));
  const totalW = btnW * 2 + gap;
  const startX = (W - totalW) / 2;
  return [
    { id: 'restart', label: mobile ? '继续轮回' : 'R 继续', x: startX, y, w: btnW, h: btnH },
    { id: 'wipe', label: mobile ? '清档重开' : '清档', x: startX + btnW + gap, y, w: btnW, h: btnH },
  ];
}

function handleGameOverPointer(mx, my) {
  if (!game.gameOver) return false;
  const hit = getGameOverActionRects().find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
  if (!hit) return false;
  if (hit.id === 'wipe') {
    if (game.relicSystem) game.relicSystem.reset();
    if (game.saveSystem) game.saveSystem.clear();
  }
  restartGame();
  return true;
}

// ============================================================
// HUD绘制
// ============================================================
function isMobileHUDLayout() {
  return !!(INPUT && INPUT.isMobileLayout && INPUT.isMobileLayout());
}

function getMobileHUDRects(player) {
  const W = canvas.width;
  const H = canvas.height;
  const mobile = isMobileHUDLayout();
  if (!mobile) return { mobile: false };

  const buttons = INPUT && INPUT.getMobileButtons ? INPUT.getMobileButtons() : [];
  const buttonLeft = buttons.length ? Math.min(...buttons.map(btn => btn.x)) : W - 120;
  const shopButton = buttons.find(btn => btn.id === 'shop');
  const joystickRest = INPUT && INPUT.getJoystickRestPosition ? INPUT.getJoystickRestPosition() : { x: 78, y: H - 86 };
  const joystickRadius = INPUT && INPUT.getJoystickRadius ? INPUT.getJoystickRadius() : ((INPUT && INPUT.joystick && INPUT.joystick.radius) || 58);
  const joystickRight = joystickRest.x + joystickRadius;
  const weaponX = Math.max(144, joystickRight + 12);
  const weaponW = Math.max(96, Math.min(126, buttonLeft - weaponX - 10));

  return {
    mobile: true,
    hp: { x: 14, y: 42, w: Math.min(154, W - 28), h: 16 },
    armor: { x: 14, y: 62, w: Math.min(154, W - 28), h: 10 },
    vehicle: { x: 14, y: 76, w: Math.min(154, W - 28), h: 13 },
    weapon: { x: weaponX, y: H - 92, w: weaponW, h: 72 },
    money: shopButton ? { x: shopButton.x - 8, y: shopButton.y + shopButton.h * 0.58 } : { x: W - 12, y: 28 },
    wave: { x: W / 2, y: 26 },
    combo: { x: 14, y: 96 },
  };
}

function drawHUD(ctx, player, waveManager) {
  const W = canvas.width;
  const H = canvas.height;
  const mobileHUD = getMobileHUDRects(player);

  // --- 左下角: HP条 + 护甲条 ---
  const barX = mobileHUD.mobile ? mobileHUD.hp.x : 20;
  const barY = mobileHUD.mobile ? mobileHUD.hp.y : H - 60;
  const barW = mobileHUD.mobile ? mobileHUD.hp.w : 200;
  const barH = mobileHUD.mobile ? mobileHUD.hp.h : 16;

  // HP背景
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barW, barH);
  // HP条
  const hpRatio = player.hp / player.maxHp;
  const hpColor = hpRatio > 0.5 ? '#0a0' : (hpRatio > 0.25 ? '#aa0' : '#a00');
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  // HP文字
  ctx.fillStyle = '#fff';
  ctx.font = mobileHUD.mobile ? 'bold 10px monospace' : 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`HP ${Math.ceil(player.hp)}/${player.maxHp}`, barX + barW / 2, barY + 12);

  // 护甲条（在HP条下方）
  if (player.armor > 0) {
    const armorY = barY + barH + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, armorY, barW, 10);
    const armorRatio = player.armor / (player.maxArmor || 100);
    ctx.fillStyle = '#48f';
    ctx.fillRect(barX, armorY, barW * armorRatio, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.fillText(`护甲 ${Math.ceil(player.armor)}`, barX + barW / 2, armorY + 9);
  }

  // --- 右下角: 武器信息 ---
  const wepX = mobileHUD.mobile ? mobileHUD.weapon.x : W - 250;
  const wepY = mobileHUD.mobile ? mobileHUD.weapon.y : H - 95;
  const currentWep = player.getCurrentWeapon ? player.getCurrentWeapon() : null;

  if (currentWep) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(wepX, wepY, mobileHUD.mobile ? mobileHUD.weapon.w : 230, mobileHUD.mobile ? mobileHUD.weapon.h : 80);

    // 武器名称 + 熟练度
    ctx.fillStyle = '#fff';
    ctx.font = mobileHUD.mobile ? 'bold 11px monospace' : 'bold 13px monospace';
    ctx.textAlign = 'left';
    const weaponName = mobileHUD.mobile ? (currentWep.name || '武器').slice(0, 9) : (currentWep.name || '武器');
    ctx.fillText(weaponName, wepX + 8, wepY + 16);
    const lvColor = currentWep.rarity === 'legendary' ? '#ff66ff' : (currentWep.rarity === 'hero' ? '#ffd700' : '#aaa');
    ctx.fillStyle = lvColor;
    ctx.font = mobileHUD.mobile ? 'bold 9px monospace' : 'bold 11px monospace';
    ctx.fillText(`Lv.${currentWep.proficiencyLevel}`, wepX + (mobileHUD.mobile ? 8 : 125), wepY + (mobileHUD.mobile ? 31 : 16));

    // 弹药
    const ammoLow = currentWep.ammo <= currentWep.magSize * 0.2;
    ctx.fillStyle = ammoLow ? '#f44' : '#ccc';
    ctx.font = mobileHUD.mobile ? 'bold 12px monospace' : 'bold 15px monospace';
    const ammoStr = currentWep.ammo === Infinity ? '∞' : currentWep.ammo;
    const magStr = currentWep.maxAmmo === Infinity ? '∞' : currentWep.magSize;
    ctx.fillText(`${ammoStr}/${magStr}`, wepX + 8, wepY + (mobileHUD.mobile ? 45 : 36));

    // 换弹提示
    if (currentWep.reloading) {
      ctx.fillStyle = '#ff0';
      ctx.font = '10px monospace';
      ctx.fillText('换弹...', wepX + (mobileHUD.mobile ? 52 : 95), wepY + (mobileHUD.mobile ? 45 : 36));
      const reloadRatio = currentWep.reloadProgress || 0;
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(wepX + (mobileHUD.mobile ? 52 : 95), wepY + (mobileHUD.mobile ? 47 : 38), (mobileHUD.mobile ? 48 : 60) * reloadRatio, 3);
    }

    // 熟练度经验条
    const xpRatio = currentWep.proficiencyXP / currentWep.proficiencyXPToNext;
    const xpW = mobileHUD.mobile ? mobileHUD.weapon.w - 16 : 120;
    const xpY = mobileHUD.mobile ? wepY + 53 : wepY + 46;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(wepX + 8, xpY, xpW, 6);
    ctx.fillStyle = currentWep.fusionLevel > 0 ? '#fc6' : '#4af';
    ctx.fillRect(wepX + 8, xpY, xpW * xpRatio, 6);
    ctx.fillStyle = '#888';
    ctx.font = mobileHUD.mobile ? '8px monospace' : '9px monospace';
    ctx.textAlign = 'right';
    const xpText = `${currentWep.proficiencyXP}/${currentWep.proficiencyXPToNext}`;
    ctx.fillText(xpText, wepX + 8 + xpW, xpY + 7);

    // 熟练度加成说明
    if (!mobileHUD.mobile) {
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      const bonus = currentWep.getProficiencyBonus();
      ctx.fillText(`伤害+${Math.round((bonus.damageMult-1)*100)}% 射速+${Math.round((bonus.fireRateMult-1)*100)}% 换弹-${Math.round((1-bonus.reloadMult)*100)}%`, wepX + 8, wepY + 66);
    }
  }

  if (!mobileHUD.mobile && game.heroSkillSystem) {
    game.heroSkillSystem.drawHUD(ctx);
  }

  // --- 主/副武器槽提示 ---
  if (!mobileHUD.mobile) {
    const keyY = H - 10;
    const keySize = 22;
    const keyGap = 6;
    let keyX = W - 110;
    for (let slot = 0; slot < 2; slot++) {
      const isActive = player.activeSlot === slot;
      const wepIdx = player.equipped[slot];
      const hasWep = wepIdx !== null;
      const bg = isActive ? 'rgba(68,136,255,0.4)' : (hasWep ? 'rgba(80,80,80,0.3)' : 'rgba(40,40,40,0.2)');
      ctx.fillStyle = bg;
      ctx.fillRect(keyX, keyY - keySize, keySize, keySize);
      ctx.strokeStyle = isActive ? '#4488ff' : '#555';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(keyX, keyY - keySize, keySize, keySize);
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(slot + 1), keyX + keySize / 2, keyY - 6);
      keyX += keySize + keyGap;
    }
    // [Tab] 装备提示
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[Tab]', W - 20, keyY - 2);
  }

  // --- 右上角: 金钱 ---
  ctx.fillStyle = '#ff0';
  ctx.font = mobileHUD.mobile ? 'bold 16px monospace' : 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`$${player.money}`, mobileHUD.mobile ? mobileHUD.money.x : W - 20, mobileHUD.mobile ? mobileHUD.money.y : 30);
  if (!mobileHUD.mobile) {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('[B]商店', W - 20, 48);
  }

  // --- 上方中央: 波次信息 ---
  if (waveManager.wave > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = mobileHUD.mobile ? 'bold 13px monospace' : 'bold 16px monospace';
    ctx.textAlign = 'center';
    const waveText = waveManager.active
      ? `Wave ${waveManager.wave}  剩余: ${game.enemyManager ? game.enemyManager.getRemainingCount() : 0}`
      : `Wave ${waveManager.wave}  完成`;
    ctx.fillText(waveText, mobileHUD.mobile ? mobileHUD.wave.x : W / 2, mobileHUD.mobile ? mobileHUD.wave.y : 28);
  }

  // --- 上方偏右: 连击 ---
  if (!mobileHUD.mobile) {
    game.comboSystem.draw(ctx);
  } else if (game.comboSystem.combo > 0) {
    ctx.fillStyle = game.comboSystem.getComboColor();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${game.comboSystem.combo}x`, mobileHUD.combo.x, mobileHUD.combo.y);
  }

  // --- 载具状态显示 ---
  if (player.inVehicle) {
    const vHp = player.inVehicle.hp;
    const vMax = player.inVehicle.maxHp;
    const vY = mobileHUD.mobile ? mobileHUD.vehicle.y : barY - 28;
    const vH = mobileHUD.mobile ? mobileHUD.vehicle.h : 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, vY, barW, vH);
    ctx.fillStyle = vHp > vMax * 0.3 ? '#4a6' : '#a44';
    ctx.fillRect(barX, vY, barW * (vHp / vMax), vH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`载具 HP ${Math.ceil(vHp)}/${vMax}`, barX + barW / 2, vY + (mobileHUD.mobile ? 10 : 11));
    ctx.textAlign = 'left';
  }

  // --- 额外生命显示 ---
  if (player.extraLives && player.extraLives > 0) {
    ctx.fillStyle = '#f0f';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`♥x${player.extraLives}`, barX + barW + 10, barY + 12);
  }

  // --- Buff 状态显示（HP条上方） ---
  const buffIcons = [];
  if (player.buffs.speed.active)  buffIcons.push({ symbol: 'S', color: '#0af', timer: player.buffs.speed.timer });
  if (player.buffs.damage.active) buffIcons.push({ symbol: 'D', color: '#f44', timer: player.buffs.damage.timer });
  if (player.buffs.shield.active) buffIcons.push({ symbol: 'P', color: '#a0f', timer: player.buffs.shield.timer });
  if (buffIcons.length > 0) {
    const iconSize = 18;
    const iconGap = 4;
    let bx = barX;
    const by = barY - iconSize - 4;
    for (const bi of buffIcons) {
      ctx.fillStyle = bi.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(bx, by, iconSize, iconSize);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, iconSize, iconSize);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bi.symbol, bx + iconSize / 2, by + iconSize / 2);
      // 剩余时间
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText(`${Math.ceil(bi.timer)}s`, bx + iconSize / 2, by + iconSize + 8);
      bx += iconSize + iconGap;
    }
  }

  // --- 分数 ---
  if (!mobileHUD.mobile) {
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`分数: ${game.score}`, W - 20, 65);
  }
}

function drawGameOver(ctx) {
  const W = canvas.width;
  const H = canvas.height;
  const mobile = INPUT && INPUT.isMobileLayout && INPUT.isMobileLayout();

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  // GAME OVER
  ctx.fillStyle = '#f00';
  ctx.font = mobile ? 'bold 42px monospace' : 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H / 2 - (mobile ? 78 : 60));

  // 最终波次
  ctx.fillStyle = '#fff';
  ctx.font = mobile ? '18px monospace' : '22px monospace';
  ctx.fillText(`最终波次: ${game.waveManager.wave}`, W / 2, H / 2 - (mobile ? 18 : 0));

  // 分数
  ctx.fillStyle = '#ff0';
  ctx.font = mobile ? 'bold 20px monospace' : 'bold 24px monospace';
  ctx.fillText(`最终分数: ${game.score}`, W / 2, H / 2 + (mobile ? 14 : 35));

  // 最高连击
  ctx.fillStyle = '#aaa';
  ctx.font = mobile ? '14px monospace' : '16px monospace';
  ctx.fillText(`最高连击: ${game.comboSystem.maxComboDisplay}`, W / 2, H / 2 + (mobile ? 42 : 65));

  // 圣遗物信息
  const relicCount = game.relicSystem ? Object.keys(game.relicSystem.relics).length : 0;
  if (relicCount > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = mobile ? '13px monospace' : '14px monospace';
    ctx.fillText(`已保留 ${relicCount} 项圣遗物`, W / 2, H / 2 + (mobile ? 64 : 85));
  }

  const buttons = getGameOverActionRects();
  for (const btn of buttons) {
    ctx.fillStyle = btn.id === 'restart' ? 'rgba(70,130,90,0.86)' : 'rgba(105,55,55,0.78)';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = btn.id === 'restart' ? '#8dffa8' : '#ff9a9a';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#fff';
    ctx.font = mobile ? 'bold 15px monospace' : 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
  ctx.textBaseline = 'alphabetic';

  if (!mobile) {
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('键盘: R 继续 | Ctrl/⌘+Shift+C 清档', W / 2, buttons[0].y + buttons[0].h + 28);
  }
}

// ============================================================
// 初始化入口
// ============================================================
window.addEventListener('load', initGame);
window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
  window.visualViewport.addEventListener('scroll', resizeCanvas);
}
