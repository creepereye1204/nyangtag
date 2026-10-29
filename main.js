/* 냥태그 — 화면, 입력, 로비, 온라인(PeerJS), 효과 */
(() => {
  'use strict';
  const C = window.Core;
  const R = C.R;
  let W = C.W, H = C.H;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;
  const lerp = (a, b, t) => a + (b - a) * t;
  const TEAM_COL = ['#ee8a1f', '#4a74a0'];
  const TEAM_NAME = C.TEAM_NAME;
  const PREFIX = 'nyangtag-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const VERSION = 'v4.0.1';
  const MAXP = 16; // 최대 8:8
  const MAP_ICON = { house: '🏠', hanok: '🏮', cafe: '☕', snow: '❄️', beach: '🏖️', town: '🏘️', school: '🏫', halloween: '🎃', space: '🚀' };
  const SK_ICON = { trap: '🧶', boost: '🌿', sniff: '👃', pounce: '🐾', nade: '💣', wall: '🧱', shield: '🛡️', camo: '🦎', healburst: '💗' };
  const WPN_COL = { pistol: '#4cc9f0', shotgun: '#f77f00', rapid: '#80ed99', sniper: '#f72585', churu: '#ffb3c6', rocket: '#ff595e' };
  const isCombat = g => g && g.mode && g.mode !== 'tag';
  const IT_ICON = { camo: '🦎', block: '🧱', fish: '🐟' }, IT_NAME = { camo: '보호색', block: '블럭 쌓기', fish: '생선' };
  // 말풍선 멘트
  const LINES = {
    chase: ['어디 숨었냥~?', '냄새가 난다냥…', '다 보인다냥!', '츄르 걸고 잡는다냥', '도망쳐 봤자다냥', '하나 둘 셋… 찾는다!'],
    run: ['못 잡지롱~', '여기 없다냥', '숨 참는 중…', '츄르 주면 나갈게', '냥냥 펀치 맞을래?', '조용… 조용…'],
    tease: ['메롱~', '느림보냥', '여기여기~', '냥하하', '츄르 내놔!', 'ㅋㅋㅋㅋ', '나 잡아 봐라냥', '와 고수다', 'GG냥', '살려줘…'],
    freezeMe: ['으앙 얼었다냥…', '살려줘냥!!', '추워… 땡 해줘', '꽁꽁 얼었다냥'],
    freezeBy: ['잡았다냥!', '얼음!! 냥하하', '하나 처리냥', '딱 걸렸지?'],
    unfreezeMe: ['살았다냥!', '고마워 친구야!', '부활이다냥'],
    unfreezeBy: ['내가 왔다냥!', '땡! 가자!', '구조 완료냥'],
    spot: ['거기 있었냥!', '찾았다!!', '딱 걸렸냥', '보인다 보여~'],
    spotted: ['헉 들켰다냥', '으악!', '어떻게 알았냥?!'],
    trap: ['털뭉치 뭐냥?!', '발이 엉켰다냥…', '으아 실 풀어줘'],
    trapBy: ['걸렸지롱~', '털뭉치 맛 어때?'],
    close: ['휴 살았다냥', '아슬아슬~', '스쳤다냥!'],
    boost: ['슝~', '캣닢 최고냥!', '부릉부릉'],
    sniff: ['킁킁… 냄새난다', '츄르 냄새…?'],
    pounce: ['냥냥 덮치기!', '받아라!'],
    camo: ['나는 이제 투명냥', '안 보이지롱'],
    whiff: ['헛방이다냥…', '어라?', '놓쳤다냥!'],
    block: ['막았다냥!', '벽 세웠다냥'],
    fish: ['생선 냠냠, 힘이 난다냥', '냠냠 쩝쩝'],
  };
  const pickLine = (cat, n) => { const L = LINES[cat] || LINES.tease; return L[(n == null ? Math.random() * 1000 | 0 : n) % L.length]; };

  /* ---------------- 고양이 모양 ---------------- */
  const STYLES = [
    { coat: 'cheese', expr: 'pop', name: '팝냥' },
    { coat: 'calico', expr: 'vibe', name: '둠칫냥' },
    { coat: 'mackerel', expr: 'huh', name: '띠용냥' },
    { coat: 'tux', expr: 'cry', name: '눈물냥' },
  ];
  // 고양이 밈 GIF 목록은 gifs.js
  const GIFS = (window.NYANG_GIFS && window.NYANG_GIFS.meme) || [];
  const KEY_GIFS = (window.NYANG_GIFS && window.NYANG_GIFS.key) || [];
  const KEYED = new Set(KEY_GIFS.map(([u]) => u));
  const PRESET = new Set([...KEYED, ...GIFS.map(([u]) => u)]);

  /* ---------------- GIF 프레임 분해 + 크로마키 ---------------- */
  // ImageDecoder로 GIF를 프레임별로 풀고, 초록 배경이면 초록을 투명하게 만든다.
  // 안 되는 브라우저/CORS 막힌 GIF는 원본 <img>로 보여 준다.
  const anims = new Map(); // key -> {state:'loading'|'ok'|'fail', frames, total, w, h, keyed}
  function keyFrame(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], m = Math.max(r, b), gr = g - m;
      if (g > 70 && gr > 45) px[i + 3] = 0;
      else if (g > 60 && gr > 12) {
        px[i + 3] = Math.round(px[i + 3] * clamp(1 - (gr - 12) / 33, 0, 1));
        px[i + 1] = m; // 초록 번짐 제거
      }
    }
    // GIF 가장자리 2px에 남는 테두리 줄(작대기처럼 보임)을 지운다
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) px[(y * w + x) * 4 + 3] = 0;
    ctx.putImageData(d, 0, 0);
  }
  function isGreenBorder(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data; let green = 0, n = 0;
    const test = (x, y) => { const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2]; n++; if (g > 90 && g - Math.max(r, b) > 40) green++; };
    for (let x = 0; x < w; x += 3) { test(x, 0); test(x, h - 1); }
    for (let y = 0; y < h; y += 3) { test(0, y); test(w - 1, y); }
    return green / n > 0.45;
  }
  // preview: 고르기 화면용 (작게, 프레임 적게)
  function loadAnim(url, preview) {
    const key = preview ? url + '#p' : url;
    if (anims.has(key)) return anims.get(key).p;
    const a = { state: 'loading' }; anims.set(key, a);
    a.p = (async () => {
      try {
        if (!('ImageDecoder' in window)) throw new Error('no decoder');
        const res = await fetch(url, { mode: 'cors', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error('http ' + res.status);
        const blob = await res.blob();
        const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/gif';
        if (!(await ImageDecoder.isTypeSupported(type))) throw new Error('type');
        const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type });
        await dec.tracks.ready;
        const all = dec.tracks.selectedTrack.frameCount || 1, maxF = preview ? 24 : 90, size = preview ? 110 : 200;
        const step = Math.max(1, Math.ceil(all / maxF));
        const frames = []; let total = 0, keyed = KEYED.has(url) ? true : null, cw = 0, ch = 0;
        for (let i = 0; i < all; i += step) {
          const { image } = await dec.decode({ frameIndex: i });
          if (!cw) { const sc = Math.min(1, size / Math.max(image.displayWidth, image.displayHeight)); cw = Math.max(1, Math.round(image.displayWidth * sc)); ch = Math.max(1, Math.round(image.displayHeight * sc)); }
          const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          const ctx = cv.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, 0, 0, cw, ch);
          if (keyed === null) keyed = isGreenBorder(ctx, cw, ch);
          if (keyed) keyFrame(ctx, cw, ch);
          const dur = Math.max(20, (image.duration || 80000) / 1000) * step;
          image.close();
          frames.push({ cv, dur }); total += dur;
        }
        dec.close();
        Object.assign(a, { state: 'ok', frames, total, w: cw, h: ch, keyed });
      } catch (e) { a.state = 'fail'; }
      return a;
    })();
    return a.p;
  }
  function animFrame(a, tSec) {
    let t = (tSec * 1000) % a.total;
    for (const f of a.frames) { if (t < f.dur) return f.cv; t -= f.dur; }
    return a.frames[0].cv;
  }
  function validAv(av) {
    if (typeof av !== 'string') return null;
    if (/^d[0-3]$/.test(av)) return av;
    if (av.startsWith('g:')) {
      const u = av.slice(2);
      if (u.length < 400 && /^https:\/\/[^\s"'<>]+$/.test(u)) return av;
    }
    return null;
  }
  const cleanName = n => (typeof n === 'string' ? n.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 10) : '') || '냥이';

  const COATS = {
    cheese: { base: '#f6a44a', stripe: '#d46e1c', inner: '#ffcfa6', muzzle: '#ffe9d3' },
    calico: { base: '#fffaf3', stripe: '#3a3330', patch: '#f19a3e', inner: '#ffc9cf', muzzle: '#ffffff' },
    mackerel: { base: '#a2abb2', stripe: '#55616b', inner: '#f6c6ce', muzzle: '#e7ebee' },
    tux: { base: '#34383e', stripe: '#34383e', inner: '#f3b9c3', muzzle: '#ffffff' },
  };
  function drawCat(g, x, y, r, style, t, moving, facing, frozen) {
    const S = STYLES[style] || STYLES[0], coatKey = S.coat, expr = S.expr, Cc = COATS[coatKey], O = '#2a2220';
    g.save(); g.translate(x, y);
    let bob = moving ? -Math.abs(Math.sin(t * 14)) * 4 : Math.sin(t * 2.2) * 0.8, rot = 0;
    if (expr === 'vibe') rot = Math.sin(t * 8) * 0.2;
    if (expr === 'huh') rot = -0.24 + Math.sin(t * 1.6) * 0.05;
    if (frozen) { bob = 0; rot = 0; }
    g.save(); g.scale(facing, 1);
    const sway = frozen ? 0 : Math.sin(t * (moving ? 10 : 3)) * 0.5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-r * .55, r * .55); g.quadraticCurveTo(-r * 1.35, r * .2 + sway * r * .3, -r * 1.05 + sway * r * .4, -r * .45);
    g.strokeStyle = O; g.lineWidth = r * .34; g.stroke(); g.strokeStyle = Cc.base; g.lineWidth = r * .22; g.stroke();
    g.beginPath(); g.ellipse(0, r * .5, r * .72, r * .52, 0, 0, 7); g.fillStyle = Cc.base; g.fill(); g.strokeStyle = O; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.ellipse(r * .05, r * .62, r * .36, r * .3, 0, 0, 7); g.fillStyle = Cc.muzzle; g.fill();
    const step = moving && !frozen ? Math.sin(t * 14) * r * .12 : 0;
    for (const [px, ph] of [[-r * .32, step], [r * .32, -step]]) { g.beginPath(); g.ellipse(px, r * .98 + ph * .3, r * .2, r * .13, 0, 0, 7); g.fillStyle = Cc.muzzle; g.fill(); g.strokeStyle = O; g.lineWidth = 2; g.stroke(); }
    g.restore();
    g.translate(0, bob - r * .25); g.rotate(rot);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * r * .86, -r * .22); g.lineTo(s * r * .74, -r * 1.02); g.lineTo(s * r * .22, -r * .7); g.closePath();
      g.fillStyle = Cc.base; g.fill(); g.strokeStyle = O; g.lineWidth = 2.2; g.stroke();
      g.beginPath(); g.moveTo(s * r * .72, -r * .38); g.lineTo(s * r * .68, -r * .84); g.lineTo(s * r * .36, -r * .64); g.closePath(); g.fillStyle = Cc.inner; g.fill();
    }
    g.beginPath(); g.ellipse(0, 0, r, r * .84, 0, 0, 7); g.fillStyle = Cc.base; g.fill();
    g.save(); g.clip();
    if (coatKey === 'calico') { g.fillStyle = Cc.patch; g.beginPath(); g.ellipse(-r * .55, -r * .45, r * .55, r * .45, .3, 0, 7); g.fill(); g.fillStyle = Cc.stripe; g.beginPath(); g.ellipse(r * .6, -r * .55, r * .4, r * .32, -.3, 0, 7); g.fill(); }
    else if (coatKey === 'tux') { g.fillStyle = Cc.muzzle; g.beginPath(); g.moveTo(0, -r * .35); g.quadraticCurveTo(r * .55, r * .2, r * .5, r * .9); g.lineTo(-r * .5, r * .9); g.quadraticCurveTo(-r * .55, r * .2, 0, -r * .35); g.fill(); }
    else {
      g.strokeStyle = Cc.stripe; g.lineWidth = r * .13; g.lineCap = 'round';
      for (const sx of [-.28, 0, .28]) { g.beginPath(); g.moveTo(sx * r, -r * .86); g.lineTo(sx * r * .8, -r * .48); g.stroke(); }
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r, -r * .05); g.lineTo(s * r * .72, 0); g.stroke(); g.beginPath(); g.moveTo(s * r, r * .22); g.lineTo(s * r * .76, r * .22); g.stroke(); }
    }
    g.restore();
    g.beginPath(); g.ellipse(0, 0, r, r * .84, 0, 0, 7); g.strokeStyle = O; g.lineWidth = 2.2; g.stroke();
    if (coatKey !== 'tux') { g.beginPath(); g.ellipse(0, r * .34, r * .42, r * .3, 0, 0, 7); g.fillStyle = Cc.muzzle; g.fill(); }
    const ex = r * .38, ey = -r * .06, e = frozen ? 'cry' : expr, ink = coatKey === 'tux' ? '#111' : '#241a18';
    if (e === 'vibe') {
      g.strokeStyle = ink; g.lineWidth = 2.6; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, ey + r * .06, r * .14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.fillStyle = 'rgba(255,110,140,.45)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * .62, r * .22, r * .14, r * .08, 0, 0, 7); g.fill(); }
    } else if (e === 'huh') {
      for (const s of [-1, 1]) {
        g.beginPath(); g.arc(s * ex, ey, r * .22, 0, 7); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.arc(s * ex + r * .03, ey + r * .02, r * .06, 0, 7); g.fillStyle = ink; g.fill();
      }
    } else if (e === 'cry') {
      for (const s of [-1, 1]) {
        g.beginPath(); g.ellipse(s * ex, ey, r * .19, r * .22, 0, 0, 7); g.fillStyle = ink; g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - r * .06, ey - r * .08, r * .07, 0, 7); g.fill(); g.beginPath(); g.arc(s * ex + r * .06, ey + r * .06, r * .035, 0, 7); g.fill();
        g.fillStyle = 'rgba(110,200,255,.85)'; g.beginPath(); g.ellipse(s * ex, ey + r * .24, r * .16, r * .07, 0, 0, 7); g.fill();
        const dy = ((t * 1.2 + (s > 0 ? .5 : 0)) % 1) * r * .5; g.beginPath(); g.ellipse(s * (ex + r * .08), ey + r * .3 + dy, r * .06, r * .09, 0, 0, 7); g.fill();
      }
    } else {
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, ey, r * .1, r * .14, 0, 0, 7); g.fillStyle = ink; g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - r * .03, ey - r * .05, r * .035, 0, 7); g.fill(); }
    }
    g.fillStyle = '#ff8fa3'; g.beginPath(); g.moveTo(-r * .08, r * .16); g.lineTo(r * .08, r * .16); g.lineTo(0, r * .25); g.closePath(); g.fill();
    const open = e === 'pop' && ((moving && Math.sin(t * 20) > 0) || (!moving && Math.sin(t * 2.6) > .92));
    g.strokeStyle = ink; g.lineWidth = 2; g.lineCap = 'round';
    if (open) { g.beginPath(); g.ellipse(0, r * .42, r * .2, r * .22, 0, 0, 7); g.fillStyle = '#3a1a1f'; g.fill(); g.beginPath(); g.ellipse(0, r * .52, r * .11, r * .08, 0, 0, 7); g.fillStyle = '#ff7f97'; g.fill(); }
    else if (e === 'huh') { g.beginPath(); g.arc(0, r * .38, r * .06, 0, 7); g.stroke(); }
    else if (e === 'cry') { g.beginPath(); g.moveTo(-r * .16, r * .42); g.quadraticCurveTo(-r * .08, r * .34, 0, r * .42); g.quadraticCurveTo(r * .08, r * .34, r * .16, r * .42); g.stroke(); }
    else { g.beginPath(); g.arc(-r * .08, r * .27, r * .08, .1, Math.PI - .1); g.stroke(); g.beginPath(); g.arc(r * .08, r * .27, r * .08, .1, Math.PI - .1); g.stroke(); }
    g.strokeStyle = coatKey === 'tux' ? 'rgba(255,255,255,.75)' : 'rgba(40,30,28,.55)'; g.lineWidth = 1.3;
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(s * r * .48, r * .28 + k * r * .08); g.lineTo(s * r * 1.15, r * .22 + k * r * .17); g.stroke(); }
    g.restore();
  }

  /* ---------------- 맵 그리기 (한 번만) ---------------- */
  function rr(g, x, y, w, h, r) { if (!(w > 0 && h > 0)) { g.beginPath(); return; } r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rand(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  function shadowOn(g, blur = 18, oy = 8, a = .32) { g.shadowColor = `rgba(20,12,6,${a})`; g.shadowBlur = blur; g.shadowOffsetX = 0; g.shadowOffsetY = oy; }
  function shadowOff(g) { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; }
  // 부드러운 얼룩 (바닥 질감)
  function blotches(g, rnd, x, y, w, h, n, col, rMin, rMax) {
    for (let i = 0; i < n; i++) {
      const cx = x + rnd() * w, cy = y + rnd() * h, r = rMin + rnd() * (rMax - rMin);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
  function speckle(g, rnd, x, y, w, h, n, cols, s = 2) {
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(x + rnd() * w, y + rnd() * h, s, s); }
  }

  let mapCache = null;
  // 큰 맵 한 장은 폰 GPU 텍스처 한도(4096)를 넘으니 1024 조각으로 잘라 두고 보이는 조각만 그린다
  const TILE = 1024;
  function buildMap() {
    const full = buildMapFull(), tiles = [];
    for (let ty = 0; ty < H; ty += TILE) for (let tx = 0; tx < W; tx += TILE) {
      // 2px 겹쳐서 확대할 때 조각 사이 틈(가는 줄)이 안 보이게
      const tw = Math.min(TILE + 2, W - tx), th = Math.min(TILE + 2, H - ty), c = document.createElement('canvas');
      c.width = tw; c.height = th; c.getContext('2d').drawImage(full, tx, ty, tw, th, 0, 0, tw, th);
      tiles.push({ x: tx, y: ty, w: tw, h: th, c });
    }
    full.width = full.height = 0;
    return tiles;
  }
  function drawMapTiles(g, L, R2, T, B) {
    for (const t of mapCache) if (t.x < R2 && t.x + t.w > L && t.y < B && t.y + t.h > T) g.drawImage(t.c, t.x, t.y);
  }
  function buildMapFull() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rnd = rand(4242);
    g.fillStyle = '#5c8a4c'; g.fillRect(0, 0, W, H);
    for (const rm of C.ROOMS) drawFloor(g, rm, rnd);
    drawDecor(g, rnd);
    // 숨는 곳 바닥 그늘
    for (const h of C.HIDES) {
      if (h.k === 'bush' || h.k === 'snowbush' || h.k === 'car' || h.k === 'tent' || h.k === 'bamboo' || h.k === 'hay' || h.k === 'corn' || h.k === 'pumpkins') continue;
      g.fillStyle = 'rgba(0,0,0,.14)'; rr(g, h.x + 4, h.y + 6, h.w, h.h, 18); g.fill();
    }
    for (const o of C.SOLIDS) if (o.k !== 'wall') drawSolid(g, o, rnd);
    for (const o of C.SOLIDS) if (o.k === 'wall') drawWall(g, o, true);
    for (const o of C.SOLIDS) if (o.k === 'wall') drawWall(g, o, false);
    // 방 이름
    for (const rm of C.ROOMS) {
      if (!rm.label) continue;
      g.font = `${rm.w > 2000 ? 110 : 72}px Jua, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillText(rm.label, rm.x + rm.w / 2 + 3, rm.y + rm.h / 2 + 3);
      g.fillStyle = 'rgba(0,0,0,.09)'; g.fillText(rm.label, rm.x + rm.w / 2, rm.y + rm.h / 2);
    }
    // 가장자리 그늘
    const e = 60;
    for (const [x, y, w, h, x0, y0, x1, y1] of [[0, 0, W, e, 0, 0, 0, e], [0, H - e, W, e, 0, H, 0, H - e], [0, 0, e, H, 0, 0, e, 0], [W - e, 0, e, H, W, 0, W - e, 0]]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    return cv;
  }

  function drawFloor(g, rm, rnd) {
    const { x, y, w, h } = rm;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (rm.k === 'wood') {
      for (let yy = y, row = 0; yy < y + h; yy += 40, row++) {
        let xx = x - rnd() * 200;
        while (xx < x + w) {
          const len = 170 + rnd() * 190, l = 66 + rnd() * 8;
          g.fillStyle = hsl(31 + rnd() * 6, 45 + rnd() * 10, l); g.fillRect(xx, yy, len, 40);
          g.strokeStyle = hsl(28, 40, l - 9, .55); g.lineWidth = 1.2;
          for (let k = 0; k < 3; k++) { const gy = yy + 8 + rnd() * 24; g.beginPath(); g.moveTo(xx + 6, gy); g.bezierCurveTo(xx + len * .3, gy + rnd() * 6 - 3, xx + len * .7, gy + rnd() * 6 - 3, xx + len - 6, gy); g.stroke(); }
          if (rnd() < .25) { g.fillStyle = hsl(28, 40, l - 14, .5); g.beginPath(); g.ellipse(xx + len * rnd(), yy + 20, 6, 3, 0, 0, 7); g.fill(); }
          g.fillStyle = 'rgba(80,45,15,.45)'; g.fillRect(xx, yy, 2, 40);
          xx += len;
        }
        g.fillStyle = 'rgba(80,45,15,.4)'; g.fillRect(x, yy, w, 2);
      }
      // 거실 러그 + 햇살
      if (rm.label === '거실') {
        shadowOn(g, 10, 4, .2);
        g.fillStyle = '#7fbfae'; rr(g, 330, 300, 340, 220, 60); g.fill(); shadowOff(g);
        g.strokeStyle = '#f4f7ef'; g.lineWidth = 6; g.setLineDash([2, 14]); g.lineCap = 'round'; rr(g, 348, 318, 304, 184, 46); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#9fd3c3'; rr(g, 380, 345, 240, 130, 40); g.fill();
        for (let i = 0; i < 3; i++) { const sx = 640 + i * 120; const gr = g.createLinearGradient(sx, 0, sx + 260, 700); gr.addColorStop(0, 'rgba(255,240,190,.20)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + 80, 0); g.lineTo(sx + 340, 700); g.lineTo(sx + 240, 700); g.fill(); }
      }
    } else if (rm.k === 'tile') {
      for (let yy = y; yy < y + h; yy += 60) for (let xx = x; xx < x + w; xx += 60) {
        const chk = ((xx - x) / 60 + (yy - y) / 60) % 2;
        g.fillStyle = chk ? hsl(195, 18, 92 + rnd() * 3) : hsl(200, 25, 82 + rnd() * 3); g.fillRect(xx, yy, 60, 60);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(xx + 4, yy + 4, 22, 3);
      }
      g.strokeStyle = 'rgba(120,140,150,.45)'; g.lineWidth = 2;
      for (let xx = x; xx <= x + w; xx += 60) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
      for (let yy = y; yy <= y + h; yy += 60) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,30,60,.06)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    } else if (rm.k === 'carpet') {
      g.fillStyle = '#c4b0d6'; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, 40, 'rgba(255,255,255,.10)', 60, 160);
      speckle(g, rnd, x, y, w, h, 9000, ['rgba(90,60,120,.10)', 'rgba(255,255,255,.12)'], 2);
      g.fillStyle = '#e8b4c8'; g.beginPath(); g.ellipse(x + 820, y + 450, 230, 150, 0, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.setLineDash([3, 12]); g.lineCap = 'round'; g.beginPath(); g.ellipse(x + 820, y + 450, 200, 124, 0, 0, 7); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#f5cfdc'; g.beginPath(); g.ellipse(x + 820, y + 450, 120, 70, 0, 0, 7); g.fill();
    } else if (rm.k === 'grass') {
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#8cc56f'); gr.addColorStop(1, '#79b35f');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, w * h / 30000, 'rgba(60,120,40,.22)', 50, 160);
      blotches(g, rnd, x, y, w, h, w * h / 50000, 'rgba(200,240,150,.20)', 40, 120);
      // 흙길
      if (rm.label === '공원') {
        g.lineCap = 'round'; g.lineJoin = 'round';
        const path = () => { g.beginPath(); g.moveTo(580, 1600); g.bezierCurveTo(700, 1900, 300, 2100, 700, 2250); g.bezierCurveTo(1300, 2450, 1500, 2150, 2400, 2280); g.moveTo(1100, 2700); g.bezierCurveTo(800, 2900, 1200, 3100, 1700, 3200); g.moveTo(1790, 1600); g.bezierCurveTo(1800, 1900, 1700, 2200, 1600, 2400); };
        path(); g.strokeStyle = '#c9ae7d'; g.lineWidth = 120; g.stroke();
        path(); g.strokeStyle = '#d9c193'; g.lineWidth = 96; g.stroke();
        g.save(); path(); g.lineWidth = 96; g.strokeStyle = 'rgba(0,0,0,0)'; g.restore();
        speckle(g, rnd, x, y, w, h, 3000, ['rgba(140,110,70,.0)'], 2);
        // 호수 둘레 모래
        g.fillStyle = '#dcc79a'; g.beginPath(); g.ellipse(1090, 2470, 240, 170, 0, 0, 7); g.fill();
      }
      for (let i = 0; i < w * h / 700; i++) {
        const bx = x + rnd() * w, by = y + rnd() * h;
        g.strokeStyle = rnd() > .5 ? 'rgba(50,110,40,.45)' : 'rgba(190,235,150,.5)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + rnd() * 4 - 2, by - 6 - rnd() * 5); g.stroke();
      }
      const fc = ['#fff', '#ffe066', '#ff9ec4', '#c9a8ff'];
      for (let i = 0; i < w * h / 26000; i++) {
        const cx = x + rnd() * w, cy = y + rnd() * h, col = fc[(rnd() * 4) | 0];
        for (let k = 0; k < 5; k++) { const a = k / 5 * 7, px = cx + Math.cos(a) * 3.5, py = cy + Math.sin(a) * 3.5; g.fillStyle = col; g.beginPath(); g.arc(px, py, 2.6, 0, 7); g.fill(); }
        g.fillStyle = '#f2b830'; g.beginPath(); g.arc(cx, cy, 2, 0, 7); g.fill();
      }
      if (rm.label === '마당') {
        g.fillStyle = '#dccc9f';
        for (const [sx, sy] of [[1290, 820], [1330, 1110], [1460, 1180], [1600, 1290], [1760, 1340], [1700, 1080], [1820, 960]]) {
          shadowOn(g, 6, 3, .25); g.beginPath(); g.ellipse(sx, sy, 34, 22, .3, 0, 7); g.fill(); shadowOff(g);
          g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(sx - 8, sy - 6, 14, 6, .3, 0, 7); g.fill(); g.fillStyle = '#dccc9f';
        }
      }
    } else if (rm.k === 'stone') {
      g.fillStyle = '#9b9387'; g.fillRect(x, y, w, h);
      for (let yy = y, row = 0; yy < y + h; yy += 34, row++) for (let xx = x - (row % 2) * 24; xx < x + w; xx += 48) {
        const l = 66 + rnd() * 12; g.fillStyle = hsl(35 + rnd() * 10, 10 + rnd() * 8, l); rr(g, xx + 2, yy + 2, 44, 30, 9); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, xx + 6, yy + 4, 26, 6, 3); g.fill();
      }
      // 광장 원형 무늬
      g.strokeStyle = 'rgba(120,100,80,.45)'; g.lineWidth = 10;
      for (const rad of [260, 340]) { g.beginPath(); g.arc(3400, 1180, rad, 0, 7); g.stroke(); }
      blotches(g, rnd, x, y, w, h, 40, 'rgba(60,50,40,.10)', 80, 200);
    } else if (rm.k === 'road') {
      g.fillStyle = '#4b4f55'; g.fillRect(x, y, w, h);
      speckle(g, rnd, x, y, w, h, 7000, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.18)'], 2);
      g.fillStyle = '#d9d4c8'; g.fillRect(x, y, w, 10); g.fillRect(x, y + h - 10, w, 10);
      g.fillStyle = '#f2c94c'; for (let xx = x + 20; xx < x + w; xx += 110) g.fillRect(xx, y + h / 2 - 4, 60, 8);
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 7; k++) g.fillRect(3500, y + 20 + k * 27, 140, 14);
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 7; k++) g.fillRect(2520, y + 20 + k * 27, 120, 14);
    } else if (rm.k === 'madang') {
      const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#5d5266'); gr.addColorStop(1, '#4e4a5e');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, w * h / 50000, 'rgba(120,100,90,.18)', 60, 180);
      speckle(g, rnd, x, y, w, h, w * h / 250, ['rgba(200,180,160,.12)', 'rgba(20,10,30,.18)'], 2);
      // 빗자루로 쓴 결
      g.strokeStyle = 'rgba(210,190,170,.07)'; g.lineWidth = 2;
      for (let i = 0; i < w * h / 9000; i++) { const sx2 = x + rnd() * w, sy2 = y + rnd() * h; g.beginPath(); g.arc(sx2, sy2, 30 + rnd() * 30, 3.6, 5.4); g.stroke(); }
    } else if (rm.k === 'baksuk') {
      g.fillStyle = '#3c3a48'; g.fillRect(x, y, w, h);
      // 큰 판돌을 불규칙하게
      for (let yy = y; yy < y + h; yy += 70) for (let xx = x - (yy / 70 % 2) * 45; xx < x + w; xx += 90) {
        const jx = rnd() * 10, jy = rnd() * 8, l = 30 + rnd() * 10;
        g.fillStyle = hsl(250 + rnd() * 20, 8 + rnd() * 6, l); rr(g, xx + 4 + jx, yy + 4 + jy, 80 - jx, 60 - jy, 12); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, xx + 10 + jx, yy + 8 + jy, 40, 10, 5); g.fill();
      }
      blotches(g, rnd, x, y, w, h, 30, 'rgba(255,190,120,.05)', 120, 260);
    } else if (rm.k === 'snow') {
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#f4f8fc'); gr.addColorStop(1, '#e3ecf5');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, w * h / 160000, 'rgba(170,200,232,.16)', 80, 220);
      blotches(g, rnd, x, y, w, h, w * h / 60000, 'rgba(255,255,255,.7)', 40, 140);
      speckle(g, rnd, x, y, w, h, w * h / 300, ['rgba(255,255,255,.9)', 'rgba(170,195,225,.35)'], 3);
      // 발자국 줄
      g.fillStyle = 'rgba(140,165,200,.3)';
      for (let k = 0; k < 6; k++) { let px = x + rnd() * w, py = y + rnd() * h; const a = rnd() * 7; for (let i = 0; i < 30; i++) { px += Math.cos(a + Math.sin(i * .3) * .5) * 40; py += Math.sin(a + Math.sin(i * .3) * .5) * 40; g.beginPath(); g.ellipse(px + (i % 2) * 10, py, 6, 4, a, 0, 7); g.fill(); } }
    } else if (rm.k === 'deck') {
      for (let xx = x; xx < x + w; xx += 34) { g.fillStyle = hsl(28 + rnd() * 6, 40, 52 + rnd() * 8); g.fillRect(xx, y, 34, h); g.fillStyle = 'rgba(60,30,10,.4)'; g.fillRect(xx, y, 2, h); }
      g.fillStyle = 'rgba(60,30,10,.35)'; for (let xx = x + 10; xx < x + w; xx += 34) { g.beginPath(); g.arc(xx + 7, y + 14, 2, 0, 7); g.arc(xx + 7, y + h - 14, 2, 0, 7); g.fill(); }
    } else if (rm.k === 'sand') {
      g.fillStyle = '#e7d3a1'; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, 70, 'rgba(190,150,90,.18)', 60, 180);
      speckle(g, rnd, x, y, w, h, 14000, ['rgba(140,110,60,.25)', 'rgba(255,255,255,.35)'], 2);
      // 놀이터 고무 매트 (마을 맵만)
      if (rm.label === '놀이터') for (const [mx, my, mw, mh, col] of [[2840, 1940, 240, 380, '#e86a5a'], [3940, 1890, 360, 360, '#5aa0e8'], [3240, 2770, 380, 150, '#7cc96a']]) {
        g.fillStyle = col; rr(g, mx, my, mw, mh, 26); g.fill();
        g.fillStyle = 'rgba(255,255,255,.12)'; for (let yy = my + 10; yy < my + mh; yy += 30) for (let xx = mx + 10; xx < mx + mw; xx += 30) { g.beginPath(); g.arc(xx, yy, 3, 0, 7); g.fill(); }
      }
      // 발자국
      g.fillStyle = 'rgba(150,115,60,.25)';
      if (rm.label === '놀이터') for (let i = 0; i < 40; i++) { const px = 2700 + i * 52, py = 2500 + Math.sin(i * .5) * 120; for (const [dx, dy, r] of [[0, 0, 7], [-7, -9, 3], [0, -12, 3], [7, -9, 3]]) { g.beginPath(); g.arc(px + dx, py + dy + (i % 2) * 14, r, 0, 7); g.fill(); } }
    } else if (rm.k === 'hall') {
      // 반질반질한 복도 리놀륨
      for (let xx = x; xx < x + w; xx += 60) for (let yy = y; yy < y + h; yy += 60) { g.fillStyle = ((xx + yy) / 60) % 2 ? '#d9d2c3' : '#cfc6b4'; g.fillRect(xx, yy, 60, 60); }
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,.0)'); gr.addColorStop(.5, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#6d8fb3'; g.fillRect(x, y + h / 2 - 3, w, 6);
      g.font = '30px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(60,70,90,.35)';
      for (const tx of [500, 2000, 3500]) g.fillText('복도에서 뛰지 마세요 🐾', tx, y + h / 2 + 50);
    } else if (rm.k === 'track') {
      g.fillStyle = '#c2734f'; g.fillRect(x, y, w, h);
      speckle(g, rnd, x, y, w, h, w * h / 220, ['rgba(255,220,190,.18)', 'rgba(90,30,10,.2)'], 2);
      // 잔디 운동장 + 줄무늬
      const ix = x + 180, iy = y + 180, iw = w - 360, ih = h - 360;
      g.fillStyle = '#5fa04e'; rr(g, ix, iy, iw, ih, ih / 2); g.fill();
      g.save(); rr(g, ix, iy, iw, ih, ih / 2); g.clip();
      for (let xx = ix; xx < ix + iw; xx += 120) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(xx, iy, 60, ih); }
      speckle(g, rnd, ix, iy, iw, ih, iw * ih / 300, ['rgba(40,90,30,.3)', 'rgba(170,230,130,.2)'], 3);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6;
      for (const k of [0, 50, 100]) { rr(g, ix - 30 - k, iy - 30 - k, iw + 60 + k * 2, ih + 60 + k * 2, ih / 2 + 30 + k); g.stroke(); }
      g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.8)';
      g.beginPath(); g.moveTo(x + w / 2, iy); g.lineTo(x + w / 2, iy + ih); g.stroke();
      g.beginPath(); g.arc(x + w / 2, iy + ih / 2, 160, 0, 7); g.stroke();
      for (const sx2 of [ix, ix + iw]) { g.strokeRect(sx2 - (sx2 === ix ? 0 : 260), iy + ih / 2 - 260, 260, 520); }
    } else if (rm.k === 'court') {
      for (let xx = x; xx < x + w; xx += 30) { g.fillStyle = hsl(32 + rnd() * 5, 55, 60 + rnd() * 6); g.fillRect(xx, y, 30, h); g.fillStyle = 'rgba(90,50,20,.18)'; g.fillRect(xx, y, 1.5, h); }
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, 50, x + w / 2, y + h / 2, h * .7); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.08)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 6; const m = 90;
      g.strokeRect(x + m, y + m, w - m * 2, h - m * 2);
      g.beginPath(); g.moveTo(x + m, y + h / 2); g.lineTo(x + w - m, y + h / 2); g.stroke();
      g.beginPath(); g.arc(x + w / 2, y + h / 2, 130, 0, 7); g.stroke();
      g.fillStyle = 'rgba(200,60,60,.35)';
      for (const yy of [y + m, y + h - m]) { g.beginPath(); g.arc(x + w / 2, yy, 230, yy === y + m ? 0 : Math.PI, yy === y + m ? Math.PI : 7); g.fill(); g.stroke(); }
      g.font = '90px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(120,60,20,.13)'; g.fillText('NYANG', x + w / 2, y + h / 2 + 32);
    } else if (rm.k === 'dgrass') {
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#2f3d2e'); gr.addColorStop(1, '#253025');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      blotches(g, rnd, x, y, w, h, w * h / 60000, 'rgba(90,60,110,.16)', 80, 220);
      blotches(g, rnd, x, y, w, h, w * h / 80000, 'rgba(20,25,15,.3)', 60, 160);
      for (let i = 0; i < w * h / 900; i++) { const px = x + rnd() * w, py = y + rnd() * h; g.strokeStyle = rnd() < .5 ? 'rgba(80,110,70,.5)' : 'rgba(40,60,35,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - .5) * 8, py - 9); g.stroke(); }
      // 구불구불 흙길
      g.strokeStyle = 'rgba(110,80,55,.55)'; g.lineWidth = 120; g.lineCap = 'round';
      g.beginPath(); g.moveTo(200, 300); g.bezierCurveTo(900, 200, 1200, 1300, 1800, 1200); g.bezierCurveTo(2400, 1100, 2800, 2200, 3400, 2300); g.stroke();
      g.beginPath(); g.moveTo(1800, 700); g.lineTo(1800, 1200); g.moveTo(1800, 1200); g.bezierCurveTo(1300, 1400, 900, 1600, 650, 1980); g.stroke();
      g.strokeStyle = 'rgba(70,50,35,.4)'; g.lineWidth = 3; g.setLineDash([4, 26]);
      g.beginPath(); g.moveTo(200, 300); g.bezierCurveTo(900, 200, 1200, 1300, 1800, 1200); g.bezierCurveTo(2400, 1100, 2800, 2200, 3400, 2300); g.stroke(); g.setLineDash([]);
    } else if (rm.k === 'dirt') {
      g.fillStyle = 'rgba(96,74,58,.9)'; rr(g, x, y, w, h, 80); g.fill();
      speckle(g, rnd, x, y, w, h, w * h / 200, ['rgba(160,130,100,.25)', 'rgba(30,20,10,.3)'], 3);
      // 저택 앞 돌길
      for (let yy = 470; yy < 760; yy += 46) { g.fillStyle = hsl(260, 6, 32 + rnd() * 8); rr(g, 1740 + rnd() * 10, yy, 110, 36, 12); g.fill(); }
    } else if (rm.k === 'metal') {
      g.fillStyle = '#2a3140'; g.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 80) for (let xx = x; xx < x + w; xx += 80) {
        const l = 22 + rnd() * 4; g.fillStyle = hsl(218, 14, l); rr(g, xx + 3, yy + 3, 74, 74, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(xx + 6, yy + 6, 68, 3);
        g.fillStyle = 'rgba(0,0,0,.35)'; for (const [dx, dy] of [[10, 10], [70, 10], [10, 70], [70, 70]]) { g.beginPath(); g.arc(xx + dx, yy + dy, 2.2, 0, 7); g.fill(); }
      }
      blotches(g, rnd, x, y, w, h, 18, 'rgba(0,0,0,.12)', 80, 200);
      // 바닥 안내선
      g.strokeStyle = 'rgba(80,220,255,.22)'; g.lineWidth = 8; g.setLineDash([40, 30]);
      g.beginPath(); g.moveTo(x + 60, y + h - 60); g.lineTo(x + w - 60, y + h - 60); g.stroke(); g.setLineDash([]);
    } else if (rm.k === 'grate') {
      g.fillStyle = '#1b2029'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(120,135,160,.28)'; g.lineWidth = 3;
      for (let xx = x; xx < x + w; xx += 16) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
      for (let yy = y; yy < y + h; yy += 50) { g.fillStyle = 'rgba(160,175,200,.18)'; g.fillRect(x, yy, w, 4); }
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      // 경고 줄무늬 테두리
      g.save(); g.beginPath(); g.rect(x, y, w, 14); g.rect(x, y + h - 14, w, 14); g.clip();
      for (let xx = x - 40; xx < x + w; xx += 40) { g.fillStyle = '#f2c94c'; g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + 20, y + h); g.lineTo(xx + 20 + h, y); g.lineTo(xx + h, y); g.fill(); }
      g.restore();
    }
    g.restore();
  }

  // 길에 굴러다니는 소품 (충돌 없음)
  function drawDecor(g, rnd) {
    const bowl = (x, y, col, food) => { shadowOn(g, 6, 3, .3); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 26, 18, 0, 0, 7); g.fill(); shadowOff(g); g.fillStyle = food; g.beginPath(); g.ellipse(x, y - 2, 18, 11, 0, 0, 7); g.fill(); };
    const yarn = (x, y, col) => { shadowOn(g, 6, 3, .3); g.fillStyle = col; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); shadowOff(g); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x, y, 14, k * 1.2, k * 1.2 + 2); g.stroke(); } g.beginPath(); g.moveTo(x + 12, y + 6); g.bezierCurveTo(x + 40, y + 20, x + 20, y + 40, x + 56, y + 38); g.strokeStyle = col; g.stroke(); };
    const paws = (x, y, n, dx, dy) => { g.fillStyle = 'rgba(80,50,30,.16)'; for (let i = 0; i < n; i++) { const px = x + dx * i, py = y + dy * i + (i % 2) * 12; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill(); for (const [a, b] of [[-6, -8], [0, -10], [6, -8]]) { g.beginPath(); g.arc(px + a, py + b, 2.6, 0, 7); g.fill(); } } };
    const plant = (x, y) => { shadowOn(g, 8, 4, .3); g.fillStyle = '#d07a50'; g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill(); shadowOff(g); for (let k = 0; k < 7; k++) { const a = k / 7 * 7; g.fillStyle = k % 2 ? '#4f9a45' : '#68b55a'; g.beginPath(); g.ellipse(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 16, 7, a, 0, 7); g.fill(); } };
    const lamp = (x, y) => { const gr = g.createRadialGradient(x, y, 0, x, y, 170); gr.addColorStop(0, 'rgba(255,230,150,.28)'); gr.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gr; g.fillRect(x - 170, y - 170, 340, 340); shadowOn(g, 6, 4, .4); g.fillStyle = '#3d4248'; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); shadowOff(g); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); };
    const id = C.MAP_ID;
    if (id === 'house' || id === 'town') {
      bowl(1120, 720, '#e85d75', '#a86a3a'); bowl(1060, 735, '#4aa3df', '#bfe6ff');
      yarn(760, 250, '#ff6f91'); yarn(250, 1180, '#6fc3ff'); yarn(1100, 1450, '#ffd166');
      paws(640, 700, 6, 70, -10); paws(1300, 700, 5, 60, 20);
      plant(1160, 40); plant(40, 760); plant(1150, 1560);
    } else if (id === 'cafe') {
      for (let i = 0; i < 6; i++) bowl(150 + rnd() * 1100, 150 + rnd() * 1500, ['#e85d75', '#4aa3df', '#ffd166'][i % 3], '#a86a3a');
      for (let i = 0; i < 8; i++) yarn(100 + rnd() * 2600, 100 + rnd() * 1600, ['#ff6f91', '#6fc3ff', '#ffd166', '#7ee08a'][i % 4]);
      paws(300, 1600, 10, 110, -40); plant(1340, 60); plant(60, 1740); plant(2740, 60);
      g.font = '40px Jua, sans-serif'; g.fillStyle = 'rgba(120,70,30,.25)'; g.textAlign = 'center'; g.fillText('☕ NYANG CAFE', 700, 160);
    } else if (id === 'snow') {
      for (let i = 0; i < 6; i++) paws(rnd() * W, rnd() * H, 10, 60 - rnd() * 120, 60 - rnd() * 120);
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(180,215,240,.6)'; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 40 + rnd() * 60, 20 + rnd() * 30, rnd(), 0, 7); g.fill(); }
      for (const [lx, ly] of [[600, 600], [1800, 400], [3000, 700], [900, 1900], [2400, 2000], [3300, 1400]]) lamp(lx, ly);
    } else if (id === 'hanok') {
      // 개울 위 나무다리
      for (const bx of [700, 1900, 3000]) {
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx + 8, 1176, 160, 172);
        for (let yy = 1170; yy < 1350; yy += 18) { g.fillStyle = hsl(28, 40, 34 + rnd() * 10); g.fillRect(bx, yy, 160, 16); }
        g.fillStyle = '#7f1d1d'; g.fillRect(bx - 6, 1166, 10, 188); g.fillRect(bx + 156, 1166, 10, 188);
        g.fillStyle = '#f4a261'; for (const yy of [1166, 1346]) { g.beginPath(); g.arc(bx - 1, yy, 7, 0, 7); g.arc(bx + 161, yy, 7, 0, 7); g.fill(); }
      }
      paws(1000, 1700, 12, 120, 15); paws(300, 900, 7, 70, -30);
      g.font = '120px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,200,120,.06)'; g.fillText('야시장', 1800, 1800);
    } else if (id === 'beach') {
      for (let i = 0; i < 30; i++) { const sx2 = rnd() * W, sy2 = 480 + rnd() * (H - 600); g.fillStyle = ['#ff9f80', '#ffd6a5', '#f8edeb'][i % 3]; if (i % 3 === 0) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 7, r2 = k % 2 ? 5 : 12; g.lineTo(sx2 + Math.cos(a) * r2, sy2 + Math.sin(a) * r2); } g.fill(); } else { g.beginPath(); g.arc(sx2, sy2, 7, Math.PI, 0); g.fill(); } }
      for (let i = 0; i < 5; i++) paws(rnd() * W, 600 + rnd() * 1500, 9, 70, 20 - rnd() * 40);
      g.strokeStyle = 'rgba(140,110,60,.35)'; g.lineWidth = 6; g.setLineDash([2, 22]); g.beginPath(); g.moveTo(0, 470); for (let xx = 0; xx <= W; xx += 40) g.lineTo(xx, 470 + Math.sin(xx / 90) * 12); g.stroke(); g.setLineDash([]);
    } else if (id === 'school') {
      // 운동장 분필 낙서, 축구공, 화단, 국기 게양대 그림자
      g.font = '46px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('냥냥 초등학교 운동회 🏃', 1400, 1530);
      for (const [bx, by] of [[1200, 2100], [600, 1850], [2350, 2250]]) { shadowOn(g, 6, 3, .3); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 16, 0, 7); g.fill(); shadowOff(g); g.fillStyle = '#222'; for (const [dx, dy] of [[0, 0], [-9, -8], [9, -8], [-8, 9], [8, 9]]) { g.beginPath(); g.arc(bx + dx, by + dy, 4, 0, 7); g.fill(); } }
      for (const [fx, fy, fw] of [[40, 1420, 300], [1900, 1420, 80], [2420, 2740, 120]]) {
        g.fillStyle = '#7a5236'; rr(g, fx, fy, fw, 46, 10); g.fill();
        for (let k = 0; k < fw / 16; k++) { g.fillStyle = ['#ff7f9e', '#ffd166', '#fff', '#b18cff'][k % 4]; g.beginPath(); g.arc(fx + 10 + k * 16, fy + 14 + (k % 2) * 16, 7, 0, 7); g.fill(); }
      }
      // 줄넘기·훌라후프 (체육관)
      g.strokeStyle = '#ff006e'; g.lineWidth = 5; g.beginPath(); g.ellipse(3500, 2550, 40, 26, .3, 0, 7); g.stroke();
      g.strokeStyle = '#3a86ff'; g.beginPath(); g.ellipse(3000, 1600, 36, 22, -.4, 0, 7); g.stroke();
      paws(150, 1250, 20, 180, (rnd() - .5) * 20); paws(2900, 2000, 8, 70, 40);
      // 교실 책가방
      for (let i = 0; i < 6; i++) { const bx = 120 + rnd() * 760, by = 860 + rnd() * 160; g.fillStyle = ['#ef476f', '#118ab2', '#ffd166', '#06d6a0'][i % 4]; rr(g, bx, by, 34, 40, 8); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, bx + 6, by + 6, 22, 8, 4); g.fill(); }
      // 음악실 음표
      g.font = '34px sans-serif'; g.fillStyle = 'rgba(80,40,120,.25)'; for (let i = 0; i < 8; i++) g.fillText(['♪', '♫', '♬'][i % 3], 1100 + rnd() * 800, 350 + rnd() * 400);
    } else if (id === 'halloween') {
      // 사탕 껍질, 거미줄, 안개 웅덩이, 발자국
      for (let i = 0; i < 40; i++) { const cx = rnd() * W, cy = rnd() * H, col = ['#ff006e', '#ffbe0b', '#8338ec', '#3a86ff', '#06d6a0'][i % 5]; g.save(); g.translate(cx, cy); g.rotate(rnd() * 3); g.fillStyle = col; rr(g, -9, -5, 18, 10, 4); g.fill(); g.beginPath(); g.moveTo(-9, 0); g.lineTo(-17, -6); g.lineTo(-17, 6); g.fill(); g.beginPath(); g.moveTo(9, 0); g.lineTo(17, -6); g.lineTo(17, 6); g.fill(); g.restore(); }
      for (let i = 0; i < 14; i++) { const fx = rnd() * W, fy = rnd() * H, gr = g.createRadialGradient(fx, fy, 10, fx, fy, 200); gr.addColorStop(0, 'rgba(180,170,220,.12)'); gr.addColorStop(1, 'rgba(180,170,220,0)'); g.fillStyle = gr; g.fillRect(fx - 200, fy - 200, 400, 400); }
      for (let i = 0; i < 6; i++) paws(rnd() * W, rnd() * H, 9, 60 - rnd() * 120, 60 - rnd() * 120);
      g.font = '130px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,140,40,.07)'; g.fillText('BOO!', 2600, 2200); g.fillText('🎃', 900, 1100);
      g.font = '40px Jua, sans-serif'; g.fillStyle = 'rgba(220,220,240,.25)'; g.fillText('냥 묘지', 650, 1480);
    } else if (id === 'space') {
      // 도어 경고 줄무늬, 방향 화살표, 로고
      const hazard = (hx, hy, hw, hh) => { g.save(); g.beginPath(); g.rect(hx, hy, hw, hh); g.clip(); for (let k = -hh; k < hw; k += 30) { g.fillStyle = 'rgba(242,201,76,.75)'; g.beginPath(); g.moveTo(hx + k, hy + hh); g.lineTo(hx + k + 15, hy + hh); g.lineTo(hx + k + 15 + hh, hy); g.lineTo(hx + k + hh, hy); g.fill(); } g.restore(); };
      for (const [a, b] of [[500, 720], [1700, 1920], [2950, 3170]]) hazard(a, 1270, b - a, 60);
      for (const [a, b] of [[500, 720], [1700, 1920], [2300, 2520], [3300, 3520]]) hazard(a, 1470, b - a, 60);
      for (const yy of [500]) { hazard(1470, yy, 60, 220); hazard(2470, yy, 60, 220); }
      hazard(1370, 2000, 60, 220); hazard(2570, 2300, 60, 220);
      g.fillStyle = 'rgba(80,220,255,.25)';
      for (let xx = 200; xx < 3900; xx += 300) { g.beginPath(); g.moveTo(xx, 1380); g.lineTo(xx + 50, 1400); g.lineTo(xx, 1420); g.lineTo(xx + 14, 1400); g.fill(); }
      g.font = '80px Jua, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(120,220,255,.08)'; g.fillText('NYANG-7', 2000, 1120);
      // 거주구역 옷가지, 연구실 서류
      for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(255,255,255,.55)'; g.save(); g.translate(2600 + rnd() * 1300, 300 + rnd() * 900); g.rotate(rnd() * 3); g.fillRect(-12, -16, 24, 32); g.restore(); }
      paws(300, 900, 10, 110, 20); paws(1600, 2700, 8, 90, -20);
      // 반응로 바닥 냉각관
      g.strokeStyle = 'rgba(76,201,240,.35)'; g.lineWidth = 18; g.lineCap = 'round';
      for (const [ex, ey] of [[1450, 1550], [2550, 1550], [1450, 2750], [2550, 2750]]) { g.beginPath(); g.moveTo(2000, 2100); g.lineTo(ex, ey); g.stroke(); }
    }
    if (C.MAP_ID === 'town') {
      paws(2500, 1000, 8, 80, 25); paws(600, 3000, 8, 90, -20); paws(3000, 2600, 7, 80, 30);
      for (const [lx, ly] of [[2560, 560], [3400, 560], [4300, 560], [2900, 1420], [4400, 1420], [300, 1700], [1600, 1720], [2200, 2100], [700, 3000], [1900, 2650], [3100, 1800], [4600, 2600], [3600, 3100]]) lamp(lx, ly);
      yarn(3000, 2450, '#ff6f91'); yarn(4400, 2400, '#7ee08a'); bowl(2520, 900, '#ffb703', '#a86a3a');
      // 화단
      for (const [fx, fy, fw] of [[2440, 30, 160], [4620, 1300, 160], [40, 1640, 200], [2100, 1660, 220], [2450, 3100, 300], [4560, 1780, 200]]) {
        g.fillStyle = '#7a5236'; rr(g, fx, fy, fw, 50, 10); g.fill();
        for (let k = 0; k < fw / 16; k++) { g.fillStyle = ['#ff7f9e', '#ffd166', '#fff', '#b18cff'][k % 4]; g.beginPath(); g.arc(fx + 10 + k * 16, fy + 16 + (k % 2) * 16, 7, 0, 7); g.fill(); }
      }
      // 시장 줄전구 그림자 자리
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3;
      for (const yy of [500, 960]) { g.beginPath(); g.moveTo(2420, yy); for (let xx = 2420; xx < 4800; xx += 200) g.quadraticCurveTo(xx + 100, yy + 40, xx + 200, yy); g.stroke(); }
    }
  }

  function drawWall(g, o, shadowPass) {
    if (shadowPass) { g.save(); shadowOn(g, 22, 10, .45); g.fillStyle = '#3e2f28'; g.fillRect(o.x, o.y, o.w, o.h); g.restore(); return; }
    const gr = o.w > o.h ? g.createLinearGradient(0, o.y, 0, o.y + o.h) : g.createLinearGradient(o.x, 0, o.x + o.w, 0);
    gr.addColorStop(0, '#7a6354'); gr.addColorStop(.5, '#5a463c'); gr.addColorStop(1, '#3e2f28');
    if (o.w > o.h) { g.fillStyle = '#2e221c'; g.fillRect(o.x, o.y + o.h, o.w, 12); g.fillStyle = 'rgba(255,255,255,.06)'; for (let xx = o.x + 20; xx < o.x + o.w; xx += 40) g.fillRect(xx, o.y + o.h + 2, 2, 8); }
    g.fillStyle = gr; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = 'rgba(255,255,255,.18)'; if (o.w > o.h) g.fillRect(o.x, o.y + 2, o.w, 3); else g.fillRect(o.x + 2, o.y, 3, o.h);
    g.fillStyle = '#c9b39a'; for (const [cx, cy] of [[o.x, o.y], [o.x + o.w, o.y + o.h]]) { g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill(); }
  }

  function drawSolid(g, o, rnd) {
    g.save();
    const { x, y, w, h } = o;
    // 위에서 비스듬히 본 느낌: 아래쪽에 옆면을 깔고 윗면에 빛 그라데이션
    const body = (fill, rad = 10) => {
      shadowOn(g); g.fillStyle = fill; rr(g, x, y + 10, w, h, rad); g.fill(); shadowOff(g);
      g.fillStyle = 'rgba(20,10,5,.32)'; rr(g, x, y + 10, w, h, rad); g.fill();
      g.fillStyle = fill; rr(g, x, y, w, h, rad); g.fill();
      const lg = g.createLinearGradient(x, y, x, y + h); lg.addColorStop(0, 'rgba(255,255,255,.22)'); lg.addColorStop(.6, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.08)');
      g.fillStyle = lg; rr(g, x, y, w, h, rad); g.fill();
      g.strokeStyle = 'rgba(30,20,15,.6)'; g.lineWidth = 3; rr(g, x, y, w, h, rad); g.stroke();
    };
    const lbl = (txt, col = 'rgba(0,0,0,.45)', yy = y + h / 2) => { if (!txt) return; g.fillStyle = col; g.font = '18px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x + w / 2, yy); };
    switch (o.k) {
      case 'sofa': {
        body('#4f7fc4', 18);
        g.fillStyle = '#3c69a8'; rr(g, x + 4, y + 4, w - 8, 26, 12); g.fill();
        g.fillStyle = '#6f9ce0'; rr(g, x + 14, y + 30, w / 2 - 20, h - 40, 12); g.fill(); rr(g, x + w / 2 + 6, y + 30, w / 2 - 20, h - 40, 12); g.fill();
        g.fillStyle = '#3c69a8'; rr(g, x - 4, y + 10, 26, h - 14, 12); g.fill(); rr(g, x + w - 22, y + 10, 26, h - 14, 12); g.fill();
        g.fillStyle = '#ffd166'; rr(g, x + 40, y + 34, 40, 30, 10); g.fill(); g.fillStyle = '#ff8fab'; rr(g, x + w - 84, y + 34, 40, 30, 10); g.fill();
        break;
      }
      case 'tv': {
        body('#24242b', 6);
        g.fillStyle = '#3d5a80'; rr(g, x + 10, y + 6, w - 20, h - 16, 4); g.fill();
        const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.4, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + 10, y + 6, w - 20, h - 16);
        g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(x + w - 16, y + h - 6, 3, 0, 7); g.fill();
        break;
      }
      case 'shelf': case 'wardrobe': {
        body(o.k === 'shelf' ? '#9a6b44' : '#a8774e', 6);
        const vert = h > w, cols = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#f4a261', '#8ab17d', '#b5838d'];
        if (o.k === 'shelf') {
          for (let i = 0; i < 4; i++) {
            if (vert) { const sy = y + 8 + i * (h - 16) / 4; for (let k = 0, bx = x + 8; bx < x + w - 10; k++) { const bw = 7 + rnd() * 6; g.fillStyle = cols[(i * 3 + k) % 7]; g.fillRect(bx, sy + 4, bw, (h - 16) / 4 - 10); bx += bw + 1; } g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 4, sy + (h - 16) / 4 - 4, w - 8, 3); }
            else { const sx = x + 8 + i * (w - 16) / 4; for (let k = 0, by = y + 8; by < y + h - 10; k++) { const bh = 7 + rnd() * 6; g.fillStyle = cols[(i * 3 + k) % 7]; g.fillRect(sx + 4, by, (w - 16) / 4 - 10, bh); by += bh + 1; } }
          }
        } else {
          g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 6, y + h / 2); g.lineTo(x + w - 6, y + h / 2); g.stroke();
          g.fillStyle = '#e6c27a'; g.beginPath(); g.arc(x + w / 2 + 10, y + h / 2 - 14, 5, 0, 7); g.fill(); g.beginPath(); g.arc(x + w / 2 + 10, y + h / 2 + 14, 5, 0, 7); g.fill();
        }
        break;
      }
      case 'table': {
        body('#b98652', 16);
        g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, x + 8, y + 6, w - 16, 12, 6); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 40, y + 40, 12, 0, 7); g.fill(); g.fillStyle = '#7b4b2a'; g.beginPath(); g.arc(x + 40, y + 40, 8, 0, 7); g.fill();
        g.fillStyle = '#ffd6a5'; rr(g, x + 80, y + 26, 46, 30, 6); g.fill(); g.strokeStyle = '#c9905a'; g.lineWidth = 2; g.stroke();
        break;
      }
      case 'tower': {
        body('#b9a5d6', 14);
        g.fillStyle = '#d9c9a3'; for (const [px, py] of [[x + 14, y + h - 30], [x + w - 30, y + 14]]) { g.beginPath(); g.arc(px + 8, py + 8, 12, 0, 7); g.fill(); g.strokeStyle = '#a58c5c'; g.lineWidth = 2; for (let k = -8; k < 10; k += 5) { g.beginPath(); g.moveTo(px - 2, py + 8 + k); g.lineTo(px + 18, py + 8 + k); g.stroke(); } }
        g.fillStyle = '#e3d8f2'; for (let i = 0; i < 3; i++) { rr(g, x + 10, y + 10 + i * 38, w - 20, 24, 10); g.fill(); }
        g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(x + w - 14, y + h - 10, 8, 0, 7); g.fill();
        break;
      }
      case 'counter': {
        body('#ece6dc', 8);
        g.fillStyle = '#c9d3d8'; rr(g, x + w * .38, y + 10, w * .22, h - 20, 10); g.fill(); g.fillStyle = '#9fb0b8'; g.beginPath(); g.arc(x + w * .49, y + h / 2, 5, 0, 7); g.fill();
        g.fillStyle = '#3a3a40'; for (const cx of [x + w * .78, x + w * .9]) { g.beginPath(); g.arc(cx, y + h / 2, 14, 0, 7); g.fill(); g.strokeStyle = '#ff7b54'; g.lineWidth = 2; g.beginPath(); g.arc(cx, y + h / 2, 9, 0, 7); g.stroke(); }
        g.fillStyle = '#7cc96a'; g.beginPath(); g.ellipse(x + w * .15, y + h / 2, 18, 12, 0, 0, 7); g.fill();
        lbl(o.label, 'rgba(0,0,0,.35)', y + h - 10);
        break;
      }
      case 'fridge': {
        body('#e3ecf1', 10);
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 6, y + h * .4); g.lineTo(x + w - 6, y + h * .4); g.stroke();
        g.fillStyle = '#9aa9b2'; rr(g, x + 10, y + 20, 8, 30, 3); g.fill(); rr(g, x + 10, y + h * .4 + 14, 8, 40, 3); g.fill();
        for (const [mx, my, c] of [[x + 50, y + 30, '#ff6f91'], [x + 70, y + 80, '#ffd166'], [x + 40, y + 110, '#6fc3ff']]) { g.fillStyle = c; g.beginPath(); g.arc(mx, my, 7, 0, 7); g.fill(); }
        break;
      }
      case 'desk': {
        body('#c39566', 8);
        g.fillStyle = '#2d3142'; rr(g, x + 60, y + 14, 100, 60, 6); g.fill(); g.fillStyle = '#7fd1ff'; rr(g, x + 66, y + 18, 88, 46, 4); g.fill();
        g.fillStyle = '#fff'; rr(g, x + 14, y + 30, 30, 40, 4); g.fill(); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x + w - 30, y + 30, 12, 0, 7); g.fill();
        break;
      }
      case 'drawer': {
        body('#c7a07a', 8);
        for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(x + 8 + i * (w - 16) / 3, y + 8, (w - 16) / 3 - 4, h - 16); g.fillStyle = '#e6c27a'; g.beginPath(); g.arc(x + 8 + (i + .5) * (w - 16) / 3, y + h / 2, 4, 0, 7); g.fill(); }
        break;
      }
      case 'headboard': body('#8c6a9c', 12); g.fillStyle = 'rgba(255,255,255,.2)'; rr(g, x + 10, y + 6, w - 20, 10, 5); g.fill(); break;
      case 'pond': {
        g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2 + 14, h / 2 + 12, 0, 0, 7); g.fill();
        for (let k = 0; k < 18; k++) { const a = k / 18 * 7; g.fillStyle = k % 2 ? '#9a9286' : '#b3aa9b'; g.beginPath(); g.ellipse(x + w / 2 + Math.cos(a) * (w / 2 + 8), y + h / 2 + Math.sin(a) * (h / 2 + 6), 16, 11, a, 0, 7); g.fill(); }
        const gr = g.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, w / 2);
        const icy = C.MAP_ID === 'snow';
        gr.addColorStop(0, icy ? '#bfe0f5' : '#3f97c4'); gr.addColorStop(1, icy ? '#e6f4fc' : '#6cc3e6');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + w * (.3 + rnd() * .4), y + h * (.3 + rnd() * .4), 20 + k * 6, 8 + k * 2, 0, 0, 7); g.stroke(); }
        if (icy) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; for (let k = 0; k < 8; k++) { const px = x + w * (.2 + rnd() * .6), py = y + h * (.2 + rnd() * .6); g.beginPath(); g.moveTo(px, py); g.lineTo(px + 30 - rnd() * 60, py + 20 - rnd() * 40); g.stroke(); } lbl(o.label, 'rgba(40,80,120,.45)'); break; }
        for (let k = 0; k < 4; k++) { const lx = x + w * (.15 + rnd() * .7), ly = y + h * (.2 + rnd() * .6); g.fillStyle = '#5fae55'; g.beginPath(); g.arc(lx, ly, 16, .4, 6.0); g.lineTo(lx, ly); g.fill(); if (k % 2) { g.fillStyle = '#ff9ec4'; g.beginPath(); g.arc(lx + 4, ly - 4, 5, 0, 7); g.fill(); } }
        g.fillStyle = '#ff8a3d'; for (const [dx, dy] of [[.6, .55], [.45, .7], [.3, .4]]) { g.beginPath(); g.ellipse(x + w * dx, y + h * dy, 12, 6, .4, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + w * dx - 10, y + h * dy - 3); g.lineTo(x + w * dx - 18, y + h * dy - 8); g.lineTo(x + w * dx - 18, y + h * dy + 4); g.fill(); }
        if (o.label === '호수') lbl('호수', 'rgba(255,255,255,.5)');
        break;
      }
      case 'pot': {
        shadowOn(g, 10, 5); g.fillStyle = '#c96f4a'; g.beginPath(); g.arc(x + 30, y + 30, 28, 0, 7); g.fill(); shadowOff(g);
        g.fillStyle = '#a95a3a'; g.beginPath(); g.arc(x + 30, y + 30, 22, 0, 7); g.fill();
        for (let i = 0; i < 8; i++) { const a = i / 8 * 7; g.fillStyle = i % 2 ? '#4f9a45' : '#6cbf5a'; g.beginPath(); g.ellipse(x + 30 + Math.cos(a) * 13, y + 30 + Math.sin(a) * 13, 16, 8, a, 0, 7); g.fill(); }
        g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(x + 30, y + 30, 6, 0, 7); g.fill();
        break;
      }
      case 'stall': {
        body('#a0704a', 8);
        g.fillStyle = '#f3e3c3'; rr(g, x + 6, y + 6, w - 12, h - 20, 6); g.fill();
        const goods = { '생선 가게': ['#8fb3c9', 'fish'], '과일 가게': ['#ff6b6b', 'ball'], '빵집': ['#d9a066', 'bread'], '꽃집': ['#ff9ec4', 'ball'], '츄르 가게': ['#ffd166', 'stick'], '장난감': ['#6fc3ff', 'ball'], '방석 가게': ['#b18cff', 'bread'], '캔 가게': ['#c0c7cc', 'can'] }[o.label] || ['#ccc', 'ball'];
        for (let k = 0; k < 9; k++) {
          const gx = x + 22 + k * ((w - 44) / 8), gy = y + 22 + (k % 2) * 16;
          g.fillStyle = k % 3 === 1 ? '#fff4' : goods[0];
          if (goods[1] === 'fish') { g.fillStyle = goods[0]; g.beginPath(); g.ellipse(gx, gy, 12, 6, .3, 0, 7); g.fill(); g.beginPath(); g.moveTo(gx - 10, gy - 3); g.lineTo(gx - 18, gy - 9); g.lineTo(gx - 18, gy + 3); g.fill(); }
          else if (goods[1] === 'bread') { g.fillStyle = goods[0]; rr(g, gx - 12, gy - 7, 24, 14, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx - 4, gy - 6); g.lineTo(gx - 8, gy + 6); g.moveTo(gx + 4, gy - 6); g.lineTo(gx, gy + 6); g.stroke(); }
          else if (goods[1] === 'stick') { g.fillStyle = goods[0]; rr(g, gx - 4, gy - 12, 8, 24, 3); g.fill(); }
          else if (goods[1] === 'can') { g.fillStyle = goods[0]; g.beginPath(); g.arc(gx, gy, 8, 0, 7); g.fill(); g.strokeStyle = '#8a9399'; g.lineWidth = 2; g.stroke(); }
          else { g.fillStyle = k % 2 ? goods[0] : '#ffd166'; g.beginPath(); g.arc(gx, gy, 8, 0, 7); g.fill(); }
        }
        lbl(o.label, 'rgba(255,255,255,.95)', y + h - 7);
        break;
      }
      case 'fountain': {
        const cx = x + w / 2, cy = y + h / 2;
        shadowOn(g, 20, 10); g.fillStyle = '#b8b0a2'; g.beginPath(); g.arc(cx, cy, w / 2, 0, 7); g.fill(); shadowOff(g);
        g.fillStyle = '#d6cfc2'; g.beginPath(); g.arc(cx, cy, w / 2 - 6, 0, 7); g.fill();
        const gr = g.createRadialGradient(cx, cy, 10, cx, cy, w / 2 - 16); gr.addColorStop(0, '#9be0ff'); gr.addColorStop(1, '#3b9ed1');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, w / 2 - 18, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; for (const rad of [30, 52, 72]) { g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.stroke(); }
        g.fillStyle = '#d6cfc2'; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill(); g.fillStyle = '#e9fbff'; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
        // 고양이 동상 귀
        g.fillStyle = '#c4bcae'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 6, cy - 14); g.lineTo(cx + s * 16, cy - 30); g.lineTo(cx + s * 20, cy - 10); g.fill(); }
        break;
      }
      case 'tree': {
        const cx = x + w / 2, cy = y + h / 2;
        g.fillStyle = 'rgba(20,40,10,.3)'; g.beginPath(); g.ellipse(cx + 16, cy + 22, 92, 70, 0, 0, 7); g.fill();
        g.fillStyle = '#6b4a2f'; g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fill();
        const r0 = rand(Math.round(x * 3 + y));
        for (let k = 0; k < 9; k++) { const a = k / 9 * 7, rd = 34 + r0() * 16; g.fillStyle = k % 2 ? '#3e8a3a' : '#4d9e45'; g.beginPath(); g.arc(cx + Math.cos(a) * 40, cy + Math.sin(a) * 34, rd, 0, 7); g.fill(); }
        g.fillStyle = '#5db552'; g.beginPath(); g.arc(cx - 6, cy - 8, 46, 0, 7); g.fill();
        for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(190,240,140,.35)'; g.beginPath(); g.arc(cx - 30 + r0() * 50, cy - 36 + r0() * 40, 10 + r0() * 8, 0, 7); g.fill(); }
        if (r0() < .6) { g.fillStyle = '#ff6b6b'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx - 40 + r0() * 80, cy - 30 + r0() * 60, 5, 0, 7); g.fill(); } }
        break;
      }
      case 'bench': {
        shadowOn(g, 10, 6); g.fillStyle = '#8a5a35'; rr(g, x, y, w, h, 6); g.fill(); shadowOff(g);
        g.fillStyle = '#b07a4c'; for (let k = 0; k < 3; k++) { rr(g, x + 4, y + 4 + k * 15, w - 8, 11, 4); g.fill(); }
        g.fillStyle = '#3d4248'; g.fillRect(x + 10, y - 4, 8, h + 8); g.fillRect(x + w - 18, y - 4, 8, h + 8);
        break;
      }
      case 'fence': {
        shadowOn(g, 8, 6, .3); g.fillStyle = '#b98a5a'; g.fillRect(x, y, w, h); shadowOff(g);
        g.fillStyle = '#e2c08f';
        if (w > h) for (let xx = x + 4; xx < x + w - 10; xx += 22) { rr(g, xx, y - 6, 14, h + 12, 5); g.fill(); }
        else for (let yy = y + 4; yy < y + h - 10; yy += 22) { rr(g, x - 6, yy, w + 12, 14, 5); g.fill(); }
        break;
      }
      case 'slide': {
        shadowOn(g, 16, 8); g.fillStyle = '#ff7a59'; rr(g, x, y, w, h, 16); g.fill(); shadowOff(g);
        const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#ffd166'); gr.addColorStop(1, '#ffb703');
        g.fillStyle = gr; rr(g, x + 22, y + 50, w - 44, h - 60, 14); g.fill();
        g.fillStyle = '#4ea8de'; rr(g, x + 10, y + 6, w - 20, 44, 8); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + 16, y + 12 + k * 10); g.lineTo(x + w - 16, y + 12 + k * 10); g.stroke(); }
        lbl(o.label, 'rgba(120,40,20,.6)', y + h - 30);
        break;
      }
      case 'gym': {
        g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, x + 10, y + 14, w, h, 10); g.fill();
        g.lineWidth = 10; g.lineCap = 'round';
        for (let k = 0; k <= 4; k++) { g.strokeStyle = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#ef476f'][k]; g.beginPath(); g.moveTo(x + k * w / 4, y); g.lineTo(x + k * w / 4, y + h); g.stroke(); g.beginPath(); g.moveTo(x, y + k * h / 4); g.lineTo(x + w, y + k * h / 4); g.stroke(); }
        g.fillStyle = '#073b4c'; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { g.beginPath(); g.arc(x + i * w / 4, y + j * h / 4, 6, 0, 7); g.fill(); }
        break;
      }
      case 'seesaw': {
        shadowOn(g, 10, 6); g.fillStyle = '#8338ec'; rr(g, x, y + 14, w, h - 28, 8); g.fill(); shadowOff(g);
        g.fillStyle = '#3a86ff'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 18, 0, 7); g.fill();
        g.fillStyle = '#ffbe0b'; rr(g, x + 6, y + 4, 30, h - 8, 8); g.fill(); rr(g, x + w - 36, y + 4, 30, h - 8, 8); g.fill();
        break;
      }
      case 'stream': {
        const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#1d3557'); gr.addColorStop(.5, '#28507e'); gr.addColorStop(1, '#1d3557');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        // 물가 돌
        for (let xx = x; xx < x + w; xx += 34) for (const yy of [y, y + h]) { g.fillStyle = hsl(240, 6, 30 + rnd() * 18); g.beginPath(); g.ellipse(xx + rnd() * 20, yy + (rnd() - .5) * 10, 18 + rnd() * 10, 10 + rnd() * 5, rnd(), 0, 7); g.fill(); }
        for (let k = 0; k < w / 220; k++) { const lx = x + 40 + rnd() * (w - 80), ly = y + 40 + rnd() * (h - 80); g.fillStyle = '#2d6a4f'; g.beginPath(); g.arc(lx, ly, 14, .4, 6); g.lineTo(lx, ly); g.fill(); if (rnd() < .5) { g.fillStyle = '#ffafcc'; g.beginPath(); g.arc(lx + 3, ly - 3, 5, 0, 7); g.fill(); } }
        break;
      }
      case 'hanok': {
        // 기단(돌) → 마루 → 기와지붕(처마가 바깥으로)
        const ov = 34;
        shadowOn(g, 30, 16, .5); g.fillStyle = '#6c6a73'; g.fillRect(x - 8, y + 10, w + 16, h + 10); shadowOff(g);
        g.fillStyle = '#8d8a92'; g.fillRect(x - 8, y + h + 8, w + 16, 14);
        g.fillStyle = '#a07a52'; g.fillRect(x + 6, y + h - 8, w - 12, 16);
        for (let xx = x + 20; xx < x + w - 10; xx += 80) { g.fillStyle = '#7a4e2d'; g.fillRect(xx, y + h - 22, 12, 30); }
        // 지붕
        const rx = x - ov, ry = y - ov * .6, rw = w + ov * 2, rh = h + ov * 1.2;
        g.save();
        g.beginPath(); g.moveTo(rx - 14, ry - 10); g.quadraticCurveTo(rx + rw / 2, ry + 18, rx + rw + 14, ry - 10); g.lineTo(rx + rw + 8, ry + rh + 10); g.quadraticCurveTo(rx + rw / 2, ry + rh - 16, rx - 8, ry + rh + 10); g.closePath();
        const rg = g.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, '#2b2d42'); rg.addColorStop(.5, '#3d405b'); rg.addColorStop(1, '#22233a');
        g.fillStyle = rg; g.fill(); g.clip();
        // 기와 골
        g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 3;
        for (let xx = rx; xx < rx + rw; xx += 16) { g.beginPath(); g.moveTo(xx, ry); g.lineTo(xx + (xx - (rx + rw / 2)) * .05, ry + rh); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.25)'; for (let yy = ry + 8; yy < ry + rh; yy += 14) for (let xx = rx; xx < rx + rw; xx += 16) { g.beginPath(); g.arc(xx + 8, yy, 6, 0, Math.PI); g.fill(); }
        g.restore();
        // 용마루
        const my = y + h / 2 - 6;
        g.fillStyle = '#1b1c2e'; rr(g, x + 20, my - 9, w - 40, 22, 8); g.fill();
        g.fillStyle = '#e9ecef'; g.fillRect(x + 26, my - 2, w - 52, 4);
        for (const ex of [x + 16, x + w - 16]) { g.fillStyle = '#1b1c2e'; g.beginPath(); g.moveTo(ex, my - 12); g.lineTo(ex + (ex < x + w / 2 ? -18 : 18), my - 26); g.lineTo(ex, my + 8); g.fill(); }
        // 단청 띠
        g.strokeStyle = '#2a9d8f'; g.lineWidth = 4; g.beginPath(); g.moveTo(rx, ry + rh + 6); g.quadraticCurveTo(rx + rw / 2, ry + rh - 18, rx + rw, ry + rh + 6); g.stroke();
        g.strokeStyle = '#e63946'; g.lineWidth = 2; g.beginPath(); g.moveTo(rx + 6, ry + rh + 1); g.quadraticCurveTo(rx + rw / 2, ry + rh - 22, rx + rw - 6, ry + rh + 1); g.stroke();
        // 창호지 불빛
        for (let xx = x + 50; xx < x + w - 60; xx += 120) { const lg = g.createRadialGradient(xx + 20, y + h + 18, 2, xx + 20, y + h + 18, 70); lg.addColorStop(0, 'rgba(255,214,140,.55)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = lg; g.fillRect(xx - 50, y + h - 40, 140, 120); }
        if (o.label) { g.fillStyle = 'rgba(255,240,210,.85)'; g.font = '20px Jua, sans-serif'; g.textAlign = 'center'; g.fillText(o.label, x + w / 2, my + 40); }
        break;
      }
      case 'dam': {
        shadowOn(g, 12, 8, .45); g.fillStyle = '#5c5a66'; g.fillRect(x, y, w, h); shadowOff(g);
        const horiz = w > h;
        for (let k = 0; k < (horiz ? w : h) / 22; k++) { g.fillStyle = hsl(30, 8, 40 + rnd() * 18); const px = horiz ? x + k * 22 + 11 : x + w / 2, py = horiz ? y + h / 2 : y + k * 22 + 11; g.beginPath(); g.ellipse(px, py + 2, 12, 9, rnd(), 0, 7); g.fill(); }
        g.fillStyle = '#2b2d42'; if (horiz) { rr(g, x - 6, y - 8, w + 12, 12, 4); g.fill(); } else { rr(g, x - 8, y - 6, 12, h + 12, 4); g.fill(); }
        g.fillStyle = '#1b1c2e'; g.fillRect(horiz ? x : x + w + 2, horiz ? y + h : y, horiz ? w : 8, horiz ? 10 : h);
        break;
      }
      case 'cherry': {
        const cx = x + w / 2, cy = y + h / 2, r0 = rand(Math.round(x * 3 + y * 7));
        g.fillStyle = 'rgba(20,10,30,.4)'; g.beginPath(); g.ellipse(cx + 22, cy + 26, 100, 70, 0, 0, 7); g.fill();
        g.fillStyle = '#4a2f27'; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill();
        g.strokeStyle = '#4a2f27'; g.lineWidth = 8; for (let k = 0; k < 4; k++) { const a = k * 1.6 + .5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 50); g.stroke(); }
        for (let k = 0; k < 16; k++) { const a = r0() * 7, d = r0() * 55, rr2 = 26 + r0() * 18; const pg = g.createRadialGradient(cx + Math.cos(a) * d - 6, cy + Math.sin(a) * d - 8, 2, cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr2); pg.addColorStop(0, '#ffe5ec'); pg.addColorStop(.6, '#ffb3c6'); pg.addColorStop(1, '#fb6f92'); g.fillStyle = pg; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr2, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 24; k++) { g.beginPath(); g.arc(cx - 60 + r0() * 120, cy - 60 + r0() * 110, 2.5, 0, 7); g.fill(); }
        // 떨어진 꽃잎
        g.fillStyle = 'rgba(255,179,198,.75)'; for (let k = 0; k < 30; k++) { const a = r0() * 7, d = 70 + r0() * 90; g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, 4, 2.5, a, 0, 7); g.fill(); }
        break;
      }
      case 'pocha': {
        shadowOn(g, 18, 10, .5); g.fillStyle = '#5a3825'; rr(g, x, y + 10, w, h, 8); g.fill(); shadowOff(g);
        g.fillStyle = '#e9e2d0'; rr(g, x + 8, y + 18, w - 16, h - 22, 6); g.fill();
        // 음식
        const fc = { '떡볶이': '#e63946', '어묵': '#e9c46a', '붕어빵': '#c8883e', '호떡': '#b5651d', '닭꼬치': '#9c4221', '솜사탕': '#ffafcc', '군고구마': '#7b2d26', '식혜': '#f1faee' }[o.label] || '#e9c46a';
        for (let k = 0; k < 7; k++) { g.fillStyle = fc; g.beginPath(); g.ellipse(x + 26 + k * (w - 52) / 6, y + 50 + (k % 2) * 14, 13, 8, k, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x + 22 + k * (w - 52) / 6, y + 46 + (k % 2) * 14, 3, 0, 7); g.fill(); }
        // 김
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { const sx2 = x + 50 + k * 70; g.beginPath(); g.moveTo(sx2, y + 40); g.bezierCurveTo(sx2 - 10, y + 24, sx2 + 10, y + 16, sx2, y); g.stroke(); }
        // 주황 천막 지붕
        g.fillStyle = '#f77f00'; g.beginPath(); g.moveTo(x - 10, y - 4); g.lineTo(x + w + 10, y - 4); g.lineTo(x + w + 4, y + 22); g.lineTo(x - 4, y + 22); g.fill();
        for (let k = 0; k < (w + 20) / 26; k++) { g.fillStyle = k % 2 ? '#fcbf49' : '#d62828'; g.beginPath(); g.arc(x - 10 + k * 26 + 13, y + 22, 13, 0, Math.PI); g.fill(); }
        g.fillStyle = '#fff'; g.font = '22px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label, x + w / 2, y + 8);
        break;
      }
      case 'pine': {
        const cx = x + w / 2, cy = y + h / 2, r0 = rand(Math.round(x * 5 + y));
        g.fillStyle = 'rgba(40,60,90,.25)'; g.beginPath(); g.ellipse(cx + 20, cy + 26, 80, 56, 0, 0, 7); g.fill();
        g.fillStyle = '#5b3f2a'; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
        for (let k = 0; k < 4; k++) {
          const rad = 70 - k * 15, n = 9;
          g.fillStyle = ['#1f5f3f', '#26704a', '#2f8256', '#3b9463'][k];
          g.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr2 = i % 2 ? rad * .62 : rad; g.lineTo(cx + Math.cos(a + k) * rr2, cy + Math.sin(a + k) * rr2 - k * 4); } g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 7; k++) { const a = r0() * 7, d = 10 + r0() * 45; g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d - 8, 10 + r0() * 8, 6, a, 0, 7); g.fill(); }
        break;
      }
      case 'rock': {
        const r0 = rand(Math.round(x + y * 3));
        shadowOn(g, 14, 8, .35); g.fillStyle = '#8d8a85';
        g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 7, rx = w / 2 * (.8 + r0() * .25), ry = h / 2 * (.8 + r0() * .25); g.lineTo(x + w / 2 + Math.cos(a) * rx, y + h / 2 + Math.sin(a) * ry); } g.closePath(); g.fill(); shadowOff(g);
        g.fillStyle = '#a9a6a0'; g.beginPath(); g.ellipse(x + w * .42, y + h * .38, w * .26, h * .2, -.3, 0, 7); g.fill();
        if (C.MAP_ID === 'snow') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + w * .45, y + h * .3, w * .3, h * .16, -.2, 0, 7); g.fill(); }
        else { g.fillStyle = 'rgba(80,140,70,.45)'; g.beginPath(); g.ellipse(x + w * .7, y + h * .7, 14, 8, 0, 0, 7); g.fill(); }
        break;
      }
      case 'snowman': {
        const cx = x + w / 2, cy = y + h / 2;
        g.fillStyle = 'rgba(60,90,130,.25)'; g.beginPath(); g.ellipse(cx + 8, cy + 14, 40, 22, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#c9d6e3'; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy + 6, 32, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy - 18, 20, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#222'; g.beginPath(); g.arc(cx - 7, cy - 22, 3, 0, 7); g.arc(cx + 7, cy - 22, 3, 0, 7); g.fill();
        g.fillStyle = '#ff8c42'; g.beginPath(); g.moveTo(cx, cy - 18); g.lineTo(cx + 16, cy - 15); g.lineTo(cx, cy - 13); g.fill();
        g.fillStyle = '#e63946'; g.fillRect(cx - 20, cy - 4, 40, 7);
        for (const s2 of [-1, 1]) { g.fillStyle = '#e63946'; g.beginPath(); g.moveTo(cx + s2 * 12, cy - 30); g.lineTo(cx + s2 * 22, cy - 46); g.lineTo(cx + s2 * 4, cy - 36); g.fill(); }
        break;
      }
      case 'sea': {
        const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#1f6fb2'); gr.addColorStop(.75, '#3fa7d6'); gr.addColorStop(1, '#8fd8f2');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
        for (let yy = y + 40; yy < y + h - 40; yy += 46) { g.beginPath(); for (let xx = x; xx <= x + w; xx += 20) g.lineTo(xx, yy + Math.sin(xx / 60 + yy) * 6); g.stroke(); }
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y + h); for (let xx = x; xx <= x + w; xx += 30) g.lineTo(xx, y + h - 14 - Math.sin(xx / 40) * 8); g.lineTo(x + w, y + h + 6); g.lineTo(x, y + h + 6); g.fill();
        // 작은 배와 갈매기
        for (const [bx, by] of [[600, 140], [2400, 220]]) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 90, by); g.lineTo(bx + 70, by + 26); g.lineTo(bx + 18, by + 26); g.fill(); g.fillStyle = '#e63946'; g.beginPath(); g.moveTo(bx + 46, by - 60); g.lineTo(bx + 46, by - 4); g.lineTo(bx + 84, by - 8); g.fill(); }
        g.strokeStyle = '#fff'; g.lineWidth = 3; for (const [sx2, sy2] of [[1200, 120], [1260, 160], [3000, 90]]) { g.beginPath(); g.arc(sx2 - 10, sy2, 10, Math.PI * 1.1, Math.PI * 1.9); g.arc(sx2 + 10, sy2, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        break;
      }
      case 'palm': {
        const cx = x + w / 2, cy = y + h / 2;
        g.fillStyle = 'rgba(90,60,20,.25)'; g.beginPath(); g.ellipse(cx + 26, cy + 24, 90, 50, .2, 0, 7); g.fill();
        g.fillStyle = '#8a6a3f'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill();
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * Math.PI * 2 + .3;
          g.save(); g.translate(cx, cy); g.rotate(a);
          g.fillStyle = k % 2 ? '#2f9e44' : '#40b057'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, -24, 86, 4); g.quadraticCurveTo(40, 10, 0, 0); g.fill();
          g.strokeStyle = 'rgba(0,60,0,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(40, -8, 82, 4); g.stroke();
          g.restore();
        }
        g.fillStyle = '#6b4f2a'; for (const [dx, dy] of [[-6, -4], [6, -2], [0, 7]]) { g.beginPath(); g.arc(cx + dx, cy + dy, 7, 0, 7); g.fill(); }
        break;
      }
      case 'umbrella': {
        const cx = x + w / 2, cy = y + h / 2, cols = [['#ef476f', '#fff'], ['#118ab2', '#fff'], ['#ffd166', '#f77f00'], ['#06d6a0', '#fff']][(Math.round(x + y) / 7 | 0) % 4];
        g.fillStyle = 'rgba(80,60,20,.22)'; g.beginPath(); g.ellipse(cx + 18, cy + 18, 64, 40, 0, 0, 7); g.fill();
        for (let k = 0; k < 8; k++) { g.fillStyle = cols[k % 2]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 52, k / 8 * 7, (k + 1) / 8 * 7 + .01); g.fill(); }
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
        break;
      }
      case 'sdesk': {
        body('#c89a64', 6);
        g.fillStyle = '#e0b57f'; rr(g, x + 4, y + 4, w - 8, h - 22, 4); g.fill();
        g.fillStyle = '#fff'; g.save(); g.translate(x + w * .3, y + h * .35); g.rotate(-.15); g.fillRect(-14, -9, 28, 20); g.fillStyle = '#9db4d8'; for (let k = 0; k < 3; k++) g.fillRect(-10, -5 + k * 6, 20, 2); g.restore();
        g.fillStyle = ['#ef476f', '#118ab2', '#06d6a0', '#ffd166'][(x / 200 | 0) % 4]; g.save(); g.translate(x + w * .72, y + h * .3); g.rotate(.6); g.fillRect(-16, -2.5, 32, 5); g.restore();
        g.fillStyle = '#6b6f7a'; rr(g, x + w / 2 - 22, y + h + 14, 44, 18, 6); g.fill(); // 의자
        break;
      }
      case 'board': {
        shadowOn(g, 12, 6); g.fillStyle = '#7a5236'; rr(g, x - 8, y - 4, w + 16, h + 10, 6); g.fill(); shadowOff(g);
        g.fillStyle = '#2f5d48'; rr(g, x, y, w, h, 3); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.font = '22px Jua, sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText('오늘의 숙제: 츄르 먹기 ✔', x + 20, y + h / 2);
        g.fillStyle = '#f4f1de'; g.fillRect(x + w - 60, y + h - 6, 20, 5); g.fillStyle = '#ffadad'; g.fillRect(x + w - 34, y + h - 6, 16, 5);
        break;
      }
      case 'piano': {
        body('#1d1d24', 10);
        g.fillStyle = '#fff'; rr(g, x + 10, y + h - 46, w - 20, 36, 3); g.fill();
        g.fillStyle = '#1d1d24'; for (let k = 0; k < 20; k++) if (k % 7 !== 2 && k % 7 !== 6) g.fillRect(x + 22 + k * (w - 40) / 20, y + h - 46, 7, 22);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let k = 1; k < 21; k++) { g.beginPath(); g.moveTo(x + 10 + k * (w - 20) / 21, y + h - 46); g.lineTo(x + 10 + k * (w - 20) / 21, y + h - 10); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, x + 14, y + 10, w - 28, 30, 8); g.fill();
        g.font = '26px sans-serif'; g.textAlign = 'center'; g.fillText('🎵', x + w - 40, y + 34);
        break;
      }
      case 'drum': {
        const cx = x + w / 2, cy = y + h / 2;
        shadowOn(g, 10, 6); g.fillStyle = '#d62828'; g.beginPath(); g.arc(cx, cy, w / 2, 0, 7); g.fill(); shadowOff(g);
        g.fillStyle = '#f1faee'; g.beginPath(); g.arc(cx, cy, w / 2 - 7, 0, 7); g.fill();
        g.strokeStyle = '#ccc'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, w / 2 - 4, 0, 7); g.stroke();
        g.strokeStyle = '#e9c46a'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 20, cy - 26); g.lineTo(cx + 8, cy + 4); g.moveTo(cx + 22, cy - 26); g.lineTo(cx - 4, cy + 6); g.stroke();
        break;
      }
      case 'lab': {
        body('#3c4a5c', 8);
        g.fillStyle = '#e8eef3'; rr(g, x + 6, y + 6, w - 12, h - 22, 5); g.fill();
        const flask = (fx, fy, col) => { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(fx - 4, fy - 18, 8, 12); g.beginPath(); g.moveTo(fx - 4, fy - 6); g.lineTo(fx - 14, fy + 12); g.lineTo(fx + 14, fy + 12); g.lineTo(fx + 4, fy - 6); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(fx - 9, fy + 3); g.lineTo(fx - 14, fy + 12); g.lineTo(fx + 14, fy + 12); g.lineTo(fx + 9, fy + 3); g.fill(); };
        flask(x + 40, y + 30, '#06d6a0'); flask(x + 80, y + 34, '#ef476f'); flask(x + 120, y + 30, '#8338ec');
        g.fillStyle = '#9aa5b1'; g.beginPath(); g.arc(x + w - 46, y + 36, 16, 0, 7); g.fill(); g.fillStyle = '#4cc9f0'; g.beginPath(); g.arc(x + w - 46, y + 36, 9, 0, 7); g.fill();
        break;
      }
      case 'goal': {
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 8, y + 10, w, h);
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5;
        for (let yy = y; yy <= y + h; yy += 14) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
        for (let xx = x; xx <= x + w; xx += 14) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
        g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath();
        if (x < W / 2) { g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); } else { g.moveTo(x + w, y); g.lineTo(x, y); g.lineTo(x, y + h); g.lineTo(x + w, y + h); }
        g.stroke();
        break;
      }
      case 'hoop': {
        shadowOn(g, 10, 6); g.fillStyle = '#fff'; rr(g, x, y, w, 16, 3); g.fill(); shadowOff(g);
        g.strokeStyle = '#e63946'; g.lineWidth = 3; g.strokeRect(x + w / 2 - 14, y + 2, 28, 12);
        g.strokeStyle = '#f77f00'; g.lineWidth = 5; g.beginPath(); g.arc(x + w / 2, y + (y > H / 2 ? -14 : 32), 16, 0, 7); g.stroke();
        break;
      }
      case 'vault': {
        body('#8d5524', 12);
        g.fillStyle = '#fff3e0'; rr(g, x + 6, y + 4, w - 12, 22, 10); g.fill();
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 1; k < 4; k++) g.fillRect(x + 6, y + 26 + k * (h - 30) / 4, w - 12, 3);
        break;
      }
      case 'mansion': {
        // 뾰족 지붕 유령 저택
        shadowOn(g, 30, 16, .6); g.fillStyle = '#2b2236'; g.fillRect(x, y + 60, w, h - 60); shadowOff(g);
        const roof = (rx, rw, peak) => { g.fillStyle = '#3d2f4f'; g.beginPath(); g.moveTo(rx, y + 90); g.lineTo(rx + rw / 2, y + 90 - peak); g.lineTo(rx + rw, y + 90); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(rx + rw * k / 12, y + 90 - peak * k / 6); g.lineTo(rx + rw - rw * k / 12, y + 90 - peak * k / 6); g.stroke(); } };
        g.fillStyle = '#382c48'; g.fillRect(x + 10, y + 80, w - 20, h - 90);
        for (let yy = y + 100; yy < y + h - 10; yy += 26) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 10, yy, w - 20, 2); }
        roof(x - 10, 260, 120); roof(x + w - 250, 260, 120); roof(x + 260, 280, 170);
        // 창문 (노랗게 빛남)
        for (const [wx, wy] of [[x + 70, y + 170], [x + 170, y + 170], [x + w - 210, y + 170], [x + w - 110, y + 170], [x + 70, y + 280], [x + w - 110, y + 280]]) {
          g.fillStyle = '#ffd166'; rr(g, wx, wy, 44, 60, 22); g.fill(); g.fillStyle = 'rgba(255,240,180,.6)'; g.fillRect(wx + 20, wy, 4, 60); g.fillRect(wx, wy + 28, 44, 4);
        }
        // 동그란 다락창의 고양이 실루엣
        g.fillStyle = '#ffb703'; g.beginPath(); g.arc(x + w / 2, y + 60, 34, 0, 7); g.fill();
        g.fillStyle = '#1a1424'; g.beginPath(); g.ellipse(x + w / 2, y + 72, 14, 16, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + w / 2, y + 54, 10, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x + w / 2 - 10, y + 50); g.lineTo(x + w / 2 - 8, y + 40); g.lineTo(x + w / 2 - 2, y + 48); g.moveTo(x + w / 2 + 10, y + 50); g.lineTo(x + w / 2 + 8, y + 40); g.lineTo(x + w / 2 + 2, y + 48); g.fill();
        // 문
        g.fillStyle = '#5a1e1e'; rr(g, x + w / 2 - 50, y + h - 130, 100, 130, 50); g.fill(); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x + w / 2 + 28, y + h - 60, 5, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; // 거미줄
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 10, y + 80); g.lineTo(x + 10 + Math.cos(k * .3) * 70, y + 80 + Math.sin(k * .3) * 70); g.stroke(); }
        for (let r2 = 20; r2 < 70; r2 += 16) { g.beginPath(); g.arc(x + 10, y + 80, r2, 0, 1.5); g.stroke(); }
        lbl(o.label, 'rgba(255,220,150,.7)', y + h + 24);
        break;
      }
      case 'ifence': {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 4, y + 8, w, h);
        g.strokeStyle = '#1b1b22'; g.lineWidth = 4;
        if (w > h) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + w, y + 4); g.moveTo(x, y + h - 4); g.lineTo(x + w, y + h - 4); g.stroke(); for (let xx = x + 6; xx < x + w; xx += 18) { g.beginPath(); g.moveTo(xx, y - 10); g.lineTo(xx, y + h + 2); g.stroke(); g.fillStyle = '#1b1b22'; g.beginPath(); g.moveTo(xx - 5, y - 8); g.lineTo(xx, y - 18); g.lineTo(xx + 5, y - 8); g.fill(); } }
        else { g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 4, y + h); g.moveTo(x + w - 4, y); g.lineTo(x + w - 4, y + h); g.stroke(); for (let yy = y + 6; yy < y + h; yy += 18) { g.beginPath(); g.moveTo(x - 6, yy); g.lineTo(x + w + 6, yy); g.stroke(); } }
        break;
      }
      case 'grave': {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + w / 2 + 6, y + h + 2, w * .55, 10, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(70,50,40,.7)'; rr(g, x + 6, y + h - 6, w - 12, 30, 8); g.fill(); // 흙더미
        const gr = g.createLinearGradient(x, y, x + w, y); gr.addColorStop(0, '#8d8a98'); gr.addColorStop(1, '#5d5a68');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + 20); g.arc(x + w / 2, y + 20, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(30,25,40,.6)'; g.font = '14px Jua, sans-serif'; g.textAlign = 'center'; g.fillText(['R.I.P', '냥', '🐟', '츄르'][(x + y) % 4 | 0] || 'R.I.P', x + w / 2, y + 26);
        g.fillStyle = 'rgba(100,140,90,.6)'; g.beginPath(); g.arc(x + 8, y + h - 6, 6, 0, 7); g.arc(x + w - 10, y + h - 4, 5, 0, 7); g.fill();
        break;
      }
      case 'deadtree': {
        const cx = x + w / 2, cy = y + h / 2, rr2 = rand(Math.round(x * 3 + y));
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cx + 16, cy + 22, 54, 30, 0, 0, 7); g.fill();
        g.strokeStyle = '#2a1e18'; g.lineCap = 'round';
        const branch = (bx, by, a, len, wd) => { if (wd < 1.5) return; const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len; g.lineWidth = wd; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); branch(ex, ey, a - .5 - rr2() * .3, len * .7, wd * .6); branch(ex, ey, a + .4 + rr2() * .3, len * .65, wd * .6); };
        for (let k = 0; k < 5; k++) branch(cx, cy, k / 5 * 6.28 + rr2(), 26, 9);
        g.fillStyle = '#3b2a20'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); g.fillStyle = '#1a120d'; g.beginPath(); g.ellipse(cx + 3, cy + 2, 5, 7, 0, 0, 7); g.fill();
        break;
      }
      case 'cauldron': {
        const cx = x + w / 2, cy = y + h / 2;
        shadowOn(g, 16, 8, .5); g.fillStyle = '#1b1b22'; g.beginPath(); g.ellipse(cx, cy + 6, w / 2, h / 2 - 4, 0, 0, 7); g.fill(); shadowOff(g);
        const gr = g.createRadialGradient(cx, cy, 4, cx, cy, w / 2 - 14); gr.addColorStop(0, '#b8f55c'); gr.addColorStop(1, '#3a9d23');
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, w / 2 - 14, h / 2 - 18, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(230,255,180,.7)'; for (const [dx, dy, r2] of [[-20, -4, 7], [10, 6, 5], [24, -8, 4], [-4, 10, 3]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r2, 0, 7); g.fill(); }
        g.strokeStyle = '#3a3a44'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, w / 2 - 10, h / 2 - 14, 0, 0, 7); g.stroke();
        g.fillStyle = '#ff7b00'; for (const dx of [-30, 0, 30]) { g.beginPath(); g.moveTo(cx + dx - 10, y + h + 4); g.quadraticCurveTo(cx + dx, y + h - 22, cx + dx + 10, y + h + 4); g.fill(); }
        lbl(o.label, 'rgba(200,255,150,.7)', y + h + 22);
        break;
      }
      case 'jack': case 'pumpkin': {
        const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + 6, cy + ry * .7, rx, ry * .5, 0, 0, 7); g.fill();
        for (const [dx, sc] of [[-rx * .45, .6], [rx * .45, .6], [0, .7]]) {
          const gr = g.createRadialGradient(cx + dx - 6, cy - 8, 2, cx + dx, cy, rx * sc + 6); gr.addColorStop(0, '#ffb347'); gr.addColorStop(1, '#d35400');
          g.fillStyle = gr; g.beginPath(); g.ellipse(cx + dx, cy, rx * sc, ry, 0, 0, 7); g.fill();
        }
        g.fillStyle = '#3a5a1e'; rr(g, cx - 4, cy - ry - 8, 8, 14, 3); g.fill();
        if (o.k === 'jack') {
          g.fillStyle = '#ffe066';
          g.beginPath(); g.moveTo(cx - 16, cy - 2); g.lineTo(cx - 8, cy - 12); g.lineTo(cx - 2, cy - 2); g.fill();
          g.beginPath(); g.moveTo(cx + 16, cy - 2); g.lineTo(cx + 8, cy - 12); g.lineTo(cx + 2, cy - 2); g.fill();
          g.beginPath(); g.moveTo(cx - 18, cy + 6); for (let k = 0; k <= 6; k++) g.lineTo(cx - 18 + k * 6, cy + 6 + (k % 2 ? 8 : 0)); g.lineTo(cx + 18, cy + 14); g.quadraticCurveTo(cx, cy + 24, cx - 18, cy + 6); g.fill();
        }
        break;
      }
      case 'hull': {
        shadowOn(g, 18, 8, .5); g.fillStyle = '#4a5466'; g.fillRect(x, y, w, h); shadowOff(g);
        const gr = o.w > o.h ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
        gr.addColorStop(0, '#9aa7bd'); gr.addColorStop(.5, '#5f6b80'); gr.addColorStop(1, '#2e3644');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(80,220,255,.6)';
        if (w > h) for (let xx = x + 30; xx < x + w - 20; xx += 120) g.fillRect(xx, y + h / 2 - 2, 40, 4); else for (let yy = y + 30; yy < y + h - 20; yy += 120) g.fillRect(x + w / 2 - 2, yy, 4, 40);
        g.fillStyle = '#f2c94c'; for (const [cx2, cy2] of [[x, y], [x + w, y + h]]) { g.beginPath(); g.arc(cx2, cy2, 9, 0, 7); g.fill(); }
        break;
      }
      case 'window': {
        g.fillStyle = '#05060f'; g.fillRect(x, y, w, h);
        const rs = rand(99); for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${.3 + rs() * .7})`; g.fillRect(x + rs() * w, y + rs() * h, 1.5, 1.5); }
        const pg = g.createRadialGradient(x + w * .8, y + h * 1.4, 10, x + w * .8, y + h * 1.4, 120); pg.addColorStop(0, '#4cc9f0'); pg.addColorStop(.6, '#3a0ca3'); pg.addColorStop(1, 'rgba(58,12,163,0)');
        g.fillStyle = pg; g.fillRect(x, y, w, h);
        g.strokeStyle = '#9aa7bd'; g.lineWidth = 6; g.strokeRect(x, y, w, h); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + k * w / 4, y); g.lineTo(x + k * w / 4, y + h); g.stroke(); }
        break;
      }
      case 'console': {
        body('#39445a', 10);
        g.fillStyle = '#0b1320'; rr(g, x + 10, y + 8, w - 20, h - 30, 6); g.fill();
        g.strokeStyle = '#4cc9f0'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 20; k++) g.lineTo(x + 16 + k * (w - 32) / 20, y + 8 + (h - 30) / 2 + Math.sin(k * .9 + x) * 8); g.stroke();
        for (let k = 0; k < 6; k++) { g.fillStyle = ['#ef476f', '#06d6a0', '#ffd166'][k % 3]; g.beginPath(); g.arc(x + 20 + k * (w - 40) / 5, y + h - 12, 4, 0, 7); g.fill(); }
        lbl(o.label, 'rgba(160,220,255,.7)', y + h + 20);
        break;
      }
      case 'holo': {
        body('#2a3446', 30);
        const cx = x + w / 2, cy = y + h / 2;
        const gr = g.createRadialGradient(cx, cy, 10, cx, cy, w / 2); gr.addColorStop(0, 'rgba(76,201,240,.55)'); gr.addColorStop(1, 'rgba(76,201,240,0)');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(140,230,255,.8)'; g.lineWidth = 2;
        for (const r2 of [30, 55, 80]) { g.beginPath(); g.ellipse(cx, cy, r2 * 1.4, r2 * .7, 0, 0, 7); g.stroke(); }
        g.fillStyle = '#ffd166'; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill();
        g.fillStyle = '#90e0ef'; g.beginPath(); g.arc(cx + 78, cy - 20, 7, 0, 7); g.arc(cx - 50, cy + 30, 5, 0, 7); g.fill();
        lbl(o.label, 'rgba(160,230,255,.85)', y + h - 16);
        break;
      }
      case 'crate': {
        body('#6c757d', 6);
        g.strokeStyle = '#f2c94c'; g.lineWidth = 6; g.strokeRect(x + 8, y + 8, w - 16, h - 16);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 12, y + 12); g.lineTo(x + w - 12, y + h - 12); g.moveTo(x + w - 12, y + 12); g.lineTo(x + 12, y + h - 12); g.stroke();
        g.fillStyle = '#212529'; rr(g, x + w / 2 - 22, y + h / 2 - 10, 44, 20, 4); g.fill();
        g.fillStyle = '#4cc9f0'; g.font = '13px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N-7', x + w / 2, y + h / 2 + 1);
        break;
      }
      case 'tank': {
        const cx = x + w / 2, cy = y + h / 2;
        shadowOn(g, 16, 8, .5); g.fillStyle = '#39445a'; g.beginPath(); g.arc(cx, cy, w / 2, 0, 7); g.fill(); shadowOff(g);
        const gr = g.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, w / 2 - 8); gr.addColorStop(0, '#b9fbc0'); gr.addColorStop(1, '#1b9e5a');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, w / 2 - 10, 0, 7); g.fill();
        g.fillStyle = 'rgba(10,40,20,.55)'; g.beginPath(); g.ellipse(cx, cy + 6, 14, 18, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx, cy - 14, 10, 0, 7); g.fill(); // 떠 있는 고양이 실루엣
        g.beginPath(); g.moveTo(cx - 9, cy - 18); g.lineTo(cx - 7, cy - 28); g.lineTo(cx - 1, cy - 20); g.moveTo(cx + 9, cy - 18); g.lineTo(cx + 7, cy - 28); g.lineTo(cx + 1, cy - 20); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; for (const [dx, dy, r2] of [[18, -20, 4], [-20, 14, 3], [12, 22, 2.5]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r2, 0, 7); g.fill(); }
        g.strokeStyle = '#9aa7bd'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, w / 2 - 6, 0, 7); g.stroke();
        break;
      }
      case 'reactor': {
        const cx = x + w / 2, cy = y + h / 2;
        shadowOn(g, 30, 10, .6); g.fillStyle = '#2e3644'; g.beginPath(); g.arc(cx, cy, w / 2, 0, 7); g.fill(); shadowOff(g);
        g.strokeStyle = '#f2c94c'; g.lineWidth = 12; g.setLineDash([24, 18]); g.beginPath(); g.arc(cx, cy, w / 2 - 10, 0, 7); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#4a5466'; g.beginPath(); g.arc(cx, cy, w / 2 - 26, 0, 7); g.fill();
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; g.fillStyle = '#5f6b80'; g.save(); g.translate(cx, cy); g.rotate(a); g.fillRect(w / 2 - 70, -10, 44, 20); g.restore(); }
        const gr = g.createRadialGradient(cx, cy, 6, cx, cy, 80); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, '#90e0ef'); gr.addColorStop(1, '#0077b6');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 80, 0, 7); g.fill();
        lbl(o.label, 'rgba(10,30,60,.8)', cy);
        break;
      }
      default: body('#999');
    }
    g.restore();
  }

  // 숨는 곳 덮개 (고양이 위에 그린다) — 한 번 그려 두고 재사용
  const canopyCache = new Map();
  function canopyImage(h) {
    const key = h.x + ',' + h.y;
    if (canopyCache.has(key)) return canopyCache.get(key);
    const pad = 40, cv = document.createElement('canvas'); cv.width = h.w + pad * 2; cv.height = h.h + pad * 2;
    const g = cv.getContext('2d'); g.translate(pad - h.x, pad - h.y);
    drawCanopy(g, h);
    const img = { cv, pad }; canopyCache.set(key, img); return img;
  }
  function drawCanopy(g, h) {
    const { x, y, w, h: hh } = h;
    g.save();
    if (h.k === 'bush' || h.k === 'snowbush') {
      const rnd = rand(Math.round(x * 7 + y)), snowy = h.k === 'snowbush';
      shadowOn(g, 16, 8, .35);
      g.fillStyle = '#2f7a2e'; rr(g, x + 10, y + 10, w - 20, hh - 20, 50); g.fill(); shadowOff(g);
      for (let i = 0; i < 18; i++) {
        const cx = x + 22 + rnd() * (w - 44), cy = y + 22 + rnd() * (hh - 44), r = 30 + rnd() * 22;
        const gr = g.createRadialGradient(cx - r * .3, cy - r * .4, r * .1, cx, cy, r);
        gr.addColorStop(0, i % 3 ? '#6cc05a' : '#5cb04c'); gr.addColorStop(1, i % 3 ? '#2f7f2d' : '#286f27');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      }
      for (let i = 0; i < 26; i++) { const lx = x + 16 + rnd() * (w - 32), ly = y + 16 + rnd() * (hh - 32); g.fillStyle = 'rgba(200,250,160,.35)'; g.beginPath(); g.ellipse(lx, ly, 6, 3, rnd() * 3, 0, 7); g.fill(); }
      if (snowy) {
        for (let i = 0; i < 16; i++) { const cx = x + 24 + rnd() * (w - 48), cy = y + 18 + rnd() * (hh - 50); g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.ellipse(cx, cy, 18 + rnd() * 14, 9 + rnd() * 5, rnd() - .5, 0, 7); g.fill(); }
        g.fillStyle = '#e63946'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + 30 + rnd() * (w - 60), y + 30 + rnd() * (hh - 60), 4, 0, 7); g.fill(); }
      } else {
        const fl = ['#ff7fae', '#fff', '#ffd166'];
        for (let i = 0; i < 7; i++) { g.fillStyle = fl[i % 3]; g.beginPath(); g.arc(x + 30 + rnd() * (w - 60), y + 30 + rnd() * (hh - 60), 5, 0, 7); g.fill(); }
      }
    } else if (h.k === 'curtain') {
      shadowOn(g, 12, 6, .3);
      const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#d75f78'); gr.addColorStop(.5, '#f2899c'); gr.addColorStop(1, '#d75f78');
      g.fillStyle = gr; rr(g, x, y, w, hh, 8); g.fill(); shadowOff(g);
      g.strokeStyle = 'rgba(120,30,50,.35)'; g.lineWidth = 4;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + w * i / 4, y); g.lineTo(x + w * i / 4, y + hh); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.5)'; for (let yy = y + 20; yy < y + hh; yy += 40) for (let xx = x + 10; xx < x + w; xx += 20) { g.beginPath(); g.arc(xx, yy, 3, 0, 7); g.fill(); }
      g.fillStyle = '#e6c27a'; g.fillRect(x - 4, y + 2, w + 8, 8);
    } else if (h.k === 'box') {
      shadowOn(g, 12, 7, .35); g.fillStyle = '#c58a4a'; rr(g, x, y, w, hh, 6); g.fill(); shadowOff(g);
      g.fillStyle = '#d9a066'; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w / 2, y + hh * .45); g.lineTo(x + w - 4, y + 4); g.fill();
      g.fillStyle = '#b57a3e'; g.beginPath(); g.moveTo(x + 4, y + hh - 4); g.lineTo(x + w / 2, y + hh * .55); g.lineTo(x + w - 4, y + hh - 4); g.fill();
      g.fillStyle = 'rgba(233,214,168,.95)'; g.fillRect(x + w / 2 - 10, y, 20, hh);
      g.strokeStyle = '#5a3a1c'; g.lineWidth = 3; rr(g, x, y, w, hh, 6); g.stroke();
      g.fillStyle = '#5a3a1c'; g.font = '18px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('택배', x + w / 2, y + hh - 16);
      g.strokeStyle = '#5a3a1c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, y + 16); g.lineTo(x + 24, y + 26); g.moveTo(x + 24, y + 16); g.lineTo(x + 14, y + 26); g.stroke();
    } else if (h.k === 'bed' || h.k === 'blanket') {
      shadowOn(g, 14, 7, .3);
      g.fillStyle = h.k === 'bed' ? '#fbe3a6' : '#a8dadc'; rr(g, x, y, w, hh, 22); g.fill(); shadowOff(g);
      const dot = h.k === 'bed' ? '#f3c55f' : '#457b9d';
      if (h.k === 'blanket' && h.label === '돗자리') {
        g.fillStyle = '#e63946'; for (let yy = y; yy < y + hh; yy += 28) for (let xx = x; xx < x + w; xx += 28) if (((xx - x) / 28 + (yy - y) / 28) % 2 < 1) g.fillRect(xx, yy, Math.min(28, x + w - xx), Math.min(28, y + hh - yy));
        g.fillStyle = '#fff'; rr(g, x + w - 60, y + 20, 40, 30, 6); g.fill(); g.fillStyle = '#ffb703'; g.beginPath(); g.arc(x + 40, y + hh - 34, 14, 0, 7); g.fill();
      } else {
        g.fillStyle = dot; for (let yy = y + 16; yy < y + hh; yy += 34) for (let xx = x + 16 + ((yy - y) % 68 ? 17 : 0); xx < x + w - 8; xx += 34) { g.beginPath(); g.arc(xx, yy, 6, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 10, y + hh * k / 4); g.quadraticCurveTo(x + w / 2, y + hh * k / 4 + 14, x + w - 10, y + hh * k / 4); g.stroke(); }
      }
      g.strokeStyle = 'rgba(120,80,30,.6)'; g.lineWidth = 3; rr(g, x, y, w, hh, 22); g.stroke();
      if (h.k === 'bed') { shadowOn(g, 6, 3, .2); g.fillStyle = '#ffffff'; rr(g, x + 24, y + 10, 100, 44, 18); g.fill(); rr(g, x + w - 124, y + 10, 100, 44, 18); g.fill(); shadowOff(g); }
    } else if (h.k === 'tablecloth') {
      shadowOn(g, 14, 8, .35); g.fillStyle = '#ffffff'; rr(g, x, y, w, hh, 12); g.fill(); shadowOff(g);
      g.fillStyle = '#e8504f'; const s = 26;
      for (let yy = y; yy < y + hh; yy += s) for (let xx = x; xx < x + w; xx += s) if (((xx - x) / s + (yy - y) / s) % 2 < 1) g.fillRect(xx, yy, Math.min(s, x + w - xx), Math.min(s, y + hh - yy));
      g.strokeStyle = '#9b2c2b'; g.lineWidth = 3; rr(g, x, y, w, hh, 12); g.stroke();
      for (const [px, py] of [[x + w * .3, y + hh * .45], [x + w * .7, y + hh * .55]]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 24, 0, 7); g.fill(); g.strokeStyle = '#ccc'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(px, py, 12, 6, .3, 0, 7); g.fill(); }
      g.fillStyle = '#7cc96a'; g.beginPath(); g.arc(x + w / 2, y + hh / 2, 12, 0, 7); g.fill();
    } else if (h.k === 'laundry') {
      const cols = ['#6fb6ff', '#ff9bb5', '#ffd25e', '#9ee39e', '#c5a3ff'];
      const rnd = rand(Math.round(x + y));
      shadowOn(g, 12, 6, .3);
      for (let i = 0; i < 14; i++) { g.fillStyle = cols[i % 5]; g.beginPath(); g.ellipse(x + 20 + rnd() * (w - 40), y + 20 + rnd() * (hh - 40), 30 + rnd() * 16, 18 + rnd() * 10, rnd() * 3, 0, 7); g.fill(); if (i === 3) shadowOff(g); }
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const lx = x + 20 + rnd() * (w - 40), ly = y + 20 + rnd() * (hh - 40); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 14, ly + 4); g.stroke(); }
    } else if (h.k === 'tent') {
      shadowOn(g, 16, 10, .35);
      g.fillStyle = '#fff'; g.fillRect(x, y, w, hh - 16); shadowOff(g);
      const sc = h.x % 3 === 0 ? '#e63946' : h.x % 3 === 1 ? '#2a9d8f' : '#f4a261';
      for (let xx = x, k = 0; xx < x + w; xx += 26, k++) if (k % 2 === 0) { g.fillStyle = sc; g.fillRect(xx, y, Math.min(26, x + w - xx), hh - 16); }
      for (let xx = x, k = 0; xx < x + w; xx += 26, k++) { g.fillStyle = k % 2 === 0 ? sc : '#fff'; g.beginPath(); g.arc(xx + 13, y + hh - 16, 13, 0, Math.PI); g.fill(); }
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(x, y, w, hh - 16);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(x, y, w, hh - 16);
    } else if (h.k === 'car') {
      const col = h.x % 2 ? '#3a86ff' : '#ff595e';
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x + 8, y + 14, w, hh, 30); g.fill();
      g.fillStyle = '#222'; for (const [wx, wy] of [[x + 40, y - 4], [x + w - 70, y - 4], [x + 40, y + hh - 10], [x + w - 70, y + hh - 10]]) { rr(g, wx, wy, 34, 14, 5); g.fill(); }
      g.fillStyle = col; rr(g, x, y, w, hh, 30); g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = gr; rr(g, x, y, w, hh, 30); g.fill();
      g.fillStyle = '#bfe3ff'; rr(g, x + w * .58, y + 14, w * .16, hh - 28, 10); g.fill(); rr(g, x + w * .18, y + 16, w * .12, hh - 32, 10); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x + w * .32, y + 12, w * .26, hh - 24, 12); g.fill();
      g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(x + w - 8, y + 22, 8, 0, 7); g.fill(); g.beginPath(); g.arc(x + w - 8, y + hh - 22, 8, 0, 7); g.fill();
      g.fillStyle = '#ff4d4d'; g.fillRect(x + 2, y + 16, 6, 18); g.fillRect(x + 2, y + hh - 34, 6, 18);
    } else if (h.k === 'jar') {
      const rnd = rand(Math.round(x + y * 3));
      shadowOn(g, 12, 6, .45); g.fillStyle = '#8d8a92'; rr(g, x, y, w, hh, 14); g.fill(); shadowOff(g);
      for (let i = 0; i < 7; i++) {
        const cx = x + 30 + (i % 4) * ((w - 60) / 3), cy = y + 34 + Math.floor(i / 4) * 60 + (i % 2) * 6, r = 26 + rnd() * 6;
        const jg = g.createRadialGradient(cx - r * .4, cy - r * .4, 2, cx, cy, r); jg.addColorStop(0, '#a0522d'); jg.addColorStop(.7, '#5e2c14'); jg.addColorStop(1, '#3d1c0c');
        g.fillStyle = jg; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.fillStyle = '#3d1c0c'; g.beginPath(); g.arc(cx, cy, r * .55, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(cx - r * .45, cy - r * .45, r * .25, r * .12, -.7, 0, 7); g.fill();
      }
    } else if (h.k === 'pyeong') {
      shadowOn(g, 14, 8, .45); g.fillStyle = '#8b5e34'; rr(g, x, y, w, hh, 6); g.fill(); shadowOff(g);
      g.fillStyle = '#d4a373'; rr(g, x + 6, y + 6, w - 12, hh - 12, 4); g.fill();
      g.strokeStyle = 'rgba(120,80,40,.5)'; g.lineWidth = 2; for (let yy = y + 12; yy < y + hh - 8; yy += 8) { g.beginPath(); g.moveTo(x + 10, yy); g.lineTo(x + w - 10, yy); g.stroke(); }
      g.fillStyle = '#6f4518'; rr(g, x + w / 2 - 40, y + hh / 2 - 26, 80, 52, 8); g.fill();
      g.fillStyle = '#fff'; for (const [dx, dy] of [[-20, -8], [14, 6]]) { g.beginPath(); g.arc(x + w / 2 + dx, y + hh / 2 + dy, 9, 0, 7); g.fill(); }
      g.fillStyle = '#e9c46a'; g.beginPath(); g.ellipse(x + w / 2 + 2, y + hh / 2 - 12, 10, 5, .3, 0, 7); g.fill();
    } else if (h.k === 'hay') {
      const rnd = rand(Math.round(x * 5 + y));
      shadowOn(g, 14, 8, .45); g.fillStyle = '#b08d3c'; g.beginPath(); g.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, 0, 0, 7); g.fill(); shadowOff(g);
      for (let i = 0; i < 160; i++) { const a = rnd() * 7, d = Math.sqrt(rnd()), px = x + w / 2 + Math.cos(a) * d * w / 2 * .92, py = y + hh / 2 + Math.sin(a) * d * hh / 2 * .92; g.strokeStyle = rnd() < .5 ? '#e9c46a' : '#c99a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a + 1.6) * 12, py + Math.sin(a + 1.6) * 12); g.stroke(); }
      g.fillStyle = 'rgba(255,240,180,.25)'; g.beginPath(); g.ellipse(x + w * .4, y + hh * .35, w * .22, hh * .14, -.3, 0, 7); g.fill();
    } else if (h.k === 'bamboo') {
      const rnd = rand(Math.round(x * 2 + y * 9));
      g.fillStyle = 'rgba(10,30,15,.45)'; rr(g, x + 8, y + 12, w, hh, 30); g.fill();
      for (let i = 0; i < w * hh / 900; i++) {
        const cx = x + 10 + rnd() * (w - 20), cy = y + 10 + rnd() * (hh - 20);
        g.fillStyle = rnd() < .5 ? '#40916c' : '#52b788'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
        g.strokeStyle = '#1b4332'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.stroke();
        for (let k = 0; k < 3; k++) { const a = rnd() * 7; g.fillStyle = rnd() < .5 ? '#74c69d' : '#2d6a4f'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 14, 4, a, 0, 7); g.fill(); }
      }
    } else if (h.k === 'tube') {
      shadowOn(g, 14, 8, .35);
      const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
      g.fillStyle = cols[0]; rr(g, x, y, w, hh, hh / 2); g.fill(); shadowOff(g);
      for (let k = 0; k < 8; k++) { g.fillStyle = cols[k % 4]; g.fillRect(x + 20 + k * (w - 40) / 8, y + 2, (w - 40) / 8, hh - 4); }
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(255,255,255,.4)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; rr(g, x, y, w, hh, hh / 2); g.fill();
      g.fillStyle = '#1b1b2f'; for (const ex of [x + 4, x + w - 26]) { g.beginPath(); g.ellipse(ex + 11, y + hh / 2, 12, hh / 2 - 8, 0, 0, 7); g.fill(); }
    } else if (h.k === 'locker') {
      shadowOn(g, 12, 6, .35); g.fillStyle = '#4f7cac'; rr(g, x, y, w, hh, 6); g.fill(); shadowOff(g);
      const n = Math.max(3, Math.round(w / 55)), cw = (w - 8) / n;
      for (let k = 0; k < n; k++) {
        const lx = x + 4 + k * cw; g.fillStyle = k % 2 ? '#6b9bd1' : '#5f8fc4'; rr(g, lx + 2, y + 4, cw - 4, hh - 8, 4); g.fill();
        g.fillStyle = 'rgba(20,30,50,.45)'; for (let s2 = 0; s2 < 3; s2++) g.fillRect(lx + 8, y + 10 + s2 * 6, cw - 16, 2);
        g.fillStyle = '#e9ecef'; g.fillRect(lx + cw - 12, y + hh / 2 - 6, 4, 12);
      }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 4, y + 4, w - 8, 3);
    } else if (h.k === 'mat') {
      shadowOn(g, 14, 8, .35);
      for (let k = 0; k < 3; k++) { g.fillStyle = ['#1d4e89', '#2a6fdb', '#4a90e2'][k]; rr(g, x + k * 6, y + k * 8, w - k * 12, hh - k * 14, 14); g.fill(); if (!k) shadowOff(g); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.setLineDash([10, 8]); rr(g, x + 22, y + 26, w - 44, hh - 46, 10); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, x + 20, y + 20, w * .4, 12, 6); g.fill();
    } else if (h.k === 'corn') {
      const rnd = rand(Math.round(x * 3 + y * 7));
      g.fillStyle = 'rgba(10,15,5,.5)'; rr(g, x + 6, y + 12, w, hh, 24); g.fill();
      for (let row = y + 10; row < y + hh - 10; row += 26) for (let cx = x + 12 + (row / 26 % 2) * 12; cx < x + w - 10; cx += 24) {
        const cy = row + rnd() * 6;
        for (let k = 0; k < 4; k++) { const a = rnd() * 7; g.fillStyle = rnd() < .5 ? '#5a6b2a' : '#7a8c35'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 15, 4, a, 0, 7); g.fill(); }
        if (rnd() < .25) { g.fillStyle = '#e9c46a'; g.beginPath(); g.ellipse(cx, cy, 4, 8, rnd(), 0, 7); g.fill(); }
      }
      // 허수아비
      const sx = x + w / 2, sy = y + hh / 2;
      g.strokeStyle = '#6b4226'; g.lineWidth = 7; g.beginPath(); g.moveTo(sx - 40, sy); g.lineTo(sx + 40, sy); g.stroke();
      g.fillStyle = '#c1121f'; rr(g, sx - 22, sy - 12, 44, 40, 8); g.fill();
      g.fillStyle = '#f4d58d'; g.beginPath(); g.arc(sx, sy - 24, 16, 0, 7); g.fill();
      g.fillStyle = '#5e3b1f'; g.beginPath(); g.ellipse(sx, sy - 34, 28, 8, 0, 0, 7); g.fill(); g.beginPath(); g.arc(sx, sy - 40, 12, Math.PI, 0); g.fill();
      g.fillStyle = '#222'; g.fillRect(sx - 7, sy - 27, 4, 4); g.fillRect(sx + 3, sy - 27, 4, 4);
    } else if (h.k === 'pumpkins') {
      const rnd = rand(Math.round(x + y * 3));
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + w / 2 + 6, y + hh / 2 + 10, w / 2, hh / 2, 0, 0, 7); g.fill();
      g.fillStyle = '#2d4a1e'; for (let k = 0; k < 10; k++) { g.beginPath(); g.ellipse(x + rnd() * w, y + rnd() * hh, 22, 12, rnd() * 3, 0, 7); g.fill(); }
      const ps = []; for (let k = 0; k < 7; k++) ps.push([x + 30 + rnd() * (w - 60), y + 30 + rnd() * (hh - 60), 26 + rnd() * 14]);
      ps.sort((a, b) => a[1] - b[1]);
      for (const [cx, cy, r2] of ps) {
        for (const [dx, sc] of [[-r2 * .45, .62], [r2 * .45, .62], [0, .75]]) { const gr = g.createRadialGradient(cx + dx - 5, cy - 6, 2, cx + dx, cy, r2 * sc + 4); gr.addColorStop(0, '#ffa94d'); gr.addColorStop(1, '#c2410c'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx + dx, cy, r2 * sc, r2 * .8, 0, 0, 7); g.fill(); }
        g.fillStyle = '#3a5a1e'; rr(g, cx - 3, cy - r2 * .8 - 6, 6, 10, 2); g.fill();
      }
    } else if (h.k === 'coffin') {
      shadowOn(g, 14, 8, .5);
      const cx = x + w / 2, cy = y + hh / 2;
      const shape = (ins) => { g.beginPath(); g.moveTo(x + ins, cy); g.lineTo(x + w * .28, y + ins); g.lineTo(x + w - ins, y + hh * .2 + ins / 2); g.lineTo(x + w - ins, y + hh * .8 - ins / 2); g.lineTo(x + w * .28, y + hh - ins); g.closePath(); };
      g.fillStyle = '#4a2c1d'; shape(0); g.fill(); shadowOff(g);
      g.fillStyle = '#6b3f2a'; shape(8); g.fill();
      g.fillStyle = '#d4a373'; g.fillRect(cx - 4, cy - 22, 8, 44); g.fillRect(cx - 18, cy - 10, 36, 8);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + w * .3, y + 14, w * .5, 4);
    } else if (h.k === 'pod') {
      shadowOn(g, 14, 8, .5); g.fillStyle = '#5f6b80'; rr(g, x, y, w, hh, hh / 2); g.fill(); shadowOff(g);
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(160,230,255,.85)'); gr.addColorStop(1, 'rgba(60,140,200,.75)');
      g.fillStyle = gr; rr(g, x + 14, y + 12, w - 50, hh - 24, (hh - 24) / 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, x + 26, y + 18, (w - 70) * .6, 8, 4); g.fill();
      g.fillStyle = '#ffd166'; rr(g, x + w - 30, y + 20, 14, hh - 40, 4); g.fill();
      g.fillStyle = '#06d6a0'; g.beginPath(); g.arc(x + w - 23, y + hh / 2, 3, 0, 7); g.fill();
    } else if (h.k === 'vent') {
      shadowOn(g, 8, 4, .4); g.fillStyle = '#8d99ae'; rr(g, x, y, w, hh, 8); g.fill(); shadowOff(g);
      g.fillStyle = '#2b2d42'; rr(g, x + 8, y + 8, w - 16, hh - 16, 4); g.fill();
      g.fillStyle = '#8d99ae'; for (let yy = y + 14; yy < y + hh - 10; yy += 11) g.fillRect(x + 10, yy, w - 20, 5);
      g.fillStyle = '#edf2f4'; for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + hh - 6], [x + w - 6, y + hh - 6]]) { g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill(); }
    } else if (h.k === 'cargo') {
      const rnd = rand(Math.round(x * 5 + y));
      shadowOn(g, 14, 8, .45);
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#495057', '#6c757d', '#adb5bd', '#e76f51', '#2a9d8f'][k]; rr(g, x + 10 + rnd() * (w - 90), y + 8 + rnd() * (hh - 70), 70 + rnd() * 20, 50 + rnd() * 14, 6); g.fill(); if (!k) shadowOff(g); }
      g.strokeStyle = 'rgba(30,30,30,.75)'; g.lineWidth = 3;
      for (let k = -hh; k < w; k += 22) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k + hh, y + hh); g.stroke(); g.beginPath(); g.moveTo(x + k + hh, y); g.lineTo(x + k, y + hh); g.stroke(); }
      g.strokeStyle = '#f2c94c'; g.lineWidth = 4; rr(g, x + 2, y + 2, w - 4, hh - 4, 10); g.stroke();
    }
    g.restore();
  }

  /* ---------------- 상태 ---------------- */
  const app = {
    mode: 'title', // title | practice | host | client
    inGame: false,
    g: null, demo: null,
    mySlot: -1, myId: 'me',
    lobby: null, // {code, map, slots:[{p,name,av}]}
    cam: { x: W / 2, y: H / 2 }, demoCam: { x: W / 2, y: H / 2, tx: 600, ty: 400, t: 0 },
    popups: [], bannerT: 0,
    me: { name: '', av: 'd0' },
    muted: false,
  };
  try { const s = JSON.parse(localStorage.getItem('nyangtag-me') || '{}'); app.me.name = cleanName(s.name || ''); app.me.av = validAv(s.av) || 'd0'; if (!s.name) app.me.name = ''; app.muted = !!s.muted; } catch (e) { }
  function saveMe() { try { localStorage.setItem('nyangtag-me', JSON.stringify({ ...app.me, muted: app.muted })); } catch (e) { } }
  const myName = () => app.me.name || '냥이';

  /* ---------------- 랭크 (롤 티어, 이 기기에 저장) ---------------- */
  const TIERS = [['아이언', '#6b5e57', 'I'], ['브론즈', '#a0663b', 'B'], ['실버', '#8e9ba6', 'S'], ['골드', '#d9a520', 'G'], ['플래티넘', '#2fa39a', 'P'], ['에메랄드', '#1f9d55', 'E'], ['다이아몬드', '#4f7fe8', 'D']];
  const DIVS = ['IV', 'III', 'II', 'I'];
  const cleanRk = v => (typeof v === 'number' && isFinite(v) ? clamp(Math.round(v), 0, 9999) : 0);
  function tierOf(r) {
    r = cleanRk(r);
    if (r >= 3600) return { name: '챌린저', short: 'C', col: 'linear-gradient(135deg,#f9c74f,#4cc9f0)', lp: r - 2800, rank: 9, icon: '👑' };
    if (r >= 3200) return { name: '그랜드마스터', short: 'GM', col: '#c1121f', lp: r - 2800, rank: 8, icon: '🔥' };
    if (r >= 2800) return { name: '마스터', short: 'M', col: '#8338ec', lp: r - 2800, rank: 7, icon: '💜' };
    const t = Math.floor(r / 400), d = Math.floor((r % 400) / 100);
    return { name: TIERS[t][0] + ' ' + DIVS[d], tier: TIERS[t][0], short: TIERS[t][2] + (4 - d), col: TIERS[t][1], lp: r % 100, rank: t, div: d, icon: ['🪨', '🥉', '🥈', '🥇', '💠', '💚', '💎'][t] };
  }
  // 이름마다 따로 기록 (한 기기에서 여러 명이 번갈아 해도 각자 순위)
  const rid = () => Math.random().toString(36).slice(2, 10);
  const newProfile = () => ({ id: rid(), rating: 0, wins: 0, losses: 0, draws: 0, streak: 0, best: 0, freezes: 0, rescues: 0, history: [], t: Date.now() });
  const store = { profiles: {}, seen: {}, board: {} };
  try {
    const raw = JSON.parse(localStorage.getItem('nyangtag-rank') || '{}');
    if (raw.profiles) Object.assign(store, raw);
    else if (raw.rating != null || raw.wins) { const { seen, ...old } = raw; store.profiles[cleanName(app.me.name || '냥이')] = Object.assign(newProfile(), old); store.seen = seen || {}; } // 예전 형식 옮기기
  } catch (e) { }
  let rank = null;
  function useProfile(name) {
    name = cleanName(name || '냥이');
    if (!store.profiles[name]) store.profiles[name] = newProfile();
    rank = store.profiles[name]; delete rank.seen; rank.rating = cleanRk(rank.rating); if (!rank.id) rank.id = rid();
    return rank;
  }
  useProfile(app.me.name);
  function saveRank() {
    // 이름 칠 때 생긴 빈 기록은 지운다
    for (const [n, pr] of Object.entries(store.profiles)) if (pr !== rank && !(pr.wins + pr.losses + pr.draws)) delete store.profiles[n];
    try { store.profiles[myName()] = rank; localStorage.setItem('nyangtag-rank', JSON.stringify({ profiles: store.profiles, seen: store.seen, board: store.board })); } catch (e) { }
  }
  // 🌍 전체 랭킹: 서버 없이 만나는 사람끼리 랭킹표를 주고받아 합친다 (같은 사람이면 최신 기록이 이김)
  const myEntry = (p = rank, name = myName()) => ({ id: p.id, n: name, r: cleanRk(p.rating), w: p.wins | 0, l: p.losses | 0, t: p.t || Date.now() });
  function boardPut(e) {
    if (!e || typeof e.id !== 'string' || !/^[a-z0-9]{4,12}$/.test(e.id)) return false;
    const t = Math.min(Number(e.t) || 0, Date.now() + 864e5), cur = store.board[e.id];
    if (cur && cur.t >= t) return false;
    store.board[e.id] = { n: cleanName(e.n), r: cleanRk(e.r), w: clamp(e.w | 0, 0, 1e5), l: clamp(e.l | 0, 0, 1e5), t };
    return true;
  }
  function boardSync() { for (const [name, p] of Object.entries(store.profiles)) if (p.wins + p.losses + p.draws > 0) boardPut(myEntry(p, name)); }
  function boardTop(n) {
    boardSync();
    const ids = Object.keys(store.board);
    if (ids.length > 400) ids.sort((a, b) => store.board[a].t - store.board[b].t).slice(0, ids.length - 400).forEach(id => delete store.board[id]);
    return Object.entries(store.board).sort((a, b) => b[1].r - a[1].r).slice(0, n).map(([id, v]) => ({ id, ...v }));
  }
  function boardMerge(list) { let ch = 0; if (Array.isArray(list)) for (const e of list.slice(0, 300)) if (boardPut(e)) ch++; if (ch) saveRank(); return ch; }
  const match = { stats: { freezes: 0, rescues: 0, rounds: 0, wonRounds: 0 } };
  // 경기 끝: LP 계산 (연습 0.5배)
  function settleRank(result, practice, oppAvg) {
    const before = rank.rating, st = match.stats, perf = Math.min(6, st.freezes + st.rescues * 2 + st.wonRounds);
    let d = result > 0 ? 20 + perf * .5 + (rank.streak >= 2 ? 3 : 0) : result < 0 ? -16 + perf * .5 : 2;
    if (oppAvg != null) d += clamp((oppAvg - before) / 100, -5, 5);
    if (practice) d *= 0.5;
    d = Math.round(d); if (result > 0) d = Math.max(d, practice ? 5 : 10); if (result < 0) d = Math.min(d, -4);
    rank.rating = Math.max(0, before + d); rank.best = Math.max(rank.best, rank.rating);
    rank.freezes = (rank.freezes || 0) + st.freezes; rank.rescues = (rank.rescues || 0) + st.rescues; rank.t = Date.now();
    if (result > 0) { rank.wins++; rank.streak = Math.max(1, rank.streak + 1); } else if (result < 0) { rank.losses++; rank.streak = Math.min(-1, rank.streak - 1); } else { rank.draws++; rank.streak = 0; }
    rank.history.unshift({ t: Date.now(), r: result, d, p: practice ? 1 : 0, m: C.MAP_ID, ts: app.g ? app.g.ts : 2 }); rank.history = rank.history.slice(0, 30);
    saveRank(); renderRankBox();
    return { before, after: rank.rating, d };
  }
  function tierBadge(r, big) {
    const t = tierOf(r), el = document.createElement('span'); el.className = 'tbadge' + (big ? ' big' : '');
    el.style.background = t.col; el.textContent = t.icon + ' ' + t.name; return el;
  }
  function renderRankBox() {
    const b = $('rankBox'); if (!b) return;
    const t = tierOf(rank.rating), games = rank.wins + rank.losses + rank.draws;
    b.replaceChildren(tierBadge(rank.rating));
    const info = document.createElement('span'); info.className = 'rinfo';
    const pos = Object.values(store.profiles).filter(p => cleanRk(p.rating) > rank.rating).length + 1;
    info.textContent = `${myName()} · ${t.lp} LP · ${rank.wins}승 ${rank.losses}패` + (games ? ` · 승률 ${Math.round(rank.wins / games * 100)}%` : '') + (Object.keys(store.profiles).length > 1 ? ` · 이 기기 ${pos}위` : '') + ' · 🏆 순위';
    const bar = document.createElement('i'); bar.className = 'lpbar'; bar.style.setProperty('--lp', (t.rank >= 7 ? 1 : t.lp / 100).toFixed(2));
    b.append(info, bar);
  }
  function openRank() {
    const box = $('rankBody'); box.replaceChildren();
    const t = tierOf(rank.rating);
    const head = document.createElement('div'); head.className = 'rhead';
    head.append(tierBadge(rank.rating, true));
    const p = document.createElement('p'); p.className = 'hint';
    p.textContent = `${t.lp} LP · 최고 ${tierOf(rank.best).name} · ${rank.wins}승 ${rank.losses}패 ${rank.draws}무 · ${rank.streak > 1 ? rank.streak + '연승 중' : rank.streak < -1 ? -rank.streak + '연패 중' : ''}`;
    head.append(p); box.append(head);
    const h3 = document.createElement('h3'); h3.textContent = '최근 경기'; box.append(h3);
    const ul = document.createElement('ul'); ul.className = 'hist';
    for (const h of rank.history.slice(0, 10)) {
      const li = document.createElement('li'); li.className = h.r > 0 ? 'w' : h.r < 0 ? 'l' : 'd';
      li.textContent = `${h.r > 0 ? '승' : h.r < 0 ? '패' : '무'} · ${(C.MAPS[h.m] || {}).name || ''} ${h.ts}:${h.ts}${h.p ? ' (연습)' : ''} · ${h.d > 0 ? '+' : ''}${h.d} LP`;
      ul.append(li);
    }
    if (!rank.history.length) { const li = document.createElement('li'); li.textContent = '아직 경기가 없어요. 한 판 해 볼까요?'; ul.append(li); }
    box.append(ul);
    const h4 = document.createElement('h3'); h4.textContent = '🏆 순위표'; box.append(h4);
    const tabs = document.createElement('div'); tabs.className = 'btabs'; box.append(tabs);
    const ol = document.createElement('ol'); ol.className = 'board'; box.append(ol);
    const me = myName();
    const local = Object.entries(store.profiles).filter(([, p]) => p.wins + p.losses + p.draws > 0 || p === rank)
      .map(([name, p]) => ({ name, rk: cleanRk(p.rating), w: p.wins, l: p.losses, f: p.freezes || 0, me: name === me, where: '🏠' }));
    const myIds = new Set(Object.values(store.profiles).map(p => p.id));
    const global = boardTop(200).map(e => ({ name: e.n, rk: e.r, w: e.w, l: e.l, f: null, me: e.id === rank.id, where: myIds.has(e.id) ? '🏠' : '🌍' }));
    if (!global.some(r => r.me)) global.push({ name: myName(), rk: rank.rating, w: rank.wins, l: rank.losses, me: true, where: '🏠' });
    const modes = { all: ['🌍 전체 랭킹', global], local: ['🏠 이 기기', local] };
    const draw = mode => {
      ol.replaceChildren();
      for (const b of tabs.children) b.classList.toggle('on', b.dataset.m === mode);
      const rows = modes[mode][1].slice().sort((a, b) => b.rk - a.rk || (b.w || 0) - (a.w || 0)).slice(0, 50);
      if (!rows.length) { const li = document.createElement('li'); li.textContent = '아직 기록이 없어요.'; ol.append(li); }
      rows.forEach((r, i) => {
        const li = document.createElement('li'); if (r.me) li.className = 'me';
        const n = document.createElement('b'); n.textContent = `${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${r.where} ${r.name}${r.me ? ' (나)' : ''}`;
        const sub = document.createElement('small'); sub.textContent = r.w != null ? `${r.w}승 ${r.l}패` + (r.f != null ? ` · 얼림·처치 ${r.f}` : '') : '';
        li.append(n, sub, tierBadge(r.rk)); ol.append(li);
      });
    };
    for (const m of Object.keys(modes)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'szbtn'; b.dataset.m = m; b.textContent = modes[m][0]; b.onclick = () => draw(m); tabs.append(b); }
    draw('all');
    const h5 = document.createElement('h3'); h5.textContent = '티어표'; box.append(h5);
    const tl = document.createElement('div'); tl.className = 'tiers';
    for (const r of [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200, 3600]) { const b = tierBadge(r); b.textContent = tierOf(r).icon + ' ' + (tierOf(r).tier || tierOf(r).name); tl.append(b); }
    box.append(tl);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = '이기면 +LP, 지면 −LP. 얼리기·구하기·라운드 승리로 보너스, 강한 상대일수록 더 받아요. 봇 연습은 절반만 반영돼요. 100 LP마다 승급, 마스터부터는 LP가 계속 쌓여요. 기록은 이 기기(브라우저 저장소)에 이름별로 저장돼요. 🌍 전체 랭킹은 온라인에서 만난 사람끼리 랭킹표를 주고받아 합친 거라, 많이 만날수록 더 많은 사람이 보여요.';
    box.append(note);
    show('scrRank');
  }
  $('rankBox').onclick = openRank;
  $('rankClose').onclick = () => show('scrTitle');
  function noteSeen(L) {
    let ch = false;
    for (const s of L.slots) if (s.p && s.p !== app.myId && s.name) { store.seen[s.name] = { rk: cleanRk(s.rk), t: Date.now() }; ch = true; }
    const names = Object.keys(store.seen); if (names.length > 60) names.sort((a, b) => store.seen[a].t - store.seen[b].t).slice(0, names.length - 60).forEach(n => delete store.seen[n]);
    if (ch) saveRank();
  }

  /* ---------------- 효과 (파티클·흔들림·번쩍) ---------------- */
  const fx = { bubbles: Array(MAXP).fill(null), parts: [], rings: [], marks: [], screen: [], shake: 0, flash: null, slow: 0, tension: 0, beat: 0, prevHide: Array(MAXP).fill(-1), dustT: Array(MAXP).fill(0), rustle: new Map() };
  function burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.a0 ?? 0) + Math.random() * (o.spread ?? Math.PI * 2), sp = (o.sp ?? 200) * (0.4 + Math.random() * 0.8);
      fx.parts.push({
        x: x + (Math.random() - .5) * (o.jit ?? 10), y: y + (Math.random() - .5) * (o.jit ?? 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up ?? 0),
        life: 0, max: (o.life ?? .7) * (0.6 + Math.random() * 0.6), size: (o.size ?? 6) * (0.6 + Math.random() * 0.8),
        col: Array.isArray(o.col) ? o.col[(Math.random() * o.col.length) | 0] : o.col, kind: o.kind || 'dot', grav: o.grav ?? 0, drag: o.drag ?? 3, rot: Math.random() * 7, vr: (Math.random() - .5) * 10,
      });
    }
    if (fx.parts.length > 900) fx.parts.splice(0, fx.parts.length - 900);
  }
  const bubble = (id, text, dur = 2.4) => { if (id >= 0 && id < MAXP) fx.bubbles[id] = { text, t: 0, dur }; };
  const ring = (x, y, max, col, dur = .6, w = 6) => fx.rings.push({ x, y, max, col, dur, w, t: 0 });
  function confetti(n = 80) {
    for (let i = 0; i < n; i++) fx.screen.push({ x: Math.random() * vw, y: -20 - Math.random() * vh * .3, vx: (Math.random() - .5) * 120, vy: 120 + Math.random() * 200, rot: Math.random() * 7, vr: (Math.random() - .5) * 12, col: ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0', '#f77f00', '#b18cff'][i % 6], life: 0, max: 2.4 + Math.random() });
  }
  const shake = v => { fx.shake = Math.max(fx.shake, v); };
  const flash = (col, a = .35) => { fx.flash = { col, a }; };
  function vib(p) { if (touchUI && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } }

  /* ---------------- 소리 (전부 합성) ---------------- */
  const au = { ctx: null, master: null, sfx: null, mus: null, noise: null, nextNote: 0, step: 0, hbT: 0, lastBeat: 0 };
  function ac() {
    if (!au.ctx) {
      try {
        const A = window.AudioContext || window.webkitAudioContext; au.ctx = new A();
        au.master = au.ctx.createGain(); au.master.gain.value = app.muted ? 0 : .9; au.master.connect(au.ctx.destination);
        const comp = au.ctx.createDynamicsCompressor(); comp.connect(au.master);
        au.sfx = au.ctx.createGain(); au.sfx.gain.value = 1; au.sfx.connect(comp);
        au.mus = au.ctx.createGain(); au.mus.gain.value = 0; au.mus.connect(comp);
        const len = au.ctx.sampleRate; const buf = au.ctx.createBuffer(1, len, au.ctx.sampleRate); const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        au.noise = buf;
      } catch (e) { au.ctx = null; return null; }
    }
    if (au.ctx.state === 'suspended') au.ctx.resume();
    return au.ctx;
  }
  function tone(f1, f2, dur, type = 'square', vol = .05, delay = 0, dest) {
    const c = ac(); if (!c) return;
    try {
      const t = c.currentTime + delay, o = c.createOscillator(), gn = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + Math.min(.015, dur / 4)); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(gn).connect(dest || au.sfx); o.start(t); o.stop(t + dur + .02);
    } catch (e) { }
  }
  function noise(dur, vol, f1, f2, type = 'bandpass', q = 1, delay = 0, dest) {
    const c = ac(); if (!c || !au.noise) return;
    try {
      const t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = au.noise;
      const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
      const gn = c.createGain(); gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(gn).connect(dest || au.sfx); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
    } catch (e) { }
  }
  const beep = (f1, f2, dur, type, vol) => tone(f1, f2, dur, type, vol);
  const SFX = {
    ui: () => tone(660, 880, .07, 'triangle', .06),
    dash: (v = 1) => { noise(.22, .18 * v, 600, 3200, 'bandpass', 1.2); tone(260, 110, .14, 'sawtooth', .025 * v); },
    freeze: (v = 1) => { [1760, 2350, 3135].forEach((f, i) => tone(f, f * 1.02, .22, 'triangle', .06 * v, i * .045)); noise(.25, .12 * v, 6000, 2500, 'highpass', .7); },
    frozenMe: () => { tone(180, 50, .35, 'sine', .3); noise(.4, .2, 3000, 800, 'bandpass', .8); [1320, 990, 660].forEach((f, i) => tone(f, f * .98, .25, 'triangle', .05, .08 + i * .07)); },
    unfreeze: (v = 1) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .16, 'triangle', .06 * v, i * .05)),
    trapSet: () => { tone(500, 180, .1, 'sine', .15); tone(900, 1300, .08, 'triangle', .05, .08); },
    trapHit: (v = 1) => { tone(220, 880, .15, 'sine', .2 * v); tone(880, 160, .35, 'sine', .14 * v, .15); noise(.2, .1 * v, 1200, 400, 'bandpass', 2, .02); },
    boost: () => { tone(300, 1400, .32, 'sawtooth', .04); [1568, 2093, 2637].forEach((f, i) => tone(f, f, .1, 'triangle', .04, .1 + i * .05)); },
    sniff: () => { for (let i = 0; i < 3; i++) noise(.09, .2, 2400, 1400, 'bandpass', 3, i * .13); tone(220, 330, .4, 'sine', .05, .35); },
    pounce: () => { noise(.3, .22, 900, 4000, 'bandpass', 1); tone(420, 140, .3, 'sawtooth', .05); },
    spot: () => { tone(988, 988, .07, 'square', .07); tone(1480, 1480, .16, 'square', .07, .08); },
    close: () => { noise(.3, .15, 4000, 500, 'bandpass', 1.5); },
    hide: () => { noise(.28, .12, 900, 400, 'lowpass', .7); noise(.18, .06, 2500, 1200, 'bandpass', 2, .1); },
    tick: () => tone(1200, 1200, .05, 'square', .04),
    sec: () => { tone(880, 860, .08, 'square', .05); tone(440, 430, .08, 'triangle', .05); },
    go: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .3, 'triangle', .05, i * .02)),
    release: () => { tone(110, 55, .5, 'sawtooth', .08); noise(.5, .15, 300, 80, 'lowpass', .7); },
    win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, f, .22, 'triangle', .06, i * .08)),
    lose: () => [440, 392, 349, 262].forEach((f, i) => tone(f, f * .97, .3, 'triangle', .06, i * .14)),
    ready: () => { tone(1568, 1568, .06, 'sine', .05); tone(2093, 2093, .1, 'sine', .04, .05); },
    pick: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .09, 'square', .04, i * .05)),
    camo: () => { noise(.5, .12, 400, 3000, 'bandpass', .8); tone(900, 300, .4, 'sine', .05); },
    block: () => { tone(140, 60, .2, 'square', .1); noise(.15, .2, 900, 200, 'lowpass', .7); },
    fish: () => { tone(500, 700, .08, 'triangle', .06); tone(700, 1000, .1, 'triangle', .06, .1); },
    pew: (w, v = 1) => { if (w === 'sniper') { tone(1400, 200, .25, 'sawtooth', .07 * v); noise(.2, .15 * v, 3000, 800, 'bandpass', 1); } else if (w === 'shotgun') { noise(.22, .22 * v, 1500, 300, 'lowpass', .8); tone(220, 90, .15, 'square', .05 * v); } else { tone(w === 'churu' ? 1200 : 900, 300, .07, 'square', .035 * v); noise(.06, .07 * v, 2500, 1200, 'bandpass', 2); } },
    boom: (v = 1) => { noise(.6, .4 * v, 900, 60, 'lowpass', .7); tone(120, 35, .5, 'sine', .3 * v); },
    hurt: () => { tone(300, 120, .12, 'square', .07); noise(.1, .1, 900, 300, 'bandpass', 1); },
    hitmark: () => tone(1800, 1600, .04, 'square', .04),
    ko: () => { [600, 450, 300, 180].forEach((f, i) => tone(f, f * .9, .16, 'triangle', .07, i * .08)); },
    mob: () => { tone(500, 140, .18, 'sawtooth', .04); noise(.15, .08, 3000, 800, 'bandpass', 2); },
    meow: () => { tone(500, 900, .12, 'sawtooth', .04); tone(900, 420, .3, 'sawtooth', .04, .12); },
  };
  // 긴장감 브금: 가까울수록 빨라지고 커진다 + 심장 소리
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
  const BASS = [45, 41, 43, 40]; // A F G E (MIDI)
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function musicUpdate(dt, playing) {
    const c = au.ctx; if (!c) return;
    const target = playing && !app.muted ? .55 : 0;
    au.mus.gain.value += (target - au.mus.gain.value) * Math.min(1, dt * 3);
    if (!playing || app.muted) { au.nextNote = 0; return; }
    const I = fx.tension;
    const spb = 60 / (92 + I * 70) / 4; // 16분음표 길이
    if (au.nextNote < c.currentTime) au.nextNote = c.currentTime + .05;
    while (au.nextNote < c.currentTime + .15) {
      const s = au.step % 16, bar = Math.floor(au.step / 16) % 4, t0 = au.nextNote - c.currentTime, root = BASS[bar];
      if (s === 0 || s === 6 || s === 8 || (I > .5 && (s === 11 || s === 14))) tone(mtof(root), mtof(root) * .99, spb * 3, 'triangle', .07 + I * .05, t0, au.mus);
      if (s % 2 === 0) { const n = root + 24 + SCALE[(s / 2 + bar * 3 + (I > .6 ? s : 0)) % SCALE.length]; tone(mtof(n), mtof(n), spb * 1.6, I > .55 ? 'square' : 'triangle', .012 + I * .022, t0, au.mus); }
      if (I > .3 && s % 2 === 1) noise(.04, .025 + I * .04, 8000, 6000, 'highpass', .7, t0, au.mus);
      if (I > .7 && (s === 4 || s === 12)) noise(.12, .08, 1800, 600, 'bandpass', .8, t0, au.mus);
      au.nextNote += spb; au.step++;
    }
  }
  function heartbeat(dt) {
    const I = fx.tension;
    if (I < .2 || app.muted || !au.ctx) { au.hbT = 0; return; }
    au.hbT -= dt;
    if (au.hbT <= 0) {
      au.hbT = lerp(1.05, .38, (I - .2) / .8);
      tone(70, 38, .16, 'sine', .25 + I * .35); tone(64, 34, .14, 'sine', .18 + I * .25, .17);
      fx.beat = 1;
      if (I > .75) vib(25);
    }
  }

  /* ---------------- 화면 크기 ---------------- */
  const worldC = $('world'), fxC = $('fx'), wg = worldC.getContext('2d'), xg = fxC.getContext('2d'), spritesEl = $('sprites');
  let vw = innerWidth, vh = innerHeight, dpr = 1, zoom = 1;
  // 화질 단계: 프레임이 계속 느리면 해상도를 한 단계씩 내린다 (폰에서 렉 방지)
  const perf = { cap: (matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75), ema: 16, slowT: 0, low: false };
  function resize() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, perf.cap);
    for (const c of [worldC, fxC]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    zoom = clamp(Math.sqrt(vw * vh / (1000 * 650)), 0.55, 1.6);
  }
  addEventListener('resize', resize); resize();

  /* ---------------- 입력 ---------------- */
  const keys = new Set();
  const touchUI = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (touchUI) document.body.classList.add('touchui');
  const skillQ = [false, false]; let itemQ = false, sayQ = false;
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (app.inGame && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (app.inGame && !e.repeat) {
      if (e.code === 'KeyQ' || e.code === 'KeyJ' || e.code === 'Digit1') skillQ[0] = true;
      if (e.code === 'KeyE' || e.code === 'KeyK' || e.code === 'Digit2') skillQ[1] = true;
      if (e.code === 'KeyR' || e.code === 'KeyL' || e.code === 'Digit3') itemQ = true;
      if (e.code === 'KeyT') sayQ = true;
      if (e.code === 'KeyM') toggleMute();
    }
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  let dashTouch = false;
  const stickZone = $('stickZone'), stickBase = $('stickBase'), stickKnob = $('stickKnob');
  stickZone.addEventListener('pointerdown', e => {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
    stickZone.setPointerCapture(e.pointerId); stickZone.classList.add('active');
    stickBase.style.left = e.clientX + 'px'; stickBase.style.top = e.clientY + 'px'; stickKnob.style.transform = '';
  });
  stickZone.addEventListener('pointermove', e => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = hyp(dx, dy), m = 56;
    if (d > m) { dx = dx / d * m; dy = dy / d * m; }
    stick.x = dx / m; stick.y = dy / m;
    if (hyp(stick.x, stick.y) < .18) stick.x = stick.y = 0;
    stickKnob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const endStick = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; stickKnob.style.transform = ''; stickZone.classList.remove('active'); stickBase.style.left = ''; stickBase.style.top = ''; };
  stickZone.addEventListener('pointerup', endStick); stickZone.addEventListener('pointercancel', endStick);
  const skD = $('skD'), skB = [$('sk0'), $('sk1')];
  skD.addEventListener('pointerdown', e => { e.preventDefault(); dashTouch = true; try { skD.setPointerCapture(e.pointerId); } catch (er) { } });
  skD.addEventListener('pointerup', () => { dashTouch = false; }); skD.addEventListener('pointercancel', () => { dashTouch = false; });
  skB.forEach((b, k) => b.addEventListener('pointerdown', e => { e.preventDefault(); skillQ[k] = true; }));
  const skI = $('skI');
  skI.addEventListener('pointerdown', e => { e.preventDefault(); itemQ = true; });
  $('sayBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (app.mode === 'practice' && !touchUI) sayQ = true; else chatOpen(); });
  const mouse = { x: 0, y: 0, down: false, on: false };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; } });
  const uiHit = t => t.closest('button,input,form,.screen,#chatBox,#skills');
  $('app').addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || !app.inGame || uiHit(e.target)) return;
    if (e.button === 0) mouse.down = true;
    else if (e.button === 2 && isCombat(app.g)) skillQ[0] = true;
  });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouse.down = false; });
  addEventListener('blur', () => { mouse.down = false; });
  $('app').addEventListener('contextmenu', e => { if (app.inGame) e.preventDefault(); });
  let fireTouch = false;
  const fireBtn = $('fireBtn'), aimStick = { id: null, ox: 0, oy: 0, a: null };
  // 누르면 발사, 누른 채 드래그하면 그 방향으로 조준 (안 끌면 자동 조준)
  fireBtn.addEventListener('pointerdown', e => {
    e.preventDefault(); fireTouch = true; aimStick.id = e.pointerId; aimStick.ox = e.clientX; aimStick.oy = e.clientY; aimStick.a = null;
    try { fireBtn.setPointerCapture(e.pointerId); } catch (er) { }
  });
  fireBtn.addEventListener('pointermove', e => {
    if (e.pointerId !== aimStick.id) return;
    const dx = e.clientX - aimStick.ox, dy = e.clientY - aimStick.oy, d = hyp(dx, dy);
    if (d > 14) aimStick.a = Math.atan2(dy, dx);
    fireBtn.style.setProperty('--ax', clamp(dx, -30, 30) + 'px'); fireBtn.style.setProperty('--ay', clamp(dy, -30, 30) + 'px');
  });
  const endAim = () => { fireTouch = false; aimStick.id = null; aimStick.a = null; fireBtn.style.setProperty('--ax', '0px'); fireBtn.style.setProperty('--ay', '0px'); };
  fireBtn.addEventListener('pointerup', endAim); fireBtn.addEventListener('pointercancel', endAim);
  // 조준: PC는 마우스, 폰은 가장 가까운 보이는 적을 자동 조준 (없으면 가는 방향)
  function aimFor(me, g, mx, my) {
    const W0 = C.WEAPONS[me.wpn] || C.WEAPONS.pistol, range = W0.spd * W0.life;
    const cand = g.mode === 'zombie' ? g.mobs : g.cats.filter(c => c.team !== me.team && !c.dead && C.visibleTo(g, me.team, c));
    if (aimStick.a != null) return aimStick.a;
    if (!touchUI && mouse.on) {
      const [px, py] = toScreen(me.x, me.y), a = Math.atan2(mouse.y - py, mouse.x - px);
      // 조준 보정: 커서 방향 10° 안의 적에게 살짝 붙는다
      let best = null, bs = 0.18;
      for (const t of cand) {
        const d = hyp(t.x - me.x, t.y - me.y); if (d > range * 1.05) continue;
        const ta = Math.atan2(t.y - me.y, t.x - me.x), diff = Math.abs(Math.atan2(Math.sin(ta - a), Math.cos(ta - a)));
        if (diff < bs) { bs = diff; best = ta; }
      }
      return best == null ? a : a + Math.atan2(Math.sin(best - a), Math.cos(best - a)) * 0.6;
    }
    let best = null, bd = 1e9;
    for (const t of cand) { const d = hyp(t.x - me.x, t.y - me.y); if (d < bd && d < range * 1.1) { bd = d; best = t; } }
    if (best) return Math.atan2(best.y - me.y, best.x - me.x);
    if (mx || my) return Math.atan2(my, mx);
    return me.gunA ?? 0;
  }
  function readInput() {
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    const l = hyp(x, y); if (l > 1) { x /= l; y /= l; }
    const dash = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Enter') || dashTouch;
    const s0 = skillQ[0], s1 = skillQ[1], it = itemQ, say = sayQ; skillQ[0] = skillQ[1] = itemQ = sayQ = false;
    const inp = { x, y, dash, s0, s1, it, say };
    const g = app.g, me = g && g.cats[app.mySlot];
    if (isCombat(g) && me) { inp.ga = aimFor(me, g, x, y); inp.fire = mouse.down || fireTouch || keys.has('KeyF') || keys.has('KeyJ'); }
    return inp;
  }
  function toggleMute() {
    app.muted = !app.muted; saveMe();
    if (au.master) au.master.gain.value = app.muted ? 0 : .9;
    $('muteBtn').textContent = app.muted ? '🔇' : '🔊';
    toast(app.muted ? '소리 끔' : '소리 켬', 1200);
  }
  $('muteBtn').textContent = app.muted ? '🔇' : '🔊';
  $('muteBtn').onclick = toggleMute;

  /* ---------------- UI 헬퍼 ---------------- */
  function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms); }
  function show(id) {
    for (const s of ['scrTitle', 'scrLobby', 'scrOver', 'scrPick', 'scrRank']) $(s).hidden = s !== id; if (id === 'scrTitle') renderRankBox();
    $('chatBox').hidden = !(id === 'scrLobby' || id === 'scrOver' || (id == null && app.inGame)); if (id === 'scrTitle') $('chatLog').replaceChildren();
  }
  function banner(html, sec = 2) { const b = $('banner'); b.innerHTML = html; b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); app.bannerT = sec; }
  function avNode(av, slot, size) {
    const v = validAv(av) || 'd' + (slot % 4);
    if (v.startsWith('g:')) {
      const im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = v.slice(2); im.loading = 'lazy';
      im.onerror = () => { im.replaceWith(avNode('d' + (slot % 4), slot, size)); };
      return im;
    }
    const cv = document.createElement('canvas'); cv.width = size * 2; cv.height = size * 2;
    const g = cv.getContext('2d'); g.scale(2, 2); drawCat(g, size / 2, size * .58, size * .3, +v[1], 1.2, false, 1, false);
    return cv;
  }
  function setAvBox(el, av, slot) { el.replaceChildren(avNode(av, slot, 76)); }
  function copyText(txt, done) {
    const fin = () => toast(done);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(fin, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); fin(); } catch (e) { toast(txt, 6000); } ta.remove(); }
  }

  /* ---------------- 고양이 고르기 ---------------- */
  let pickReturn = 'scrTitle';
  // 초록 배경 미리보기는 화면에 보일 때만 푼다 (100개 넘게 한꺼번에 풀면 무거움)
  const previewIO = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
    for (const en of ents) if (en.isIntersecting) { previewIO.unobserve(en.target); startPreview(en.target); }
  }, { rootMargin: '200px' }) : null;
  function startPreview(b) {
    const im = b.querySelector('img'), url = b.dataset.av.slice(2);
    loadAnim(url, true).then(a => {
      if (a.state !== 'ok' || !a.keyed || !im.isConnected) return;
      const cv = document.createElement('canvas'); cv.width = a.w; cv.height = a.h; cv.className = 'keyprev';
      const ctx = cv.getContext('2d'); const t0 = performance.now();
      im.replaceWith(cv);
      (function tick(now) { if (!cv.isConnected) return; if (!$('scrPick').hidden) { ctx.clearRect(0, 0, a.w, a.h); ctx.drawImage(animFrame(a, (now - t0) / 1000), 0, 0); } requestAnimationFrame(tick); })(t0);
    });
  }
  function gifCell(url, nm, keyed) {
    const b = document.createElement('button'); b.className = 'cell' + (keyed ? ' keyed' : ''); b.type = 'button'; const av = 'g:' + url; b.dataset.av = av;
    const im = new Image(); im.alt = nm; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; im.src = url;
    im.onerror = () => { b.hidden = true; };
    b.append(im); const sp = document.createElement('span'); sp.textContent = nm; b.append(sp);
    b.onclick = () => choose(av);
    if (keyed) { if (previewIO) previewIO.observe(b); else startPreview(b); }
    return b;
  }
  function openPick(from) {
    pickReturn = from;
    const dg = $('drawGrid'), gg = $('gifGrid'), kg = $('keyGrid');
    if (!dg.children.length) {
      STYLES.forEach((s, i) => {
        const b = document.createElement('button'); b.className = 'cell'; b.type = 'button'; b.dataset.av = 'd' + i;
        b.append(avNode('d' + i, i, 84)); const sp = document.createElement('span'); sp.textContent = s.name; b.append(sp);
        b.onclick = () => choose('d' + i); dg.append(b);
      });
      KEY_GIFS.forEach(([url, nm]) => kg.append(gifCell(url, nm, true)));
      GIFS.forEach(([url, nm]) => gg.append(gifCell(url, nm, false)));
      $('keyCount').textContent = KEY_GIFS.length + '개'; $('gifCount').textContent = GIFS.length + '개';
    }
    for (const b of document.querySelectorAll('#scrPick .cell')) b.classList.toggle('on', b.dataset.av === app.me.av);
    $('urlIn').value = app.me.av.startsWith('g:') && !PRESET.has(app.me.av.slice(2)) ? app.me.av.slice(2) : '';
    show('scrPick');
  }
  function choose(av) {
    const v = validAv(av); if (!v) { toast('https:// 로 시작하는 GIF 주소를 넣어 주세요.'); return; }
    SFX.meow();
    app.me.av = v; saveMe(); setAvBox($('myAv'), v, 0);
    if (app.lobby) {
      if (app.mode === 'client') net.send({ t: 'av', av: v });
      else { const s = app.lobby.slots.find(s => s.p === app.myId); if (s) s.av = v; lobbyChanged(); }
    }
    show(pickReturn);
    if (pickReturn === 'scrLobby') renderLobby();
  }
  $('pickClose').onclick = () => show(pickReturn);
  $('urlBtn').onclick = () => { const u = $('urlIn').value.trim(); if (u) choose('g:' + u); };
  $('myAvBtn').onclick = () => openPick('scrTitle');
  $('lobbyAvBtn').onclick = () => openPick('scrLobby');

  /* ---------------- 맵 ---------------- */
  function useMap(id) {
    if (!C.MAPS[id]) id = 'house';
    if (C.MAP_ID === id && mapCache) return;
    C.setMap(id); W = C.W; H = C.H;
    mapCache = null; canopyCache.clear();
    app.demo = C.createGame(2); C.startMatch(app.demo); app.demo.countT = 0;
    app.cam.x = clamp(app.cam.x, 0, W); app.cam.y = clamp(app.cam.y, 0, H); app.demoCam.t = 0;
  }
  // 맵 카드용 축소 지도 (실제 배치를 그대로 그림)
  const FLOOR_COL = { wood: '#d9b27c', tile: '#dfe6ea', carpet: '#c8b3e0', grass: '#7fb069', stone: '#b8afa2', road: '#55595f', madang: '#5d5266', baksuk: '#3c3a48', snow: '#eef4fa', deck: '#b8865a', sand: '#ecd9a6', hall: '#d6cfc0', track: '#c2734f', court: '#d9a066', dgrass: '#2c3a2c', dirt: '#5e4a3a', metal: '#2f3747', grate: '#1d222b' };
  const SOLID_COL = k => k === 'wall' || k === 'hull' ? '#1e2a26' : k === 'tree' || k === 'pine' || k === 'palm' || k === 'cherry' ? '#2f6e2b' : k === 'pond' || k === 'sea' || k === 'stream' || k === 'fountain' ? '#4fa3cf' : k === 'reactor' || k === 'tank' || k === 'holo' ? '#4cc9f0' : k === 'jack' || k === 'pumpkin' ? '#f77f00' : k === 'deadtree' ? '#6b4a35' : k === 'mansion' || k === 'hanok' ? '#3b2f4f' : 'rgba(40,30,25,.55)';
  function mapThumb(id) {
    const cur = C.MAP_ID; C.setMap(id);
    const tw = 240, th = 160, cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
    const g = cv.getContext('2d'), k = Math.min(tw / C.W, th / C.H), ox = (tw - C.W * k) / 2, oy = (th - C.H * k) / 2;
    g.fillStyle = '#1e2a26'; g.fillRect(0, 0, tw, th); g.translate(ox, oy); g.scale(k, k);
    for (const r of C.ROOMS) { g.fillStyle = FLOOR_COL[r.k] || '#7fb069'; g.fillRect(r.x, r.y, r.w, r.h); }
    if (id === 'beach') { g.fillStyle = '#4fa3cf'; g.fillRect(0, 0, C.W, 420); }
    for (const h of C.HIDES) { g.fillStyle = 'rgba(70,150,60,.75)'; g.fillRect(h.x, h.y, h.w, h.h); }
    for (const o of C.SOLIDS) { g.fillStyle = SOLID_COL(o.k); g.fillRect(o.x, o.y, Math.max(o.w, 30), Math.max(o.h, 30)); }
    if (C.NIGHT) { g.fillStyle = 'rgba(10,12,40,.45)'; g.fillRect(0, 0, C.W, C.H); g.globalCompositeOperation = 'lighter'; for (const [lx, ly, lr] of C.LIGHTS) { const gr = g.createRadialGradient(lx, ly, 0, lx, ly, lr); gr.addColorStop(0, C.LAMP === 'tech' ? 'rgba(80,200,255,.35)' : 'rgba(255,170,70,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); } g.globalCompositeOperation = 'source-over'; }
    g.fillStyle = '#ff4d88'; for (const [sx, sy] of C.SPAWN.slice(0, 1)) { g.beginPath(); g.arc(sx, sy, 70, 0, 7); g.fill(); }
    g.fillStyle = '#4a74a0'; for (const [sx, sy] of C.SPAWN.slice(2, 3)) { g.beginPath(); g.arc(sx, sy, 70, 0, 7); g.fill(); }
    if (cur) C.setMap(cur);
    return cv;
  }
  function renderMaps() {
    const L = app.lobby, box = $('mapRow'), host = app.mode !== 'client';
    if (!box.children.length) {
      for (const id of C.MAP_IDS) {
        const M = C.MAPS[id], b = document.createElement('button'); b.type = 'button'; b.className = 'mapbtn'; b.dataset.map = id;
        b.innerHTML = `<span class="mi">${MAP_ICON[id] || '🗺️'}</span><b></b><small></small>`;
        b.querySelector('b').textContent = M.name; b.querySelector('small').textContent = M.desc;
        try { const t = mapThumb(id); t.className = 'thumb'; b.prepend(t); } catch (e) { }
        b.onclick = () => { if (app.mode === 'client' || !app.lobby) return; SFX.ui(); app.lobby.map = id; useMap(id); lobbyChanged(); };
        box.append(b);
      }
    }
    for (const b of box.children) { b.classList.toggle('on', b.dataset.map === L.map); b.disabled = !host; }
  }

  function renderModes() {
    const L = app.lobby, box = $('modeRow'), host = app.mode !== 'client';
    if (!box.children.length) for (const id of Object.keys(C.MODES)) {
      const M = C.MODES[id], b = document.createElement('button'); b.type = 'button'; b.className = 'modebtn'; b.dataset.mode = id;
      b.innerHTML = `<span class="mi">${M.icon}</span><b></b><small></small>`; b.querySelector('b').textContent = M.name; b.querySelector('small').textContent = M.desc;
      b.onclick = () => { if (app.mode === 'client' || !app.lobby) return; SFX.ui(); app.lobby.mode = id; lobbyChanged(); };
      box.append(b);
    }
    for (const b of box.children) { b.classList.toggle('on', b.dataset.mode === (L.mode || 'tag')); b.disabled = !host; }
    // 냥버워치: 내 클래스 고르기
    const cr = $('clsRow'); cr.hidden = L.mode !== 'hero';
    if (L.mode === 'hero') {
      if (!cr.children.length) for (const id of C.CLASS_IDS) {
        const K = C.CLASSES[id], b = document.createElement('button'); b.type = 'button'; b.className = 'clsbtn'; b.dataset.cls = id;
        b.innerHTML = `<span class="mi">${K.icon}</span><b></b><small></small>`; b.querySelector('b').textContent = K.name;
        b.querySelector('small').textContent = `체력 ${K.hp} · ${C.WEAPONS[K.wpn].name} · ${K.skill.name}`;
        b.onclick = () => { SFX.ui(); pickCls(id); };
        cr.append(b);
      }
      const mine = L.slots.find(s => s.p === app.myId), cur = (mine && mine.cls) || 'dps';
      for (const b of cr.children) b.classList.toggle('on', b.dataset.cls === cur);
    }
  }
  function pickCls(id) {
    if (!C.CLASSES[id] || !app.lobby) return;
    if (app.mode === 'client') { net.send({ t: 'cls', cls: id }); const s = app.lobby.slots.find(s => s.p === app.myId); if (s) s.cls = id; renderLobby(); return; }
    const s = app.lobby.slots.find(s => s.p === app.myId); if (s) s.cls = id; lobbyChanged();
  }
  function renderSizes() {
    const L = app.lobby, box = $('sizeRow'), host = app.mode !== 'client';
    if (!box.children.length) {
      const lb = document.createElement('span'); lb.className = 'szl'; lb.textContent = '인원'; box.append(lb);
      for (let ts = 1; ts <= 8; ts++) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'szbtn'; b.dataset.ts = ts; b.textContent = `${ts}:${ts}`;
        b.onclick = () => {
          if (app.mode === 'client' || !app.lobby) return;
          if (!resizeLobby(app.lobby, ts)) { toast('사람이 많아서 그 인원으로 못 줄여요.'); return; }
          SFX.ui(); lobbyChanged();
        };
        box.append(b);
      }
    }
    for (const b of box.querySelectorAll('.szbtn')) { b.classList.toggle('on', +b.dataset.ts === L.ts); b.disabled = !host; }
  }

  /* ---------------- 로비 ---------------- */
  const botName = i => '봇 ' + STYLES[i % 4].name;
  const botCls = i => ['tank', 'dps', 'heal', 'snipe'][i % 4];
  const empty = () => ({ p: null, name: '', av: '', rk: 0 });
  const teamOf = (L, i) => (i >= L.ts ? 1 : 0);
  const teamIdx = (L, t) => Array.from({ length: L.ts }, (_, k) => t * L.ts + k);
  function newLobby(code, ts = 2) {
    return { code, map: C.MAP_ID || 'house', mode: 'tag', ts, slots: Array.from({ length: ts * 2 }, empty) };
  }
  function freeSlot(lobby, team) {
    for (const i of teamIdx(lobby, team)) if (!lobby.slots[i].p) return i;
    return -1;
  }
  // 팀 인원 바꾸기: 사람은 자기 팀에 최대한 남긴다
  function resizeLobby(L, ts) {
    const humans = L.slots.map((s, i) => ({ s, t: teamOf(L, i) })).filter(h => h.s.p);
    if (humans.length > ts * 2) return false;
    const N = { ...L, ts, slots: Array.from({ length: ts * 2 }, empty) };
    for (const h of humans) { let i = freeSlot(N, h.t); if (i < 0) i = freeSlot(N, 1 - h.t); N.slots[i] = h.s; }
    Object.assign(L, N); return true;
  }
  function addPlayer(lobby, p, name, av, rk) {
    const humans = t => lobby.slots.filter((s, i) => teamOf(lobby, i) === t && s.p).length;
    const pref = humans(0) <= humans(1) ? 0 : 1;
    let i = freeSlot(lobby, pref); if (i < 0) i = freeSlot(lobby, 1 - pref);
    if (i < 0) return -1;
    lobby.slots[i] = { p, name: cleanName(name), av: validAv(av) || '', rk: cleanRk(rk), cls: 'dps' };
    return i;
  }
  function moveTeam(lobby, p, team) {
    const cur = lobby.slots.findIndex(s => s.p === p); if (cur < 0 || teamOf(lobby, cur) === team) return;
    const i = freeSlot(lobby, team); if (i < 0) return false;
    lobby.slots[i] = lobby.slots[cur]; lobby.slots[cur] = empty();
    return true;
  }
  function renderLobby() {
    const L = app.lobby; if (!L) return;
    if (app.mode !== 'practice') noteSeen(L);
    const isLocal = app.mode === 'practice';
    $('lobbyKind').textContent = isLocal ? '혼자 연습' : app.quick ? '⚡ 빠른 대전 방' : '방 코드';
    $('codeOut').textContent = isLocal ? '연습' : L.code;
    $('copyRow').hidden = isLocal;
    for (const t of [0, 1]) {
      const box = $('slots' + t); box.replaceChildren(); box.classList.toggle('many', L.ts > 3);
      for (const i of teamIdx(L, t)) {
        const s = L.slots[i], d = document.createElement('div'); d.className = 'slot' + (s.p && s.p === app.myId ? ' mine' : '');
        const av = document.createElement('div'); av.className = 'av'; av.append(avNode(s.p ? s.av : '', i, 44));
        const who = document.createElement('div'); who.className = 'who';
        const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = s.p ? s.name : botName(i);
        const tg = document.createElement('div'); tg.className = 'tag';
        tg.textContent = !s.p ? '빈 자리 · 봇' : (s.p === app.myId ? '나' : '') + (s.p === L.host ? (s.p === app.myId ? ' · 방장' : '방장') : (s.p === app.myId ? '' : '친구'));
        who.append(nm, tg); d.append(av, who);
        if (L.mode === 'hero') { const ci = document.createElement('span'); ci.className = 'clschip'; ci.textContent = C.CLASSES[s.cls || botCls(i)].icon; d.append(ci); }
        if (s.p) { const tr = tierOf(s.p === app.myId ? rank.rating : s.rk); const b = document.createElement('span'); b.className = 'tierchip'; b.style.background = tr.col; b.textContent = tr.short; b.title = tr.name; d.append(b); }
        box.append(d);
      }
    }
    const mine = L.slots.findIndex(s => s.p === app.myId);
    $('go0').disabled = mine < 0 || teamOf(L, mine) === 0 || freeSlot(L, 0) < 0;
    $('go1').disabled = mine < 0 || teamOf(L, mine) === 1 || freeSlot(L, 1) < 0;
    const host = app.mode !== 'client';
    $('startBtn').hidden = !host;
    renderModes(); renderMaps(); renderSizes();
    const humans = L.slots.filter(s => s.p).length;
    $('lobbyHint').textContent = host
      ? (isLocal ? '나 빼고 나머지는 봇이 맡아요. 인원·팀·맵을 골라 시작하세요.' : app.quick ? (quickT > 0 ? `${humans}명 모임 · ${Math.ceil(quickT)}초 뒤 자동 시작` : `상대 기다리는 중… 지금 ${humans}명 (2명부터 자동 시작)`) : `지금 ${humans}명. 빈 자리는 봇이 채워요. 코드나 링크를 친구한테 보내세요.`)
      : app.quick ? '빠른 대전 방이에요. 사람이 모이면 자동으로 시작해요!' : '방장이 맵을 고르고 시작하면 바로 게임이 열려요.';
  }
  function lobbyChanged() {
    renderLobby();
    if (app.mode === 'host') net.broadcast({ t: 'lobby', lobby: app.lobby });
  }
  $('go0').onclick = () => pickTeam(0);
  $('go1').onclick = () => pickTeam(1);
  function pickTeam(t) {
    SFX.ui();
    if (app.mode === 'client') { net.send({ t: 'team', team: t }); return; }
    if (moveTeam(app.lobby, app.myId, t) === false) toast('그 팀은 자리가 없어요.');
    lobbyChanged();
  }

  /* ---------------- 게임 시작/끝 ---------------- */
  const sprites = Array(MAXP).fill(null);
  const spriteAv = Array(MAXP).fill('');
  function syncSprites() {
    for (let i = 0; i < MAXP; i++) {
      const s = app.inGame && app.lobby ? app.lobby.slots[i] : null;
      const av = s && s.p ? validAv(s.av) || '' : '';
      if (spriteAv[i] === av) continue;
      spriteAv[i] = av;
      if (sprites[i]) { if (sprites[i].remove) sprites[i].remove(); sprites[i] = null; }
      if (av.startsWith('g:')) {
        const url = av.slice(2);
        const im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = url;
        im.onerror = () => { if (sprites[i] === im) { im.remove(); sprites[i] = null; } };
        spritesEl.append(im); sprites[i] = im; im.dataset.url = url;
        loadAnim(url).then(a => {
          if (a.state === 'ok' && sprites[i] === im) { im.remove(); sprites[i] = { anim: a, url }; }
        });
      }
    }
  }
  function styleOf(i) {
    const s = app.inGame && app.lobby ? app.lobby.slots[i] : null;
    const av = s && s.p ? validAv(s.av) : null;
    return av && av[0] === 'd' ? +av[1] : i % 4;
  }
  function applyLobbyToGame() {
    const L = app.lobby, hostish = app.mode !== 'client';
    app.g.cats.forEach((c, i) => {
      const s = L.slots[i];
      c.kind = s.p === app.myId ? 'local' : s.p ? (hostish ? 'remote' : 'net') : (hostish ? 'bot' : 'net');
      c.cls = s.p ? (s.cls || 'dps') : botCls(i);
    });
    app.mySlot = L.slots.findIndex(s => s.p === app.myId);
  }
  function enterGame() {
    app.inGame = true; app.popups = [];
    fx.parts = []; fx.rings = []; fx.marks = []; fx.screen = []; fx.tension = 0; fx.prevHide = Array(MAXP).fill(-1); fx.bubbles = Array(MAXP).fill(null);
    match.stats = { freezes: 0, rescues: 0, rounds: 0, wonRounds: 0 };
    document.body.classList.toggle('combat', isCombat(app.g)); $('feed').replaceChildren();
    show(null); $('hud').hidden = false; $('touch').hidden = !touchUI; $('skills').hidden = false;
    syncSprites(); ac();
    const me = app.g.cats[app.mySlot]; if (me) { app.cam.x = me.x; app.cam.y = me.y; }
  }
  function startHostGame() {
    useMap(app.lobby.map);
    app.g = C.createGame(app.lobby.ts, app.lobby.mode); applyLobbyToGame(); C.startMatch(app.g);
    if (app.mode === 'host') net.broadcast({ t: 'start', lobby: app.lobby });
    enterGame();
  }
  $('startBtn').onclick = () => { SFX.go(); startHostGame(); };
  function leaveGameUI() {
    app.inGame = false; document.body.classList.remove('combat'); $('hud').hidden = true; $('touch').hidden = true; $('skills').hidden = true; $('banner').hidden = true;
    fx.tension = 0;
    syncSprites();
  }
  function backToLobby() {
    leaveGameUI(); show('scrLobby'); renderLobby();
  }
  function backToTitle(msg) {
    if (app.mode === 'host') {
      // 손님들한테 알리고 조금 뒤에 끊는다 (바로 끊으면 메시지가 안 갈 수 있음)
      net.broadcast({ t: 'bye' });
      const conns = [...net.conns.values()], peer = net.peer; net.conns = new Map(); net.peer = null;
      setTimeout(() => { for (const c of conns) try { c.close(); } catch (e) { } try { if (peer) peer.destroy(); } catch (e) { } }, 400);
    }
    net.close();
    app.mode = 'title'; app.lobby = null; app.g = null; app.quick = false;
    leaveGameUI(); show('scrTitle'); if (msg) toast(msg, 3500);
    history.replaceState(null, '', location.pathname);
  }
  $('quitBtn').onclick = () => {
    if (app.mode === 'practice') { backToLobby(); return; }
    backToTitle();
  };
  $('leaveBtn').onclick = () => backToTitle();
  $('overLeave').onclick = () => backToTitle();
  $('overAgain').onclick = () => {
    if (app.mode === 'client') { backToLobby(); return; }
    if (app.mode === 'host') net.broadcast({ t: 'lobby', lobby: app.lobby, back: true });
    backToLobby();
  };

  /* ---------------- 이벤트 → 효과 ---------------- */
  const nameOf = id => { const s = app.lobby && app.lobby.slots[id]; return id === app.mySlot ? '나' : s && s.p ? s.name : '봇'; };
  function handleEvent(e, g) {
    const mine = app.mySlot >= 0 ? g.cats[app.mySlot] : null, myTeam = mine ? mine.team : -1;
    const cat = typeof e.id === 'number' ? g.cats[e.id] : null;
    const near = (x, y) => !mine || hyp(mine.x - x, mine.y - y) < 900;
    const canSee = c => c && (myTeam < 0 || C.visibleTo(g, myTeam, c));
    if (e.k === 'freeze') {
      burst(e.x, e.y, 26, { col: ['#bfeaff', '#7fd3ff', '#ffffff', '#4cc9f0'], sp: 340, life: .8, size: 9, kind: 'ice', drag: 2.5 });
      ring(e.x, e.y, 120, '#7fd3ff', .5, 8);
      pop(e.x, e.y - 50, '얼음!', '#3aaef0', 1.3);
      if (e.by === app.mySlot) match.stats.freezes++;
      if (e.deep) pop(e.x, e.y - 86, '꽁꽁 얼음!', '#1d4e89', 1.1);
      if (e.id === app.mySlot) { SFX.frozenMe(); shake(16); flash('#9ee3ff', .45); vib([60, 40, 160]); }
      else if (e.by === app.mySlot) { SFX.freeze(1.2); shake(9); vib(60); pop(e.x, e.y - 90, '잡았다!', '#ff3b6b', 1.1); }
      else if (near(e.x, e.y)) { SFX.freeze(.7); shake(4); }
      if (e.last) { fx.slow = 1.1; shake(18); flash('#ffffff', .5); }
      bubble(e.id, pickLine('freezeMe')); if (Math.random() < .7) bubble(e.by, pickLine('freezeBy'));
    } else if (e.k === 'unfreeze') {
      bubble(e.id, pickLine('unfreezeMe')); bubble(e.by, pickLine('unfreezeBy'));
      if (e.by === app.mySlot) match.stats.rescues++;
      burst(e.x, e.y, 24, { col: ['#ffd166', '#fff', TEAM_COL[cat.team], '#06d6a0'], sp: 260, life: .9, size: 8, kind: 'star', up: -60 });
      ring(e.x, e.y, 110, '#ffd166', .5, 6);
      pop(e.x, e.y - 50, '땡!', TEAM_COL[cat.team], 1.3);
      if (e.id === app.mySlot || e.by === app.mySlot) { SFX.unfreeze(); vib([30, 30, 50]); shake(5); if (e.by === app.mySlot) pop(e.x, e.y - 92, '구해줬다!', '#06d6a0'); }
      else if (near(e.x, e.y)) SFX.unfreeze(.6);
    } else if (e.k === 'dash') {
      if (cat && canSee(cat)) burst(cat.x, cat.y + cat.r * .8, 10, { col: ['rgba(230,220,200,.9)', 'rgba(255,255,255,.8)'], sp: 120, life: .45, size: 10, kind: 'puff', drag: 4 });
      if (e.id === app.mySlot) { SFX.dash(); vib(15); } else if (cat && canSee(cat) && near(cat.x, cat.y)) SFX.dash(.4);
    } else if (e.k === 'skill') {
      if (app.mode === 'client' && e.id === app.mySlot && !e.local) return; // 내 스킬은 이미 바로 보여줬다
      const isMe = e.id === app.mySlot, sameTeam = cat && cat.team === myTeam;
      if (e.s === 'trap') {
        if (isMe || sameTeam || myTeam < 0) { burst(e.x, e.y, 12, { col: ['#ff6f91', '#ffd166', '#fff'], sp: 140, life: .5, size: 6 }); pop(e.x, e.y - 40, '털뭉치 설치!', '#ff6f91', .9); }
        if (isMe) { SFX.trapSet(); vib(20); }
      } else if (e.s === 'boost') {
        bubble(e.id, pickLine('boost'), 1.4);
        if (canSee(cat)) { burst(e.x, e.y, 18, { col: ['#7ee08a', '#b7f5a0', '#2a9d8f'], sp: 200, life: .7, size: 9, kind: 'leaf' }); ring(e.x, e.y, 90, '#7ee08a', .35, 5); pop(e.x, e.y - 50, '캣닢 가속!', '#2a9d8f', .9); }
        if (isMe) { SFX.boost(); vib(30); shake(3); }
      } else if (e.s === 'sniff') {
        ring(e.x, e.y, C.SNIFF, 'rgba(255,93,143,.9)', 1.1, 10); ring(e.x, e.y, C.SNIFF * .6, 'rgba(255,93,143,.6)', .8, 6);
        if (canSee(cat)) pop(e.x, e.y - 50, '킁킁…', '#ff5d8f', 1);
        bubble(e.id, pickLine('sniff'), 1.6);
        if (isMe) { SFX.sniff(); vib([20, 40, 20, 40, 20]); }
        else if (mine && !sameTeam && hyp(mine.x - e.x, mine.y - e.y) < C.SNIFF) {
          SFX.sniff(); vib([60, 50, 60]); flash('#ff5d8f', .22);
          banner(mine.hidden ? '냄새 맡혔다!<small>근처에 냄새 구름이 남았어. 자리를 옮겨!</small>' : '냄새 맡혔다!<small>술래한테 위치가 다 보여!</small>', 1.8);
        } else if (sameTeam) banner('냄새 추적!<small>숨은 고양이는 냄새 구름으로 보여요</small>', 1.4);
      } else if (e.s === 'pounce') {
        bubble(e.id, pickLine('pounce'), 1.2);
        if (canSee(cat)) { burst(e.x, e.y, 14, { col: ['#ff3b6b', '#fff'], sp: 220, life: .4, size: 7, kind: 'puff' }); pop(e.x, e.y - 50, '덮치기!', '#ff3b6b', .8); }
        if (isMe) { SFX.pounce(); vib(40); shake(6); } else if (canSee(cat) && near(e.x, e.y)) SFX.pounce();
      }
    } else if (e.k === 'trap') {
      burst(e.x, e.y, 30, { col: ['#ff6f91', '#ffd166', '#fff', '#b18cff'], sp: 300, life: .9, size: 7, kind: 'star', up: -40 });
      ring(e.x, e.y, 130, '#ff6f91', .5, 8);
      pop(e.x, e.y - 60, '털뭉치에 걸림!', '#ff6f91', 1.2);
      bubble(e.id, pickLine('trap')); if (typeof e.by === 'number') bubble(e.by, pickLine('trapBy'), 1.8);
      if (e.id === app.mySlot) { SFX.trapHit(); shake(12); flash('#ff9ec4', .3); vib([80, 40, 80, 40, 80]); }
      else if (e.by === app.mySlot) { SFX.trapHit(); vib([30, 30, 60]); pop(e.x, e.y - 100, '걸렸다!', '#2a9d8f', 1.1); shake(4); }
      else if (near(e.x, e.y)) SFX.trapHit(.6);
    } else if (e.k === 'spot') {
      if (cat) fx.marks.push({ id: e.id, t: 0 });
      bubble(e.id, pickLine('spotted'), 1.6);
      const sp = g.cats.filter(c => c.team === g.chaserTeam).sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y))[0];
      if (sp && Math.random() < .6) bubble(sp.id, pickLine('spot'), 1.6);
      if (e.id === app.mySlot) { SFX.spot(); vib([40, 30, 40]); pop(cat.x, cat.y - 90, '들켰다! 깜짝 가속', '#ff3b6b', 1); flash('#ff3b6b', .15); cat.scareT = Math.max(cat.scareT || 0, C.TUNE.scare); }
      else if (myTeam === g.chaserTeam) SFX.spot();
    } else if (e.k === 'whiff') {
      if (cat && canSee(cat)) { pop(e.x, e.y - 60, '헛방!', '#8d99ae', 1); burst(e.x, e.y + 20, 8, { col: ['rgba(230,215,190,.9)'], sp: 120, life: .5, size: 10, kind: 'puff' }); }
      bubble(e.id, pickLine('whiff'), 1.4);
      if (e.id === app.mySlot) { tone(300, 120, .25, 'sawtooth', .05); vib(30); }
    } else if (e.k === 'close') {
      if (e.id === app.mySlot) { SFX.close(); vib(20); pop(e.x, e.y - 70, '아슬아슬!', '#f77f00', .9); }
      if (Math.random() < .6) bubble(e.id, pickLine('close'), 1.5);
    } else if (e.k === 'pick') {
      if (e.id === app.mySlot) {
        SFX.pick(); vib(25);
        const txt = e.s === 'heal' ? '💗 체력 회복!' : e.s.startsWith('w:') ? '💧 ' + (C.WEAPONS[e.s.slice(2)] || {}).name + '!' : IT_ICON[e.s] + ' ' + IT_NAME[e.s] + ' 획득!';
        pop(e.x, e.y - 50, txt, '#b5179e', 1);
      }
      burst(e.x, e.y, 14, { col: ['#ffd166', '#ff5d8f', '#4cc9f0', '#fff'], sp: 200, life: .6, size: 7, kind: 'star', up: -50 });
    } else if (e.k === 'full') {
      if (e.id === app.mySlot) { pop(e.x, e.y - 40, '가방 가득! (최대 3개)', '#8d99ae', .8); tone(300, 250, .1, 'square', .03); }
    } else if (e.k === 'item') {
      if (app.mode === 'client' && e.id === app.mySlot && !e.local) return;
      const isMe = e.id === app.mySlot;
      if (e.s === 'camo') {
        if (canSee(cat) || isMe) burst(e.x, e.y, 22, { col: ['#7ee08a', '#c7f9cc', '#80ed99', '#fff'], sp: 180, life: .7, size: 10, kind: 'puff' });
        if (isMe) { SFX.camo(); vib(30); pop(e.x, e.y - 60, '보호색!', '#2a9d8f'); }
      } else if (e.s === 'block') {
        burst(e.x - (cat ? cat.aimX * 62 : 0), e.y - (cat ? cat.aimY * 62 : 0), 18, { col: ['#c58a4a', '#e9d6a8', '#8b5e34'], sp: 220, life: .6, size: 8 });
        if (isMe || near(e.x, e.y)) { SFX.block(); shake(isMe ? 6 : 2); } if (isMe) vib(40);
      } else if (e.s === 'fish') {
        if (canSee(cat) || isMe) burst(e.x, e.y, 14, { col: ['#8fb3c9', '#fff', '#ffd166'], sp: 160, life: .6, size: 8, kind: 'star' });
        if (isMe) { SFX.fish(); vib(20); pop(e.x, e.y - 60, '쿨타임 초기화!', '#118ab2'); }
      }
      bubble(e.id, pickLine(e.s), 1.6);
    } else if (e.k === 'say') {
      bubble(e.id, pickLine(e.c, e.n));
      if (cat && cat._vis && near(cat.x, cat.y)) tone(700 + Math.random() * 300, 500, .12, 'triangle', .03);
    } else if (e.k === 'fire') {
      if (app.mode === 'client' && e.id === app.mySlot && !e.local) return;
      if (app.mode === 'client' && cat) for (const sh of C.makeShots(cat, e.x, e.y, e.a, e.w, e.s)) g.shots.push(sh);
      if (cat && (canSee(cat) || e.id === app.mySlot)) burst(e.x + Math.cos(e.a) * 30, e.y + Math.sin(e.a) * 30, 3, { col: [WPN_COL[e.w] || '#fff', '#fff'], sp: 140, a0: e.a - .4, spread: .8, life: .18, size: 6 });
      if (e.id === app.mySlot) {
        SFX.pew(e.w); shake(e.w === 'sniper' ? 6 : e.w === 'shotgun' ? 5 : 1.2);
        // 반동: 화면이 쏜 반대쪽으로 살짝 밀린다
        app.cam.x -= Math.cos(e.a) * (e.w === 'sniper' ? 14 : e.w === 'shotgun' ? 10 : 3); app.cam.y -= Math.sin(e.a) * (e.w === 'sniper' ? 14 : e.w === 'shotgun' ? 10 : 3);
        if (e.w === 'sniper' || e.w === 'shotgun') vib(15); else if (Math.random() < .3) vib(6);
      }
      else if (cat && near(e.x, e.y)) SFX.pew(e.w, .35);
    } else if (e.k === 'nade') {
      if (app.mode === 'client') g.nades.push({ sx: e.sx, sy: e.sy, tx: e.tx, ty: e.ty, t: 0, T: .75 });
      if (e.id === app.mySlot) tone(500, 300, .2, 'triangle', .05);
    } else if (e.k === 'boom') {
      burst(e.x, e.y, 34, { col: ['#ffd166', '#f77f00', '#ff6f91', '#fff'], sp: 420, life: .7, size: 10 });
      burst(e.x, e.y, 14, { col: ['rgba(80,70,70,.7)'], sp: 120, life: 1, size: 22, kind: 'puff' });
      ring(e.x, e.y, 150, '#ffd166', .4, 10);
      const d = mine ? hyp(mine.x - e.x, mine.y - e.y) : 0; if (d < 900) { SFX.boom(1 - d / 1000); shake(14 * (1 - d / 900)); if (d < 200) vib(60); }
    } else if (e.k === 'hit') {
      if (!cat) return;
      if (e.id === app.mySlot) { SFX.hurt(); flash('#ff3b3b', .18); shake(4); vib(25); }
      if (e.by === app.mySlot) { SFX.hitmark(); app.popups.push({ x: cat.x + (Math.random() - .5) * 30, y: cat.y - 40, text: '-' + e.d, color: '#ff3b6b', t: .2, s: .6 }); }
      if (canSee(cat)) burst(cat.x, cat.y, 4, { col: ['#bde0fe', '#fff'], sp: 160, life: .3, size: 5 });
    } else if (e.k === 'heal') {
      if (cat && Math.random() < .3 && canSee(cat)) burst(cat.x, cat.y - 10, 2, { col: ['#80ed99', '#fff'], sp: 60, life: .6, size: 6, kind: 'star', up: -60 });
    } else if (e.k === 'kill') {
      const killer = e.by >= 0 ? g.cats[e.by] : null;
      burst(e.x, e.y, 26, { col: ['#fff', TEAM_COL[cat ? cat.team : 0], '#ffd166'], sp: 300, life: .8, size: 8, kind: 'star' });
      ring(e.x, e.y, 110, '#fff', .45, 6);
      feed(killer ? nameOf(e.by) : g.mode === 'zombie' ? '🤖 로봇청소기' : '?', killer ? TEAM_COL[killer.team] : '#888', nameOf(e.id), cat ? TEAM_COL[cat.team] : '#888', killer ? '💧' : '💥');
      if (e.id === app.mySlot) { SFX.ko(); shake(12); vib([80, 40, 160]); banner(g.mode === 'zombie' ? 'KO!<small>동료가 옆에 2초 있어 주면 부활</small>' : `KO!<small>${g.mode === 'hero' ? 5 : 3}초 뒤 부활</small>`, 1.6); }
      else if (e.by === app.mySlot) { match.stats.freezes++; SFX.win(); pop(e.x, e.y - 70, '처치!', '#ff3b6b', 1.2); vib(40); }
      bubble(e.id, pickLine('freezeMe'), 1.6);
    } else if (e.k === 'respawn' || e.k === 'revive') {
      if (cat) { burst(cat.x, cat.y, 18, { col: ['#ffd166', '#fff', '#80ed99'], sp: 200, life: .6, size: 7, kind: 'star', up: -80 }); ring(cat.x, cat.y, 90, '#80ed99', .4, 6); }
      if (e.k === 'revive') { pop(cat.x, cat.y - 60, '부활!', '#06d6a0'); if (e.by === app.mySlot) match.stats.rescues++; }
      if (e.id === app.mySlot) { SFX.unfreeze(); vib(30); }
    } else if (e.k === 'mobdie') {
      burst(e.x, e.y, e.kind === 'big' ? 30 : 14, { col: ['#adb5bd', '#495057', '#ffd166', '#4cc9f0'], sp: 260, life: .6, size: e.kind === 'big' ? 9 : 6 });
      if (near(e.x, e.y)) SFX.mob();
      if (e.by === app.mySlot) match.stats.freezes++;
      if (e.kind === 'big') { ring(e.x, e.y, 120, '#ffd166', .4, 8); shake(5); }
      if (e.kind === 'boss') { ring(e.x, e.y, 260, '#ffd166', .7, 12); burst(e.x, e.y, 60, { col: ['#ffd166', '#fff', '#ff595e'], sp: 420, life: 1, size: 10, kind: 'star' }); shake(14); vib([80, 40, 120]); banner('👑 왕청소기 격파!<small>+500점</small>', 2); SFX.win(); confetti(90); }
      const mult = Math.min(10, 1 + Math.floor((e.c || 0) / 5));
      if (e.c >= 3 && near(e.x, e.y)) pop(e.x, e.y - 30, `${e.c} 콤보${mult > 1 ? ' ×' + mult : ''}`, mult >= 4 ? '#ff595e' : mult >= 2 ? '#ffd166' : '#fff', Math.min(1.8, .8 + e.c * .03));
      if (e.c && e.c % 10 === 0) { tone(500 + Math.min(e.c, 60) * 12, 900 + Math.min(e.c, 60) * 15, .15, 'square', .05); fx.timerPulse = 1; }
    } else if (e.k === 'unlock') {
      const W0 = C.WEAPONS[e.w]; banner(`🔓 새 무기 해금!<small>${W0 ? W0.name : e.w} — 모두 장착</small>`, 2.2); SFX.go(); vib([40, 30, 40]); confetti(40);
    } else if (e.k === 'wave') {
      banner(`🤖 웨이브 ${e.n}<small>${e.n % 5 === 0 ? '👑 왕청소기 등장!' : '로봇청소기가 몰려온다!'}</small>`, 2.2); SFX.release(); shake(6); vib([60, 40, 60]);
    } else if (e.k === 'waveclear') {
      banner(`웨이브 ${e.n} 클리어!<small>6초 쉬는 시간 · 쓰러진 동료 부활</small>`, 2.2); SFX.win(); confetti(50);
    } else if (e.k === 'cap') {
      banner(`<span style="color:${e.team ? '#a9cdf0' : '#ffc27d'}">${TEAM_NAME[e.team]}</span> 점령 중!`, 1.4); tone(660, 990, .2, 'triangle', .06);
    } else if (e.k === 'wallbreak') {
      burst(e.x, e.y, 20, { col: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'], sp: 260, life: .6, size: 8 }); if (near(e.x, e.y)) SFX.block();
    } else if (e.k === 'round' && isCombat(g)) {
      const M = C.MODES[g.mode];
      const tip = { gun: `먼저 ${g.killGoal}킬! · 상자에서 무기 줍기`, hero: '가운데 점령 지점을 먼저 100%!', zombie: '몰려오는 로봇청소기를 막아라 · 쓰러진 동료 옆에 서면 부활' }[g.mode];
      banner(`${M.icon} ${M.name}<small>${tip}${touchUI ? '' : ' · 마우스로 조준, 클릭으로 발사'}</small>`, 3.2); SFX.ui();
    } else if (e.k === 'round') {
      const ch = e.chaser, role = myTeam < 0 ? '' : myTeam === ch ? `<small>너는 술래! ${C.HOLD}초 뒤 출발 · 냄새 추적 / 덮치기</small>` : '<small>너는 도망! 얼른 숨어 · 털뭉치 / 캣닢 가속</small>';
      banner(`${e.round + 1}라운드 · <span style="color:${ch ? '#a9cdf0' : '#ffc27d'}">${TEAM_NAME[ch]}</span> 술래${role}`, 3);
      SFX.ui();
    } else if (e.k === 'tick') { SFX.tick(); fx.countPop = 1; }
    else if (e.k === 'go') { SFX.go(); vib(30); }
    else if (e.k === 'release') {
      banner(myTeam === g.chaserTeam ? '출발! 잡으러 가자' : '술래 출발!<small>숨죽이고 있어…</small>', 1.4); SFX.release(); shake(6);
      if (myTeam >= 0 && myTeam !== g.chaserTeam) vib([100, 60, 100]);
    } else if (e.k === 'sec') { SFX.sec(); fx.timerPulse = 1; if (e.n <= 3) vib(15); }
    else if (e.k === 'roundEnd' && isCombat(g)) {
      if (g.mode === 'zombie') { banner(`전멸…<small>웨이브 ${g.wave}까지 버텼다!</small>`, 2.8); SFX.lose(); vib(200); return; }
      const why = { kills: '목표 킬 달성!', cap: '점령 완료!', time: '시간 종료' }[e.reason] || '';
      if (e.winner < 0) { banner(`무승부<small>${why}</small>`, 2.8); return; }
      const good = e.winner === myTeam;
      banner(`${TEAM_NAME[e.winner]} 승리<small>${why}</small>`, 2.8);
      if (good || myTeam < 0) { SFX.win(); confetti(110); vib([50, 50, 50, 50, 120]); } else { SFX.lose(); vib(200); }
    }
    else if (e.k === 'roundEnd') {
      const why = e.reason === 'all' ? '두 마리 다 얼렸다!' : '끝까지 버텼다!';
      const good = e.winner === myTeam;
      match.stats.rounds++; if (good) match.stats.wonRounds++;
      banner(`${TEAM_NAME[e.winner]} 승리<small>${why}</small>`, 2.8);
      if (good || myTeam < 0) { SFX.win(); confetti(110); vib([50, 50, 50, 50, 120]); } else { SFX.lose(); vib(200); }
    } else if (e.k === 'over') showOver(e.scores || g.scores, e);
  }
  function showOver(sc, ev = {}) {
    const g0 = app.g, mode = g0 ? g0.mode : 'tag';
    const w = mode !== 'tag' && typeof ev.winner === 'number' ? ev.winner : sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1;
    const me = app.g && app.g.cats[app.mySlot];
    if (mode === 'zombie') return showZombieOver(ev.wave || (g0 && g0.wave) || 0, me, ev);
    $('overTitle').textContent = w < 0 ? '무승부냥' : `${TEAM_NAME[w]} 최종 승리!`;
    $('overTitle').style.color = w < 0 ? '' : TEAM_COL[w];
    $('overScore').textContent = mode === 'hero' ? `${sc[0]}% : ${sc[1]}%` : `${sc[0]} : ${sc[1]}`;
    $('overAgain').textContent = app.mode === 'client' ? '로비로' : app.mode === 'host' ? '모두 로비로' : '다시 하기';
    $('overHint').textContent = app.mode === 'client' ? '방장이 다시 시작하면 같이 들어가요.' : '';
    if (me && w === me.team) { setTimeout(() => confetti(160), 100); SFX.win(); }
    const box = $('overRank'); box.replaceChildren();
    if (me) {
      const L = app.lobby, opp = L ? L.slots.filter((s, i) => s.p && teamOf(L, i) !== me.team) : [];
      const oppAvg = opp.length ? opp.reduce((a, s) => a + cleanRk(s.rk), 0) / opp.length : null;
      const res = settleRank(w < 0 ? 0 : w === me.team ? 1 : -1, app.mode === 'practice' || !opp.length, oppAvg);
      boardPut(myEntry()); saveRank();
      if (app.mode === 'client') net.send({ t: 'bd', bd: [myEntry()] }); else if (app.mode === 'host') setTimeout(() => net.broadcast({ t: 'bd', bd: boardTop(150) }), 1500);
      const tb = tierOf(res.before), ta = tierOf(res.after);
      box.append(tierBadge(res.after, true));
      const dl = document.createElement('div'); dl.className = 'lpd ' + (res.d >= 0 ? 'up' : 'down'); dl.textContent = `${res.d >= 0 ? '+' : ''}${res.d} LP`; box.append(dl);
      const sub = document.createElement('div'); sub.className = 'hint';
      sub.textContent = (mode === 'tag' ? `얼림 ${match.stats.freezes} · 구함 ${match.stats.rescues} · 라운드 승 ${match.stats.wonRounds}` : `처치 ${me.kills | 0} · 쓰러짐 ${me.deaths | 0}`) + (app.mode === 'practice' || !opp.length ? ' · 봇 연습(0.5배)' : '');
      box.append(sub);
      if (ta.name !== tb.name) {
        const up = res.after > res.before, pr = document.createElement('div'); pr.className = 'promo ' + (up ? 'up' : 'down');
        pr.textContent = up ? `🎉 승급! ${ta.name}` : `강등… ${ta.name}`; box.append(pr);
        if (up) { setTimeout(() => confetti(220), 600); vib([60, 40, 60, 40, 200]); }
      }
    }
    leaveGameUI(); show('scrOver');
  }
  function feed(a, ac, b, bc, icon) {
    const box = $('feed'), d = document.createElement('div'); d.className = 'fd';
    const x = document.createElement('b'); x.textContent = a; x.style.color = ac;
    const y = document.createElement('b'); y.textContent = b; y.style.color = bc;
    d.append(x, document.createTextNode(` ${icon} `), y); box.prepend(d);
    while (box.children.length > 5) box.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 4500); setTimeout(() => d.remove(), 5200);
  }
  // 로봇청소기 습격: 랭크 대신 최고 기록
  function showZombieOver(wave, me, ev = {}) {
    $('overTitle').textContent = `웨이브 ${wave}까지 버텼다!`; $('overTitle').style.color = '#4cc9f0';
    $('overScore').textContent = `${(ev.pts ?? (app.g && app.g.pts) ?? 0) | 0}점 · 🤖 × ${me ? me.kills | 0 : 0}`;
    $('overAgain').textContent = app.mode === 'client' ? '로비로' : app.mode === 'host' ? '모두 로비로' : '다시 하기';
    $('overHint').textContent = app.mode === 'client' ? '방장이 다시 시작하면 같이 들어가요.' : '';
    const box = $('overRank'); box.replaceChildren();
    const best = rank.bestWave || 0, nb = wave > best; if (nb) { rank.bestWave = wave; saveRank(); setTimeout(() => confetti(160), 200); }
    const d = document.createElement('div'); d.className = 'lpd up'; d.textContent = nb ? `🏆 새 기록! 웨이브 ${wave}` : `최고 기록 웨이브 ${best}`; box.append(d);
    const sub = document.createElement('div'); sub.className = 'hint'; sub.textContent = `최고 콤보 ${ev.bc | 0} · 부순 로봇 ${me ? me.kills | 0 : 0} · 살려 준 동료 ${match.stats.rescues} · 협동 모드라 LP는 안 바뀌어요`; box.append(sub);
    leaveGameUI(); show('scrOver');
  }
  function pop(x, y, text, color, scale = 1) { app.popups.push({ x, y, text, color, t: 0, s: scale }); }

  /* ---------------- 네트워크 ---------------- */
  const net = {
    peer: null, conns: new Map(), host: null, evq: [], sendT: 0, joinTimer: 0,
    send(msg) { if (this.host && this.host.open) try { this.host.send(msg); } catch (e) { } },
    broadcast(msg) { for (const c of this.conns.values()) if (c.open) try { c.send(msg); } catch (e) { } },
    close() {
      clearTimeout(this.joinTimer);
      for (const c of this.conns.values()) try { c.close(); } catch (e) { }
      this.conns.clear();
      if (this.host) try { this.host.close(); } catch (e) { }
      this.host = null;
      if (this.peer) try { this.peer.destroy(); } catch (e) { }
      this.peer = null; this.evq = [];
    },
  };
  const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  function peerOk() { if (!window.Peer) { toast('온라인 모듈을 못 불러왔어요. 인터넷 연결을 확인해 주세요.'); return false; } return true; }
  const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  const ITEM_IDS = C.ITEMS.map(i => i.id);

  function hostCreate(tries = 0, fixed = '', quick = false) {
    if (!peerOk()) return;
    net.close();
    const code = fixed || newCode();
    toast(quick ? '빠른 대전 방을 여는 중…' : '방 만드는 중…', 8000);
    const peer = new Peer(PREFIX + code, { debug: 0 });
    net.peer = peer;
    peer.on('open', id => {
      app.mode = 'host'; app.myId = id; app.quick = quick; app.lobby = newLobby(code, quick ? 4 : 2); app.lobby.host = id;
      if (quick) { app.lobby.quick = true; app.lobby.map = C.MAP_IDS[(Math.random() * C.MAP_IDS.length) | 0]; useMap(app.lobby.map); quickT = 0; }
      addPlayer(app.lobby, id, myName(), app.me.av, rank.rating);
      history.replaceState(null, '', location.pathname + '?room=' + code);
      toast(quick ? '빠른 대전 방을 열었어요. 상대가 들어오면 자동으로 시작해요!' : '방을 만들었어요. 코드를 친구한테 보내세요!');
      show('scrLobby'); renderLobby();
    });
    peer.on('connection', conn => {
      conn.on('open', () => {
        if (app.inGame) { conn.send({ t: 'busy' }); setTimeout(() => conn.close(), 300); return; }
        net.conns.set(conn.peer, conn);
      });
      conn.on('data', msg => hostOnMsg(conn, msg));
      conn.on('close', () => hostDrop(conn.peer));
      conn.on('error', () => hostDrop(conn.peer));
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && fixed) { if (quickTries++ < 3) quickMatch(0); else backToTitle('빠른 대전 방을 못 찾았어요. 잠시 뒤 다시 해 주세요.'); return; }
      if (err.type === 'unavailable-id' && tries < 4) { hostCreate(tries + 1); return; }
      if (app.mode === 'host' && (err.type === 'network' || err.type === 'disconnected')) { toast('연결이 잠깐 끊겼어요. 다시 잇는 중…'); try { peer.reconnect(); } catch (e) { } return; }
      if (app.mode !== 'host') backToTitle('방을 못 만들었어요 (' + err.type + '). 잠시 뒤 다시 해 주세요.');
    });
    peer.on('disconnected', () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { } });
  }
  function hostOnMsg(conn, msg) {
    if (!msg || typeof msg !== 'object' || app.mode !== 'host') return;
    const L = app.lobby, p = conn.peer;
    const slot = L.slots.findIndex(s => s.p === p);
    if (msg.t === 'hello') {
      if (slot >= 0) return;
      if (app.inGame) { conn.send({ t: 'busy' }); return; }
      const i = addPlayer(L, p, msg.name, msg.av, msg.rk);
      if (i < 0) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      toast(`${L.slots[i].name} 들어왔어요`);
      boardMerge(msg.bd); net.broadcast({ t: 'bd', bd: boardTop(150) });
      SFX.meow();
      lobbyChanged();
    } else if (msg.t === 'bd' && slot >= 0) {
      if (boardMerge(msg.bd)) net.broadcast({ t: 'bd', bd: boardTop(150) });
    } else if (msg.t === 'chat' && slot >= 0) {
      const m = cleanChat(msg.m); if (!m || !sayOk(slot)) return;
      const tm = teamOf(L, slot);
      chatShow(L.slots[slot].name, tm, m, slot);
      net.broadcast({ t: 'chat', n: L.slots[slot].name, s: slot, tm, m });
    } else if (msg.t === 'cls' && slot >= 0 && !app.inGame) {
      if (C.CLASSES[msg.cls]) { L.slots[slot].cls = msg.cls; lobbyChanged(); }
    } else if (msg.t === 'team' && slot >= 0 && !app.inGame) {
      moveTeam(L, p, msg.team === 1 ? 1 : 0); lobbyChanged();
    } else if (msg.t === 'av' && slot >= 0) {
      const v = validAv(msg.av); if (v) { L.slots[slot].av = v; lobbyChanged(); if (app.inGame) syncSprites(); }
    } else if (msg.t === 'pos' && slot >= 0 && app.inGame && app.g) {
      const g = app.g, c = g.cats[slot];
      if (c.kind !== 'remote' || msg.rid !== g.roundId || c.frozen) return;
      c.x = clamp(num(msg.x), R, W - R); c.y = clamp(num(msg.y), R, H - R);
      c.vx = clamp(num(msg.vx), -900, 900); c.vy = clamp(num(msg.vy), -900, 900);
      c.facing = msg.f === -1 ? -1 : 1; if (msg.d) c.dashT = Math.max(c.dashT, 0.1); c.moving = hyp(c.vx, c.vy) > 30;
      if (typeof msg.ga === 'number' && isFinite(msg.ga)) c.gunA = msg.ga; c.fire = !!msg.fi;
    } else if (msg.t === 'sk' && slot >= 0 && app.inGame && app.g) {
      const g = app.g, c = g.cats[slot];
      if (c.kind !== 'remote') return;
      const ax = num(msg.ax), ay = num(msg.ay), l = hyp(ax, ay);
      if (l > 0.01) { c.aimX = ax / l; c.aimY = ay / l; }
      C.useSkill(g, c, msg.k === 1 ? 1 : 0);
    } else if (msg.t === 'it' && slot >= 0 && app.inGame && app.g) {
      const g = app.g, c = g.cats[slot];
      if (c.kind !== 'remote') return;
      const ax = num(msg.ax), ay = num(msg.ay), l = hyp(ax, ay);
      if (l > 0.01) { c.aimX = ax / l; c.aimY = ay / l; }
      C.useItem(g, c);
    } else if (msg.t === 'say' && slot >= 0 && app.inGame && app.g) {
      if (sayOk(slot)) C.say(app.g, app.g.cats[slot], 'tease');
    }
  }
  const lastSay = Array(MAXP).fill(0);
  function sayOk(i) { const t = performance.now(); if (t - lastSay[i] < 1500) return false; lastSay[i] = t; return true; }
  function hostDrop(p) {
    if (!net.conns.has(p)) return;
    net.conns.delete(p);
    const L = app.lobby; if (!L) return;
    const i = L.slots.findIndex(s => s.p === p);
    if (i >= 0) {
      toast(`${L.slots[i].name} 나갔어요. 봇이 대신해요.`);
      L.slots[i] = { p: null, name: '', av: '' };
      if (app.inGame && app.g) { app.g.cats[i].kind = 'bot'; syncSprites(); }
      lobbyChanged();
    }
  }
  function hostSnapshot() {
    const g = app.g;
    const r1 = v => Math.round(v * 10) / 10;
    return {
      t: 's', ph: g.phase, r: g.round, sc: g.scores, ct: g.chaserTeam, tl: r1(g.timeLeft), cd: r1(g.countT), ho: r1(g.hold), rid: g.roundId,
      c: g.cats.map(c => [Math.round(c.x), Math.round(c.y), Math.round(c.vx), Math.round(c.vy), c.facing,
        (c.frozen ? 1 : 0) | (c.dashT > 0 ? 8 : 0) | (c.moving ? 16 : 0), r1(c.immune), r1(c.stun), r1(c.rootT), r1(c.boostT), r1(c.pounceT), r1(c.sk[0]), r1(c.sk[1]),
        c.items.map(it => ITEM_IDS.indexOf(it)), r1(c.camoT), r1(c.windT), Math.round(Math.atan2(c.aimY, c.aimX) * 100) / 100, c.thaws | 0, r1(c.scareT),
        Math.round(c.hp || 0), c.maxHp || 100, c.dead ? 1 : 0, r1(c.respawnT || 0), C.WEAPON_IDS.indexOf(c.wpn), C.CLASS_IDS.indexOf(c.cls), c.kills | 0, c.deaths | 0, r1(c.shieldT || 0), Math.round((c.gunA || 0) * 100) / 100, r1(c.revT || 0)]),
      mb: g.mobs.slice(0, 80).map(m => [m.u, ['vac', 'mini', 'big', 'boss'].indexOf(m.kind), Math.round(m.x), Math.round(m.y), Math.round(m.hp), Math.round(m.maxHp), Math.round(m.a * 10) / 10]),
      cp: g.cp ? [g.cp.x, g.cp.y, g.cp.r, r1(g.cp.prog[0]), r1(g.cp.prog[1]), g.cp.owner, g.cp.contested ? 1 : 0] : null,
      wv: [g.wave, g.waveLeft + g.mobs.length, r1(g.breakT), g.combo, g.pts, r1(g.comboT)],
      bl: g.blocks.map(b => [Math.round(b.x), Math.round(b.y), b.w, b.h, r1(b.t), b.team]),
      bx: g.boxes.map(b => r1(Math.max(0, b.t))),
      tr: g.traps.map(t => [t.u, Math.round(t.x), Math.round(t.y), t.team, t.owner]),
      rv: [r1(g.reveal[0]), r1(g.reveal[1])],
      sn: g.scents.map(s => [Math.round(s.x), Math.round(s.y), s.team, r1(s.t)]),
      ev: net.evq.splice(0),
    };
  }

  function clientJoin(code, opts = {}) {
    if (!peerOk()) return;
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { toast('코드 4자리를 넣어 주세요.'); return; }
    net.close();
    net.quickFail = opts.fail || null;
    if (!opts.fail) toast('방 찾는 중…', 9000);
    const peer = new Peer({ debug: 0 });
    net.peer = peer;
    peer.on('open', id => {
      app.myId = id;
      const conn = peer.connect(PREFIX + code, { reliable: true });
      net.host = conn;
      net.joinTimer = setTimeout(() => { if (app.mode !== 'client') { if (quickFailed('timeout')) return; backToTitle('방을 못 찾았어요. 코드를 확인해 주세요.'); } }, net.quickFail ? 6000 : 10000);
      conn.on('open', () => { conn.send({ t: 'hello', name: myName(), av: app.me.av, rk: rank.rating, bd: boardTop(120) }); });
      conn.on('data', msg => clientOnMsg(msg, code));
      conn.on('close', () => { if (app.mode === 'client') backToTitle('방이 닫혔어요.'); });
      conn.on('error', () => { if (app.mode === 'client') backToTitle('방장과 연결이 끊겼어요.'); });
    });
    peer.on('error', err => {
      if (err.type === 'peer-unavailable') { if (quickFailed('none')) return; backToTitle('그 코드의 방이 없어요. 코드를 확인해 주세요.'); }
      else if (app.mode !== 'client') backToTitle('연결 실패 (' + err.type + ')');
    });
  }
  function clientOnMsg(msg, code) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'bye') { backToTitle('방장이 방을 닫았어요.'); return; }
    if (msg.t === 'full') { if (quickFailed('full')) return; backToTitle('방이 꽉 찼어요.'); return; }
    if (msg.t === 'busy') { if (quickFailed('busy')) return; backToTitle('지금 게임 중인 방이에요. 끝나면 다시 들어와 주세요.'); return; }
    if (msg.t === 'lobby' || msg.t === 'start') {
      const L = sanitizeLobby(msg.lobby); if (!L) return;
      const first = app.mode !== 'client';
      app.mode = 'client'; app.lobby = L; clearTimeout(net.joinTimer); net.quickFail = null; app.quick = L.quick;
      if (first) { history.replaceState(null, '', location.pathname + '?room=' + code); toast('들어왔어요!'); }
      if (!app.inGame) useMap(L.map);
      if (msg.t === 'start') {
        useMap(L.map);
        app.g = C.createGame(L.ts, L.mode); applyLobbyToGame(); C.placeCats(app.g); app.g.phase = 'count'; app.g.roundId = -1; enterGame();
      } else if (app.inGame) {
        if (msg.back) backToLobby(); else syncSprites();
      } else if (!$('scrOver').hidden && !msg.back) {
        // 결과 화면 보는 중이면 그대로
      } else if ($('scrPick').hidden) { show('scrLobby'); renderLobby(); }
      else renderLobby();
    } else if (msg.t === 's' && app.inGame && app.g) applySnap(msg);
    else if (msg.t === 'bd') boardMerge(msg.bd);
    else if (msg.t === 'chat') chatShow(cleanName(msg.n), msg.tm === 1 ? 1 : msg.tm === 0 ? 0 : -1, cleanChat(msg.m), typeof msg.s === 'number' ? msg.s : -1);
  }
  // 빠른 대전: 공개방 QM01~QM06을 차례로 두드려 보고, 다 없으면 내가 연다
  const QUICK = ['QM01', 'QM02', 'QM03', 'QM04', 'QM05', 'QM06'];
  let quickT = 0, quickTries = 0, quickFree = -1;
  function quickFailed(why) {
    const f = net.quickFail; if (!f) return false;
    net.quickFail = null; clearTimeout(net.joinTimer);
    setTimeout(() => f(why), 50); return true;
  }
  function quickMatch(i = 0) {
    if (!peerOk()) return;
    if (i === 0) quickFree = -1;
    if (i >= QUICK.length) { hostCreate(0, QUICK[quickFree >= 0 ? quickFree : 0], true); return; }
    toast(`⚡ 빠른 대전 상대 찾는 중… (${i + 1}/${QUICK.length})`, 7000);
    clientJoin(QUICK[i], { fail: why => { if (why === 'none' && quickFree < 0) quickFree = i; quickMatch(i + 1); } });
  }
  $('quickBtn').onclick = () => { SFX.ui(); quickTries = 0; quickMatch(0); };
  function quickTick(dt) {
    if (app.mode !== 'host' || !app.quick || app.inGame || !app.lobby || $('scrLobby').hidden) { quickT = 0; return; }
    const humans = app.lobby.slots.filter(s => s.p).length;
    if (humans < 2) { if (quickT) { quickT = 0; renderLobby(); } return; }
    const before = Math.ceil(quickT);
    if (!quickT) quickT = 20; else quickT -= dt;
    if (Math.ceil(quickT) !== before) renderLobby();
    if (quickT <= 0) { quickT = 0; SFX.go(); startHostGame(); }
  }

  function sanitizeLobby(L) {
    if (!L || !Array.isArray(L.slots) || L.slots.length < 2 || L.slots.length > MAXP || L.slots.length % 2) return null;
    return {
      code: String(L.code || '').slice(0, 4), host: typeof L.host === 'string' ? L.host : '', map: C.MAPS[L.map] ? L.map : 'house', ts: L.slots.length / 2, quick: !!L.quick, mode: C.MODES[L.mode] ? L.mode : 'tag',
      slots: L.slots.map(s => ({ p: s && typeof s.p === 'string' ? s.p : null, name: cleanName(s && s.name), av: validAv(s && s.av) || '', rk: cleanRk(s && s.rk), cls: s && C.CLASSES[s.cls] ? s.cls : 'dps' })),
    };
  }
  function applySnap(m) {
    const g = app.g;
    const ph = ['count', 'play', 'roundEnd', 'over', 'lobby'].includes(m.ph) ? m.ph : g.phase;
    g.phase = ph; g.round = m.r | 0; g.scores = Array.isArray(m.sc) ? [m.sc[0] | 0, m.sc[1] | 0] : g.scores;
    g.chaserTeam = m.ct === 1 ? 1 : m.ct === 0 ? 0 : -1; g.timeLeft = +m.tl || 0; g.countT = +m.cd || 0; g.hold = +m.ho || 0;
    const newRound = m.rid !== g.roundId; g.roundId = m.rid;
    if (Array.isArray(m.tr)) g.traps = m.tr.slice(0, 16).filter(Array.isArray).map(a => ({ u: num(a[0]), x: num(a[1]), y: num(a[2]), team: a[3] === 1 ? 1 : 0, owner: num(a[4]) }));
    if (Array.isArray(m.rv)) g.reveal = [num(m.rv[0]), num(m.rv[1])];
    if (Array.isArray(m.mb)) {
      const old = new Map(g.mobs.map(o => [o.u, o]));
      g.mobs = m.mb.filter(Array.isArray).map(a => { const o = old.get(a[0]) || { u: a[0], x: num(a[2]), y: num(a[3]) }; return Object.assign(o, { kind: ['vac', 'mini', 'big', 'boss'][a[1]] || 'vac', nx: num(a[2]), ny: num(a[3]), hp: num(a[4]), maxHp: num(a[5]) || 1, a: num(a[6]), r: C.MOBS[['vac', 'mini', 'big', 'boss'][a[1]] || 'vac'].r }); });
    }
    if (Array.isArray(m.cp)) g.cp = { x: num(m.cp[0]), y: num(m.cp[1]), r: num(m.cp[2]), prog: [num(m.cp[3]), num(m.cp[4])], owner: num(m.cp[5]), contested: !!m.cp[6] };
    if (Array.isArray(m.wv)) { g.wave = num(m.wv[0]); g.mobsLeft = num(m.wv[1]); g.breakT = num(m.wv[2]); g.combo = num(m.wv[3]); g.pts = num(m.wv[4]); g.comboT = num(m.wv[5]); }
    if (Array.isArray(m.bl)) g.blocks = m.bl.slice(0, 8).filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), w: clamp(num(a[2]), 10, 200), h: clamp(num(a[3]), 10, 200), t: num(a[4]), team: a[5] === 1 ? 1 : 0, k: 'block' }));
    if (Array.isArray(m.bx)) m.bx.forEach((v, i) => { if (g.boxes[i]) g.boxes[i].t = num(v); });
    if (Array.isArray(m.sn)) g.scents = m.sn.slice(0, 8).filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), team: a[2] === 1 ? 1 : 0, t: num(a[3]) }));
    if (!Array.isArray(m.c)) return;
    m.c.forEach((a, i) => {
      const c = g.cats[i]; if (!c || !Array.isArray(a)) return;
      const its = Array.isArray(a[13]) ? a[13] : [];
      const [x, y, vx, vy, f, fl, imm, stun, root, boost, pounce, k0, k1, , camo, wind, aimA, thaws, scare, hp, maxHp, dead, resp, wI, cI, kills, deaths, shield, gunA, revT] = a.map(num);
      c.thaws = thaws; c.hp = hp; c.maxHp = maxHp || 100; c.dead = !!dead; c.respawnT = resp; c.wpn = C.WEAPON_IDS[wI] || 'pistol'; c.cls = C.CLASS_IDS[cI] || c.cls; c.kills = kills; c.deaths = deaths; c.shieldT = shield; c.revT = revT;
      if (i !== app.mySlot) c.gunA = gunA;
      if (!(i === app.mySlot && c.itemUsedT > 0)) c.items = its.slice(0, 3).map(n => ITEM_IDS[n]).filter(Boolean);
      const frozen = !!(fl & 1);
      c.rootT = root; c.stun = stun; c.immune = imm;
      if (i === app.mySlot) {
        if (newRound || frozen || hyp(c.x - x, c.y - y) > 260) { c.x = x; c.y = y; c.vx = c.vy = 0; }
        if (newRound) { c.sk = [k0, k1]; c.boostT = boost; c.pounceT = pounce; }
        else { c.sk = [Math.max(c.sk[0], k0), Math.max(c.sk[1], k1)]; c.boostT = Math.max(c.boostT, boost); c.pounceT = Math.max(c.pounceT, pounce); }
        c.camoT = Math.max(c.camoT, camo);
        c.frozen = frozen;
      } else {
        c.nx = x; c.ny = y; c.vx = vx; c.vy = vy; c.facing = f === -1 ? -1 : 1; c.frozen = frozen;
        c.boostT = boost; c.pounceT = pounce; c.sk = [k0, k1]; c.camoT = camo; c.windT = wind; c.scareT = scare;
        if (wind > 0 || pounce > 0) { c.aimX = Math.cos(aimA); c.aimY = Math.sin(aimA); }
        c.dashT = fl & 8 ? .1 : 0; c.moving = !!(fl & 16); c.snapT = 0;
        if (newRound || c.nx == null || hyp(c.x - x, c.y - y) > 300) { c.x = x; c.y = y; }
      }
    });
    if (Array.isArray(m.ev)) for (const e of m.ev.slice(0, 30)) if (e && typeof e.k === 'string') handleEvent(e, g);
  }
  function clientStep(dt) {
    const g = app.g;
    g.clock += dt;
    for (const sc of g.scents) sc.t -= dt;
    g.reveal = g.reveal.map(v => Math.max(0, v - dt));
    for (const c of g.cats) {
      c.t += dt;
      if (c.id === app.mySlot) continue;
      if (c.nx == null) continue;
      c.snapT = (c.snapT || 0) + dt;
      const ext = Math.min(c.snapT, .15);
      const tx = c.nx + c.vx * ext, ty = c.ny + c.vy * ext;
      const k = Math.min(1, dt * 14);
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
      c.hideIdx = C.hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0 || c.camoT > 0;
      c.camoT = Math.max(0, c.camoT - dt);
    }
    for (const bl of g.blocks) bl.t -= dt;
    for (const bx of g.boxes) bx.t = Math.max(0, bx.t - dt);
    stepVisualShots(g, dt);
    for (const m of g.mobs) if (m.nx != null) { const k = Math.min(1, dt * 12); m.x += (m.nx - m.x) * k; m.y += (m.ny - m.y) * k; }
    const me = g.cats[app.mySlot];
    if (me) {
      const inp = readInput();
      if (g.phase === 'play' || g.phase === 'count') {
        if (C.moveCat(me, g, inp.x, inp.y, inp.dash, dt)) handleEvent({ k: 'dash', id: me.id }, g);
        for (const k of [0, 1]) if (inp['s' + k]) {
          if (C.useSkill(g, me, k)) {
            for (const e of g.events.splice(0)) handleEvent(Object.assign(e, { local: true }), g);
            net.send({ t: 'sk', k, ax: me.aimX, ay: me.aimY });
          } else skillDenied(k);
        }
        me.itemUsedT = Math.max(0, (me.itemUsedT || 0) - dt);
        if (inp.it) {
          if (C.useItem(g, me)) {
            me.itemUsedT = .5;
            for (const e of g.events.splice(0)) handleEvent(Object.assign(e, { local: true }), g);
            net.send({ t: 'it', ax: me.aimX, ay: me.aimY });
          } else itemDenied();
        }
        if (inp.say && sayOk(app.mySlot)) net.send({ t: 'say' });
        if (isCombat(g)) {
          me.gunA = inp.ga; me.fire = inp.fire && !me.dead && g.phase === 'play';
          me.fireCd = Math.max(0, (me.fireCd || 0) - dt);
          if (me.fire && me.fireCd <= 0) { const W0 = C.WEAPONS[me.wpn] || C.WEAPONS.pistol; me.fireCd = W0.rate; handleEvent({ k: 'fire', id: me.id, x: me.x, y: me.y, a: me.gunA, w: me.wpn, s: (Math.random() * 1e6) | 0, local: true }, g); }
        }
        g.events.length = 0;
      } else { me.vx = me.vy = 0; me.moving = false; }
      net.sendT -= dt;
      if (net.sendT <= 0) {
        net.sendT = 0.05;
        net.send({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), f: me.facing, d: me.dashT > 0 ? 1 : 0, rid: g.roundId, ga: Math.round((me.gunA || 0) * 1000) / 1000, fi: me.fire ? 1 : 0 });
      }
    }
  }
  // 손님 화면용 총알: 벽에 닿거나 사거리가 끝나면 사라진다 (판정은 방장)
  function stepVisualShots(g, dt) {
    for (const sh of g.shots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt; if (C.shotBlocked(sh.x, sh.y)) sh.life = 0; }
    g.shots = g.shots.filter(s => s.life > 0);
    for (const n of g.nades) { n.t += dt; }
    g.nades = g.nades.filter(n => n.t < n.T);
  }
  function itemDenied() { skI.classList.remove('deny'); void skI.offsetWidth; skI.classList.add('deny'); tone(200, 160, .08, 'square', .03); }
  function skillDenied(k) { const b = skB[k]; b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); tone(200, 160, .08, 'square', .03); }


  /* ---------------- 채팅 ---------------- */
  const BAD = /(씨발|시발|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|좆|존나|개새|새끼|fuck|shit)/gi;
  const cleanChat = m => (typeof m === 'string' ? m.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) : '').replace(BAD, m2 => '♡'.repeat(Math.min(3, m2.length)));
  const QUICK_CHAT = ['ㅎㅇ!', '같이 가자!', '여기 숨었어', '도와줘!!', '나이스 ㅋㅋ', 'GG', '한 판 더?', '츄르 내놔'];
  let chatLast = 0;
  function chatShow(name, team, msg, slot) {
    const box = $('chatLog'), d = document.createElement('div'); d.className = 'cm';
    const n = document.createElement('b'); n.textContent = name; n.style.color = team === 1 ? '#a9cdf0' : team === 0 ? '#ffc27d' : '#fff';
    d.append(n, document.createTextNode(' ' + msg)); box.append(d);
    while (box.children.length > 8) box.firstChild.remove();
    setTimeout(() => d.classList.add('old'), 9000);
    if (app.inGame && slot >= 0) bubble(slot, msg, 3.2);
    tone(900, 1200, .05, 'sine', .03);
  }
  function chatSend(msg) {
    msg = cleanChat(msg); if (!msg) return;
    const t = performance.now(); if (t - chatLast < 1000) { toast('천천히 보내 주세요', 1000); return; } chatLast = t;
    const L = app.lobby, slot = L ? L.slots.findIndex(sl => sl.p === app.myId) : -1;
    if (app.mode === 'client') net.send({ t: 'chat', m: msg });
    else {
      chatShow(myName(), L ? teamOf(L, slot) : -1, msg, slot);
      if (app.mode === 'host') net.broadcast({ t: 'chat', n: myName(), s: slot, tm: L ? teamOf(L, slot) : -1, m: msg });
      else if (app.mode === 'practice' && app.inGame && Math.random() < .6) {
        // 혼자 연습: 봇이 가끔 대답
        const g = app.g, b2 = g.cats.filter(c => c.kind === 'bot');
        const bt = b2[(Math.random() * b2.length) | 0];
        if (bt) setTimeout(() => chatShow(botName(bt.id), bt.team, pickLine('tease'), bt.id), 700 + Math.random() * 900);
      }
    }
  }
  function chatOpen() {
    const w = $('chatIn'); $('chatBox').classList.add('open'); w.hidden = false;
    const q = $('chatQuick'); if (!q.children.length) for (const m of QUICK_CHAT) { const b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.onclick = () => { chatSend(m); chatClose(); }; q.append(b); }
    $('chatText').focus();
  }
  function chatClose() { $('chatBox').classList.remove('open'); $('chatIn').hidden = true; $('chatText').blur(); keys.clear(); }
  $('chatIn').addEventListener('submit', e => { e.preventDefault(); chatSend($('chatText').value); $('chatText').value = ''; chatClose(); });
  $('chatText').addEventListener('keydown', e => { if (e.key === 'Escape') chatClose(); e.stopPropagation(); });
  addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && (app.inGame || !$('scrLobby').hidden) && app.mode !== 'title') { e.preventDefault(); chatOpen(); } });
  $('chatBtn').onclick = () => chatOpen();

  /* ---------------- 버튼 ---------------- */
  const nameIn = $('nameIn');
  nameIn.value = app.me.name;
  nameIn.addEventListener('input', () => { app.me.name = cleanName(nameIn.value) === '냥이' && !nameIn.value.trim() ? '' : cleanName(nameIn.value); saveMe(); useProfile(app.me.name); renderRankBox(); });
  setAvBox($('myAv'), app.me.av, 0);
  $('hostBtn').onclick = () => { SFX.ui(); hostCreate(); };
  $('joinBtn').onclick = () => { SFX.ui(); clientJoin($('codeIn').value); };
  $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') clientJoin($('codeIn').value); });
  $('soloBtn').onclick = () => {
    SFX.ui(); net.close();
    app.mode = 'practice'; app.myId = 'me'; app.lobby = newLobby('');
    app.lobby.host = 'me'; app.lobby.slots[2] = { p: 'me', name: myName(), av: app.me.av, rk: rank.rating };
    show('scrLobby'); renderLobby();
  };
  $('copyCode').onclick = () => copyText(app.lobby.code, '코드를 복사했어요: ' + app.lobby.code);
  $('copyLink').onclick = () => copyText(location.origin + location.pathname + '?room=' + app.lobby.code, '초대 링크를 복사했어요');
  const qRoom = new URLSearchParams(location.search).get('room');
  if (qRoom) { $('codeIn').value = qRoom.toUpperCase().slice(0, 4); toast('초대받은 방이에요. 이름 넣고 참가를 누르세요!', 4000); }

  /* ---------------- 그리기 ---------------- */
  function camFollow(dt) {
    let tx, ty;
    if (app.inGame && app.g && app.g.cats[app.mySlot]) {
      const m = app.g.cats[app.mySlot]; tx = m.x + m.vx * .18; ty = m.y + m.vy * .18;
      if (isCombat(app.g) && !m.dead) { const look = touchUI ? 70 : 140; tx += Math.cos(m.gunA || 0) * look; ty += Math.sin(m.gunA || 0) * look; }
    }
    else {
      const d = app.demoCam; d.t -= dt;
      if (d.t <= 0 || !d.follow || !app.demo.cats.includes(d.follow)) { d.follow = app.demo.cats[Math.floor(Math.random() * app.demo.cats.length)]; d.t = 7; }
      tx = d.follow.x; ty = d.follow.y;
    }
    const k = 1 - Math.exp(-dt * (app.inGame ? 8 : 2));
    app.cam.x += (tx - app.cam.x) * k; app.cam.y += (ty - app.cam.y) * k;
    const hw = vw / zoom / 2, hh = vh / zoom / 2;
    app.cam.x = hw * 2 >= W ? W / 2 : clamp(app.cam.x, hw, W - hw);
    app.cam.y = hh * 2 >= H ? H / 2 : clamp(app.cam.y, hh, H - hh);
  }
  let shX = 0, shY = 0;
  const toScreen = (x, y) => [(x - app.cam.x) * zoom + vw / 2 + shX, (y - app.cam.y) * zoom + vh / 2 + shY];

  function drawStar(g, x, y, r, rot) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    g.closePath(); g.fill();
  }
  function drawTrap(g, t, now, own) {
    const pulse = 1 + Math.sin(now * 5 + t.u) * .06;
    g.save(); g.translate(t.x, t.y); g.scale(pulse, pulse);
    g.globalAlpha = own ? .95 : .85;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(3, 14, 20, 7, 0, 0, 7); g.fill();
    g.fillStyle = t.team ? '#6fc3ff' : '#ff6f91'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(0, 0, 17, k * 1.3 + now, k * 1.3 + now + 1.8); g.stroke(); }
    g.beginPath(); g.moveTo(-6, -15); g.bezierCurveTo(4, -2, -10, 6, 8, 15); g.stroke();
    if (own) { g.strokeStyle = t.team ? '#a9cdf0' : '#ffc2d1'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke(); g.setLineDash([]); }
    g.restore();
  }

  /* ---------------- 환경 연출: 물결, 구름 그림자, 날씨, 밤 조명 ---------------- */
  const AMB = { house: {}, hanok: { petals: 70, fireflies: 40 }, cafe: { dust: 30 }, snow: { snow: 160, clouds: 1 }, beach: { clouds: 1, sparkle: 1 }, town: { leaves: 40, clouds: 1 }, school: { petals: 35 }, halloween: { bats: 10, wisps: 34 }, space: { motes: 60 } };
  const amb = { parts: [], map: '' };
  const nightC = document.createElement('canvas'), ng = nightC.getContext('2d');
  function stepAmbient(dt, L, R2, T, B) {
    const cfg = AMB[C.MAP_ID] || {};
    if (amb.map !== C.MAP_ID) { amb.parts = []; amb.map = C.MAP_ID; }
    const AK = ['petals', 'snow', 'leaves', 'fireflies', 'dust', 'bats', 'wisps', 'motes'], want = AK.reduce((n, k) => n + (cfg[k] || 0), 0) * (perf.low ? .4 : 1);
    if (amb.parts.length > want) amb.parts.length = Math.floor(want);
    while (amb.parts.length < want) {
      const kinds = []; for (const k of AK) if (cfg[k] && amb.parts.filter(p => p.k === k).length < cfg[k] * (perf.low ? .4 : 1)) kinds.push(k);
      const k = kinds[0]; if (!k) break;
      amb.parts.push({ k, x: L + Math.random() * (R2 - L), y: T + Math.random() * (B - T), ph: Math.random() * 7, s: .6 + Math.random() * .8 });
    }
    const now = performance.now() / 1000;
    for (const p of amb.parts) {
      if (p.k === 'snow') { p.x += (Math.sin(now * .7 + p.ph) * 25 + 15) * dt; p.y += 70 * p.s * dt; }
      else if (p.k === 'petals' || p.k === 'leaves') { p.x += (Math.sin(now + p.ph) * 40 + 30) * dt; p.y += 40 * p.s * dt; }
      else if (p.k === 'fireflies' || p.k === 'wisps') { p.x += Math.sin(now * .9 + p.ph) * 30 * dt; p.y += Math.cos(now * .7 + p.ph * 2) * 30 * dt; }
      else if (p.k === 'bats') { p.x += (120 + p.s * 80) * dt; p.y += Math.sin(now * 2 + p.ph) * 60 * dt; }
      else if (p.k === 'motes') { p.x += Math.sin(now * .4 + p.ph) * 10 * dt; p.y += Math.cos(now * .5 + p.ph) * 10 * dt; }
      else { p.x += Math.sin(now * .3 + p.ph) * 6 * dt; p.y -= 4 * dt; }
      // 화면 밖으로 나가면 반대편에서 다시
      if (p.x < L - 40) p.x = R2 + 30; if (p.x > R2 + 40) p.x = L - 30;
      if (p.y < T - 40) p.y = B + 30; if (p.y > B + 40) { p.y = T - 30; p.x = L + Math.random() * (R2 - L); }
    }
  }
  // 반짝이 입자는 매 프레임 그라데이션을 만들지 말고 미리 그린 빛 한 장을 찍는다
  const glowCache = {};
  function glowSprite(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (glowCache[rgb] = c);
  }
  function drawAmbient(g, now, glowPass) {
    for (const p of amb.parts) {
      if ((p.k === 'fireflies' || p.k === 'wisps' || p.k === 'motes') !== glowPass) continue;
      if (p.k === 'snow') { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(p.x, p.y, 2.2 * p.s + 1, 0, 7); g.fill(); }
      else if (p.k === 'petals') { g.save(); g.translate(p.x, p.y); g.rotate(now * 2 + p.ph); g.scale(1, Math.sin(now * 3 + p.ph) * .5 + .6); g.fillStyle = '#ffc2d1'; g.beginPath(); g.ellipse(0, 0, 6 * p.s, 3.5 * p.s, 0, 0, 7); g.fill(); g.restore(); }
      else if (p.k === 'leaves') { g.save(); g.translate(p.x, p.y); g.rotate(now * 1.5 + p.ph); g.fillStyle = ['#e76f51', '#f4a261', '#e9c46a'][(p.ph * 10 | 0) % 3]; g.beginPath(); g.ellipse(0, 0, 8 * p.s, 4 * p.s, 0, 0, 7); g.fill(); g.restore(); }
      else if (p.k === 'dust') { g.fillStyle = 'rgba(255,240,200,.35)'; g.beginPath(); g.arc(p.x, p.y, 1.6, 0, 7); g.fill(); }
      else if (p.k === 'bats') { g.save(); g.translate(p.x, p.y); g.scale(p.s, p.s); const f = Math.sin(now * 18 + p.ph) * 8; g.fillStyle = 'rgba(15,10,25,.85)'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-14, -10 - f, -26, -2 - f); g.quadraticCurveTo(-16, 0, -12, 6); g.quadraticCurveTo(-6, 2, 0, 8); g.quadraticCurveTo(6, 2, 12, 6); g.quadraticCurveTo(16, 0, 26, -2 - f); g.quadraticCurveTo(14, -10 - f, 0, 0); g.fill(); g.restore(); }
      else if (p.k === 'wisps') { g.globalAlpha = clamp(.45 + Math.sin(now * 2 + p.ph * 5) * .4, 0, 1); g.drawImage(glowSprite('170,255,220'), p.x - 18, p.y - 18, 36, 36); g.globalAlpha = 1; }
      else if (p.k === 'motes') { const a = .3 + Math.sin(now * 2.5 + p.ph * 3) * .25; g.fillStyle = `rgba(120,220,255,${a})`; g.beginPath(); g.arc(p.x, p.y, 1.8 * p.s, 0, 7); g.fill(); }
      else if (p.k === 'fireflies') { g.globalAlpha = clamp(.5 + Math.sin(now * 3 + p.ph * 5) * .5, 0, 1); g.drawImage(glowSprite('220,255,140'), p.x - 14, p.y - 14, 28, 28); g.globalAlpha = 1; }
    }
  }
  function drawWater(g, now, L, R2, T, B) {
    for (const o of C.SOLIDS) {
      if (!(o.k === 'stream' || o.k === 'sea' || o.k === 'pond' || o.k === 'fountain')) continue;
      if (o.x > R2 || o.x + o.w < L || o.y > B || o.y + o.h < T) continue;
      if (C.MAP_ID === 'snow' && o.k === 'pond') continue;
      g.save(); g.beginPath();
      if (o.k === 'pond' || o.k === 'fountain') g.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2 - (o.k === 'fountain' ? 18 : 2), o.h / 2 - (o.k === 'fountain' ? 18 : 2), 0, 0, 7); else g.rect(o.x, o.y, o.w, o.h - (o.k === 'sea' ? 16 : 0));
      g.clip();
      const x0 = Math.max(o.x, L), x1 = Math.min(o.x + o.w, R2), y0 = Math.max(o.y, T), y1 = Math.min(o.y + o.h, B);
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2;
      for (let yy = y0 - (y0 % 26); yy < y1; yy += 26) { g.beginPath(); for (let xx = x0 - 20; xx < x1 + 20; xx += 16) g.lineTo(xx, yy + Math.sin(xx / 40 + now * 2 + yy) * 4); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let k = 0; k < (x1 - x0) * (y1 - y0) / 9000; k++) { const sx2 = x0 + ((k * 137.5 + now * 30) % (x1 - x0 + 1)), sy2 = y0 + ((k * 91.7) % (y1 - y0 + 1)), a = Math.sin(now * 4 + k) ; if (a > .6) { g.beginPath(); g.arc(sx2, sy2, 2, 0, 7); g.fill(); } }
      g.restore();
    }
  }
  function drawClouds(g, now, L, R2, T, B) {
    if (!(AMB[C.MAP_ID] || {}).clouds) return;
    for (let k = 0; k < 6; k++) {
      const cx = ((k * 997 + now * 22) % (W + 1600)) - 800, cy = (k * 613) % H, r = 300 + (k % 3) * 120;
      if (cx + r < L || cx - r > R2 || cy + r < T || cy - r > B) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(20,30,60,.13)'); gr.addColorStop(1, 'rgba(20,30,60,0)');
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
  function drawLanterns(g, now, L, R2, T, B) {
    for (const [lx, ly, lr] of C.LIGHTS) {
      if (lx < L || lx > R2 || ly < T || ly > B) continue;
      if (C.LAMP === 'pumpkin') {
        // 호박 등불: 안에서 촛불이 일렁인다
        const f = .75 + Math.sin(now * 11 + lx) * .15 + Math.sin(now * 23 + ly) * .1;
        const gl = g.createRadialGradient(lx, ly - 4, 2, lx, ly - 4, 50); gl.addColorStop(0, `rgba(255,200,80,${.6 * f})`); gl.addColorStop(1, 'rgba(255,140,30,0)');
        g.fillStyle = gl; g.fillRect(lx - 50, ly - 54, 100, 100); continue;
      }
      if (C.LAMP === 'tech') {
        if (lr > 300) continue; // 반응로는 자체 발광
        const red = (lx + ly) % 3 === 0, a = now * 3 + lx;
        g.save(); g.translate(lx, ly);
        const bg = g.createRadialGradient(0, 0, 2, 0, 0, 34); bg.addColorStop(0, red ? 'rgba(255,90,100,.9)' : 'rgba(120,230,255,.9)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = bg; g.fillRect(-34, -34, 68, 68);
        g.rotate(a); g.fillStyle = red ? 'rgba(255,70,90,.18)' : 'rgba(80,200,255,.14)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 150, -.25, .25); g.fill(); g.rotate(Math.PI); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 150, -.25, .25); g.fill();
        g.restore(); g.fillStyle = '#2b2d42'; g.beginPath(); g.arc(lx, ly, 9, 0, 7); g.fill(); g.fillStyle = red ? '#ff4d6d' : '#7de2ff'; g.beginPath(); g.arc(lx, ly, 5, 0, 7); g.fill();
        continue;
      }
      const sw = Math.sin(now * 1.6 + lx * .01) * .12;
      g.save(); g.translate(lx, ly - 40); g.rotate(sw);
      g.strokeStyle = 'rgba(40,30,30,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 0); g.stroke();
      const gl = g.createRadialGradient(0, 18, 4, 0, 18, 60); gl.addColorStop(0, 'rgba(255,170,90,.55)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gl; g.fillRect(-60, -42, 120, 120);
      g.fillStyle = '#c1121f'; rr(g, -14, 0, 28, 18, 6); g.fill();
      g.fillStyle = '#1d4e89'; rr(g, -14, 16, 28, 18, 6); g.fill();
      g.fillStyle = 'rgba(255,220,150,.75)'; g.fillRect(-10, 6, 20, 22);
      g.fillStyle = '#ffb703'; g.fillRect(-16, -2, 32, 4); g.fillRect(-16, 33, 32, 4);
      g.strokeStyle = '#c1121f'; g.lineWidth = 2; for (const dx of [-8, 0, 8]) { g.beginPath(); g.moveTo(dx, 37); g.lineTo(dx + sw * 20, 48); g.stroke(); }
      g.restore();
    }
  }
  // 밤: 화면을 어둡게 덮고 등불·내 주변만 밝힌다
  function drawNight(me, myTeam, g0, sx, sy) {
    // 어둠은 흐릿해도 티가 안 나니 반 해상도로 그리고 늘려 붙인다
    const NS = 0.5, cw = Math.ceil(fxC.width * NS), ch = Math.ceil(fxC.height * NS);
    if (nightC.width !== cw || nightC.height !== ch) { nightC.width = cw; nightC.height = ch; }
    ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'source-over';
    ng.fillStyle = C.LAMP === 'pumpkin' ? 'rgba(22,10,38,.76)' : C.LAMP === 'tech' ? 'rgba(3,7,20,.86)' : 'rgba(10,12,38,.8)'; ng.fillRect(0, 0, cw, ch);
    ng.setTransform(dpr * zoom * NS, 0, 0, dpr * zoom * NS, dpr * sx * NS, dpr * sy * NS);
    ng.globalCompositeOperation = 'destination-out';
    const L = app.cam.x - vw / zoom / 2, R2 = app.cam.x + vw / zoom / 2, T = app.cam.y - vh / zoom / 2, B = app.cam.y + vh / zoom / 2;
    const onScr = (x, y, r) => x + r > L && x - r < R2 && y + r > T && y - r < B;
    const hole = (x, y, r, a = 1) => { if (!onScr(x, y, r)) return; const gr = ng.createRadialGradient(x, y, r * .25, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); ng.fillStyle = gr; ng.fillRect(x - r, y - r, r * 2, r * 2); };
    const flick = performance.now() / 1000;
    for (const [lx, ly, lr] of C.LIGHTS) hole(lx, ly, lr * (1 + Math.sin(flick * 7 + lx) * .02), .95);
    for (const c of g0.cats) {
      if (c === me) hole(c.x, c.y, 360, 1);
      else if (myTeam < 0 || c.team === myTeam) hole(c.x, c.y, 200, .8);
    }
    xg.save(); xg.setTransform(1, 0, 0, 1, 0, 0); xg.drawImage(nightC, 0, 0, fxC.width, fxC.height); xg.restore();
    // 등불 빛번짐 (따뜻한 주황)
    xg.save(); xg.globalCompositeOperation = 'lighter';
    for (const [lx, ly, lr] of C.LIGHTS) {
      if (!onScr(lx, ly - 30, lr)) continue;
      const gr = xg.createRadialGradient(lx, ly - 30, 0, lx, ly - 30, lr * .9);
      const gc = C.LAMP === 'tech' ? (lr > 300 ? '90,200,255' : (lx + ly) % 3 ? '80,200,255' : '255,70,90') : '255,150,60';
      gr.addColorStop(0, `rgba(${gc},${C.LAMP === 'tech' ? .2 + (lr > 300 ? Math.sin(performance.now() / 400) * .06 : 0) : .22})`); gr.addColorStop(1, `rgba(${gc},0)`);
      xg.fillStyle = gr; xg.fillRect(lx - lr, ly - 30 - lr, lr * 2, lr * 2);
    }
    xg.restore();
  }
  const isLit = (g0, me, myTeam, x, y) => {
    if (!C.NIGHT || myTeam < 0) return true;
    for (const [lx, ly, lr] of C.LIGHTS) if (hyp(lx - x, ly - y) < lr * .8) return true;
    for (const c of g0.cats) if (c.team === myTeam && hyp(c.x - x, c.y - y) < (c === me ? 330 : 190)) return true;
    return false;
  };

  function drawCP(g, cp, now) {
    const col = cp.owner >= 0 ? TEAM_COL[cp.owner] : '#ffffff';
    g.save();
    g.fillStyle = cp.contested ? `rgba(255,59,107,${.12 + Math.sin(now * 8) * .06})` : cp.owner >= 0 ? (cp.owner ? 'rgba(74,116,160,.18)' : 'rgba(238,138,31,.18)') : 'rgba(255,255,255,.1)';
    g.beginPath(); g.arc(cp.x, cp.y, cp.r, 0, 7); g.fill();
    g.strokeStyle = col; g.lineWidth = 6; g.setLineDash([18, 12]); g.lineDashOffset = -now * 20; g.beginPath(); g.arc(cp.x, cp.y, cp.r, 0, 7); g.stroke(); g.setLineDash([]);
    for (const t of [0, 1]) { g.strokeStyle = TEAM_COL[t]; g.lineWidth = 10; g.beginPath(); g.arc(cp.x, cp.y, cp.r + 14 + t * 12, -Math.PI / 2, -Math.PI / 2 + cp.prog[t] / 100 * Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '40px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🚩', cp.x, cp.y - 6);
    g.restore();
  }
  function drawMob(g, m, now) {
    g.save(); g.translate(m.x, m.y);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(4, m.r * .7, m.r, m.r * .4, 0, 0, 7); g.fill();
    g.rotate(m.a || 0);
    if (m.kind === 'mini') {
      // 생쥐 로봇
      g.fillStyle = m.hitT > 0 ? '#fff' : '#868e96'; g.beginPath(); g.ellipse(0, 0, m.r * 1.3, m.r, 0, 0, 7); g.fill();
      g.fillStyle = '#495057'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(m.r * .4, s2 * m.r * .8, m.r * .45, 0, 7); g.fill(); }
      g.strokeStyle = '#495057'; g.lineWidth = 3; g.beginPath(); g.moveTo(-m.r * 1.2, 0); g.quadraticCurveTo(-m.r * 2, Math.sin(now * 12) * 8, -m.r * 2.6, 0); g.stroke();
      g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(m.r * 1.05, 0, 3, 0, 7); g.fill();
    } else {
      const big = m.kind === 'big' || m.kind === 'boss';
      g.fillStyle = m.hitT > 0 ? '#fff' : big ? '#343a40' : '#495057'; g.beginPath(); g.arc(0, 0, m.r, 0, 7); g.fill();
      g.strokeStyle = big ? '#fcbf49' : '#adb5bd'; g.lineWidth = big ? 5 : 3; g.beginPath(); g.arc(0, 0, m.r - 3, 0, 7); g.stroke();
      g.fillStyle = big ? '#212529' : '#6c757d'; g.beginPath(); g.arc(0, 0, m.r * .55, 0, 7); g.fill();
      // 앞 범퍼와 화난 눈
      g.strokeStyle = '#212529'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, m.r + 1, -.9, .9); g.stroke();
      g.fillStyle = Math.sin(now * 10 + m.u) > 0 ? '#ff3b3b' : '#ff8787'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(m.r * .45, s2 * m.r * .3, big ? 5 : 3.5, 0, 7); g.fill(); }
      // 회전 솔
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; for (const s2 of [-1, 1]) { g.save(); g.translate(m.r * .7, s2 * m.r * .7); g.rotate(now * 20 * s2); for (let k = 0; k < 3; k++) { g.rotate(2.1); g.beginPath(); g.moveTo(0, 0); g.lineTo(m.r * .35, 0); g.stroke(); } g.restore(); }
      if (big) { g.fillStyle = '#fcbf49'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillRect(-m.r * .2, m.r * .62, m.r * .4, 5); } }
    }
    g.restore();
    if (m.kind === 'boss') {
      // 왕관 + 붉은 오라
      const gr = g.createRadialGradient(m.x, m.y, m.r * .8, m.x, m.y, m.r * 1.6); gr.addColorStop(0, 'rgba(255,60,60,.25)'); gr.addColorStop(1, 'rgba(255,60,60,0)');
      g.fillStyle = gr; g.fillRect(m.x - m.r * 1.6, m.y - m.r * 1.6, m.r * 3.2, m.r * 3.2);
      const cy = m.y - m.r - 18 + Math.sin(now * 4) * 3; g.fillStyle = '#ffd166'; g.strokeStyle = '#b8860b'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(m.x - 24, cy + 12); g.lineTo(m.x - 24, cy - 6); g.lineTo(m.x - 12, cy + 4); g.lineTo(m.x, cy - 12); g.lineTo(m.x + 12, cy + 4); g.lineTo(m.x + 24, cy - 6); g.lineTo(m.x + 24, cy + 12); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ef476f'; g.beginPath(); g.arc(m.x, cy + 4, 3.5, 0, 7); g.fill();
    }
    if (m.hp < m.maxHp) { const k = clamp(m.hp / m.maxHp, 0, 1), bw = m.kind === 'boss' ? 110 : 40, by = m.y - m.r - (m.kind === 'boss' ? 40 : 14); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(m.x - bw / 2, by, bw, 6); g.fillStyle = m.kind === 'boss' ? '#ffd166' : '#ff3b6b'; g.fillRect(m.x - bw / 2, by, bw * k, 6); }
  }
  function drawShots(g, g0, now) {
    for (const sh of g0.shots) {
      const col = WPN_COL[sh.w] || (sh.team ? '#a9cdf0' : '#ffc27d');
      if (sh.w === 'sniper') { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(sh.x - sh.vx * .04, sh.y - sh.vy * .04); g.stroke(); continue; }
      if (sh.w === 'rocket') {
        const a = Math.atan2(sh.vy, sh.vx); g.save(); g.translate(sh.x, sh.y); g.rotate(a);
        g.fillStyle = 'rgba(255,180,80,.5)'; g.beginPath(); g.moveTo(-10, -5); g.lineTo(-26 - Math.random() * 10, 0); g.lineTo(-10, 5); g.fill();
        g.fillStyle = '#ff595e'; rr(g, -12, -6, 24, 12, 6); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 0, 4, 0, 7); g.fill();
        g.restore(); if (Math.random() < .5) burst(sh.x, sh.y, 1, { col: ['rgba(200,200,200,.6)'], sp: 20, life: .5, size: 7, kind: 'puff' }); continue;
      }
      const r = sh.w === 'shotgun' ? 4 : sh.w === 'rapid' ? 4.5 : 6;
      g.fillStyle = col; g.globalAlpha = .35; g.beginPath(); g.arc(sh.x - sh.vx * .015, sh.y - sh.vy * .015, r * 1.5, 0, 7); g.fill();
      g.globalAlpha = 1; g.beginPath(); g.arc(sh.x, sh.y, r, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(sh.x - r * .3, sh.y - r * .3, r * .4, 0, 7); g.fill();
    }
    for (const n of g0.nades) {
      const k = Math.min(1, n.t / n.T), x = n.sx + (n.tx - n.sx) * k, y = n.sy + (n.ty - n.sy) * k, z = Math.sin(k * Math.PI) * 90;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 8, 12, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(x, y - z, 12, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - z, 12, now * 8, now * 8 + 2); g.stroke();
      g.strokeStyle = 'rgba(255,59,107,.6)'; g.setLineDash([6, 6]); g.beginPath(); g.arc(n.tx, n.ty, 130 * (.6 + k * .4), 0, 7); g.stroke(); g.setLineDash([]);
    }
  }

  function render(dt, rdt) {
    const g = app.inGame ? app.g : app.demo;
    if (!mapCache) mapCache = buildMap();
    camFollow(rdt);
    const me = app.inGame ? g.cats[app.mySlot] : null;
    const myTeam = me ? me.team : -1;
    const now = performance.now() / 1000;
    // 흔들림
    fx.shake *= Math.exp(-rdt * 9); if (fx.shake < .3) fx.shake = 0;
    shX = (Math.random() - .5) * fx.shake * 2; shY = (Math.random() - .5) * fx.shake * 2;
    const sx = vw / 2 - app.cam.x * zoom + shX, sy = vh / 2 - app.cam.y * zoom + shY;
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.fillStyle = '#1b2a25'; wg.fillRect(0, 0, worldC.width, worldC.height);
    wg.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * sx, dpr * sy);
    const vL = app.cam.x - vw / zoom / 2 - 60, vR = app.cam.x + vw / zoom / 2 + 60, vT = app.cam.y - vh / zoom / 2 - 60, vB = app.cam.y + vh / zoom / 2 + 60;
    drawMapTiles(wg, vL - 40, vR + 40, vT - 40, vB + 40);
    drawWater(wg, now, vL, vR, vT, vB);
    stepAmbient(rdt, vL, vR, vT, vB);
    const vis = c => myTeam < 0 || C.visibleTo(g, myTeam, c);
    // 숨기 들어가고 나올 때 효과 + 숨는 곳 흔들림
    fx.rustle.clear();
    for (const c of g.cats) {
      const prev = fx.prevHide[c.id];
      if (c.hideIdx !== prev) {
        const v = vis(c);
        if (app.inGame && (v || c === me) && g.phase === 'play') {
          const h = C.HIDES[c.hideIdx >= 0 ? c.hideIdx : prev];
          if (h) burst(c.x, c.y, 10, { col: h.k === 'bush' ? ['#3f8f3a', '#7ccf63', '#2f7a2e'] : ['#fff', '#f3e3c3', '#ffd6e0'], sp: 150, life: .6, size: 8, kind: h.k === 'bush' ? 'leaf' : 'dot', up: -40 });
          if (c === me) { SFX.hide(); vib(12); if (c.hideIdx >= 0) pop(c.x, c.y - 60, '쏙!', '#2f7a2e', .8); }
        }
        fx.prevHide[c.id] = c.hideIdx;
      }
      if (c.hideIdx >= 0 && c.moving) fx.rustle.set(c.hideIdx, 1);
      // 발밑 먼지 / 가속 잎 / 덮치기 잔상
      fx.dustT[c.id] -= rdt;
      if (c.moving && fx.dustT[c.id] <= 0 && vis(c) && !c.hidden) {
        fx.dustT[c.id] = c.boostT > 0 ? .04 : c.dashT > 0 || c.pounceT > 0 ? .03 : .16;
        if (c.boostT > 0) burst(c.x, c.y + c.r * .6, 2, { col: ['#7ee08a', '#b7f5a0'], sp: 40, life: .5, size: 7, kind: 'leaf' });
        else if (c.pounceT > 0) burst(c.x, c.y, 2, { col: ['rgba(255,59,107,.7)'], sp: 20, life: .3, size: 16, kind: 'puff' });
        else burst(c.x - c.vx * .03, c.y + c.r * .9, 1, { col: ['rgba(230,215,190,.7)'], sp: 30, life: .4, size: 7, kind: 'puff' });
      }
    }
    // 털뭉치 트랩 (우리 팀 것은 늘 보이고, 상대 것은 가까이 가야 보인다)
    for (const t of g.traps) {
      const own = myTeam < 0 || t.team === myTeam;
      if (!own && !(me && hyp(me.x - t.x, me.y - t.y) < 150)) continue;
      drawTrap(wg, t, now, own);
    }
    // 아이템 상자
    for (const bx of g.boxes) {
      if (bx.t > 0) {
        // 다시 생기는 중: 흐린 자리 + 남은 시간 고리
        const k = 1 - bx.t / C.TUNE.boxRespawn;
        wg.save(); wg.globalAlpha = .55; wg.strokeStyle = 'rgba(255,255,255,.35)'; wg.lineWidth = 4; wg.beginPath(); wg.arc(bx.x, bx.y, 18, 0, 7); wg.stroke();
        wg.strokeStyle = '#ffd166'; wg.beginPath(); wg.arc(bx.x, bx.y, 18, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); wg.stroke();
        wg.fillStyle = 'rgba(181,23,158,.35)'; rr(wg, bx.x - 9 * k, bx.y - 8 * k, 18 * k, 16 * k, 4); wg.fill(); wg.restore();
        continue;
      }
      const bob = Math.sin(now * 3 + bx.u) * 5;
      wg.save(); wg.translate(bx.x, bx.y);
      wg.fillStyle = 'rgba(0,0,0,.25)'; wg.beginPath(); wg.ellipse(0, 18, 18 - bob * .4, 6, 0, 0, 7); wg.fill();
      const gl = wg.createRadialGradient(0, bob - 4, 0, 0, bob - 4, 46); gl.addColorStop(0, 'rgba(255,230,120,.55)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      wg.fillStyle = gl; wg.fillRect(-46, bob - 50, 92, 92);
      wg.translate(0, bob - 6); wg.rotate(Math.sin(now * 2 + bx.u) * .12);
      wg.fillStyle = '#b5179e'; rr(wg, -17, -15, 34, 30, 6); wg.fill(); wg.strokeStyle = '#fff'; wg.lineWidth = 2; wg.stroke();
      wg.fillStyle = '#ffd166'; wg.fillRect(-4, -15, 8, 30); wg.fillRect(-17, -3, 34, 7);
      wg.fillStyle = '#fff'; wg.font = '18px Jua, sans-serif'; wg.textAlign = 'center'; wg.textBaseline = 'middle'; wg.fillText('?', 0, 1);
      wg.restore();
    }
    // 블럭 벽
    for (const bl of g.blocks) {
      const a = clamp(bl.t / .5, 0, 1), rise = clamp((6 - bl.t) / .15, 0, 1);
      wg.save(); wg.globalAlpha = a;
      wg.fillStyle = 'rgba(0,0,0,.3)'; wg.fillRect(bl.x + 6, bl.y + 10, bl.w, bl.h);
      const vert = bl.h > bl.w, n = 4;
      for (let k = 0; k < n; k++) {
        const bx = vert ? bl.x : bl.x + k * bl.w / n, by = vert ? bl.y + k * bl.h / n : bl.y, bw = vert ? bl.w : bl.w / n, bh = vert ? bl.h / n : bl.h;
        wg.fillStyle = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][k]; rr(wg, bx + 1, by + 1 - (1 - rise) * 20, bw - 2, bh - 2, 5); wg.fill();
        wg.fillStyle = 'rgba(255,255,255,.35)'; rr(wg, bx + 4, by + 3 - (1 - rise) * 20, bw - 8, 5, 2); wg.fill();
        wg.strokeStyle = 'rgba(0,0,0,.35)'; wg.lineWidth = 2; rr(wg, bx + 1, by + 1 - (1 - rise) * 20, bw - 2, bh - 2, 5); wg.stroke();
      }
      if (bl.t < 1.5 && Math.floor(bl.t * 8) % 2) { wg.globalAlpha = .4; wg.fillStyle = '#fff'; wg.fillRect(bl.x, bl.y, bl.w, bl.h); }
      wg.restore();
    }
    if (g.cp) drawCP(wg, g.cp, now);
    for (const m of g.mobs) drawMob(wg, m, now);
    if (isCombat(g) && me && !me.dead && g.phase === 'play') {
      const W0 = C.WEAPONS[me.wpn] || C.WEAPONS.pistol, len = Math.min(W0.spd * W0.life, 900), a = me.gunA || 0;
      const lg = wg.createLinearGradient(me.x, me.y, me.x + Math.cos(a) * len, me.y + Math.sin(a) * len);
      // 조준선은 짧은 점 몇 개만 (긴 작대기처럼 안 보이게), 저격만 가는 실선
      if (me.wpn === 'sniper') {
        lg.addColorStop(0, 'rgba(255,90,140,.35)'); lg.addColorStop(1, 'rgba(255,90,140,0)');
        wg.strokeStyle = lg; wg.lineWidth = 1.5; wg.beginPath(); wg.moveTo(me.x + Math.cos(a) * 34, me.y + Math.sin(a) * 34); wg.lineTo(me.x + Math.cos(a) * len, me.y + Math.sin(a) * len); wg.stroke();
      } else {
        wg.fillStyle = 'rgba(255,255,255,.5)';
        for (let k = 0; k < 3; k++) { const d = 44 + k * 18; wg.globalAlpha = .55 - k * .15; wg.beginPath(); wg.arc(me.x + Math.cos(a) * d, me.y + Math.sin(a) * d, 3.2 - k * .6, 0, 7); wg.fill(); }
        wg.globalAlpha = 1;
      }
    }
    const order = [...g.cats].sort((a, b) => a.y - b.y);
    for (const c of order) {
      const v = vis(c);
      c._vis = v;
      if (!v) continue;
      if (c.dead) {
        // 쓰러진 고양이: 유령처럼
        wg.save(); wg.globalAlpha = .35; wg.translate(0, -Math.sin(now * 2 + c.id) * 4);
        if (!(app.inGame && sprites[c.id])) drawCat(wg, c.x, c.y, c.r, app.inGame ? styleOf(c.id) : c.id % 4, c.t, false, c.facing, true);
        else { wg.fillStyle = TEAM_COL[c.team]; wg.beginPath(); wg.arc(c.x, c.y, c.r, 0, 7); wg.fill(); }
        wg.restore();
        if (g.mode === 'zombie' && c.revT > 0) { wg.strokeStyle = '#80ed99'; wg.lineWidth = 5; wg.beginPath(); wg.arc(c.x, c.y, c.r * 1.6, -Math.PI / 2, -Math.PI / 2 + c.revT / 2 * Math.PI * 2); wg.stroke(); }
        continue;
      }
      const isCh = c.team === g.chaserTeam && g.phase !== 'lobby';
      const sniffedNow = myTeam >= 0 && c.team !== myTeam && c.hidden && C.sniffed(g, myTeam, c);
      wg.save(); wg.translate(c.x, c.y + c.r * .95);
      wg.fillStyle = 'rgba(20,30,30,.25)'; wg.beginPath(); wg.ellipse(0, 0, c.r * 1.05, c.r * .36, 0, 0, 7); wg.fill();
      wg.strokeStyle = isCh ? '#ff3b6b' : TEAM_COL[c.team]; wg.lineWidth = 3.5;
      if (isCh) { wg.setLineDash([8, 7]); wg.lineDashOffset = -c.t * 30; }
      wg.beginPath(); wg.ellipse(0, 0, c.r * 1.3, c.r * .48, 0, 0, 7); wg.stroke(); wg.setLineDash([]);
      if (c === me) { wg.strokeStyle = '#fff'; wg.lineWidth = 2; wg.beginPath(); wg.ellipse(0, 0, c.r * 1.55, c.r * .6, 0, 0, 7); wg.stroke(); }
      if (c.boostT > 0) { wg.strokeStyle = 'rgba(126,224,138,.8)'; wg.lineWidth = 3; wg.beginPath(); wg.ellipse(0, 0, c.r * 1.8 + Math.sin(now * 20) * 3, c.r * .7, 0, 0, 7); wg.stroke(); }
      wg.restore();
      if (c.windT > 0) {
        // 덮치기 예고: 빨간 부채꼴
        const a = Math.atan2(c.aimY, c.aimX), len = 200, k = 1 - c.windT / C.TUNE.windup;
        wg.save(); wg.translate(c.x, c.y); wg.rotate(a);
        wg.globalAlpha = .18 + k * .3; wg.fillStyle = '#ff3b6b';
        wg.beginPath(); wg.moveTo(0, 0); wg.arc(0, 0, len, -.32, .32); wg.closePath(); wg.fill();
        wg.globalAlpha = .9; wg.strokeStyle = '#ff3b6b'; wg.lineWidth = 3; wg.beginPath(); wg.arc(0, 0, len * k, -.32, .32); wg.stroke();
        wg.restore();
      }
      if (c.dashT > 0 || c.pounceT > 0) {
        for (let k = 1; k <= 3; k++) { wg.globalAlpha = .22 / k; wg.fillStyle = c.pounceT > 0 ? '#ff3b6b' : TEAM_COL[c.team]; wg.beginPath(); wg.arc(c.x - c.vx * .03 * k, c.y - c.vy * .03 * k, c.r, 0, 7); wg.fill(); }
        wg.globalAlpha = 1;
      }
      const sp = app.inGame ? sprites[c.id] : null;
      wg.globalAlpha = c.immune > 0 && Math.floor(c.t * 14) % 2 ? .45 : 1;
      if (c.camoT > 0) wg.globalAlpha = c.team === myTeam || myTeam < 0 ? .45 + Math.sin(now * 6) * .1 : .3;
      // 스쿼시 앤 스트레치
      const spd = hyp(c.vx, c.vy), st = clamp(spd / 1400, 0, .18);
      if (sp && sp.anim) {
        const a = sp.anim, hh = c.r * (a.keyed ? 3.4 : 3.1), ww = hh * a.w / a.h;
        const bob = c.moving && !c.frozen ? -Math.abs(Math.sin(c.t * 14)) * 4 : 0;
        wg.save(); wg.translate(c.x, c.y + c.r * (a.keyed ? .95 : .9) + bob); wg.scale(c.facing * (1 + st), 1 - st);
        if (c.frozen) wg.filter = 'saturate(.3) hue-rotate(170deg) brightness(1.15)';
        if (!a.keyed) { wg.fillStyle = 'rgba(255,255,255,.9)'; rr(wg, -ww / 2 - 3, -hh - 3, ww + 6, hh + 6, 8); wg.fill(); }
        wg.drawImage(animFrame(a, c.t), -ww / 2, -hh, ww, hh);
        wg.restore();
      } else if (!sp) {
        wg.save(); wg.translate(c.x, c.y); wg.scale(1 + st, 1 - st);
        drawCat(wg, 0, 0, c.r, app.inGame ? styleOf(c.id) : c.id % 4, c.t, c.moving, c.facing, c.frozen);
        wg.restore();
      }
      wg.globalAlpha = 1;
      if (c.shieldT > 0) {
        const a = c.gunA || 0; wg.save(); wg.translate(c.x, c.y); wg.rotate(a);
        wg.fillStyle = 'rgba(169,205,240,.35)'; wg.strokeStyle = '#a9cdf0'; wg.lineWidth = 4;
        wg.beginPath(); wg.arc(0, 0, c.r * 2.1, -1.1, 1.1); wg.arc(0, 0, c.r * 1.6, 1.1, -1.1, true); wg.closePath(); wg.fill(); wg.stroke(); wg.restore();
      }
      if (sniffedNow) { wg.strokeStyle = '#ff5d8f'; wg.lineWidth = 3; wg.beginPath(); wg.arc(c.x, c.y, c.r * 1.8 + Math.sin(now * 10) * 3, 0, 7); wg.stroke(); }
    }
    // GIF 스프라이트 (<img> 대체)
    for (let i = 0; i < g.cats.length; i++) {
      const im = sprites[i]; if (!im || im.anim) continue;
      const c = g.cats[i];
      if (!app.inGame || !c._vis) { im.style.display = 'none'; continue; }
      im.style.display = '';
      const size = c.r * 3.1 * zoom, bob = c.moving && !c.frozen ? -Math.abs(Math.sin(c.t * 14)) * 4 * zoom : 0;
      const [px, py] = toScreen(c.x, c.y);
      im.style.width = size + 'px'; im.style.height = size + 'px';
      im.style.transform = `translate(${px - size / 2}px,${py - size * .62 + bob}px) scaleX(${c.facing})`;
      im.style.opacity = c.camoT > 0 ? .4 : c.immune > 0 && Math.floor(c.t * 14) % 2 ? .45 : 1;
      im.style.filter = c.frozen ? 'saturate(.3) hue-rotate(170deg) brightness(1.15)' : 'none';
    }
    // 효과 레이어
    xg.setTransform(1, 0, 0, 1, 0, 0); xg.clearRect(0, 0, fxC.width, fxC.height);
    xg.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * sx, dpr * sy);
    const viewL = app.cam.x - vw / zoom / 2 - 100, viewR = app.cam.x + vw / zoom / 2 + 100, viewT = app.cam.y - vh / zoom / 2 - 100, viewB = app.cam.y + vh / zoom / 2 + 100;
    C.HIDES.forEach((h, i) => {
      if (h.x > viewR || h.x + h.w < viewL || h.y > viewB || h.y + h.h < viewT) return;
      const inside = me && me.hideIdx === i;
      const img = canopyImage(h), rus = fx.rustle.has(i) ? Math.sin(now * 40) * 2.2 : 0;
      xg.globalAlpha = inside ? .45 : 1;
      xg.drawImage(img.cv, h.x - img.pad + rus, h.y - img.pad + ((h.k === 'bush' || h.k === 'snowbush') ? Math.sin(now * 1.4 + i) * 1.2 : 0));
      xg.globalAlpha = 1;
      if (rus && Math.random() < .15 && h.k === 'bush') burst(h.x + Math.random() * h.w, h.y + Math.random() * h.h * .5, 1, { col: ['#5cb04c', '#7ccf63'], sp: 60, life: .7, size: 7, kind: 'leaf', grav: 120 });
    });
    drawClouds(xg, now, vL, vR, vT, vB);
    drawAmbient(xg, now, false);
    if (C.NIGHT) drawLanterns(xg, now, vL, vR, vT, vB);
    if (C.NIGHT) {
      drawNight(me, myTeam, g, sx, sy);
      xg.save(); xg.globalCompositeOperation = 'lighter'; drawAmbient(xg, now, true); xg.restore();
    } else drawAmbient(xg, now, true);
    // 냄새 구름 (냄새를 맡은 팀만 본다)
    for (const s of g.scents) {
      if (myTeam >= 0 && s.team !== myTeam) continue;
      const a = clamp(s.t / 4, 0, 1);
      for (let k = 0; k < 5; k++) {
        const ox = Math.sin(now * 1.3 + k * 1.7) * 50, oy = Math.cos(now * 1.1 + k * 2.3) * 40;
        const gr = xg.createRadialGradient(s.x + ox, s.y + oy, 0, s.x + ox, s.y + oy, 90);
        gr.addColorStop(0, `rgba(255,93,143,${.28 * a})`); gr.addColorStop(1, 'rgba(255,93,143,0)');
        xg.fillStyle = gr; xg.fillRect(s.x + ox - 90, s.y + oy - 90, 180, 180);
      }
      xg.font = '30px sans-serif'; xg.textAlign = 'center'; xg.globalAlpha = a; xg.fillText('👃', s.x, s.y + Math.sin(now * 4) * 6); xg.globalAlpha = 1;
    }
    // 파티클
    for (const p of fx.parts) {
      const k = 1 - p.life / p.max; if (k <= 0) continue;
      xg.globalAlpha = Math.min(1, k * 1.6); xg.fillStyle = p.col;
      if (p.kind === 'star') drawStar(xg, p.x, p.y, p.size, p.rot);
      else if (p.kind === 'ice') { xg.save(); xg.translate(p.x, p.y); xg.rotate(p.rot); xg.beginPath(); xg.moveTo(0, -p.size); xg.lineTo(p.size * .5, 0); xg.lineTo(0, p.size); xg.lineTo(-p.size * .5, 0); xg.closePath(); xg.fill(); xg.restore(); }
      else if (p.kind === 'leaf') { xg.save(); xg.translate(p.x, p.y); xg.rotate(p.rot); xg.beginPath(); xg.ellipse(0, 0, p.size, p.size * .45, 0, 0, 7); xg.fill(); xg.restore(); }
      else if (p.kind === 'puff') { xg.beginPath(); xg.arc(p.x, p.y, p.size * (1.6 - k * .8), 0, 7); xg.fill(); }
      else { xg.beginPath(); xg.arc(p.x, p.y, p.size * (.5 + k * .5), 0, 7); xg.fill(); }
    }
    xg.globalAlpha = 1;
    drawShots(xg, g, now);
    for (const r of fx.rings) {
      const k = r.t / r.dur; if (k >= 1) continue;
      xg.globalAlpha = 1 - k; xg.strokeStyle = r.col; xg.lineWidth = r.w * (1 - k) + 1;
      xg.beginPath(); xg.arc(r.x, r.y, r.max * (1 - Math.pow(1 - k, 3)), 0, 7); xg.stroke();
    }
    xg.globalAlpha = 1;
    for (const c of g.cats) {
      if (!c._vis) continue;
      if (myTeam >= 0 && c.team !== myTeam && !isLit(g, me, myTeam, c.x, c.y)) continue; // 어둠 속 상대는 이름도 안 보인다
      if (c.frozen) {
        const deep = (c.thaws | 0) >= C.TUNE.maxThaw;
        xg.save(); xg.globalAlpha = deep ? .75 : .5; xg.fillStyle = deep ? '#7fb2e5' : '#bfeaff'; rr(xg, c.x - c.r * 1.4, c.y - c.r * 1.6, c.r * 2.8, c.r * 2.9, 10); xg.fill();
        if (deep) { xg.globalAlpha = 1; xg.font = '14px Jua, sans-serif'; xg.textAlign = 'center'; xg.fillStyle = '#1d4e89'; xg.fillText('꽁꽁', c.x, c.y + c.r * 1.55); }
        xg.globalAlpha = .9; xg.strokeStyle = '#fff'; xg.lineWidth = 3; xg.stroke();
        xg.globalAlpha = .7; xg.fillStyle = '#fff'; xg.beginPath(); xg.moveTo(c.x - c.r * 1.1, c.y - c.r * 1.3); xg.lineTo(c.x - c.r * .6, c.y - c.r * 1.3); xg.lineTo(c.x - c.r * 1.1, c.y - c.r * .2); xg.fill();
        xg.restore();
      }
      // 기절 별
      if (c.stun > .4 || c.rootT > 0) {
        xg.fillStyle = '#ffd166';
        for (let k = 0; k < 3; k++) { const a = now * 5 + k * 2.1; drawStar(xg, c.x + Math.cos(a) * c.r * 1.1, c.y - c.r * 1.9 + Math.sin(a) * c.r * .35, 7, a); }
      }
      const isCh = c.team === g.chaserTeam && g.phase !== 'lobby';
      let label;
      if (app.inGame && app.lobby) { const s = app.lobby.slots[c.id]; label = s && s.p ? s.name : '봇'; } else label = STYLES[c.id % 4].name;
      if (c === me) label = '나';
      const text = (isCh ? '술래 · ' : '') + label + (c.dead ? (c.respawnT > 0 ? ` 💀 ${Math.ceil(c.respawnT)}` : ' 💀') : '');
      const spr = app.inGame ? sprites[c.id] : null;
      xg.font = '15px Jua, sans-serif'; const tw = xg.measureText(text).width + 16, bx = c.x - tw / 2, by = c.y - c.r * (spr && spr.anim ? 2.95 : 2.45);
      xg.globalAlpha = c.hidden && c.team === myTeam ? .7 : 1;
      xg.fillStyle = isCh ? '#ff3b6b' : TEAM_COL[c.team]; rr(xg, bx, by, tw, 22, 11); xg.fill();
      xg.fillStyle = '#fff'; xg.textAlign = 'center'; xg.textBaseline = 'middle'; xg.fillText(text, c.x, by + 12);
      if (isCombat(g) && !c.dead) {
        const k = clamp((c.hp || 0) / (c.maxHp || 100), 0, 1), bw = c === me ? 56 : 46;
        xg.fillStyle = 'rgba(0,0,0,.5)'; rr(xg, c.x - bw / 2 - 1, by + 24, bw + 2, 7, 3); xg.fill();
        xg.fillStyle = k > .5 ? '#80ed99' : k > .25 ? '#ffd166' : '#ff3b6b'; rr(xg, c.x - bw / 2, by + 25, bw * k, 5, 2); xg.fill();
        if (g.mode === 'hero') { xg.font = '14px sans-serif'; xg.fillText(C.CLASSES[c.cls || 'dps'].icon, bx - 10, by + 11); }
      }
      if (c.hidden && c.team === myTeam) { const t2 = c.camoT > 0 ? `보호색 ${Math.ceil(c.camoT)}` : c.moving ? '부스럭…' : '숨는 중'; xg.font = '13px Gowun Dodum, sans-serif'; xg.fillStyle = c.moving ? '#ffd166' : '#fff'; xg.strokeStyle = 'rgba(0,0,0,.6)'; xg.lineWidth = 3; xg.strokeText(t2, c.x, by - 10); xg.fillText(t2, c.x, by - 10); }
      xg.globalAlpha = 1;
    }
    // 말풍선
    xg.font = '15px Gowun Dodum, sans-serif'; xg.textBaseline = 'middle';
    for (let i = 0; i < g.cats.length; i++) {
      const b = fx.bubbles[i]; if (!b) continue;
      b.t += rdt; if (b.t > b.dur) { fx.bubbles[i] = null; continue; }
      const c = g.cats[i]; if (!c._vis || (myTeam >= 0 && c.team !== myTeam && !isLit(g, me, myTeam, c.x, c.y))) continue;
      const spr = app.inGame ? sprites[c.id] : null, top = c.y - c.r * (spr && spr.anim ? 2.95 : 2.45) - 18 - (c.hidden && c.team === myTeam ? 14 : 0);
      const tw = Math.min(220, xg.measureText(b.text).width + 22), bh = 30, s = b.t < .12 ? .6 + b.t / .12 * .4 : 1, a = Math.min(1, (b.dur - b.t) * 4);
      xg.save(); xg.globalAlpha = a; xg.translate(c.x, top); xg.scale(s, s);
      xg.fillStyle = 'rgba(0,0,0,.18)'; rr(xg, -tw / 2 + 2, -bh + 3, tw, bh, 14); xg.fill();
      xg.fillStyle = '#fff'; rr(xg, -tw / 2, -bh, tw, bh, 14); xg.fill();
      xg.beginPath(); xg.moveTo(-7, -1); xg.lineTo(7, -1); xg.lineTo(0, 9); xg.closePath(); xg.fill();
      xg.strokeStyle = c.team === g.chaserTeam && g.phase !== 'lobby' ? '#ff3b6b' : TEAM_COL[c.team]; xg.lineWidth = 2.5; rr(xg, -tw / 2, -bh, tw, bh, 14); xg.stroke();
      xg.fillStyle = '#2b2320'; xg.textAlign = 'center'; xg.fillText(b.text, 0, -bh / 2 + 1, tw - 14);
      xg.restore();
    }
    // 들킴 "!"
    for (const m of fx.marks) {
      const c = g.cats[m.id]; if (!c || !c._vis) continue;
      const k = m.t, s = k < .15 ? k / .15 * 1.3 : 1.3 - Math.min(.3, (k - .15) * 2);
      xg.save(); xg.translate(c.x, c.y - c.r * 3.4); xg.scale(s, s); xg.globalAlpha = Math.min(1, (1.2 - k) * 3);
      xg.fillStyle = '#ff3b6b'; xg.strokeStyle = '#fff'; xg.lineWidth = 4; xg.beginPath(); xg.arc(0, 0, 20, 0, 7); xg.fill(); xg.stroke();
      xg.fillStyle = '#fff'; xg.font = '30px Jua, sans-serif'; xg.textAlign = 'center'; xg.textBaseline = 'middle'; xg.fillText('!', 0, 2);
      xg.restore();
    }
    for (const p of app.popups) {
      const a = 1 - p.t, s = (p.s || 1) * (p.t < .12 ? .5 + p.t / .12 * .9 : 1.4 - Math.min(.4, (p.t - .12) * 1.2));
      xg.save(); xg.globalAlpha = Math.max(0, a * 1.4); xg.translate(p.x, p.y - p.t * 40); xg.scale(s, s);
      xg.font = '34px Jua, sans-serif'; xg.textAlign = 'center'; xg.textBaseline = 'middle';
      xg.lineWidth = 8; xg.strokeStyle = '#fff'; xg.strokeText(p.text, 0, 0); xg.fillStyle = p.color; xg.fillText(p.text, 0, 0); xg.restore();
    }
    // 화면 좌표
    xg.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (app.inGame) {
      // 긴장감 비네트 (심장 박동에 맞춰 뛴다)
      fx.beat = Math.max(0, fx.beat - rdt * 3);
      const ten = fx.tension, isRunner = me && me.team !== g.chaserTeam;
      if (ten > .15) {
        const a = (ten - .15) * (isRunner ? .55 : .3) * (.7 + fx.beat * .6);
        const gr = xg.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .3, vw / 2, vh / 2, Math.max(vw, vh) * .75);
        gr.addColorStop(0, 'rgba(180,0,40,0)'); gr.addColorStop(1, `rgba(${isRunner ? '180,0,40' : '255,120,0'},${a})`);
        xg.fillStyle = gr; xg.fillRect(0, 0, vw, vh);
      }
      if (me && me.hidden && g.phase === 'play') {
        const gr = xg.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .25, vw / 2, vh / 2, Math.max(vw, vh) * .7);
        gr.addColorStop(0, 'rgba(10,40,20,0)'); gr.addColorStop(1, 'rgba(10,40,20,.45)'); xg.fillStyle = gr; xg.fillRect(0, 0, vw, vh);
      }
      if (myTeam >= 0 && g.reveal[1 - myTeam] > 0 && me && C.sniffed(g, 1 - myTeam, me)) {
        xg.strokeStyle = `rgba(255,93,143,${.5 + Math.sin(now * 12) * .3})`; xg.lineWidth = 10; xg.strokeRect(5, 5, vw - 10, vh - 10);
      }
      // 얼은 친구 방향 화살표
      for (const c of g.cats) {
        if (!me || c === me || c.team !== myTeam || !c.frozen || (c.thaws | 0) >= C.TUNE.maxThaw) continue;
        const [px, py] = toScreen(c.x, c.y);
        if (px > 30 && px < vw - 30 && py > 90 && py < vh - 30) continue;
        const ang = Math.atan2(py - vh / 2, px - vw / 2);
        const ax = clamp(px, 34, vw - 34), ay = clamp(py, 110, vh - 40), bounce = Math.sin(now * 8) * 5;
        xg.save(); xg.translate(ax - Math.cos(ang) * bounce, ay - Math.sin(ang) * bounce); xg.rotate(ang);
        xg.fillStyle = '#3aaef0'; xg.strokeStyle = '#fff'; xg.lineWidth = 3;
        xg.beginPath(); xg.moveTo(18, 0); xg.lineTo(-10, -13); xg.lineTo(-10, 13); xg.closePath(); xg.fill(); xg.stroke(); xg.restore();
        xg.font = '13px Jua, sans-serif'; xg.textAlign = 'center'; xg.fillStyle = '#fff'; xg.strokeStyle = 'rgba(0,0,0,.6)'; xg.lineWidth = 3;
        xg.strokeText('땡 해줘!', ax, ay + 26); xg.fillText('땡 해줘!', ax, ay + 26);
      }
      if (g.phase === 'count') {
        const n = Math.ceil(g.countT), fr = g.countT - Math.floor(g.countT), s = 1 + Math.pow(fr, 4) * .8;
        xg.save(); xg.translate(vw / 2, vh / 2 + 40); xg.scale(s, s);
        xg.font = '110px Jua, sans-serif'; xg.textAlign = 'center'; xg.textBaseline = 'middle';
        xg.lineWidth = 14; xg.strokeStyle = '#fff'; xg.strokeText(n > 0 ? n : '', 0, 0); xg.fillStyle = n === 1 ? '#ff3b6b' : '#1e2a26'; xg.fillText(n > 0 ? n : '', 0, 0);
        xg.restore();
      }
      if (isCombat(g) && !touchUI && mouse.on && me && !me.dead) {
        xg.strokeStyle = '#fff'; xg.lineWidth = 2; xg.beginPath(); xg.arc(mouse.x, mouse.y, 11, 0, 7); xg.stroke();
        xg.strokeStyle = WPN_COL[me.wpn] || '#ff3b6b'; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { xg.beginPath(); xg.moveTo(mouse.x + dx * 6, mouse.y + dy * 6); xg.lineTo(mouse.x + dx * 17, mouse.y + dy * 17); xg.stroke(); }
        if (me.fireCd > 0) { xg.strokeStyle = 'rgba(255,255,255,.6)'; xg.beginPath(); xg.arc(mouse.x, mouse.y, 15, -Math.PI / 2, -Math.PI / 2 + (1 - me.fireCd / (C.WEAPONS[me.wpn] || C.WEAPONS.pistol).rate) * Math.PI * 2); xg.stroke(); }
      }
      drawMinimap(g, me, myTeam);
    }
    // 화면 번쩍
    if (fx.flash) {
      xg.globalAlpha = fx.flash.a; xg.fillStyle = fx.flash.col; xg.fillRect(0, 0, vw, vh); xg.globalAlpha = 1;
      fx.flash.a -= rdt * 1.6; if (fx.flash.a <= 0) fx.flash = null;
    }
    // 꽃가루
    for (const p of fx.screen) {
      const k = p.life / p.max; if (k >= 1) continue;
      xg.save(); xg.globalAlpha = Math.min(1, (1 - k) * 2); xg.translate(p.x, p.y); xg.rotate(p.rot); xg.fillStyle = p.col; xg.fillRect(-6, -3.5, 12, 7); xg.restore();
    }
  }
  function stepFx(dt) {
    for (const p of fx.parts) { p.life += dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    fx.parts = fx.parts.filter(p => p.life < p.max);
    for (const r of fx.rings) r.t += dt; fx.rings = fx.rings.filter(r => r.t < r.dur);
    for (const m of fx.marks) m.t += dt; fx.marks = fx.marks.filter(m => m.t < 1.2);
    for (const p of fx.screen) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx += Math.sin(p.life * 3 + p.rot) * 40 * dt; p.rot += p.vr * dt; }
    fx.screen = fx.screen.filter(p => p.life < p.max);
  }
  // 긴장도: 도망팀은 술래가 가까울수록, 술래팀은 눈에 보이는 도망팀이 가까울수록
  function updateTension(dt) {
    let target = 0;
    const g = app.g;
    if (app.inGame && g) {
      const me = g.cats[app.mySlot];
      if (me && g.phase === 'play' && isCombat(g)) {
        const foes = g.mode === 'zombie' ? g.mobs : g.cats.filter(c => c.team !== me.team && !c.dead && C.visibleTo(g, me.team, c));
        const d = foes.length ? Math.min(...foes.map(c => hyp(c.x - me.x, c.y - me.y))) : 9999;
        target = me.dead ? .1 : clamp((800 - d) / 650, .1, .9) + (me.hp < me.maxHp * .35 ? .2 : 0);
        if (g.mode === 'zombie' && g.mobs.length > 12) target = Math.max(target, .6);
      } else if (me && g.phase === 'play') {
        if (me.team !== g.chaserTeam) {
          if (!me.frozen) {
            const d = Math.min(...g.cats.filter(c => c.team !== me.team).map(c => hyp(c.x - me.x, c.y - me.y)));
            target = g.hold > 0 ? .12 : clamp((900 - d) / 720, 0, 1);
          } else target = .25;
        } else {
          const ds = g.cats.filter(c => c.team !== me.team && !c.frozen && C.teamSees(g, me.team, c)).map(c => hyp(c.x - me.x, c.y - me.y));
          target = ds.length ? clamp((700 - Math.min(...ds)) / 600, 0, .85) : .1;
        }
        if (g.timeLeft < 10) target = Math.max(target, .55);
      } else if (me && g.phase === 'count') target = .08;
    }
    fx.tension += (target - fx.tension) * Math.min(1, dt * (target > fx.tension ? 3 : 1));
  }
  function drawMinimap(g, me, myTeam) {
    const mw = touchUI ? (Math.min(vw, vh) < 500 ? 110 : 140) : (vw < 560 ? 120 : 180), s = mw / W, mh = H * s;
    const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--satpx')) || 0;
    const x0 = vw - mw - 12, y0 = touchUI ? (vw < 560 ? 104 : 92) + sat : vh - mh - 14;
    xg.save(); xg.translate(x0, y0);
    xg.globalAlpha = .9; xg.fillStyle = '#1e2a26'; rr(xg, -4, -4, mw + 8, mh + 8, 8); xg.fill(); xg.globalAlpha = 1;
    const cols = { wood: '#c9a273', tile: '#cdd8dc', carpet: '#b8a3c9', grass: '#7fb565', stone: '#b5ab9c', road: '#555a60', sand: '#e2cf9f', snow: '#e8f0f8', deck: '#a07a4c', madang: '#57506a', baksuk: '#3c3a48' };
    for (const r of C.ROOMS) { xg.fillStyle = cols[r.k] || FLOOR_COL[r.k] || '#888'; xg.fillRect(r.x * s, r.y * s, r.w * s, r.h * s); }
    xg.fillStyle = '#4c3b33'; for (const o of C.SOLIDS) { xg.fillStyle = o.k === 'wall' ? '#3e2f28' : o.k === 'tree' || o.k === 'pine' || o.k === 'palm' ? '#2f6e2b' : o.k === 'pond' || o.k === 'fountain' || o.k === 'sea' || o.k === 'stream' ? '#4fa3cf' : o.k === 'hanok' || o.k === 'mansion' ? '#2b2d42' : o.k === 'cherry' ? '#ffb3c6' : o.k === 'hull' ? '#9aa7bd' : o.k === 'reactor' || o.k === 'tank' ? '#4cc9f0' : o.k === 'deadtree' ? '#5a4030' : o.k === 'jack' || o.k === 'pumpkin' ? '#f77f00' : 'rgba(76,59,51,.8)'; xg.fillRect(o.x * s, o.y * s, Math.max(1, o.w * s), Math.max(1, o.h * s)); }
    xg.fillStyle = 'rgba(30,100,30,.75)'; for (const h of C.HIDES) xg.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
    for (const c of g.cats) {
      // 미니맵에는 우리 팀 눈에 실제로 보이는 상대만
      if (!(myTeam < 0 || c.team === myTeam || (c._vis && C.teamSees(g, myTeam, c)))) continue;
      xg.fillStyle = c.frozen ? '#7fd3ff' : (c.team === g.chaserTeam ? '#ff3b6b' : TEAM_COL[c.team]);
      xg.beginPath(); xg.arc(c.x * s, c.y * s, c === me ? 4.5 : 3.5, 0, 7); xg.fill();
      if (c === me) { xg.strokeStyle = '#fff'; xg.lineWidth = 1.5; xg.stroke(); }
    }
    for (const m of g.mobs) { xg.fillStyle = '#ff3b6b'; xg.fillRect(m.x * s - 2, m.y * s - 2, 4, 4); }
    if (g.cp) { xg.strokeStyle = g.cp.owner >= 0 ? TEAM_COL[g.cp.owner] : '#fff'; xg.lineWidth = 2; xg.beginPath(); xg.arc(g.cp.x * s, g.cp.y * s, Math.max(4, g.cp.r * s), 0, 7); xg.stroke(); }
    for (const sc of g.scents) if (myTeam < 0 || sc.team === myTeam) { xg.fillStyle = 'rgba(255,93,143,.6)'; xg.beginPath(); xg.arc(sc.x * s, sc.y * s, 6, 0, 7); xg.fill(); }
    xg.strokeStyle = 'rgba(255,255,255,.7)'; xg.lineWidth = 1;
    xg.strokeRect((app.cam.x - vw / zoom / 2) * s, (app.cam.y - vh / zoom / 2) * s, vw / zoom * s, vh / zoom * s);
    xg.restore();
  }

  /* ---------------- HUD ---------------- */
  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  const skPrev = [0, 0];
  function hud(dt) {
    if (!app.inGame) return;
    const g = app.g, me = g.cats[app.mySlot];
    setText('sA', String(g.scores[0])); setText('sB', String(g.scores[1]));
    const tl = g.phase === 'count' ? g.roundTime : Math.ceil(g.timeLeft);
    setText('timer', String(Math.max(0, tl)));
    const tEl = $('timer');
    tEl.classList.toggle('low', g.phase === 'play' && g.timeLeft < 10);
    if (fx.timerPulse) { tEl.classList.remove('pulse'); void tEl.offsetWidth; tEl.classList.add('pulse'); fx.timerPulse = 0; }
    setText('roundTxt', `${Math.min(g.round + 1, C.ROUNDS)} / ${C.ROUNDS} 라운드`);
    $('cA').classList.toggle('on', g.chaserTeam === 0); $('cB').classList.toggle('on', g.chaserTeam === 1);
    let role = '';
    // 전투 모드 점수판
    if (isCombat(g)) {
      if (g.mode === 'gun') setText('roundTxt', `💧 먼저 ${g.killGoal}킬`);
      else if (g.mode === 'hero') { setText('sA', Math.floor(g.scores[0]) + '%'); setText('sB', Math.floor(g.scores[1]) + '%'); setText('roundTxt', g.cp && g.cp.contested ? '⚔️ 점령 지점 쟁탈 중!' : '🚩 점령전'); }
      else { setText('sA', String(g.wave)); setText('sB', String(g.mode === 'zombie' && app.mode === 'client' ? g.mobsLeft || 0 : g.waveLeft + g.mobs.length)); setText('timer', g.breakT > 0 && !g.mobs.length && g.phase === 'play' ? String(Math.ceil(g.breakT)) : '🤖'); setText('roundTxt', `웨이브 ${g.wave} · 남은 로봇 ${$('sB').textContent} · ${g.pts | 0}점${g.combo >= 3 && g.comboT > 0 ? ` · 🔥${g.combo}콤보 ×${Math.min(10, 1 + Math.floor(g.combo / 5))}` : ''}`); }
      document.body.classList.toggle('zmode', g.mode === 'zombie');
    }
    if (me && isCombat(g)) {
      const W0 = C.WEAPONS[me.wpn] || C.WEAPONS.pistol;
      if (g.phase === 'count') role = { gun: '곧 시작! 상자에서 무기를 주워요', hero: `${C.CLASSES[me.cls || 'dps'].icon} ${C.CLASSES[me.cls || 'dps'].name} · 점령 지점으로!`, zombie: '모여서 같이 버텨요!' }[g.mode];
      else if (me.dead) role = g.mode === 'zombie' ? (me.revT > 0 ? `부활 중… ${Math.ceil(2 - me.revT)}` : '쓰러짐 · 동료가 옆에 오면 부활') : `💀 ${Math.ceil(me.respawnT)}초 뒤 부활`;
      else role = `${g.mode === 'hero' ? C.CLASSES[me.cls || 'dps'].icon + ' ' : ''}💧 ${W0.name} · 체력 ${Math.ceil(me.hp)}/${me.maxHp}` + (g.mode === 'hero' && g.cp && hyp(me.x - g.cp.x, me.y - g.cp.y) < g.cp.r ? ' · 🚩 점령 중' : '');
    }
    if (me && !isCombat(g)) {
      const ch = me.team === g.chaserTeam, hold = Math.ceil(g.hold);
      if (g.phase === 'count') role = ch ? '이번엔 술래!' : '이번엔 도망!';
      else if (g.phase === 'play') {
        if (ch) role = g.hold > 0 ? `술래 대기… ${hold}초 뒤 출발` : me.rootT > 0 ? '털뭉치에 걸렸다! 꼼짝 마' : '술래! 둘 다 얼려라';
        else if (me.frozen) role = '얼음! 친구가 닿아 주면 땡';
        else if (g.hold > 0) role = `얼른 숨어! 술래 ${hold}초 뒤 출발`;
        else if (me.hidden) role = me.moving ? '부스럭… 움직이면 잘 들켜요' : '숨는 중 · 가만히 있으면 잘 안 들켜요';
        else if (g.cats.some(c => c.team === me.team && c !== me && c.frozen)) role = '친구가 얼었어! 가서 땡 해줘';
        else role = '도망! 숨을 곳을 찾아';
      } else role = '';
    }
    if (me) {
      const ch = me.team === g.chaserTeam;
      // 스킬 버튼
      const list = C.skillsOf(me, g);
      for (const k of [0, 1]) {
        const s = list[k], b = skB[k], cd = me.sk[k];
        if (b.dataset.id !== s.id) { b.dataset.id = s.id; b.querySelector('.ic').textContent = SK_ICON[s.id]; b.querySelector('.nm').textContent = s.name; b.classList.toggle('chase', ch); }
        b.style.setProperty('--cd', String(clamp(cd / (s.cd || C.skillCd(g, s.id)), 0, 1)));
        b.querySelector('.cdt').textContent = cd > 0 ? Math.ceil(cd) : '';
        const off = cd > 0 || g.phase !== 'play' || me.frozen || me.dead || (ch && g.hold > 0);
        b.classList.toggle('cool', off);
        if (skPrev[k] > 0 && cd <= 0 && g.phase === 'play') { b.classList.remove('ready'); void b.offsetWidth; b.classList.add('ready'); SFX.ready(); }
        skPrev[k] = cd;
      }
      const it = me.items[0] || '', sig = me.items.join(',');
      if (skI.dataset.it !== sig) {
        const more = me.items.length > (skI.dataset.it ? skI.dataset.it.split(',').length : 0);
        skI.dataset.it = sig; skI.querySelector('.ic').textContent = it ? IT_ICON[it] : '🎁'; skI.querySelector('.nm').textContent = it ? IT_NAME[it] : '아이템';
        skI.querySelector('.cdt').textContent = me.items.length > 1 ? '' : '';
        skI.querySelector('.cnt').textContent = me.items.length > 1 ? '×' + me.items.length : '';
        skI.querySelector('.next').textContent = me.items.slice(1).map(i => IT_ICON[i]).join('');
        skI.classList.toggle('has', !!it); if (more) { skI.classList.remove('ready'); void skI.offsetWidth; skI.classList.add('ready'); }
      }
      skI.classList.toggle('cool', !it || g.phase !== 'play' || me.frozen);
      skD.style.setProperty('--cd', String(clamp(me.dashCd / 2.5, 0, 1)));
      skD.classList.toggle('cool', me.dashCd > 0);
    }
    setText('role', role); $('role').hidden = !role;
  }

  /* ---------------- 메인 루프 ---------------- */
  useMap('house');
  renderRankBox(); $('ver').textContent = VERSION;
  let last = performance.now();
  let frameErrs = 0;
  function frame(now) {
    // 한 프레임에서 에러가 나도 다음 프레임은 계속 돈다 (시연 중 멈춤 방지)
    try { frameBody(now); } catch (e) { if (frameErrs++ < 5) console.warn('frame', e); }
    requestAnimationFrame(frame);
  }
  function frameBody(now) {
    let rdt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!document.hidden) {
      perf.ema += (rdt * 1000 - perf.ema) * 0.05;
      perf.slowT = perf.ema > 24 ? perf.slowT + rdt : 0;
      if (perf.slowT > 2 && (perf.cap > 1 || !perf.low)) {
        if (perf.cap > 1) { perf.cap = Math.max(1, perf.cap - 0.25); resize(); } else perf.low = true;
        perf.slowT = 0; perf.ema = 16;
      }
    }
    // 마지막 얼음은 슬로모션
    let dt = rdt;
    if (fx.slow > 0) { fx.slow -= rdt; dt = rdt * .3; }
    // 뒷배경 데모 (봇끼리)
    if (!app.inGame) {
      C.stepGame(app.demo, dt); app.demo.events.length = 0;
      if (app.demo.phase === 'over') { C.startMatch(app.demo); }
    }
    if (app.inGame && app.g) {
      if (app.mode === 'host' || app.mode === 'practice') {
        const g = app.g, me = g.cats[app.mySlot];
        const inp = readInput();
        g.localInput[app.mySlot] = inp;
        if (me) for (const k of [0, 1]) if (inp['s' + k]) { me.aimX = me.aimX || 1; if (!C.useSkill(g, me, k)) skillDenied(k); }
        if (me && inp.it && !C.useItem(g, me)) itemDenied();
        if (me && inp.say && sayOk(app.mySlot)) C.say(g, me, 'tease');
        C.stepGame(g, dt);
        const evs = g.events.splice(0);
        for (const e of evs) { handleEvent(e, g); if (app.mode === 'host') net.evq.push(e); }
        if (app.mode === 'host') {
          net.sendT -= dt;
          if (net.sendT <= 0) { net.sendT = 0.05; net.broadcast(hostSnapshot()); }
        }
      } else if (app.mode === 'client') clientStep(dt);
    }
    for (const p of app.popups) p.t += rdt;
    app.popups = app.popups.filter(p => p.t < 1);
    stepFx(dt);
    updateTension(rdt);
    if (au.ctx) { musicUpdate(rdt, app.inGame && app.g && (app.g.phase === 'play' || app.g.phase === 'count')); heartbeat(rdt); }
    quickTick(rdt);
    if (app.bannerT > 0) { app.bannerT -= rdt; if (app.bannerT <= 0) $('banner').hidden = true; }
    if (app.inGame || !document.hidden) { render(dt, rdt); hud(rdt); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { mapCache = null; canopyCache.clear(); });
  requestAnimationFrame(t => { last = t; frame(t); });
})();
