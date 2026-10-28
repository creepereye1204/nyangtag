/* 냥태그 게임 코어 — DOM 없음. 방장(호스트)과 혼자 연습 모드가 이 시뮬레이션을 돌린다. */
(function (root) {
  'use strict';
  const W = 2400, H = 1600, R = 24, BASE = 250;
  const ROUND_TIME = 60, ROUNDS = 4, HOLD = 5, SEE = 95, WALL = 24;
  const TEAM_NAME = ['치즈팀', '고등어팀'];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  /* ---------------- 맵 ---------------- */
  const ROOMS = [
    { x: 0, y: 0, w: 1200, h: 792, k: 'wood', label: '거실' },
    { x: 1200, y: 0, w: 1200, h: 792, k: 'tile', label: '주방' },
    { x: 0, y: 792, w: 1200, h: 808, k: 'carpet', label: '침실' },
    { x: 1200, y: 792, w: 1200, h: 808, k: 'grass', label: '마당' },
  ];
  const wallsH = (y, segs) => segs.map(([a, b]) => ({ x: a, y: y - WALL / 2, w: b - a, h: WALL, k: 'wall' }));
  const wallsV = (x, segs) => segs.map(([a, b]) => ({ x: x - WALL / 2, y: a, w: WALL, h: b - a, k: 'wall' }));

  const SOLIDS = [
    ...wallsH(792, [[0, 380], [540, 1000], [1400, 1700], [1860, 2400]]),
    ...wallsV(1200, [[0, 300], [460, 780], [804, 1100], [1260, 1600]]),
    // 거실
    { x: 300, y: 170, w: 320, h: 90, k: 'sofa', label: '소파' },
    { x: 360, y: 0, w: 240, h: 50, k: 'tv', label: 'TV' },
    { x: 0, y: 420, w: 60, h: 260, k: 'shelf', label: '책장' },
    { x: 430, y: 380, w: 150, h: 80, k: 'table', label: '탁자' },
    { x: 900, y: 180, w: 90, h: 120, k: 'tower', label: '캣타워' },
    // 주방
    { x: 1650, y: 0, w: 460, h: 70, k: 'counter', label: '싱크대' },
    { x: 2300, y: 0, w: 100, h: 150, k: 'fridge', label: '냉장고' },
    { x: 1450, y: 560, w: 300, h: 70, k: 'counter', label: '아일랜드' },
    { x: 2200, y: 300, w: 80, h: 200, k: 'shelf', label: '선반' },
    // 침실
    { x: 0, y: 1300, w: 80, h: 300, k: 'wardrobe', label: '옷장' },
    { x: 800, y: 1510, w: 220, h: 90, k: 'desk', label: '책상' },
    { x: 950, y: 840, w: 200, h: 60, k: 'drawer', label: '서랍장' },
    { x: 300, y: 960, w: 280, h: 40, k: 'headboard', label: '' },
    // 마당
    { x: 1900, y: 1150, w: 260, h: 170, k: 'pond', label: '연못' },
    { x: 1600, y: 1010, w: 60, h: 60, k: 'pot', label: '' },
    { x: 1290, y: 1210, w: 60, h: 60, k: 'pot', label: '' },
    { x: 2050, y: 1500, w: 60, h: 60, k: 'pot', label: '' },
  ];

  // 들어가면 상대 눈에 안 보이는 곳 (가까이 오면 들킴)
  const HIDES = [
    { x: 0, y: 80, w: 64, h: 280, k: 'curtain', label: '커튼' },
    { x: 660, y: 560, w: 120, h: 100, k: 'box', label: '상자' },
    { x: 120, y: 620, w: 150, h: 120, k: 'blanket', label: '담요' },
    { x: 1500, y: 260, w: 260, h: 170, k: 'tablecloth', label: '식탁 밑' },
    { x: 2150, y: 600, w: 130, h: 110, k: 'box', label: '상자' },
    { x: 1212, y: 60, w: 60, h: 220, k: 'curtain', label: '커튼' },
    { x: 300, y: 1000, w: 280, h: 220, k: 'bed', label: '이불 속' },
    { x: 700, y: 1180, w: 150, h: 110, k: 'laundry', label: '빨래더미' },
    { x: 420, y: 1420, w: 140, h: 120, k: 'box', label: '상자' },
    { x: 1330, y: 880, w: 220, h: 160, k: 'bush', label: '풀숲' },
    { x: 2160, y: 880, w: 210, h: 190, k: 'bush', label: '풀숲' },
    { x: 1330, y: 1380, w: 230, h: 180, k: 'bush', label: '풀숲' },
    { x: 1700, y: 1400, w: 200, h: 150, k: 'bush', label: '풀숲' },
    { x: 2190, y: 1390, w: 180, h: 190, k: 'bush', label: '풀숲' },
  ];
  for (const h of HIDES) { h.cx = h.x + h.w / 2; h.cy = h.y + h.h / 2; }

  // slot = team*2 + i
  const SPAWN = [[200, 300], [200, 390], [2280, 1240], [2330, 1320]];

  function circleHitsRect(x, y, r, o) {
    const nx = clamp(x, o.x, o.x + o.w), ny = clamp(y, o.y, o.y + o.h);
    return (x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r;
  }
  function blockedPt(x, y, r) {
    if (x < r || y < r || x > W - r || y > H - r) return true;
    for (const o of SOLIDS) if (circleHitsRect(x, y, r, o)) return true;
    return false;
  }
  function hideAt(x, y) {
    for (let i = 0; i < HIDES.length; i++) {
      const h = HIDES[i];
      if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return i;
    }
    return -1;
  }
  function resolve(c) {
    c.x = clamp(c.x, c.r, W - c.r); c.y = clamp(c.y, c.r, H - c.r);
    for (let pass = 0; pass < 2; pass++) {
      for (const o of SOLIDS) {
        const nx = clamp(c.x, o.x, o.x + o.w), ny = clamp(c.y, o.y, o.y + o.h);
        const dx = c.x - nx, dy = c.y - ny, d = hyp(dx, dy);
        if (d < c.r) {
          if (d === 0) {
            const L = c.x - o.x, Rr = o.x + o.w - c.x, T = c.y - o.y, B = o.y + o.h - c.y, m = Math.min(L, Rr, T, B);
            if (m === L) c.x = o.x - c.r; else if (m === Rr) c.x = o.x + o.w + c.r; else if (m === T) c.y = o.y - c.r; else c.y = o.y + o.h + c.r;
          } else { c.x += dx / d * (c.r - d); c.y += dy / d * (c.r - d); }
        }
      }
      c.x = clamp(c.x, c.r, W - c.r); c.y = clamp(c.y, c.r, H - c.r);
    }
  }
  function lineClear(ax, ay, bx, by, r) {
    const d = hyp(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 16));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (blockedPt(ax + (bx - ax) * t, ay + (by - ay) * t, r)) return false;
    }
    return true;
  }

  /* ---------------- 길찾기 (A*) ---------------- */
  const CELL = 40, GW = W / CELL, GH = H / CELL, N = GW * GH;
  const walk = new Uint8Array(N);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++)
    walk[gy * GW + gx] = blockedPt(gx * CELL + CELL / 2, gy * CELL + CELL / 2, R * 0.85) ? 0 : 1;

  function nearestWalk(x, y) {
    const gx0 = clamp(Math.floor(x / CELL), 0, GW - 1), gy0 = clamp(Math.floor(y / CELL), 0, GH - 1);
    if (walk[gy0 * GW + gx0]) return gy0 * GW + gx0;
    for (let rad = 1; rad < 8; rad++) {
      let best = -1, bd = 1e9;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const gx = gx0 + dx, gy = gy0 + dy;
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || !walk[gy * GW + gx]) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = gy * GW + gx; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  const gScore = new Float32Array(N), came = new Int32Array(N), stamp = new Uint32Array(N), closedS = new Uint32Array(N);
  let curStamp = 0;
  function astar(sx, sy, tx, ty) {
    const s = nearestWalk(sx, sy), t = nearestWalk(tx, ty);
    if (s < 0 || t < 0) return null;
    if (s === t) return [{ x: tx, y: ty }];
    curStamp++;
    const heap = []; // [f, idx]
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const tgx = t % GW, tgy = (t / GW) | 0;
    const hfn = i => { const dx = Math.abs(i % GW - tgx), dy = Math.abs(((i / GW) | 0) - tgy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    stamp[s] = curStamp; gScore[s] = 0; came[s] = -1; push(hfn(s), s);
    let found = false, iter = 0;
    while (heap.length && iter++ < 4000) {
      const [, cur] = pop();
      if (closedS[cur] === curStamp) continue;
      closedS[cur] = curStamp;
      if (cur === t) { found = true; break; }
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const ni = ny * GW + nx;
        if (!walk[ni] || closedS[ni] === curStamp) continue;
        if (dx && dy && (!walk[cy * GW + nx] || !walk[ny * GW + cx])) continue;
        const ng = gScore[cur] + (dx && dy ? Math.SQRT2 : 1);
        if (stamp[ni] !== curStamp || ng < gScore[ni]) { stamp[ni] = curStamp; gScore[ni] = ng; came[ni] = cur; push(ng + hfn(ni), ni); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = t; i !== -1; i = came[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map(i => ({ x: (i % GW) * CELL + CELL / 2, y: ((i / GW) | 0) * CELL + CELL / 2 }));
    if (!blockedPt(tx, ty, R * 0.85)) pts[pts.length - 1] = { x: tx, y: ty };
    // 줄 당기기
    const out = []; let i = 0, px = sx, py = sy;
    while (i < pts.length) {
      let j = Math.min(pts.length - 1, i + 10);
      while (j > i && !lineClear(px, py, pts[j].x, pts[j].y, R * 0.8)) j--;
      out.push(pts[j]); px = pts[j].x; py = pts[j].y; i = j + 1;
    }
    return out;
  }

  /* ---------------- 게임 상태 ---------------- */
  function makeCat(slot) {
    return {
      id: slot, team: slot >> 1, kind: 'bot', x: SPAWN[slot][0], y: SPAWN[slot][1], vx: 0, vy: 0, r: R,
      facing: slot >> 1 ? -1 : 1, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, hidden: false, hideIdx: -1,
      moving: false, t: Math.random() * 10, bot: { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, lx: 0, ly: 0, wig: 0, dash: false },
    };
  }
  function createGame() {
    const g = {
      phase: 'lobby', round: 0, scores: [0, 0], chaserTeam: 0, timeLeft: ROUND_TIME, countT: 0, endT: 0, hold: 0,
      roundId: 0, clock: 0, lastWin: -1, lastReason: '', events: [],
      cats: [0, 1, 2, 3].map(makeCat),
      mem: [{}, {}], checked: HIDES.map(() => -99),
      localInput: {},
    };
    return g;
  }
  function placeCats(g) {
    for (const c of g.cats) {
      Object.assign(c, { x: SPAWN[c.id][0], y: SPAWN[c.id][1], vx: 0, vy: 0, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, facing: c.team ? -1 : 1 });
      c.hidden = false; c.hideIdx = -1;
      Object.assign(c.bot, { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, dash: false });
    }
    g.mem = [{}, {}]; g.checked = HIDES.map(() => -99);
  }
  function startMatch(g) { g.scores = [0, 0]; g.round = 0; beginRound(g); }
  function beginRound(g) {
    g.chaserTeam = g.round % 2; placeCats(g);
    g.timeLeft = ROUND_TIME; g.countT = 3.2; g.hold = HOLD; g.phase = 'count'; g.roundId++;
    g.events.push({ k: 'round', round: g.round, chaser: g.chaserTeam });
  }
  function endRound(g, winner, reason) {
    g.scores[winner]++; g.phase = 'roundEnd'; g.endT = 3; g.lastWin = winner; g.lastReason = reason;
    g.events.push({ k: 'roundEnd', winner, reason });
  }
  function nextRound(g) {
    g.round++;
    if (g.round >= ROUNDS) { g.phase = 'over'; g.events.push({ k: 'over', scores: g.scores.slice() }); }
    else beginRound(g);
  }
  const isHeld = (c, g) => g.phase !== 'play' || (c.team === g.chaserTeam && g.hold > 0);

  function visibleTo(g, team, c) {
    if (c.team === team || !c.hidden || c.frozen) return true;
    for (const m of g.cats) if (m.team === team && hyp(m.x - c.x, m.y - c.y) < SEE) return true;
    return false;
  }

  /* 한 마리 이동 — 손님(클라이언트)도 자기 고양이에 같은 함수를 쓴다 */
  function moveCat(c, g, ix, iy, dash, dt) {
    c.dashT = Math.max(0, c.dashT - dt); c.dashCd = Math.max(0, c.dashCd - dt);
    c.stun = Math.max(0, c.stun - dt); c.immune = Math.max(0, c.immune - dt);
    if (c.frozen || isHeld(c, g)) { ix = 0; iy = 0; dash = false; }
    const l = hyp(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    let dashed = false;
    if (dash && c.dashCd <= 0 && (ix || iy)) { c.dashT = 0.2; c.dashCd = 2.5; dashed = true; }
    const isCh = c.team === g.chaserTeam;
    const sp = BASE * (isCh ? 1.04 : 1) * (c.kind === 'bot' ? (isCh ? 0.87 : 0.94) : 1) * (c.dashT > 0 ? 2.3 : 1) * (c.stun > 0 ? 0.35 : 1);
    const k = 1 - Math.exp(-dt * 14);
    c.vx += (ix * sp - c.vx) * k; c.vy += (iy * sp - c.vy) * k;
    if (c.frozen) { c.vx = 0; c.vy = 0; }
    c.x += c.vx * dt; c.y += c.vy * dt; resolve(c);
    c.moving = hyp(c.vx, c.vy) > 30;
    if (Math.abs(c.vx) > 20) c.facing = c.vx > 0 ? 1 : -1;
    c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0;
    return dashed;
  }

  /* ---------------- 봇 ---------------- */
  function steer(c, scoreFn) {
    let best = [0, 0], bs = -1e9;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let s = 0;
      if (blockedPt(c.x + dx * 30, c.y + dy * 30, c.r)) s -= 900;
      else if (blockedPt(c.x + dx * 70, c.y + dy * 70, c.r)) s -= 250;
      s += scoreFn(c.x + dx * 70, c.y + dy * 70);
      s += (dx * c.bot.dx + dy * c.bot.dy) * 16;
      if (s > bs) { bs = s; best = [dx, dy]; }
    }
    return best;
  }
  function goTo(c, tx, ty, g, force) {
    const b = c.bot;
    if (lineClear(c.x, c.y, tx, ty, c.r * 0.8)) { b.path = null; const d = hyp(tx - c.x, ty - c.y) || 1; return [(tx - c.x) / d, (ty - c.y) / d]; }
    const goalMoved = !b.goal || hyp(b.goal.x - tx, b.goal.y - ty) > 60;
    if (force || !b.path || g.clock > b.pathT || goalMoved) {
      b.path = astar(c.x, c.y, tx, ty); b.pi = 0; b.pathT = g.clock + 0.6; b.goal = { x: tx, y: ty };
    }
    if (!b.path || !b.path.length) return [0, 0];
    let wp = b.path[b.pi];
    while (wp && hyp(wp.x - c.x, wp.y - c.y) < 22 && b.pi < b.path.length - 1) { b.pi++; wp = b.path[b.pi]; }
    const d = hyp(wp.x - c.x, wp.y - c.y) || 1;
    return [(wp.x - c.x) / d, (wp.y - c.y) / d];
  }
  function knownPos(g, team, o) {
    if (visibleTo(g, team, o)) return { x: o.x, y: o.y, fresh: true };
    const m = g.mem[team][o.id];
    if (m && g.clock - m.t < 6) return { x: m.x, y: m.y, fresh: false };
    return null;
  }
  function think(c, g) {
    const b = c.bot;
    b.dash = false;
    if (c.frozen || isHeld(c, g)) { b.dx = b.dy = 0; return; }
    // 끼임 감지
    if (hyp(c.x - b.lx, c.y - b.ly) < 4 && (b.dx || b.dy)) b.stuckT += 0.15; else b.stuckT = 0;
    b.lx = c.x; b.ly = c.y;
    if (b.stuckT > 0.6) { const a = Math.random() * Math.PI * 2; b.dx = Math.cos(a); b.dy = Math.sin(a); b.path = null; b.stuckT = 0; b.wig = g.clock + 0.35; return; }
    if (g.clock < b.wig) return;

    const chasing = c.team === g.chaserTeam;
    let dir = [0, 0];
    if (chasing) {
      const prey = g.cats.filter(o => o.team !== c.team && !o.frozen);
      const partner = g.cats.find(o => o.team === c.team && o !== c);
      let pick = null, ps = 1e9;
      for (const p of prey) {
        const kp = knownPos(g, c.team, p); if (!kp) continue;
        let s = hyp(kp.x - c.x, kp.y - c.y) + (kp.fresh ? 0 : 200);
        if (prey.length > 1 && hyp(partner.x - kp.x, partner.y - kp.y) < s - 60) s += 160;
        if (s < ps) { ps = s; pick = { p, kp }; }
      }
      if (pick) {
        const { p, kp } = pick, d = hyp(kp.x - c.x, kp.y - c.y);
        let tx = kp.x, ty = kp.y;
        if (kp.fresh) { const lead = Math.min(d / 450, 0.5); tx += p.vx * lead; ty += p.vy * lead; }
        if (!kp.fresh && d < 40) delete g.mem[c.team][p.id];
        dir = goTo(c, tx, ty, g);
        b.dash = kp.fresh && d < 140 && lineClear(c.x, c.y, p.x, p.y, c.r * 0.8);
      } else {
        // 순찰: 아무도 안 보이면 숨을 만한 곳을 뒤진다
        if (!b.goal || b.goal.patrol == null || hyp(b.goal.x - c.x, b.goal.y - c.y) < 50) {
          let bi = 0, bs = -1e9;
          HIDES.forEach((h, i) => {
            const s = -hyp(h.cx - c.x, h.cy - c.y) * 0.6 + (g.clock - g.checked[i]) * 25 + Math.random() * 120
              - (partner.bot.goal && partner.bot.goal.patrol === i ? 500 : 0);
            if (s > bs) { bs = s; bi = i; }
          });
          g.checked[bi] = g.clock;
          b.goal = { x: HIDES[bi].cx, y: HIDES[bi].cy, patrol: bi }; b.path = null;
        }
        const pg = b.goal;
        dir = goTo(c, pg.x, pg.y, g);
        b.goal = pg;
      }
    } else {
      const hunters = g.cats.filter(o => o.team !== c.team);
      const mate = g.cats.find(o => o.team === c.team && o !== c);
      const threats = hunters.map(h => knownPos(g, c.team, h)).filter(Boolean);
      const tdist = (x, y) => threats.reduce((m, t) => Math.min(m, hyp(x - t.x, y - t.y)), 1e9);
      const near = tdist(c.x, c.y);
      const seenByThem = hunters.some(h => hyp(h.x - c.x, h.y - c.y) < SEE + 40) || !c.hidden;
      if (near < 230 && seenByThem) {
        dir = steer(c, (x, y) => {
          const ds = threats.map(t => hyp(x - t.x, y - t.y)).sort((a, b) => a - b);
          const m = Math.min(x, y, W - x, H - y);
          return ds[0] + (ds[1] || 0) * 0.3 - (m < 90 ? (90 - m) * 2.5 : 0) + (hideAt(x, y) >= 0 ? 30 : 0);
        });
        b.path = null; b.goal = null;
        b.dash = near < 95;
      } else if (mate.frozen && tdist(mate.x, mate.y) > 220) {
        dir = goTo(c, mate.x, mate.y, g);
      } else if (c.hidden && near > 160) {
        dir = [0, 0];
      } else {
        if (!b.goal || b.goal.hide == null || tdist(b.goal.x, b.goal.y) < 200) {
          let bi = 0, bs = -1e9;
          HIDES.forEach((h, i) => {
            const mateThere = mate.hideIdx === i || (mate.bot.goal && mate.bot.goal.hide === i);
            const s = -hyp(h.cx - c.x, h.cy - c.y) * 0.5 + Math.min(tdist(h.cx, h.cy), 900) * 0.9 - (mateThere ? 400 : 0) + Math.random() * 60;
            if (s > bs) { bs = s; bi = i; }
          });
          b.goal = { x: HIDES[bi].cx, y: HIDES[bi].cy, hide: bi }; b.path = null;
        }
        const hg = b.goal;
        dir = goTo(c, hg.x, hg.y, g); b.goal = hg;
      }
    }
    b.dx = dir[0]; b.dy = dir[1];
  }

  /* ---------------- 한 틱 ---------------- */
  function stepGame(g, dt) {
    g.clock += dt;
    for (const c of g.cats) c.t += dt;
    if (g.phase === 'lobby' || g.phase === 'over') { for (const c of g.cats) c.moving = false; return; }
    if (g.phase === 'roundEnd') { g.endT -= dt; for (const c of g.cats) c.moving = false; if (g.endT <= 0) nextRound(g); return; }
    if (g.phase === 'count') {
      const before = Math.ceil(g.countT); g.countT -= dt;
      const after = Math.ceil(g.countT);
      if (after !== before && after > 0) g.events.push({ k: 'tick', n: after });
      if (g.countT <= 0) { g.phase = 'play'; g.events.push({ k: 'go' }); }
      for (const c of g.cats) c.moving = false;
      return;
    }
    // play
    g.timeLeft -= dt;
    const wasHold = g.hold > 0; g.hold = Math.max(0, g.hold - dt);
    if (wasHold && g.hold === 0) g.events.push({ k: 'release' });
    for (const team of [0, 1]) for (const o of g.cats) {
      if (o.team !== team && !o.frozen && visibleTo(g, team, o)) g.mem[team][o.id] = { x: o.x, y: o.y, t: g.clock };
    }
    for (const c of g.cats) {
      if (c.kind === 'remote') {
        c.immune = Math.max(0, c.immune - dt); c.stun = Math.max(0, c.stun - dt);
        c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0;
        if (c.frozen) { c.vx = 0; c.vy = 0; }
        continue;
      }
      let ix = 0, iy = 0, dash = false;
      if (c.kind === 'bot') {
        c.bot.cd -= dt;
        if (c.bot.cd <= 0) { think(c, g); c.bot.cd = 0.12 + Math.random() * 0.08; }
        ix = c.bot.dx; iy = c.bot.dy; dash = c.bot.dash;
      } else {
        const inp = g.localInput[c.id] || {}; ix = inp.x || 0; iy = inp.y || 0; dash = !!inp.dash;
      }
      if (moveCat(c, g, ix, iy, dash, dt)) g.events.push({ k: 'dash', id: c.id });
    }
    const chasers = g.cats.filter(c => c.team === g.chaserTeam), runners = g.cats.filter(c => c.team !== g.chaserTeam);
    if (g.hold <= 0) for (const ch of chasers) {
      if (ch.stun > 0) continue;
      for (const r of runners) {
        if (!r.frozen && r.immune <= 0 && hyp(ch.x - r.x, ch.y - r.y) < ch.r + r.r) {
          r.frozen = true; r.vx = r.vy = 0; ch.stun = 0.35;
          g.events.push({ k: 'freeze', id: r.id, by: ch.id, x: r.x, y: r.y });
        }
      }
    }
    for (const a of runners) for (const b of runners) {
      if (a !== b && !a.frozen && b.frozen && hyp(a.x - b.x, a.y - b.y) < a.r + b.r + 8) {
        b.frozen = false; b.immune = 1.5;
        g.events.push({ k: 'unfreeze', id: b.id, by: a.id, x: b.x, y: b.y });
      }
    }
    if (runners.every(r => r.frozen)) endRound(g, g.chaserTeam, 'all');
    else if (g.timeLeft <= 0) { g.timeLeft = 0; endRound(g, 1 - g.chaserTeam, 'time'); }
  }

  root.Core = {
    W, H, R, BASE, ROUND_TIME, ROUNDS, HOLD, SEE, TEAM_NAME, ROOMS, SOLIDS, HIDES, SPAWN, CELL, GW, GH, walk,
    blockedPt, hideAt, resolve, lineClear, astar, createGame, startMatch, beginRound, placeCats, stepGame, moveCat, visibleTo, isHeld,
  };
})(typeof window !== 'undefined' ? window : globalThis);
