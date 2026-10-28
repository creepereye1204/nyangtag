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
  const VERSION = 'v2.0.0';
  const MAXP = 16; // 최대 8:8
  const MAP_ICON = { house: '🏠', cafe: '☕', snow: '❄️', beach: '🏖️', town: '🏘️' };
  const SK_ICON = { trap: '🧶', boost: '🌿', sniff: '👃', pounce: '🐾' };
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
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
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
  function buildMap() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rnd = rand(4242);
    g.fillStyle = '#5c8a4c'; g.fillRect(0, 0, W, H);
    for (const rm of C.ROOMS) drawFloor(g, rm, rnd);
    drawDecor(g, rnd);
    // 숨는 곳 바닥 그늘
    for (const h of C.HIDES) {
      if (h.k === 'bush' || h.k === 'snowbush' || h.k === 'car' || h.k === 'tent') continue;
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
    } else if (id === 'beach') {
      for (let i = 0; i < 30; i++) { const sx2 = rnd() * W, sy2 = 480 + rnd() * (H - 600); g.fillStyle = ['#ff9f80', '#ffd6a5', '#f8edeb'][i % 3]; if (i % 3 === 0) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 7, r2 = k % 2 ? 5 : 12; g.lineTo(sx2 + Math.cos(a) * r2, sy2 + Math.sin(a) * r2); } g.fill(); } else { g.beginPath(); g.arc(sx2, sy2, 7, Math.PI, 0); g.fill(); } }
      for (let i = 0; i < 5; i++) paws(rnd() * W, 600 + rnd() * 1500, 9, 70, 20 - rnd() * 40);
      g.strokeStyle = 'rgba(140,110,60,.35)'; g.lineWidth = 6; g.setLineDash([2, 22]); g.beginPath(); g.moveTo(0, 470); for (let xx = 0; xx <= W; xx += 40) g.lineTo(xx, 470 + Math.sin(xx / 90) * 12); g.stroke(); g.setLineDash([]);
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
    g.fillStyle = gr; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = 'rgba(255,255,255,.18)'; if (o.w > o.h) g.fillRect(o.x, o.y + 2, o.w, 3); else g.fillRect(o.x + 2, o.y, 3, o.h);
    g.fillStyle = '#c9b39a'; for (const [cx, cy] of [[o.x, o.y], [o.x + o.w, o.y + o.h]]) { g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill(); }
  }

  function drawSolid(g, o, rnd) {
    g.save();
    const { x, y, w, h } = o;
    const body = (fill, rad = 10) => { shadowOn(g); g.fillStyle = fill; rr(g, x, y, w, h, rad); g.fill(); shadowOff(g); g.strokeStyle = 'rgba(30,20,15,.6)'; g.lineWidth = 3; g.stroke(); };
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
    } else if (h.k === 'tube') {
      shadowOn(g, 14, 8, .35);
      const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
      g.fillStyle = cols[0]; rr(g, x, y, w, hh, hh / 2); g.fill(); shadowOff(g);
      for (let k = 0; k < 8; k++) { g.fillStyle = cols[k % 4]; g.fillRect(x + 20 + k * (w - 40) / 8, y + 2, (w - 40) / 8, hh - 4); }
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(255,255,255,.4)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; rr(g, x, y, w, hh, hh / 2); g.fill();
      g.fillStyle = '#1b1b2f'; for (const ex of [x + 4, x + w - 26]) { g.beginPath(); g.ellipse(ex + 11, y + hh / 2, 12, hh / 2 - 8, 0, 0, 7); g.fill(); }
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
  const rank = { rating: 0, wins: 0, losses: 0, draws: 0, streak: 0, best: 0, history: [], seen: {} };
  try { Object.assign(rank, JSON.parse(localStorage.getItem('nyangtag-rank') || '{}')); rank.rating = cleanRk(rank.rating); } catch (e) { }
  function saveRank() { try { localStorage.setItem('nyangtag-rank', JSON.stringify(rank)); } catch (e) { } }
  const match = { stats: { freezes: 0, rescues: 0, rounds: 0, wonRounds: 0 } };
  // 경기 끝: LP 계산 (연습 0.5배)
  function settleRank(result, practice, oppAvg) {
    const before = rank.rating, st = match.stats, perf = Math.min(6, st.freezes + st.rescues * 2 + st.wonRounds);
    let d = result > 0 ? 20 + perf * .5 + (rank.streak >= 2 ? 3 : 0) : result < 0 ? -16 + perf * .5 : 2;
    if (oppAvg != null) d += clamp((oppAvg - before) / 100, -5, 5);
    if (practice) d *= 0.5;
    d = Math.round(d); if (result > 0) d = Math.max(d, practice ? 5 : 10); if (result < 0) d = Math.min(d, -4);
    rank.rating = Math.max(0, before + d); rank.best = Math.max(rank.best, rank.rating);
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
    info.textContent = `${t.lp} LP · ${rank.wins}승 ${rank.losses}패` + (games ? ` · 승률 ${Math.round(rank.wins / games * 100)}%` : '');
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
    const h4 = document.createElement('h3'); h4.textContent = '순위표 (나 + 같이 했던 플레이어)'; box.append(h4);
    const rows = [{ name: myName() + ' (나)', rk: rank.rating, me: true }, ...Object.entries(rank.seen).map(([name, v]) => ({ name, rk: v.rk }))].sort((a, b) => b.rk - a.rk).slice(0, 30);
    const ol = document.createElement('ol'); ol.className = 'board';
    rows.forEach((r, i) => { const li = document.createElement('li'); if (r.me) li.className = 'me'; const n = document.createElement('b'); n.textContent = `${i + 1}. ${r.name}`; li.append(n, tierBadge(r.rk)); ol.append(li); });
    box.append(ol);
    const h5 = document.createElement('h3'); h5.textContent = '티어표'; box.append(h5);
    const tl = document.createElement('div'); tl.className = 'tiers';
    for (const r of [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200, 3600]) { const b = tierBadge(r); b.textContent = tierOf(r).icon + ' ' + (tierOf(r).tier || tierOf(r).name); tl.append(b); }
    box.append(tl);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = '이기면 +LP, 지면 −LP. 얼리기·구하기·라운드 승리로 보너스, 강한 상대일수록 더 받아요. 봇 연습은 절반만 반영돼요. 100 LP마다 승급, 마스터부터는 LP가 계속 쌓여요. 기록은 이 기기에 저장돼요.';
    box.append(note);
    show('scrRank');
  }
  $('rankBox').onclick = openRank;
  $('rankClose').onclick = () => show('scrTitle');
  function noteSeen(L) {
    let ch = false;
    for (const s of L.slots) if (s.p && s.p !== app.myId && s.name) { rank.seen[s.name] = { rk: cleanRk(s.rk), t: Date.now() }; ch = true; }
    const names = Object.keys(rank.seen); if (names.length > 60) names.sort((a, b) => rank.seen[a].t - rank.seen[b].t).slice(0, names.length - 60).forEach(n => delete rank.seen[n]);
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
  function resize() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
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
  $('sayBtn').addEventListener('pointerdown', e => { e.preventDefault(); sayQ = true; });
  function readInput() {
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    const l = hyp(x, y); if (l > 1) { x /= l; y /= l; }
    const dash = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Enter') || dashTouch;
    const s0 = skillQ[0], s1 = skillQ[1], it = itemQ, say = sayQ; skillQ[0] = skillQ[1] = itemQ = sayQ = false;
    return { x, y, dash, s0, s1, it, say };
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
  function show(id) { for (const s of ['scrTitle', 'scrLobby', 'scrOver', 'scrPick', 'scrRank']) $(s).hidden = s !== id; if (id === 'scrTitle') renderRankBox(); }
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
  function renderMaps() {
    const L = app.lobby, box = $('mapRow'), host = app.mode !== 'client';
    if (!box.children.length) {
      for (const id of C.MAP_IDS) {
        const M = C.MAPS[id], b = document.createElement('button'); b.type = 'button'; b.className = 'mapbtn'; b.dataset.map = id;
        b.innerHTML = `<span class="mi">${MAP_ICON[id] || '🗺️'}</span><b></b><small></small>`;
        b.querySelector('b').textContent = M.name; b.querySelector('small').textContent = M.desc;
        b.onclick = () => { if (app.mode === 'client' || !app.lobby) return; SFX.ui(); app.lobby.map = id; useMap(id); lobbyChanged(); };
        box.append(b);
      }
    }
    for (const b of box.children) { b.classList.toggle('on', b.dataset.map === L.map); b.disabled = !host; }
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
  const empty = () => ({ p: null, name: '', av: '', rk: 0 });
  const teamOf = (L, i) => (i >= L.ts ? 1 : 0);
  const teamIdx = (L, t) => Array.from({ length: L.ts }, (_, k) => t * L.ts + k);
  function newLobby(code, ts = 2) {
    return { code, map: C.MAP_ID || 'house', ts, slots: Array.from({ length: ts * 2 }, empty) };
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
    lobby.slots[i] = { p, name: cleanName(name), av: validAv(av) || '', rk: cleanRk(rk) };
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
        if (s.p) { const tr = tierOf(s.p === app.myId ? rank.rating : s.rk); const b = document.createElement('span'); b.className = 'tierchip'; b.style.background = tr.col; b.textContent = tr.short; b.title = tr.name; d.append(b); }
        box.append(d);
      }
    }
    const mine = L.slots.findIndex(s => s.p === app.myId);
    $('go0').disabled = mine < 0 || teamOf(L, mine) === 0 || freeSlot(L, 0) < 0;
    $('go1').disabled = mine < 0 || teamOf(L, mine) === 1 || freeSlot(L, 1) < 0;
    const host = app.mode !== 'client';
    $('startBtn').hidden = !host;
    renderMaps(); renderSizes();
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
    });
    app.mySlot = L.slots.findIndex(s => s.p === app.myId);
  }
  function enterGame() {
    app.inGame = true; app.popups = [];
    fx.parts = []; fx.rings = []; fx.marks = []; fx.screen = []; fx.tension = 0; fx.prevHide = Array(MAXP).fill(-1); fx.bubbles = Array(MAXP).fill(null);
    match.stats = { freezes: 0, rescues: 0, rounds: 0, wonRounds: 0 };
    show(null); $('hud').hidden = false; $('touch').hidden = !touchUI; $('skills').hidden = false;
    syncSprites(); ac();
    const me = app.g.cats[app.mySlot]; if (me) { app.cam.x = me.x; app.cam.y = me.y; }
  }
  function startHostGame() {
    useMap(app.lobby.map);
    app.g = C.createGame(app.lobby.ts); applyLobbyToGame(); C.startMatch(app.g);
    if (app.mode === 'host') net.broadcast({ t: 'start', lobby: app.lobby });
    enterGame();
  }
  $('startBtn').onclick = () => { SFX.go(); startHostGame(); };
  function leaveGameUI() {
    app.inGame = false; $('hud').hidden = true; $('touch').hidden = true; $('skills').hidden = true; $('banner').hidden = true;
    fx.tension = 0;
    syncSprites();
  }
  function backToLobby() {
    leaveGameUI(); show('scrLobby'); renderLobby();
  }
  function backToTitle(msg) {
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
      if (e.id === app.mySlot) { SFX.pick(); vib(25); pop(e.x, e.y - 50, IT_ICON[e.s] + ' ' + IT_NAME[e.s] + ' 획득!', '#b5179e', 1); }
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
    else if (e.k === 'roundEnd') {
      const why = e.reason === 'all' ? '두 마리 다 얼렸다!' : '끝까지 버텼다!';
      const good = e.winner === myTeam;
      match.stats.rounds++; if (good) match.stats.wonRounds++;
      banner(`${TEAM_NAME[e.winner]} 승리<small>${why}</small>`, 2.8);
      if (good || myTeam < 0) { SFX.win(); confetti(110); vib([50, 50, 50, 50, 120]); } else { SFX.lose(); vib(200); }
    } else if (e.k === 'over') showOver(e.scores || g.scores);
  }
  function showOver(sc) {
    const w = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1;
    const me = app.g && app.g.cats[app.mySlot];
    $('overTitle').textContent = w < 0 ? '무승부냥' : `${TEAM_NAME[w]} 최종 승리!`;
    $('overTitle').style.color = w < 0 ? '' : TEAM_COL[w];
    $('overScore').textContent = `${sc[0]} : ${sc[1]}`;
    $('overAgain').textContent = app.mode === 'client' ? '로비로' : app.mode === 'host' ? '모두 로비로' : '다시 하기';
    $('overHint').textContent = app.mode === 'client' ? '방장이 다시 시작하면 같이 들어가요.' : '';
    if (me && w === me.team) { setTimeout(() => confetti(160), 100); SFX.win(); }
    const box = $('overRank'); box.replaceChildren();
    if (me) {
      const L = app.lobby, opp = L ? L.slots.filter((s, i) => s.p && teamOf(L, i) !== me.team) : [];
      const oppAvg = opp.length ? opp.reduce((a, s) => a + cleanRk(s.rk), 0) / opp.length : null;
      const res = settleRank(w < 0 ? 0 : w === me.team ? 1 : -1, app.mode === 'practice' || !opp.length, oppAvg);
      const tb = tierOf(res.before), ta = tierOf(res.after);
      box.append(tierBadge(res.after, true));
      const dl = document.createElement('div'); dl.className = 'lpd ' + (res.d >= 0 ? 'up' : 'down'); dl.textContent = `${res.d >= 0 ? '+' : ''}${res.d} LP`; box.append(dl);
      const sub = document.createElement('div'); sub.className = 'hint';
      sub.textContent = `얼림 ${match.stats.freezes} · 구함 ${match.stats.rescues} · 라운드 승 ${match.stats.wonRounds}` + (app.mode === 'practice' || !opp.length ? ' · 봇 연습(0.5배)' : '');
      box.append(sub);
      if (ta.name !== tb.name) {
        const up = res.after > res.before, pr = document.createElement('div'); pr.className = 'promo ' + (up ? 'up' : 'down');
        pr.textContent = up ? `🎉 승급! ${ta.name}` : `강등… ${ta.name}`; box.append(pr);
        if (up) { setTimeout(() => confetti(220), 600); vib([60, 40, 60, 40, 200]); }
      }
    }
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
      SFX.meow();
      lobbyChanged();
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
        c.items.map(it => ITEM_IDS.indexOf(it)), r1(c.camoT), r1(c.windT), Math.round(Math.atan2(c.aimY, c.aimX) * 100) / 100, c.thaws | 0, r1(c.scareT)]),
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
      conn.on('open', () => { conn.send({ t: 'hello', name: myName(), av: app.me.av, rk: rank.rating }); });
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
        app.g = C.createGame(L.ts); applyLobbyToGame(); app.g.phase = 'count'; app.g.roundId = -1; enterGame();
      } else if (app.inGame) {
        if (msg.back) backToLobby(); else syncSprites();
      } else if (!$('scrOver').hidden && !msg.back) {
        // 결과 화면 보는 중이면 그대로
      } else if ($('scrPick').hidden) { show('scrLobby'); renderLobby(); }
      else renderLobby();
    } else if (msg.t === 's' && app.inGame && app.g) applySnap(msg);
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
      code: String(L.code || '').slice(0, 4), host: typeof L.host === 'string' ? L.host : '', map: C.MAPS[L.map] ? L.map : 'house', ts: L.slots.length / 2, quick: !!L.quick,
      slots: L.slots.map(s => ({ p: s && typeof s.p === 'string' ? s.p : null, name: cleanName(s && s.name), av: validAv(s && s.av) || '', rk: cleanRk(s && s.rk) })),
    };
  }
  function applySnap(m) {
    const g = app.g;
    const ph = ['count', 'play', 'roundEnd', 'over', 'lobby'].includes(m.ph) ? m.ph : g.phase;
    g.phase = ph; g.round = m.r | 0; g.scores = Array.isArray(m.sc) ? [m.sc[0] | 0, m.sc[1] | 0] : g.scores;
    g.chaserTeam = m.ct === 1 ? 1 : 0; g.timeLeft = +m.tl || 0; g.countT = +m.cd || 0; g.hold = +m.ho || 0;
    const newRound = m.rid !== g.roundId; g.roundId = m.rid;
    if (Array.isArray(m.tr)) g.traps = m.tr.slice(0, 16).filter(Array.isArray).map(a => ({ u: num(a[0]), x: num(a[1]), y: num(a[2]), team: a[3] === 1 ? 1 : 0, owner: num(a[4]) }));
    if (Array.isArray(m.rv)) g.reveal = [num(m.rv[0]), num(m.rv[1])];
    if (Array.isArray(m.bl)) g.blocks = m.bl.slice(0, 8).filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), w: clamp(num(a[2]), 10, 200), h: clamp(num(a[3]), 10, 200), t: num(a[4]), team: a[5] === 1 ? 1 : 0, k: 'block' }));
    if (Array.isArray(m.bx)) m.bx.forEach((v, i) => { if (g.boxes[i]) g.boxes[i].t = num(v); });
    if (Array.isArray(m.sn)) g.scents = m.sn.slice(0, 8).filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), team: a[2] === 1 ? 1 : 0, t: num(a[3]) }));
    if (!Array.isArray(m.c)) return;
    m.c.forEach((a, i) => {
      const c = g.cats[i]; if (!c || !Array.isArray(a)) return;
      const its = Array.isArray(a[13]) ? a[13] : [];
      const [x, y, vx, vy, f, fl, imm, stun, root, boost, pounce, k0, k1, , camo, wind, aimA, thaws, scare] = a.map(num);
      c.thaws = thaws;
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
        g.events.length = 0;
      } else { me.vx = me.vy = 0; me.moving = false; }
      net.sendT -= dt;
      if (net.sendT <= 0) {
        net.sendT = 0.05;
        net.send({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), f: me.facing, d: me.dashT > 0 ? 1 : 0, rid: g.roundId });
      }
    }
  }
  function itemDenied() { skI.classList.remove('deny'); void skI.offsetWidth; skI.classList.add('deny'); tone(200, 160, .08, 'square', .03); }
  function skillDenied(k) { const b = skB[k]; b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); tone(200, 160, .08, 'square', .03); }

  /* ---------------- 버튼 ---------------- */
  const nameIn = $('nameIn');
  nameIn.value = app.me.name;
  nameIn.addEventListener('input', () => { app.me.name = cleanName(nameIn.value) === '냥이' && !nameIn.value.trim() ? '' : cleanName(nameIn.value); saveMe(); });
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
    if (app.inGame && app.g && app.g.cats[app.mySlot]) { const m = app.g.cats[app.mySlot]; tx = m.x + m.vx * .18; ty = m.y + m.vy * .18; }
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
    wg.drawImage(mapCache, 0, 0);
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
    const order = [...g.cats].sort((a, b) => a.y - b.y);
    for (const c of order) {
      const v = vis(c);
      c._vis = v;
      if (!v) continue;
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
    for (const r of fx.rings) {
      const k = r.t / r.dur; if (k >= 1) continue;
      xg.globalAlpha = 1 - k; xg.strokeStyle = r.col; xg.lineWidth = r.w * (1 - k) + 1;
      xg.beginPath(); xg.arc(r.x, r.y, r.max * (1 - Math.pow(1 - k, 3)), 0, 7); xg.stroke();
    }
    xg.globalAlpha = 1;
    for (const c of g.cats) {
      if (!c._vis) continue;
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
      const text = (isCh ? '술래 · ' : '') + label;
      const spr = app.inGame ? sprites[c.id] : null;
      xg.font = '15px Jua, sans-serif'; const tw = xg.measureText(text).width + 16, bx = c.x - tw / 2, by = c.y - c.r * (spr && spr.anim ? 2.95 : 2.45);
      xg.globalAlpha = c.hidden && c.team === myTeam ? .7 : 1;
      xg.fillStyle = isCh ? '#ff3b6b' : TEAM_COL[c.team]; rr(xg, bx, by, tw, 22, 11); xg.fill();
      xg.fillStyle = '#fff'; xg.textAlign = 'center'; xg.textBaseline = 'middle'; xg.fillText(text, c.x, by + 12);
      if (c.hidden && c.team === myTeam) { const t2 = c.camoT > 0 ? `보호색 ${Math.ceil(c.camoT)}` : c.moving ? '부스럭…' : '숨는 중'; xg.font = '13px Gowun Dodum, sans-serif'; xg.fillStyle = c.moving ? '#ffd166' : '#fff'; xg.strokeStyle = 'rgba(0,0,0,.6)'; xg.lineWidth = 3; xg.strokeText(t2, c.x, by - 10); xg.fillText(t2, c.x, by - 10); }
      xg.globalAlpha = 1;
    }
    // 말풍선
    xg.font = '15px Gowun Dodum, sans-serif'; xg.textBaseline = 'middle';
    for (let i = 0; i < g.cats.length; i++) {
      const b = fx.bubbles[i]; if (!b) continue;
      b.t += rdt; if (b.t > b.dur) { fx.bubbles[i] = null; continue; }
      const c = g.cats[i]; if (!c._vis) continue;
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
      if (me && g.phase === 'play') {
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
    const cols = { wood: '#c9a273', tile: '#cdd8dc', carpet: '#b8a3c9', grass: '#7fb565', stone: '#b5ab9c', road: '#555a60', sand: '#e2cf9f', snow: '#e8f0f8', deck: '#a07a4c' };
    for (const r of C.ROOMS) { xg.fillStyle = cols[r.k] || '#888'; xg.fillRect(r.x * s, r.y * s, r.w * s, r.h * s); }
    xg.fillStyle = '#4c3b33'; for (const o of C.SOLIDS) { xg.fillStyle = o.k === 'wall' ? '#3e2f28' : o.k === 'tree' || o.k === 'pine' || o.k === 'palm' ? '#2f6e2b' : o.k === 'pond' || o.k === 'fountain' || o.k === 'sea' ? '#4fa3cf' : 'rgba(76,59,51,.8)'; xg.fillRect(o.x * s, o.y * s, Math.max(1, o.w * s), Math.max(1, o.h * s)); }
    xg.fillStyle = 'rgba(30,100,30,.75)'; for (const h of C.HIDES) xg.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
    for (const c of g.cats) {
      // 미니맵에는 우리 팀 눈에 실제로 보이는 상대만
      if (!(myTeam < 0 || c.team === myTeam || (c._vis && C.teamSees(g, myTeam, c)))) continue;
      xg.fillStyle = c.frozen ? '#7fd3ff' : (c.team === g.chaserTeam ? '#ff3b6b' : TEAM_COL[c.team]);
      xg.beginPath(); xg.arc(c.x * s, c.y * s, c === me ? 4.5 : 3.5, 0, 7); xg.fill();
      if (c === me) { xg.strokeStyle = '#fff'; xg.lineWidth = 1.5; xg.stroke(); }
    }
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
    if (me) {
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
      // 스킬 버튼
      const list = C.skillsOf(me, g);
      for (const k of [0, 1]) {
        const s = list[k], b = skB[k], cd = me.sk[k];
        if (b.dataset.id !== s.id) { b.dataset.id = s.id; b.querySelector('.ic').textContent = SK_ICON[s.id]; b.querySelector('.nm').textContent = s.name; b.classList.toggle('chase', ch); }
        b.style.setProperty('--cd', String(clamp(cd / C.skillCd(g, s.id), 0, 1)));
        b.querySelector('.cdt').textContent = cd > 0 ? Math.ceil(cd) : '';
        const off = cd > 0 || g.phase !== 'play' || me.frozen || (ch && g.hold > 0);
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
  function frame(now) {
    let rdt = Math.min(0.05, (now - last) / 1000); last = now;
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
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { mapCache = null; canopyCache.clear(); });
  requestAnimationFrame(t => { last = t; frame(t); });
})();
