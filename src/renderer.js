import {
  GAME_WIDTH, GAME_HEIGHT, PLAY_HEIGHT, HUD_HEIGHT,
  PANEL_WIDTH, CANVAS_WIDTH,
  TOTAL_ROWS, ROW_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT,
  BULLET_WIDTH, BULLET_HEIGHT,
  ITEM_WIDTH, ITEM_HEIGHT,
  AMMO_META, AMMO_ORDER,
  WEDDING_ITEMS,
} from './constants';
import { LEVELS } from './levels';
import { drawPixelSprite, SPRITE_W, SPRITE_H } from './pixelArt';

// ── helpers ─────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ── background ──────────────────────────────────────────────────────────────

const BG_TOP = '#1a3a70';
const BG_MID = '#22478a';
const BG_BOT = '#1a3a70';

function drawBackground(ctx, players) {
  const grad = ctx.createLinearGradient(0, 0, 0, PLAY_HEIGHT);
  grad.addColorStop(0,   BG_TOP);
  grad.addColorStop(0.5, BG_MID);
  grad.addColorStop(1,   BG_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137 + 11) % GAME_WIDTH;
    const sy = (i * 97  + 23) % PLAY_HEIGHT;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  ctx.setLineDash([4, 12]);
  ctx.lineWidth   = 1;
  for (let r = 0; r <= TOTAL_ROWS; r++) {
    const y = r * ROW_HEIGHT;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); ctx.stroke();
  }
  ctx.setLineDash([]);

  const gRow = players.groom.row;
  const bRow = players.bride.row;
  if (bRow - gRow > 1) {
    const y1 = (gRow + 1) * ROW_HEIGHT;
    const y2 = bRow * ROW_HEIGHT;
    ctx.fillStyle = 'rgba(180,220,255,0.05)';
    ctx.fillRect(0, y1, GAME_WIDTH, y2 - y1);
  }
}

// ── player sprites ───────────────────────────────────────────────────────────

function drawPlayer(ctx, player, img, isGroom) {
  if (!player.alive) return;
  const { x, y } = player;
  const w = PLAYER_WIDTH, h = PLAYER_HEIGHT;

  ctx.save();
  if (img) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    // Fallback coloured box + emoji
    ctx.fillStyle = isGroom ? '#4169e1' : '#ff69b4';
    ctx.fillRect(x, y, w, h);
    ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(isGroom ? '🤵' : '👰', x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // Ammo label: below sprite for groom (at top), above sprite for bride (at bottom)
  const ammoMeta = AMMO_META[player.selectedAmmo];
  ctx.font      = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = ammoMeta.color;
  ctx.fillText(ammoMeta.label, x + w / 2, isGroom ? y + h + 14 : y - 4);
}

// ── bullets ──────────────────────────────────────────────────────────────────

function drawBullet(ctx, b) {
  const meta  = AMMO_META[b.ammoType];
  const color = meta?.color ?? '#fff';
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.ellipse(
    b.x + BULLET_WIDTH / 2, b.y + BULLET_HEIGHT / 2,
    BULLET_WIDTH / 2, BULLET_HEIGHT / 2,
    0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

// ── item cards ───────────────────────────────────────────────────────────────

function drawItem(ctx, item) {
  const { x, y, templateId, price, maxPrice, essential, flashTimer,
          incomeType, incomeAmount } = item;

  const flashing = flashTimer > 0 && Math.floor(flashTimer / 2) % 2 === 0;
  ctx.globalAlpha = flashing ? 0.35 : 1;

  const bg     = essential ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.07)';
  const border = essential ? '#ffd700'               : 'rgba(255,255,255,0.2)';
  roundRect(ctx, x, y, ITEM_WIDTH, ITEM_HEIGHT, 8);
  ctx.fillStyle   = bg;     ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = essential ? 2 : 1; ctx.stroke();

  const sx = Math.floor(x + (ITEM_WIDTH  - SPRITE_W) / 2);
  const sy = Math.floor(y + (ITEM_HEIGHT - SPRITE_H) / 2 - 6);
  drawPixelSprite(ctx, templateId, sx, sy);

  const barX = x + 4, barY = y + ITEM_HEIGHT - 13;
  const barW = ITEM_WIDTH - 8, barH = 7;

  if (maxPrice > 0) {
    const pct = price / maxPrice;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.2 ? '#ff9800' : '#f44336';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`$${Math.ceil(price)}`, x + ITEM_WIDTH / 2, barY - 1);
  } else if (incomeType === 'income') {
    // Show donation amount prominently
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#4caf50'; ctx.textAlign = 'center';
    ctx.fillText(`+$${incomeAmount}`, x + ITEM_WIDTH / 2, y + ITEM_HEIGHT - 4);
    // Ammo hint badge (💌 for guests, 💕 for family)
    const ammoHint = (templateId === 'parent_bride' || templateId === 'parent_groom') ? '💕' : '💌';
    ctx.font = '10px Arial';
    ctx.fillText(ammoHint, x + ITEM_WIDTH - 10, y + 10);
  } else if (incomeType === 'mine') {
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f44336'; ctx.textAlign = 'center';
    ctx.fillText('DANGER', x + ITEM_WIDTH / 2, y + ITEM_HEIGHT - 4);
  } else if (incomeType === 'discount') {
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ff9800'; ctx.textAlign = 'center';
    ctx.fillText('DISCOUNT', x + ITEM_WIDTH / 2, y + ITEM_HEIGHT - 4);
  }

  if (essential) {
    ctx.font = '11px Arial'; ctx.textAlign = 'left';
    ctx.fillText('⭐', x + 2, y + 12);
  }
  ctx.globalAlpha = 1;
}

// ── side panel ───────────────────────────────────────────────────────────────

function drawPanel(ctx, state) {
  const { acquiredItems, currentLevel } = state;
  const level  = LEVELS[currentLevel] ?? LEVELS[0];
  const panelX = GAME_WIDTH;

  ctx.fillStyle = 'rgba(8, 16, 42, 0.98)';
  ctx.fillRect(panelX, 0, PANEL_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(panelX, 0); ctx.lineTo(panelX, GAME_HEIGHT); ctx.stroke();

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = 'bold 11px monospace';
  ctx.fillStyle    = '#ffd700';
  ctx.fillText(`LEVEL ${level.id}`, panelX + PANEL_WIDTH / 2, 13);

  ctx.font      = '9px Arial';
  ctx.fillStyle = '#aaa';
  const name = level.name.length > 14 ? level.name.slice(0, 13) + '…' : level.name;
  ctx.fillText(name, panelX + PANEL_WIDTH / 2, 26);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(panelX + 8, 34); ctx.lineTo(panelX + PANEL_WIDTH - 8, 34);
  ctx.stroke();

  const requiredItems = level.required
    .map(id => WEDDING_ITEMS.find(w => w.id === id))
    .filter(Boolean);

  requiredItems.forEach((item, i) => {
    const cardX = panelX + 7, cardY = 40 + i * 46;
    const cardW = PANEL_WIDTH - 14, cardH = 40;
    const done  = acquiredItems.includes(item.id);

    roundRect(ctx, cardX, cardY, cardW, cardH, 6);
    ctx.fillStyle   = done ? 'rgba(76,175,80,0.28)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = done ? '#4caf50' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = done ? 1.5 : 1;
    ctx.stroke();

    ctx.font        = '20px Arial';
    ctx.textAlign   = 'center';
    ctx.globalAlpha = done ? 1 : 0.4;
    ctx.fillStyle   = '#fff';
    ctx.fillText(item.emoji, panelX + PANEL_WIDTH / 2, cardY + 17);

    ctx.font      = '8px monospace';
    ctx.fillStyle = done ? '#4caf50' : '#999';
    ctx.fillText(item.label, panelX + PANEL_WIDTH / 2, cardY + 32);

    if (done) {
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#4caf50'; ctx.textAlign = 'right';
      ctx.fillText('✓', cardX + cardW - 3, cardY + 13);
    }
    ctx.globalAlpha = 1;
  });

  ctx.textBaseline = 'alphabetic';
}

// ── HUD ──────────────────────────────────────────────────────────────────────

function drawHUD(ctx, state) {
  const { time, money, ammo, lives, players, discount } = state;
  const hudY = PLAY_HEIGHT;

  ctx.fillStyle = 'rgba(10,20,50,0.94)';
  ctx.fillRect(0, hudY, GAME_WIDTH, HUD_HEIGHT);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, hudY); ctx.lineTo(GAME_WIDTH, hudY); ctx.stroke();

  ctx.font = '18px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('❤️'.repeat(lives), 10, hudY + 20);

  const mins = Math.floor(time / 60), secs = time % 60;
  ctx.font      = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = time < 20 ? '#f44336' : time < 30 ? '#ff9800' : '#fff';
  ctx.fillText(`${mins}:${String(secs).padStart(2,'0')}`, GAME_WIDTH / 2, hudY + 20);

  ctx.font      = 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = money < 200 ? '#f44336' : '#4caf50';
  ctx.fillText(`💰 $${Math.floor(money)}`, GAME_WIDTH - 10, hudY + 20);

  ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#aaa';
  ctx.fillText(`💌×${ammo.invite}  💕×${ammo.heart}`, 10, hudY + 44);

  const bMeta = AMMO_META[players.bride.selectedAmmo];
  ctx.font = 'bold 13px monospace'; ctx.fillStyle = bMeta.color; ctx.textAlign = 'left';
  ctx.fillText(`👰 ${bMeta.label}`, 130, hudY + 44);

  const gMeta = AMMO_META[players.groom.selectedAmmo];
  ctx.font = 'bold 13px monospace'; ctx.fillStyle = gMeta.color; ctx.textAlign = 'right';
  ctx.fillText(`${gMeta.label} 🤵`, GAME_WIDTH - 10, hudY + 44);

  if (discount < 1) {
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ff9800'; ctx.textAlign = 'center';
    ctx.fillText(`🎀 −${Math.round((1 - discount) * 100)}% off`, GAME_WIDTH / 2, hudY + 44);
  }
  ctx.textBaseline = 'alphabetic';
}

// ── floating messages ────────────────────────────────────────────────────────

function drawMessages(ctx, messages) {
  for (const m of messages) {
    const alpha = Math.min(1, m.timer / 25);
    const rise  = (90 - m.timer) * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font        = 'bold 16px monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = m.color ?? '#fff';
    ctx.shadowColor = m.color ?? '#fff';
    ctx.shadowBlur  = 6;
    ctx.fillText(m.text, m.x + ITEM_WIDTH / 2, m.y - rise);
    ctx.restore();
  }
}

// ── advance animation ────────────────────────────────────────────────────────

function drawAdvanceAnim(ctx, anim) {
  if (anim <= 0) return;
  const alpha = anim / 60;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle   = 'rgba(255,215,0,0.08)';
  ctx.fillRect(0, 0, GAME_WIDTH, PLAY_HEIGHT);
  ctx.globalAlpha = alpha;
  ctx.font        = 'bold 26px monospace';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 20;
  ctx.fillText('💒  ADVANCING…  💒', GAME_WIDTH / 2, PLAY_HEIGHT / 2);
  ctx.restore();
}

// ── meeting scene (players physically meet) ──────────────────────────────────

function drawMeeting(ctx, state, assets) {
  const { meetingTimer, currentLevel } = state;
  const isLastLevel = currentLevel >= LEVELS.length - 1;

  // Blue gradient background (play area)
  const grad = ctx.createLinearGradient(0, 0, 0, PLAY_HEIGHT);
  grad.addColorStop(0,   BG_TOP);
  grad.addColorStop(0.5, BG_MID);
  grad.addColorStop(1,   BG_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, PLAY_HEIGHT);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 80; i++) {
    ctx.fillRect((i * 137 + 11) % GAME_WIDTH, (i * 97 + 23) % PLAY_HEIGHT, 1.5, 1.5);
  }

  // Animated sparkles
  const sparkSeed = Math.floor(meetingTimer / 3);
  for (let i = 0; i < 14; i++) {
    const sx = (sparkSeed * 41 + i * 193) % GAME_WIDTH;
    const sy = (sparkSeed * 67 + i * 127) % PLAY_HEIGHT;
    const sr = 1 + (i % 3) * 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle   = ['#ffd700','#fff','#ffb3ef','#b3e5ff'][i % 4];
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Couple image — fade in over first 30 frames, centred in upper 55% of play area
  const img = assets?.couple;
  if (img?.complete) {
    const fadeAlpha = Math.min(1, meetingTimer / 30);
    const cw = 320;
    const ch = Math.round(cw * img.naturalHeight / img.naturalWidth);
    ctx.globalAlpha = fadeAlpha;
    ctx.drawImage(img,
      GAME_WIDTH / 2 - cw / 2,
      PLAY_HEIGHT * 0.40 - ch / 2,
      cw, ch
    );
    ctx.globalAlpha = 1;
  }

  // HUD strip
  ctx.fillStyle = 'rgba(10,20,50,0.94)';
  ctx.fillRect(0, PLAY_HEIGHT, GAME_WIDTH, HUD_HEIGHT);

  // Level complete text — appears after 60 frames
  if (meetingTimer >= 60) {
    const tAlpha = Math.min(1, (meetingTimer - 60) / 20);
    ctx.globalAlpha = tAlpha;
    ctx.textAlign   = 'center';

    if (isLastLevel) {
      ctx.font        = 'bold 40px monospace';
      ctx.fillStyle   = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 22;
      ctx.fillText("🎉  MARRIED!  🎉", GAME_WIDTH / 2, PLAY_HEIGHT - 55);
    } else {
      ctx.font        = 'bold 34px monospace';
      ctx.fillStyle   = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 22;
      ctx.fillText('💒  Level Complete!  💒', GAME_WIDTH / 2, PLAY_HEIGHT - 65);
      ctx.shadowBlur = 0;

      const nextLevel = LEVELS[currentLevel + 1];
      if (nextLevel) {
        ctx.font      = '17px Arial';
        ctx.fillStyle = '#ccc';
        ctx.fillText(`Next: Level ${nextLevel.id} — ${nextLevel.name}`, GAME_WIDTH / 2, PLAY_HEIGHT - 34);
      }
    }
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  // "Press any key" prompt — appears after 90 frames
  if (meetingTimer >= 90) {
    const pAlpha = Math.min(1, (meetingTimer - 90) / 20);
    ctx.globalAlpha = pAlpha;
    ctx.font        = 'bold 15px Arial';
    ctx.fillStyle   = '#ffd700';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 8;
    ctx.fillText('— Press any key to continue —', GAME_WIDTH / 2, PLAY_HEIGHT + 36);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }
}

// ── title screen ─────────────────────────────────────────────────────────────

function drawTitle(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0,   BG_TOP);
  grad.addColorStop(0.5, BG_MID);
  grad.addColorStop(1,   BG_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect((i * 137 + 11) % CANVAS_WIDTH, (i * 97 + 23) % GAME_HEIGHT, 1, 1);
  }

  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 58px monospace';
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 24;
  ctx.fillText("WEDDIN'VADERS", GAME_WIDTH / 2, 140);
  ctx.shadowBlur = 0;

  ctx.font = '20px Arial'; ctx.fillStyle = '#ffd700';
  ctx.fillText('Buy the wedding of your dreams!', GAME_WIDTH / 2, 188);

  const lines = [
    '👰 Bride  —  A/D move   ·   S ammo   ·   W shoot',
    '🤵 Groom  —  ←/→ move   ·   ↑/↓ ammo   ·   Space shoot',
    '',
    '💵 Cash shoots at items to buy them',
    '💌 Send invites to guests — they attend & bring gift money!',
    '💕 Send hearts to family — they donate BIG bucks!',
    '',
    'Collect items on the right panel. N = fast-forward once done!',
    '',
    '— Press any key to begin —',
  ];
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1;
    ctx.font      = isLast ? 'bold 18px Arial' : '15px Arial';
    ctx.fillStyle = isLast ? '#ffd700' : (line === '' ? '#fff' : '#ccc');
    if (isLast) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; }
    ctx.fillText(line, GAME_WIDTH / 2, 240 + i * 26);
    ctx.shadowBlur = 0;
  });

  drawPanel(ctx, { acquiredItems: [], currentLevel: 0 });
}

// ── overlays ─────────────────────────────────────────────────────────────────

function drawOverlay(ctx, state, assets) {
  const { phase, currentLevel } = state;

  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (phase === 'levelComplete') {
    const nextLevel = LEVELS[currentLevel + 1];
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 42px monospace';
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 24;
    ctx.fillText('🎊 Level Complete! 🎊', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60);
    ctx.shadowBlur = 0;

    if (nextLevel) {
      ctx.font = '22px Arial'; ctx.fillStyle = '#fff';
      ctx.fillText(`Next: Lvl ${nextLevel.id} — ${nextLevel.name}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
    ctx.font = '18px Arial'; ctx.fillStyle = '#ccc';
    ctx.fillText('Press any key to continue', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 44);

  } else if (phase === 'gameComplete') {
    const img = assets?.couple;
    if (img?.complete) {
      const cw = 280, ch = Math.round(cw * img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, GAME_WIDTH / 2 - cw / 2, GAME_HEIGHT / 2 - ch / 2 - 60, cw, ch);
    }
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 44px monospace';
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 24;
    ctx.fillText("🎉 YOU'RE MARRIED! 🎉", GAME_WIDTH / 2, GAME_HEIGHT - 110);
    ctx.shadowBlur = 0;
    ctx.font = '18px Arial'; ctx.fillStyle = '#ccc';
    ctx.fillText('Press any key to return to title', GAME_WIDTH / 2, GAME_HEIGHT - 70);

  } else if (phase === 'lost') {
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 52px monospace';
    ctx.fillStyle   = '#f44336';
    ctx.shadowColor = '#f44336';
    ctx.shadowBlur  = 24;
    ctx.fillText('💔 Wedding Failed!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = '20px Arial'; ctx.fillStyle = '#ccc';
    ctx.fillText('Press R to try again', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
  }
}

// ── main render entry point ───────────────────────────────────────────────────

export function render(ctx, state, assets) {
  const { phase, players, bullets, items, messages, advanceAnim } = state;

  if (phase === 'title') { drawTitle(ctx); return; }

  // ── Meeting scene: players physically meet ─────────────────────────────────
  if (phase === 'meeting') {
    drawMeeting(ctx, state, assets);
    drawPanel(ctx, state);
    return;
  }

  drawBackground(ctx, players);
  for (const it of items) drawItem(ctx, it);
  for (const b of bullets) drawBullet(ctx, b);

  const groomImg = assets?.groom?.complete ? assets.groom : null;
  const brideImg = assets?.bride?.complete ? assets.bride : null;
  drawPlayer(ctx, players.groom, groomImg, true);   // isGroom = true
  drawPlayer(ctx, players.bride, brideImg, false);  // isGroom = false

  drawMessages(ctx, messages);
  drawAdvanceAnim(ctx, advanceAnim);
  drawHUD(ctx, state);
  drawPanel(ctx, state);

  if (phase === 'levelComplete' || phase === 'gameComplete' || phase === 'lost') {
    drawOverlay(ctx, state, assets);
    drawPanel(ctx, state);  // keep checklist visible on top of overlay
  }
}
