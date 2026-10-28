/* 냥태그 — 화면, 입력, 로비, 온라인(PeerJS) */
(() => {
  'use strict';
  const C = window.Core;
  const { W, H, R } = C;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;
  const TEAM_COL = ['#ee8a1f', '#4a74a0'];
  const TEAM_NAME = C.TEAM_NAME;
  const PREFIX = 'nyangtag-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /* ---------------- 고양이 모양 ---------------- */
  const STYLES = [
    { coat: 'cheese', expr: 'pop', name: '팝냥' },
    { coat: 'calico', expr: 'vibe', name: '둠칫냥' },
    { coat: 'mackerel', expr: 'huh', name: '띠용냥' },
    { coat: 'tux', expr: 'cry', name: '눈물냥' },
  ];
  // GIPHY에 올라온 고양이 밈 GIF (id, 이름)
  const GIFS = [
    ['SlQaRzPiFv7EjNd54k', '뭐냥'], ['tphCApwvdtC1VJabZ1', '춤추냥'], ['mgn17Ckkx7bpBuY3do', '화났냥'],
    ['LkQcilDtb9LF0TYsQW', '졸리냥'], ['phvjNDwUeviWesroLA', '로딩냥'], ['pVXyJy2k7WO1n49bGg', '버퍼링냥'],
    ['qoxM1gi6i0V9e', '빙글냥'], ['3ZF400H2Jh5Sg', '뱅글냥'], ['9TQzzznuLpvCqplmeZ', '깔깔냥'],
    ['0SVAVxeJsnJ1WRMIPX', '놀리냥'], ['GslAPiptF4I4gBBFnp', '노래냥'], ['3Ev8JMnsNqUM', '야옹냥'],
    ['xcfz72KwMHZ7O', '댄스냥'], ['cbD4NSXZutjebF8cd8', '신났냥'], ['7NoNw4pMNTvgc', '타자냥'],
    ['pY8jLmZw0ElqvVeRH4', '생각냥'], ['YcFOfbeTcHtVS', '쫓냥'], ['0OfoQd6qgxBwmxjyd2', '공냥'],
  ];
  const gifUrl = id => `https://media.giphy.com/media/${id}/200.gif`;
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
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  let mapCache = null;
  function buildMap() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rnd = rand(42);
    for (const rm of C.ROOMS) {
      g.save(); g.beginPath(); g.rect(rm.x, rm.y, rm.w, rm.h); g.clip();
      if (rm.k === 'wood') {
        for (let y = rm.y, i = 0; y < rm.y + rm.h; y += 44, i++) {
          g.fillStyle = i % 2 ? '#d4ae7c' : '#ddba8b'; g.fillRect(rm.x, y, rm.w, 44);
          g.strokeStyle = 'rgba(120,80,40,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(rm.x, y); g.lineTo(rm.x + rm.w, y); g.stroke();
          for (let x = rm.x + (i * 173) % 260; x < rm.x + rm.w; x += 260) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 44); g.stroke(); }
        }
        g.fillStyle = '#8fc9b5'; rr(g, 330, 300, 340, 220, 50); g.fill();
        g.strokeStyle = '#f4f7ef'; g.lineWidth = 6; g.setLineDash([2, 14]); g.lineCap = 'round'; rr(g, 348, 318, 304, 184, 38); g.stroke(); g.setLineDash([]);
      } else if (rm.k === 'tile') {
        for (let y = rm.y; y < rm.y + rm.h; y += 60) for (let x = rm.x; x < rm.x + rm.w; x += 60) {
          g.fillStyle = ((x + y) / 60) % 2 ? '#e8eef0' : '#cfdde3'; g.fillRect(x, y, 60, 60);
        }
      } else if (rm.k === 'carpet') {
        g.fillStyle = '#c9b6d9'; g.fillRect(rm.x, rm.y, rm.w, rm.h);
        g.fillStyle = 'rgba(255,255,255,.22)';
        for (let y = rm.y + 20; y < rm.y + rm.h; y += 40) for (let x = rm.x + 20 + ((y / 40) % 2) * 20; x < rm.x + rm.w; x += 40) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
      } else {
        g.fillStyle = '#86c06c'; g.fillRect(rm.x, rm.y, rm.w, rm.h);
        for (let i = 0; i < 1400; i++) {
          const x = rm.x + rnd() * rm.w, y = rm.y + rnd() * rm.h;
          g.strokeStyle = rnd() > .5 ? 'rgba(60,120,50,.45)' : 'rgba(180,230,140,.5)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 4 - 2, y - 6 - rnd() * 4); g.stroke();
        }
        g.fillStyle = '#d8c79a'; // 징검다리
        for (const [x, y] of [[1290, 820], [1330, 1110], [1460, 1180], [1600, 1290], [1760, 1340], [1700, 1080], [1820, 960]]) { g.beginPath(); g.ellipse(x, y, 34, 22, .3, 0, 7); g.fill(); }
      }
      g.font = '64px Jua, sans-serif'; g.fillStyle = 'rgba(0,0,0,.08)'; g.textAlign = 'center';
      g.fillText(rm.label, rm.x + rm.w / 2, rm.y + rm.h / 2 + 20);
      g.restore();
    }
    // 숨는 곳 바닥
    for (const h of C.HIDES) {
      if (h.k === 'bush') continue;
      g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, h.x + 4, h.y + 6, h.w, h.h, 18); g.fill();
    }
    for (const o of C.SOLIDS) drawSolid(g, o);
    return cv;
  }
  function drawSolid(g, o) {
    g.save();
    if (o.k === 'wall') {
      g.fillStyle = '#4c3b33'; g.fillRect(o.x, o.y, o.w, o.h);
      g.fillStyle = '#6e584b'; g.fillRect(o.x, o.y, o.w, Math.min(6, o.h)); g.restore(); return;
    }
    if (o.k !== 'pond' && o.k !== 'pot') { g.fillStyle = 'rgba(40,25,10,.22)'; rr(g, o.x + 6, o.y + 9, o.w, o.h, 10); g.fill(); }
    const fill = { sofa: '#5b8bd0', tv: '#2d2d35', shelf: '#9a6b44', table: '#b98652', tower: '#b9a5d6', counter: '#e9e4dc', fridge: '#dfe7ec',
      wardrobe: '#a8774e', desk: '#c39566', drawer: '#c7a07a', headboard: '#8c6a9c', pond: '#5fb3d9', pot: '#c96f4a' }[o.k] || '#999';
    g.fillStyle = fill;
    if (o.k === 'pond') { g.beginPath(); g.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, 7); g.fill(); g.strokeStyle = '#3b7d9c'; g.lineWidth = 4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(o.x + o.w * .35, o.y + o.h * .35, 40, 12, -.3, 0, 7); g.fill();
      g.fillStyle = '#ff8a3d'; for (const [dx, dy] of [[.6, .55], [.45, .7]]) { g.beginPath(); g.ellipse(o.x + o.w * dx, o.y + o.h * dy, 12, 6, .4, 0, 7); g.fill(); }
      g.restore(); return; }
    if (o.k === 'pot') { g.beginPath(); g.arc(o.x + 30, o.y + 30, 28, 0, 7); g.fill(); g.fillStyle = '#4f9a45'; for (let i = 0; i < 6; i++) { const a = i / 6 * 7; g.beginPath(); g.ellipse(o.x + 30 + Math.cos(a) * 12, o.y + 30 + Math.sin(a) * 12, 14, 8, a, 0, 7); g.fill(); } g.restore(); return; }
    rr(g, o.x, o.y, o.w, o.h, 8); g.fill(); g.strokeStyle = 'rgba(30,20,15,.7)'; g.lineWidth = 3; g.stroke();
    if (o.k === 'sofa') { g.fillStyle = '#7aa5e3'; rr(g, o.x + 14, o.y + 26, o.w / 2 - 20, o.h - 34, 10); g.fill(); rr(g, o.x + o.w / 2 + 6, o.y + 26, o.w / 2 - 20, o.h - 34, 10); g.fill(); }
    if (o.k === 'shelf' || o.k === 'wardrobe') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; const vert = o.h > o.w; for (let i = 1; i < 4; i++) { g.beginPath(); if (vert) { g.moveTo(o.x + 4, o.y + o.h * i / 4); g.lineTo(o.x + o.w - 4, o.y + o.h * i / 4); } else { g.moveTo(o.x + o.w * i / 4, o.y + 4); g.lineTo(o.x + o.w * i / 4, o.y + o.h - 4); } g.stroke(); } }
    if (o.k === 'tower') { g.fillStyle = '#d8caec'; for (let i = 0; i < 3; i++) { rr(g, o.x + 8, o.y + 8 + i * 38, o.w - 16, 26, 10); g.fill(); } }
    if (o.k === 'counter') { g.fillStyle = '#b9c4c9'; rr(g, o.x + o.w * .4, o.y + 12, o.w * .2, o.h - 24, 8); g.fill(); }
    if (o.label) { g.fillStyle = 'rgba(0,0,0,.45)'; g.font = '18px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2); }
    g.restore();
  }
  // 숨는 곳 덮개 (고양이 위에 그린다)
  function drawCanopy(g, h, t, alpha) {
    g.save(); g.globalAlpha = alpha;
    const { x, y, w, h: hh } = h;
    if (h.k === 'bush') {
      const rnd = rand(Math.round(x * 7 + y));
      for (let i = 0; i < 14; i++) {
        const cx = x + 20 + rnd() * (w - 40), cy = y + 20 + rnd() * (hh - 40), r = 34 + rnd() * 22, sw = Math.sin(t * 1.5 + i) * 2;
        g.fillStyle = i % 3 ? '#3f8f3a' : '#2f7a2e'; g.beginPath(); g.arc(cx + sw, cy, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(160,220,120,.35)'; g.beginPath(); g.arc(cx + sw - r * .3, cy - r * .3, r * .4, 0, 7); g.fill();
      }
      g.fillStyle = '#ff7fae'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + 30 + rnd() * (w - 60), y + 30 + rnd() * (hh - 60), 5, 0, 7); g.fill(); }
    } else if (h.k === 'curtain') {
      g.fillStyle = '#e97b8f'; rr(g, x, y, w, hh, 8); g.fill();
      g.strokeStyle = 'rgba(120,30,50,.35)'; g.lineWidth = 4;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + w * i / 4, y); g.lineTo(x + w * i / 4 + Math.sin(t + i) * 2, y + hh); g.stroke(); }
      for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x, y + hh * i / 6); g.quadraticCurveTo(x + w / 2, y + hh * i / 6 + 6, x + w, y + hh * i / 6); g.stroke(); }
    } else if (h.k === 'box') {
      g.fillStyle = '#c58a4a'; rr(g, x, y, w, hh, 6); g.fill();
      g.fillStyle = '#d9a066'; g.fillRect(x + 6, y + 6, w - 12, hh * .45);
      g.fillStyle = '#e9d6a8'; g.fillRect(x + w / 2 - 10, y, 20, hh);
      g.strokeStyle = '#5a3a1c'; g.lineWidth = 3; rr(g, x, y, w, hh, 6); g.stroke();
      g.fillStyle = '#5a3a1c'; g.font = '20px Jua, sans-serif'; g.textAlign = 'center'; g.fillText('택배', x + w / 2, y + hh - 14);
    } else if (h.k === 'bed' || h.k === 'blanket') {
      g.fillStyle = '#fbe3a6'; rr(g, x, y, w, hh, 18); g.fill();
      g.fillStyle = '#f3c55f'; for (let yy = y + 14; yy < y + hh; yy += 34) for (let xx = x + 14 + ((yy - y) % 68 ? 17 : 0); xx < x + w - 6; xx += 34) { g.beginPath(); g.arc(xx, yy, 6, 0, 7); g.fill(); }
      g.strokeStyle = '#b6893a'; g.lineWidth = 3; rr(g, x, y, w, hh, 18); g.stroke();
      if (h.k === 'bed') { g.fillStyle = '#ffffff'; rr(g, x + 24, y + 10, 100, 44, 16); g.fill(); rr(g, x + w - 124, y + 10, 100, 44, 16); g.fill(); }
    } else if (h.k === 'tablecloth') {
      g.fillStyle = '#ffffff'; rr(g, x, y, w, hh, 10); g.fill();
      g.fillStyle = '#e8504f'; const s = 26;
      for (let yy = y; yy < y + hh; yy += s) for (let xx = x; xx < x + w; xx += s) if (((xx - x) / s + (yy - y) / s) % 2 < 1) g.fillRect(xx, yy, Math.min(s, x + w - xx), Math.min(s, y + hh - yy));
      g.strokeStyle = '#9b2c2b'; g.lineWidth = 3; rr(g, x, y, w, hh, 10); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w / 2, y + hh / 2, 26, 0, 7); g.fill(); g.strokeStyle = '#ccc'; g.stroke();
    } else if (h.k === 'laundry') {
      const cols = ['#6fb6ff', '#ff9bb5', '#ffd25e', '#9ee39e', '#c5a3ff'];
      const rnd = rand(Math.round(x + y));
      for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 5]; g.beginPath(); g.ellipse(x + 20 + rnd() * (w - 40), y + 20 + rnd() * (hh - 40), 30 + rnd() * 16, 18 + rnd() * 10, rnd() * 3, 0, 7); g.fill(); }
    }
    g.restore();
  }

  /* ---------------- 상태 ---------------- */
  const app = {
    mode: 'title', // title | practice | host | client
    inGame: false,
    g: null, demo: null,
    mySlot: -1, myId: 'me',
    lobby: null, // {code, slots:[{p,name,av}]}
    cam: { x: W / 2, y: H / 2 }, demoCam: { x: W / 2, y: H / 2, tx: 600, ty: 400, t: 0 },
    popups: [], bannerT: 0,
    me: { name: '', av: 'd0' },
  };
  try { const s = JSON.parse(localStorage.getItem('nyangtag-me') || '{}'); app.me.name = cleanName(s.name || ''); app.me.av = validAv(s.av) || 'd0'; if (!s.name) app.me.name = ''; } catch (e) { }
  function saveMe() { try { localStorage.setItem('nyangtag-me', JSON.stringify(app.me)); } catch (e) { } }
  const myName = () => app.me.name || '냥이';

  /* ---------------- 소리 ---------------- */
  let actx = null;
  function beep(f1, f2, dur, type = 'square', vol = .05) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), gn = actx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f1, actx.currentTime); o.frequency.exponentialRampToValueAtTime(f2, actx.currentTime + dur);
      gn.gain.setValueAtTime(vol, actx.currentTime); gn.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
      o.connect(gn).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { }
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
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (app.inGame && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
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
  const dashBtn = $('dashBtn');
  dashBtn.addEventListener('pointerdown', e => { e.preventDefault(); dashTouch = true; try { dashBtn.setPointerCapture(e.pointerId); } catch (er) { } });
  dashBtn.addEventListener('pointerup', () => { dashTouch = false; }); dashBtn.addEventListener('pointercancel', () => { dashTouch = false; });
  function readInput() {
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    const l = hyp(x, y); if (l > 1) { x /= l; y /= l; }
    const dash = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Enter') || dashTouch;
    return { x, y, dash };
  }

  /* ---------------- UI 헬퍼 ---------------- */
  function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms); }
  function show(id) { for (const s of ['scrTitle', 'scrLobby', 'scrOver', 'scrPick']) $(s).hidden = s !== id; }
  function banner(html, sec = 2) { const b = $('banner'); b.innerHTML = html; b.hidden = false; app.bannerT = sec; }
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
  function openPick(from) {
    pickReturn = from;
    const dg = $('drawGrid'), gg = $('gifGrid');
    if (!dg.children.length) {
      STYLES.forEach((s, i) => {
        const b = document.createElement('button'); b.className = 'cell'; b.type = 'button'; b.dataset.av = 'd' + i;
        b.append(avNode('d' + i, i, 84)); const sp = document.createElement('span'); sp.textContent = s.name; b.append(sp);
        b.onclick = () => choose('d' + i); dg.append(b);
      });
      GIFS.forEach(([id, nm]) => {
        const b = document.createElement('button'); b.className = 'cell'; b.type = 'button'; const av = 'g:' + gifUrl(id); b.dataset.av = av;
        const im = new Image(); im.alt = nm; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; im.src = gifUrl(id);
        im.onerror = () => { b.hidden = true; };
        b.append(im); const sp = document.createElement('span'); sp.textContent = nm; b.append(sp);
        b.onclick = () => choose(av); gg.append(b);
      });
    }
    for (const b of document.querySelectorAll('#scrPick .cell')) b.classList.toggle('on', b.dataset.av === app.me.av);
    $('urlIn').value = app.me.av.startsWith('g:') && !GIFS.some(([id]) => 'g:' + gifUrl(id) === app.me.av) ? app.me.av.slice(2) : '';
    show('scrPick');
  }
  function choose(av) {
    const v = validAv(av); if (!v) { toast('https:// 로 시작하는 GIF 주소를 넣어 주세요.'); return; }
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

  /* ---------------- 로비 ---------------- */
  const BOT_NAMES = ['봇 팝냥', '봇 둠칫냥', '봇 띠용냥', '봇 눈물냥'];
  function newLobby(code) {
    return { code, slots: [0, 1, 2, 3].map(() => ({ p: null, name: '', av: '' })) };
  }
  function freeSlot(lobby, team) {
    for (const i of team === 1 ? [2, 3] : [0, 1]) if (!lobby.slots[i].p) return i;
    return -1;
  }
  function addPlayer(lobby, p, name, av) {
    const humans = t => lobby.slots.filter((s, i) => (i >> 1) === t && s.p).length;
    const pref = humans(0) <= humans(1) ? 0 : 1;
    let i = freeSlot(lobby, pref); if (i < 0) i = freeSlot(lobby, 1 - pref);
    if (i < 0) return -1;
    lobby.slots[i] = { p, name: cleanName(name), av: validAv(av) || '' };
    return i;
  }
  function moveTeam(lobby, p, team) {
    const cur = lobby.slots.findIndex(s => s.p === p); if (cur < 0 || (cur >> 1) === team) return;
    const i = freeSlot(lobby, team); if (i < 0) return false;
    lobby.slots[i] = lobby.slots[cur]; lobby.slots[cur] = { p: null, name: '', av: '' };
    return true;
  }
  function renderLobby() {
    const L = app.lobby; if (!L) return;
    const isLocal = app.mode === 'practice';
    $('lobbyKind').textContent = isLocal ? '혼자 연습' : '방 코드';
    $('codeOut').textContent = isLocal ? '연습' : L.code;
    $('copyRow').hidden = isLocal;
    for (const t of [0, 1]) {
      const box = $('slots' + t); box.replaceChildren();
      for (const i of [t * 2, t * 2 + 1]) {
        const s = L.slots[i], d = document.createElement('div'); d.className = 'slot' + (s.p && s.p === app.myId ? ' mine' : '');
        const av = document.createElement('div'); av.className = 'av'; av.append(avNode(s.p ? s.av : '', i, 44));
        const who = document.createElement('div'); who.className = 'who';
        const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = s.p ? s.name : BOT_NAMES[i];
        const tg = document.createElement('div'); tg.className = 'tag';
        tg.textContent = !s.p ? '빈 자리 · 봇' : (s.p === app.myId ? '나' : '') + (s.p === L.host ? (s.p === app.myId ? ' · 방장' : '방장') : (s.p === app.myId ? '' : '친구'));
        who.append(nm, tg); d.append(av, who); box.append(d);
      }
    }
    const mine = L.slots.findIndex(s => s.p === app.myId);
    $('go0').disabled = mine >> 1 === 0 || freeSlot(L, 0) < 0;
    $('go1').disabled = mine >> 1 === 1 || freeSlot(L, 1) < 0;
    const host = app.mode !== 'client';
    $('startBtn').hidden = !host;
    const humans = L.slots.filter(s => s.p).length;
    $('lobbyHint').textContent = host
      ? (isLocal ? '나 빼고 세 자리는 봇이 맡아요. 팀을 골라 시작하세요.' : `지금 ${humans}명. 빈 자리는 봇이 채워요. 코드나 링크를 친구한테 보내세요.`)
      : '방장이 시작하면 바로 게임이 열려요.';
  }
  function lobbyChanged() {
    renderLobby();
    if (app.mode === 'host') net.broadcast({ t: 'lobby', lobby: app.lobby });
  }
  $('go0').onclick = () => pickTeam(0);
  $('go1').onclick = () => pickTeam(1);
  function pickTeam(t) {
    if (app.mode === 'client') { net.send({ t: 'team', team: t }); return; }
    if (moveTeam(app.lobby, app.myId, t) === false) toast('그 팀은 자리가 없어요.');
    lobbyChanged();
  }

  /* ---------------- 게임 시작/끝 ---------------- */
  const sprites = [null, null, null, null];
  const spriteAv = ['', '', '', ''];
  function syncSprites() {
    for (let i = 0; i < 4; i++) {
      const s = app.inGame && app.lobby ? app.lobby.slots[i] : null;
      const av = s && s.p ? validAv(s.av) || '' : '';
      if (spriteAv[i] === av) continue;
      spriteAv[i] = av;
      if (sprites[i]) { sprites[i].remove(); sprites[i] = null; }
      if (av.startsWith('g:')) {
        const im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = av.slice(2);
        im.onerror = () => { if (sprites[i] === im) { im.remove(); sprites[i] = null; } };
        spritesEl.append(im); sprites[i] = im;
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
    show(null); $('hud').hidden = false; $('touch').hidden = !touchUI;
    syncSprites();
    const me = app.g.cats[app.mySlot]; if (me) { app.cam.x = me.x; app.cam.y = me.y; }
  }
  function startHostGame() {
    app.g = C.createGame(); applyLobbyToGame(); C.startMatch(app.g);
    if (app.mode === 'host') net.broadcast({ t: 'start', lobby: app.lobby });
    enterGame();
  }
  $('startBtn').onclick = () => { beep(400, 800, .12); startHostGame(); };
  function leaveGameUI() {
    app.inGame = false; $('hud').hidden = true; $('touch').hidden = true; $('banner').hidden = true;
    syncSprites();
  }
  function backToLobby() {
    leaveGameUI(); show('scrLobby'); renderLobby();
  }
  function backToTitle(msg) {
    net.close();
    app.mode = 'title'; app.lobby = null; app.g = null;
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
  function handleEvent(e, g) {
    const mine = app.mySlot >= 0 ? g.cats[app.mySlot] : null, myTeam = mine ? mine.team : -1;
    if (e.k === 'freeze') {
      pop(e.x, e.y - 50, '얼음!', '#3aaef0');
      if (e.id === app.mySlot) { beep(1500, 500, .3, 'square', .06); navigator.vibrate && navigator.vibrate(120); }
      else beep(1300, 700, .16, 'square', .04);
    } else if (e.k === 'unfreeze') {
      pop(e.x, e.y - 50, '땡!', TEAM_COL[g.cats[e.id].team]); beep(600, 1300, .14, 'triangle', .06);
    } else if (e.k === 'dash') {
      if (e.id === app.mySlot) beep(220, 90, .1, 'sawtooth', .025);
    } else if (e.k === 'round') {
      const ch = e.chaser, role = myTeam < 0 ? '' : myTeam === ch ? '<small>너는 술래! 5초 뒤 출발</small>' : '<small>너는 도망! 얼른 숨어</small>';
      banner(`${e.round + 1}라운드 · <span style="color:${TEAM_COL[ch] === '#4a74a0' ? '#a9cdf0' : '#ffc27d'}">${TEAM_NAME[ch]}</span> 술래${role}`, 3);
    } else if (e.k === 'tick') beep(520, 520, .07);
    else if (e.k === 'go') beep(780, 1200, .15);
    else if (e.k === 'release') { banner('술래 출발!', 1.2); beep(300, 900, .25, 'sawtooth', .04); }
    else if (e.k === 'roundEnd') {
      const why = e.reason === 'all' ? '두 마리 다 얼렸다!' : '60초를 버텼다!';
      banner(`${TEAM_NAME[e.winner]} 승리<small>${why}</small>`, 2.8);
      const good = e.winner === myTeam; beep(good ? 500 : 400, good ? 1100 : 200, .4, 'triangle', .07);
    } else if (e.k === 'over') showOver(e.scores || g.scores);
  }
  function showOver(sc) {
    const w = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1;
    $('overTitle').textContent = w < 0 ? '무승부냥' : `${TEAM_NAME[w]} 최종 승리!`;
    $('overTitle').style.color = w < 0 ? '' : TEAM_COL[w];
    $('overScore').textContent = `${sc[0]} : ${sc[1]}`;
    $('overAgain').textContent = app.mode === 'client' ? '로비로' : app.mode === 'host' ? '모두 로비로' : '다시 하기';
    $('overHint').textContent = app.mode === 'client' ? '방장이 다시 시작하면 같이 들어가요.' : '';
    leaveGameUI(); show('scrOver');
  }
  function pop(x, y, text, color) { app.popups.push({ x, y, text, color, t: 0 }); }

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

  function hostCreate(tries = 0) {
    if (!peerOk()) return;
    net.close();
    const code = newCode();
    toast('방 만드는 중…', 8000);
    const peer = new Peer(PREFIX + code, { debug: 0 });
    net.peer = peer;
    peer.on('open', id => {
      app.mode = 'host'; app.myId = id; app.lobby = newLobby(code); app.lobby.host = id;
      addPlayer(app.lobby, id, myName(), app.me.av);
      history.replaceState(null, '', location.pathname + '?room=' + code);
      toast('방을 만들었어요. 코드를 친구한테 보내세요!');
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
      const i = addPlayer(L, p, msg.name, msg.av);
      if (i < 0) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      toast(`${L.slots[i].name} 들어왔어요`);
      beep(700, 1000, .1, 'triangle', .04);
      lobbyChanged();
    } else if (msg.t === 'team' && slot >= 0 && !app.inGame) {
      moveTeam(L, p, msg.team === 1 ? 1 : 0); lobbyChanged();
    } else if (msg.t === 'av' && slot >= 0) {
      const v = validAv(msg.av); if (v) { L.slots[slot].av = v; lobbyChanged(); if (app.inGame) syncSprites(); }
    } else if (msg.t === 'pos' && slot >= 0 && app.inGame && app.g) {
      const g = app.g, c = g.cats[slot];
      if (c.kind !== 'remote' || msg.rid !== g.roundId || c.frozen) return;
      const n = v => (typeof v === 'number' && isFinite(v) ? v : 0);
      c.x = clamp(n(msg.x), R, W - R); c.y = clamp(n(msg.y), R, H - R);
      c.vx = clamp(n(msg.vx), -800, 800); c.vy = clamp(n(msg.vy), -800, 800);
      c.facing = msg.f === -1 ? -1 : 1; c.dashT = msg.d ? 0.1 : 0; c.moving = hyp(c.vx, c.vy) > 30;
    }
  }
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
        (c.frozen ? 1 : 0) | (c.dashT > 0 ? 8 : 0) | (c.moving ? 16 : 0), r1(c.immune), r1(c.stun)]),
      ev: net.evq.splice(0),
    };
  }

  function clientJoin(code) {
    if (!peerOk()) return;
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { toast('코드 4자리를 넣어 주세요.'); return; }
    net.close();
    toast('방 찾는 중…', 9000);
    const peer = new Peer({ debug: 0 });
    net.peer = peer;
    peer.on('open', id => {
      app.myId = id;
      const conn = peer.connect(PREFIX + code, { reliable: true });
      net.host = conn;
      net.joinTimer = setTimeout(() => { if (app.mode !== 'client') backToTitle('방을 못 찾았어요. 코드를 확인해 주세요.'); }, 10000);
      conn.on('open', () => { conn.send({ t: 'hello', name: myName(), av: app.me.av }); });
      conn.on('data', msg => clientOnMsg(msg, code));
      conn.on('close', () => { if (app.mode === 'client') backToTitle('방이 닫혔어요.'); });
      conn.on('error', () => { if (app.mode === 'client') backToTitle('방장과 연결이 끊겼어요.'); });
    });
    peer.on('error', err => {
      if (err.type === 'peer-unavailable') backToTitle('그 코드의 방이 없어요. 코드를 확인해 주세요.');
      else if (app.mode !== 'client') backToTitle('연결 실패 (' + err.type + ')');
    });
  }
  function clientOnMsg(msg, code) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'full') { backToTitle('방이 꽉 찼어요 (최대 4명).'); return; }
    if (msg.t === 'busy') { backToTitle('지금 게임 중인 방이에요. 끝나면 다시 들어와 주세요.'); return; }
    if (msg.t === 'lobby' || msg.t === 'start') {
      const L = sanitizeLobby(msg.lobby); if (!L) return;
      const first = app.mode !== 'client';
      app.mode = 'client'; app.lobby = L; clearTimeout(net.joinTimer);
      if (first) { history.replaceState(null, '', location.pathname + '?room=' + code); toast('들어왔어요!'); }
      if (msg.t === 'start') {
        app.g = C.createGame(); applyLobbyToGame(); app.g.phase = 'count'; app.g.roundId = -1; enterGame();
      } else if (app.inGame) {
        if (msg.back) backToLobby(); else syncSprites();
      } else if (!$('scrOver').hidden && !msg.back) {
        // 결과 화면 보는 중이면 그대로
      } else if ($('scrPick').hidden) { show('scrLobby'); renderLobby(); }
      else renderLobby();
    } else if (msg.t === 's' && app.inGame && app.g) applySnap(msg);
  }
  function sanitizeLobby(L) {
    if (!L || !Array.isArray(L.slots) || L.slots.length !== 4) return null;
    return {
      code: String(L.code || '').slice(0, 4), host: typeof L.host === 'string' ? L.host : '',
      slots: L.slots.map(s => ({ p: s && typeof s.p === 'string' ? s.p : null, name: cleanName(s && s.name), av: validAv(s && s.av) || '' })),
    };
  }
  function applySnap(m) {
    const g = app.g;
    const ph = ['count', 'play', 'roundEnd', 'over', 'lobby'].includes(m.ph) ? m.ph : g.phase;
    g.phase = ph; g.round = m.r | 0; g.scores = Array.isArray(m.sc) ? [m.sc[0] | 0, m.sc[1] | 0] : g.scores;
    g.chaserTeam = m.ct === 1 ? 1 : 0; g.timeLeft = +m.tl || 0; g.countT = +m.cd || 0; g.hold = +m.ho || 0;
    const newRound = m.rid !== g.roundId; g.roundId = m.rid;
    if (!Array.isArray(m.c)) return;
    m.c.forEach((a, i) => {
      const c = g.cats[i]; if (!c || !Array.isArray(a)) return;
      const [x, y, vx, vy, f, fl, imm, stun] = a.map(Number);
      const frozen = !!(fl & 1);
      if (i === app.mySlot) {
        if (newRound || frozen || hyp(c.x - x, c.y - y) > 260) { c.x = x; c.y = y; c.vx = c.vy = 0; }
        c.frozen = frozen; c.immune = imm || 0; c.stun = stun || 0;
      } else {
        c.nx = x; c.ny = y; c.vx = vx; c.vy = vy; c.facing = f === -1 ? -1 : 1; c.frozen = frozen; c.immune = imm || 0;
        c.dashT = fl & 8 ? .1 : 0; c.moving = !!(fl & 16); c.snapT = 0;
        if (newRound || c.nx == null || hyp(c.x - x, c.y - y) > 300) { c.x = x; c.y = y; }
      }
    });
    if (Array.isArray(m.ev)) for (const e of m.ev.slice(0, 30)) if (e && typeof e.k === 'string') handleEvent(e, g);
  }
  function clientStep(dt) {
    const g = app.g;
    g.clock += dt;
    for (const c of g.cats) {
      c.t += dt;
      if (c.id === app.mySlot) continue;
      if (c.nx == null) continue;
      c.snapT = (c.snapT || 0) + dt;
      const ext = Math.min(c.snapT, .15);
      const tx = c.nx + c.vx * ext, ty = c.ny + c.vy * ext;
      const k = Math.min(1, dt * 14);
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
      c.hideIdx = C.hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0;
    }
    const me = g.cats[app.mySlot];
    if (me) {
      const inp = readInput();
      if (g.phase === 'play' || g.phase === 'count') {
        if (C.moveCat(me, g, inp.x, inp.y, inp.dash, dt)) beep(220, 90, .1, 'sawtooth', .025);
      } else { me.vx = me.vy = 0; me.moving = false; }
      net.sendT -= dt;
      if (net.sendT <= 0) {
        net.sendT = 0.05;
        net.send({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), f: me.facing, d: me.dashT > 0 ? 1 : 0, rid: g.roundId });
      }
    }
  }

  /* ---------------- 버튼 ---------------- */
  const nameIn = $('nameIn');
  nameIn.value = app.me.name;
  nameIn.addEventListener('input', () => { app.me.name = cleanName(nameIn.value) === '냥이' && !nameIn.value.trim() ? '' : cleanName(nameIn.value); saveMe(); });
  setAvBox($('myAv'), app.me.av, 0);
  $('hostBtn').onclick = () => { beep(500, 700, .08); hostCreate(); };
  $('joinBtn').onclick = () => { beep(500, 700, .08); clientJoin($('codeIn').value); };
  $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') clientJoin($('codeIn').value); });
  $('soloBtn').onclick = () => {
    beep(500, 700, .08); net.close();
    app.mode = 'practice'; app.myId = 'me'; app.lobby = newLobby('');
    app.lobby.host = 'me'; app.lobby.slots[2] = { p: 'me', name: myName(), av: app.me.av };
    show('scrLobby'); renderLobby();
  };
  $('copyCode').onclick = () => copyText(app.lobby.code, '코드를 복사했어요: ' + app.lobby.code);
  $('copyLink').onclick = () => copyText(location.origin + location.pathname + '?room=' + app.lobby.code, '초대 링크를 복사했어요');
  const qRoom = new URLSearchParams(location.search).get('room');
  if (qRoom) { $('codeIn').value = qRoom.toUpperCase().slice(0, 4); toast('초대받은 방이에요. 이름 넣고 참가를 누르세요!', 4000); }

  /* ---------------- 그리기 ---------------- */
  function camFollow(dt) {
    let tx, ty;
    if (app.inGame && app.g && app.g.cats[app.mySlot]) { const m = app.g.cats[app.mySlot]; tx = m.x; ty = m.y; }
    else {
      const d = app.demoCam; d.t -= dt;
      if (d.t <= 0) { const c = app.demo.cats[Math.floor(Math.random() * 4)]; d.follow = c; d.t = 7; }
      tx = d.follow ? d.follow.x : W / 2; ty = d.follow ? d.follow.y : H / 2;
    }
    const k = 1 - Math.exp(-dt * (app.inGame ? 10 : 2));
    app.cam.x += (tx - app.cam.x) * k; app.cam.y += (ty - app.cam.y) * k;
    const hw = vw / zoom / 2, hh = vh / zoom / 2;
    app.cam.x = hw * 2 >= W ? W / 2 : clamp(app.cam.x, hw, W - hw);
    app.cam.y = hh * 2 >= H ? H / 2 : clamp(app.cam.y, hh, H - hh);
  }
  const toScreen = (x, y) => [(x - app.cam.x) * zoom + vw / 2, (y - app.cam.y) * zoom + vh / 2];

  function render(dt) {
    const g = app.inGame ? app.g : app.demo;
    if (!mapCache) mapCache = buildMap();
    camFollow(dt);
    const me = app.inGame ? g.cats[app.mySlot] : null;
    const myTeam = me ? me.team : -1;
    const sx = vw / 2 - app.cam.x * zoom, sy = vh / 2 - app.cam.y * zoom;
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.fillStyle = '#20302b'; wg.fillRect(0, 0, worldC.width, worldC.height);
    wg.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * sx, dpr * sy);
    wg.drawImage(mapCache, 0, 0);
    const vis = c => myTeam < 0 || C.visibleTo(g, myTeam, c);
    const order = [...g.cats].sort((a, b) => a.y - b.y);
    for (const c of order) {
      const v = vis(c);
      c._vis = v;
      if (!v) continue;
      const isCh = c.team === g.chaserTeam && g.phase !== 'lobby';
      wg.save(); wg.translate(c.x, c.y + c.r * .95);
      wg.fillStyle = 'rgba(20,30,30,.22)'; wg.beginPath(); wg.ellipse(0, 0, c.r * 1.05, c.r * .36, 0, 0, 7); wg.fill();
      wg.strokeStyle = isCh ? '#ff3b6b' : TEAM_COL[c.team]; wg.lineWidth = 3.5;
      if (isCh) { wg.setLineDash([8, 7]); wg.lineDashOffset = -c.t * 30; }
      wg.beginPath(); wg.ellipse(0, 0, c.r * 1.3, c.r * .48, 0, 0, 7); wg.stroke(); wg.setLineDash([]);
      if (c === me) { wg.strokeStyle = '#fff'; wg.lineWidth = 2; wg.beginPath(); wg.ellipse(0, 0, c.r * 1.55, c.r * .6, 0, 0, 7); wg.stroke(); }
      wg.restore();
      if (c.dashT > 0) { wg.globalAlpha = .3; wg.fillStyle = TEAM_COL[c.team]; wg.beginPath(); wg.arc(c.x - c.vx * .05, c.y - c.vy * .05, c.r, 0, 7); wg.fill(); wg.globalAlpha = 1; }
      if (!sprites[c.id] || !app.inGame) {
        wg.globalAlpha = c.immune > 0 && Math.floor(c.t * 14) % 2 ? .45 : 1;
        drawCat(wg, c.x, c.y, c.r, app.inGame ? styleOf(c.id) : c.id, c.t, c.moving, c.facing, c.frozen);
        wg.globalAlpha = 1;
      }
    }
    // GIF 스프라이트
    for (let i = 0; i < 4; i++) {
      const im = sprites[i]; if (!im) continue;
      const c = g.cats[i];
      if (!app.inGame || !c._vis) { im.style.display = 'none'; continue; }
      im.style.display = '';
      const size = c.r * 3.1 * zoom, bob = c.moving && !c.frozen ? -Math.abs(Math.sin(c.t * 14)) * 4 * zoom : 0;
      const [px, py] = toScreen(c.x, c.y);
      im.style.width = size + 'px'; im.style.height = size + 'px';
      im.style.transform = `translate(${px - size / 2}px,${py - size * .62 + bob}px) scaleX(${c.facing})`;
      im.style.opacity = c.immune > 0 && Math.floor(c.t * 14) % 2 ? .45 : 1;
      im.style.filter = c.frozen ? 'saturate(.3) hue-rotate(170deg) brightness(1.15)' : 'none';
    }
    // 효과 레이어
    xg.setTransform(1, 0, 0, 1, 0, 0); xg.clearRect(0, 0, fxC.width, fxC.height);
    xg.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * sx, dpr * sy);
    const viewL = app.cam.x - vw / zoom / 2 - 100, viewR = app.cam.x + vw / zoom / 2 + 100, viewT = app.cam.y - vh / zoom / 2 - 100, viewB = app.cam.y + vh / zoom / 2 + 100;
    C.HIDES.forEach((h, i) => {
      if (h.x > viewR || h.x + h.w < viewL || h.y > viewB || h.y + h.h < viewT) return;
      const inside = me && me.hideIdx === i;
      drawCanopy(xg, h, g.clock, inside ? .42 : .94);
    });
    for (const c of g.cats) {
      if (!c._vis) continue;
      if (c.frozen) {
        xg.save(); xg.globalAlpha = .5; xg.fillStyle = '#bfeaff'; rr(xg, c.x - c.r * 1.4, c.y - c.r * 1.6, c.r * 2.8, c.r * 2.9, 10); xg.fill();
        xg.globalAlpha = .9; xg.strokeStyle = '#fff'; xg.lineWidth = 3; xg.stroke(); xg.restore();
      }
      const isCh = c.team === g.chaserTeam && g.phase !== 'lobby';
      let label;
      if (app.inGame && app.lobby) { const s = app.lobby.slots[c.id]; label = s.p ? s.name : '봇'; } else label = BOT_NAMES[c.id].replace('봇 ', '');
      if (c === me) label = '나';
      const text = (isCh ? '술래 · ' : '') + label;
      xg.font = '15px Jua, sans-serif'; const tw = xg.measureText(text).width + 16, bx = c.x - tw / 2, by = c.y - c.r * 2.45;
      xg.globalAlpha = c.hidden && c.team === myTeam ? .7 : 1;
      xg.fillStyle = isCh ? '#ff3b6b' : TEAM_COL[c.team]; rr(xg, bx, by, tw, 22, 11); xg.fill();
      xg.fillStyle = '#fff'; xg.textAlign = 'center'; xg.textBaseline = 'middle'; xg.fillText(text, c.x, by + 12);
      if (c.hidden && c.team === myTeam) { xg.font = '13px Gowun Dodum, sans-serif'; xg.fillStyle = '#fff'; xg.strokeStyle = 'rgba(0,0,0,.6)'; xg.lineWidth = 3; xg.strokeText('숨는 중', c.x, by - 10); xg.fillText('숨는 중', c.x, by - 10); }
      xg.globalAlpha = 1;
    }
    for (const p of app.popups) {
      const a = 1 - p.t, s = 1 + Math.min(p.t * 6, 1) * .4;
      xg.save(); xg.globalAlpha = Math.max(0, a); xg.translate(p.x, p.y - p.t * 34); xg.scale(s, s);
      xg.font = '34px Jua, sans-serif'; xg.textAlign = 'center'; xg.textBaseline = 'middle';
      xg.lineWidth = 7; xg.strokeStyle = '#fff'; xg.strokeText(p.text, 0, 0); xg.fillStyle = p.color; xg.fillText(p.text, 0, 0); xg.restore();
    }
    // 화면 좌표
    xg.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (app.inGame) {
      // 얼은 친구 방향 화살표
      for (const c of g.cats) {
        if (!me || c === me || c.team !== myTeam || !c.frozen) continue;
        const [px, py] = toScreen(c.x, c.y);
        if (px > 30 && px < vw - 30 && py > 90 && py < vh - 30) continue;
        const ang = Math.atan2(py - vh / 2, px - vw / 2);
        const ax = clamp(px, 34, vw - 34), ay = clamp(py, 110, vh - 40);
        xg.save(); xg.translate(ax, ay); xg.rotate(ang);
        xg.fillStyle = '#3aaef0'; xg.strokeStyle = '#fff'; xg.lineWidth = 3;
        xg.beginPath(); xg.moveTo(18, 0); xg.lineTo(-10, -13); xg.lineTo(-10, 13); xg.closePath(); xg.fill(); xg.stroke(); xg.restore();
        xg.font = '13px Jua, sans-serif'; xg.textAlign = 'center'; xg.fillStyle = '#fff'; xg.strokeStyle = 'rgba(0,0,0,.6)'; xg.lineWidth = 3;
        xg.strokeText('땡 해줘!', ax, ay + 26); xg.fillText('땡 해줘!', ax, ay + 26);
      }
      if (g.phase === 'count') {
        const n = Math.ceil(g.countT);
        xg.font = '96px Jua, sans-serif'; xg.textAlign = 'center'; xg.textBaseline = 'middle';
        xg.lineWidth = 12; xg.strokeStyle = '#fff'; xg.strokeText(n > 0 ? n : '', vw / 2, vh / 2 + 40); xg.fillStyle = '#1e2a26'; xg.fillText(n > 0 ? n : '', vw / 2, vh / 2 + 40);
      }
      drawMinimap(g, me, myTeam);
    }
  }
  function drawMinimap(g, me, myTeam) {
    const mw = touchUI ? (Math.min(vw, vh) < 500 ? 110 : 140) : (vw < 560 ? 120 : 180), s = mw / W, mh = H * s;
    const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--satpx')) || 0;
    const x0 = vw - mw - 12, y0 = touchUI ? (vw < 560 ? 104 : 92) + sat : vh - mh - 14;
    xg.save(); xg.translate(x0, y0);
    xg.globalAlpha = .88; xg.fillStyle = '#1e2a26'; rr(xg, -4, -4, mw + 8, mh + 8, 8); xg.fill(); xg.globalAlpha = 1;
    const cols = { wood: '#c9a273', tile: '#cdd8dc', carpet: '#b8a3c9', grass: '#7fb565' };
    for (const r of C.ROOMS) { xg.fillStyle = cols[r.k]; xg.fillRect(r.x * s, r.y * s, r.w * s, r.h * s); }
    xg.fillStyle = '#4c3b33'; for (const o of C.SOLIDS) xg.fillRect(o.x * s, o.y * s, Math.max(1, o.w * s), Math.max(1, o.h * s));
    xg.fillStyle = 'rgba(40,110,40,.6)'; for (const h of C.HIDES) xg.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
    for (const c of g.cats) {
      if (!c._vis) continue;
      xg.fillStyle = c.frozen ? '#7fd3ff' : (c.team === g.chaserTeam ? '#ff3b6b' : TEAM_COL[c.team]);
      xg.beginPath(); xg.arc(c.x * s, c.y * s, c === me ? 4.5 : 3.5, 0, 7); xg.fill();
      if (c === me) { xg.strokeStyle = '#fff'; xg.lineWidth = 1.5; xg.stroke(); }
    }
    xg.strokeStyle = 'rgba(255,255,255,.7)'; xg.lineWidth = 1;
    xg.strokeRect((app.cam.x - vw / zoom / 2) * s, (app.cam.y - vh / zoom / 2) * s, vw / zoom * s, vh / zoom * s);
    xg.restore();
  }

  /* ---------------- HUD ---------------- */
  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function hud() {
    if (!app.inGame) return;
    const g = app.g, me = g.cats[app.mySlot];
    setText('sA', String(g.scores[0])); setText('sB', String(g.scores[1]));
    const tl = g.phase === 'play' ? Math.ceil(g.timeLeft) : g.phase === 'count' ? C.ROUND_TIME : Math.ceil(g.timeLeft);
    setText('timer', String(Math.max(0, tl)));
    $('timer').classList.toggle('low', g.phase === 'play' && g.timeLeft < 10);
    setText('roundTxt', `${Math.min(g.round + 1, C.ROUNDS)} / ${C.ROUNDS} 라운드`);
    $('cA').classList.toggle('on', g.chaserTeam === 0); $('cB').classList.toggle('on', g.chaserTeam === 1);
    let role = '';
    if (me) {
      const ch = me.team === g.chaserTeam, hold = Math.ceil(g.hold);
      if (g.phase === 'count') role = ch ? '이번엔 술래!' : '이번엔 도망!';
      else if (g.phase === 'play') {
        if (ch) role = g.hold > 0 ? `술래 대기… ${hold}초 뒤 출발` : '술래! 둘 다 얼려라';
        else if (me.frozen) role = '얼음! 친구가 닿아 주면 땡';
        else if (g.hold > 0) role = `얼른 숨어! 술래 ${hold}초 뒤 출발`;
        else if (me.hidden) role = '숨는 중 · 가까이 오면 들켜요';
        else if (g.cats.some(c => c.team === me.team && c !== me && c.frozen)) role = '친구가 얼었어! 가서 땡 해줘';
        else role = '도망! 숨을 곳을 찾아';
      } else role = '';
    }
    setText('role', role); $('role').hidden = !role;
    if (me) dashBtn.classList.toggle('cool', me.dashCd > 0);
  }

  /* ---------------- 메인 루프 ---------------- */
  app.demo = C.createGame(); C.startMatch(app.demo); app.demo.countT = 0;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // 뒷배경 데모 (봇끼리)
    if (!app.inGame) {
      C.stepGame(app.demo, dt); app.demo.events.length = 0;
      if (app.demo.phase === 'over') { C.startMatch(app.demo); }
    }
    if (app.inGame && app.g) {
      if (app.mode === 'host' || app.mode === 'practice') {
        const g = app.g;
        g.localInput[app.mySlot] = readInput();
        C.stepGame(g, dt);
        const evs = g.events.splice(0);
        for (const e of evs) { handleEvent(e, g); if (app.mode === 'host') net.evq.push(e); }
        if (app.mode === 'host') {
          net.sendT -= dt;
          if (net.sendT <= 0) { net.sendT = 0.05; net.broadcast(hostSnapshot()); }
        }
      } else if (app.mode === 'client') clientStep(dt);
    }
    for (const p of app.popups) p.t += dt;
    app.popups = app.popups.filter(p => p.t < 1);
    if (app.bannerT > 0) { app.bannerT -= dt; if (app.bannerT <= 0) $('banner').hidden = true; }
    if (app.inGame || !document.hidden) { render(dt); hud(); }
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { mapCache = null; });
  requestAnimationFrame(t => { last = t; frame(t); });
})();
