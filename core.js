/* 냥태그 게임 코어 — DOM 없음. 방장(호스트)과 혼자 연습 모드가 이 시뮬레이션을 돌린다. */
(function (root) {
  'use strict';
  const R = 24, BASE = 250, ROUNDS = 4, SEE = 75, VIEW = 620, SNIFF = 800, WALL = 24;
  const TEAM_NAME = ['치즈팀', '고등어팀'];
  const CH_SPEED = 1.08, BOOST = 1.45, POUNCE = 2.5, DASH = 2.3;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  // 스킬 — [술래가 아닐 때, 술래일 때]
  const SKILLS = {
    run: [{ id: 'trap', name: '털뭉치', cd: 9 }, { id: 'boost', name: '캣닢 가속', cd: 12 }],
    chase: [{ id: 'sniff', name: '냄새 추적', cd: 15 }, { id: 'pounce', name: '덮치기', cd: 7 }],
  };

  // 아이템 상자에서 나오는 것 (양 팀 공통)
  const ITEMS = [{ id: 'camo', name: '보호색' }, { id: 'block', name: '블럭 쌓기' }, { id: 'fish', name: '생선' }];

  /* ---------------- 맵 ---------------- */
  const wallsH = (y, segs, k = 'wall') => segs.map(([a, b]) => ({ x: a, y: y - WALL / 2, w: b - a, h: WALL, k }));
  const wallsV = (x, segs, k = 'wall') => segs.map(([a, b]) => ({ x: x - WALL / 2, y: a, w: WALL, h: b - a, k }));

  // 우리 집 (2400x1600) — 두 맵이 같이 쓴다
  function house() {
    return {
      rooms: [
        { x: 0, y: 0, w: 1200, h: 792, k: 'wood', label: '거실' },
        { x: 1200, y: 0, w: 1200, h: 792, k: 'tile', label: '주방' },
        { x: 0, y: 792, w: 1200, h: 808, k: 'carpet', label: '침실' },
        { x: 1200, y: 792, w: 1200, h: 808, k: 'grass', label: '마당' },
      ],
      solids: [
        ...wallsH(792, [[0, 380], [540, 1000], [1400, 1700], [1860, 2400]]),
        ...wallsV(1200, [[0, 300], [460, 780], [804, 1100], [1260, 1600]]),
        { x: 300, y: 170, w: 320, h: 90, k: 'sofa', label: '소파' },
        { x: 360, y: 0, w: 240, h: 50, k: 'tv', label: 'TV' },
        { x: 0, y: 420, w: 60, h: 260, k: 'shelf', label: '책장' },
        { x: 430, y: 380, w: 150, h: 80, k: 'table', label: '탁자' },
        { x: 900, y: 180, w: 90, h: 120, k: 'tower', label: '캣타워' },
        { x: 1650, y: 0, w: 460, h: 70, k: 'counter', label: '싱크대' },
        { x: 2300, y: 0, w: 100, h: 150, k: 'fridge', label: '냉장고' },
        { x: 1450, y: 560, w: 300, h: 70, k: 'counter', label: '아일랜드' },
        { x: 2200, y: 300, w: 80, h: 200, k: 'shelf', label: '선반' },
        { x: 0, y: 1300, w: 80, h: 300, k: 'wardrobe', label: '옷장' },
        { x: 800, y: 1510, w: 220, h: 90, k: 'desk', label: '책상' },
        { x: 950, y: 840, w: 200, h: 60, k: 'drawer', label: '서랍장' },
        { x: 300, y: 960, w: 280, h: 40, k: 'headboard', label: '' },
        { x: 1900, y: 1150, w: 260, h: 170, k: 'pond', label: '연못' },
        { x: 1600, y: 1010, w: 60, h: 60, k: 'pot', label: '' },
        { x: 1290, y: 1210, w: 60, h: 60, k: 'pot', label: '' },
        { x: 2050, y: 1500, w: 60, h: 60, k: 'pot', label: '' },
      ],
      hides: [
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
      ],
    };
  }

  const MAPS = {
    house: {
      name: '우리 집', desc: '아담한 집 한 채 · 60초', w: 2400, h: 1600, time: 60, hold: 5,
      spawn: [[200, 300], [200, 390], [2280, 1240], [2330, 1320]],
      boxes: [[760, 420], [1000, 620], [1900, 480], [1500, 150], [700, 900], [180, 1150], [1450, 1250], [2000, 900]],
      build: house,
    },
    town: {
      name: '고양이 마을', desc: '집 + 시장 + 공원 + 놀이터 오픈월드 · 90초', w: 4800, h: 3200, time: 90, hold: 6,
      spawn: [[200, 300], [200, 390], [4650, 3110], [4720, 3040]],
      boxes: [[760, 420], [1900, 480], [700, 900], [1450, 1250], [2700, 520], [3900, 520], [3400, 900], [4500, 1000], [3000, 1340],
        [600, 1900], [1200, 2200], [1900, 1950], [400, 2750], [1700, 2900], [3300, 2050], [3700, 2600], [4400, 2300], [2700, 2600]],
      build() {
        const h = house();
        const tree = (x, y) => ({ x, y, w: 90, h: 90, k: 'tree', label: '' });
        return {
          rooms: [
            { x: 2400, y: 0, w: 2400, h: 1500, k: 'stone', label: '시장' },
            { x: 2400, y: 1500, w: 2400, h: 220, k: 'road', label: '' },
            { x: 0, y: 1600, w: 2400, h: 1600, k: 'grass', label: '공원' },
            { x: 2400, y: 1720, w: 2400, h: 1480, k: 'sand', label: '놀이터' },
            ...h.rooms,
          ],
          solids: [
            ...h.solids,
            // 집 바깥벽과 울타리 (문/틈 있음)
            ...wallsV(2400, [[0, 300], [460, 792]]),
            ...wallsH(1600, [[0, 500], [660, 1200]]),
            ...wallsV(2400, [[792, 1100], [1300, 1500]], 'fence'),
            ...wallsH(1600, [[1200, 1700], [1900, 2400]], 'fence'),
            // 시장
            { x: 2650, y: 200, w: 260, h: 80, k: 'stall', label: '생선 가게' },
            { x: 3150, y: 200, w: 260, h: 80, k: 'stall', label: '과일 가게' },
            { x: 3650, y: 200, w: 260, h: 80, k: 'stall', label: '빵집' },
            { x: 4150, y: 200, w: 260, h: 80, k: 'stall', label: '꽃집' },
            { x: 2650, y: 760, w: 260, h: 80, k: 'stall', label: '츄르 가게' },
            { x: 3150, y: 760, w: 260, h: 80, k: 'stall', label: '장난감' },
            { x: 3650, y: 760, w: 260, h: 80, k: 'stall', label: '방석 가게' },
            { x: 4150, y: 760, w: 260, h: 80, k: 'stall', label: '캔 가게' },
            { x: 3300, y: 1080, w: 200, h: 200, k: 'fountain', label: '' },
            tree(2520, 1060), tree(4560, 1120), tree(4600, 420),
            // 공원
            tree(300, 1900), tree(800, 2080), tree(1500, 1850), tree(2000, 2300), tree(620, 2720), tree(1300, 2960), tree(1900, 2900), tree(250, 2520),
            { x: 900, y: 2350, w: 380, h: 240, k: 'pond', label: '호수' },
            { x: 1500, y: 2500, w: 160, h: 50, k: 'bench', label: '벤치' },
            { x: 400, y: 2190, w: 160, h: 50, k: 'bench', label: '벤치' },
            // 놀이터
            { x: 2900, y: 2000, w: 120, h: 260, k: 'slide', label: '미끄럼틀' },
            { x: 4000, y: 1950, w: 240, h: 240, k: 'gym', label: '정글짐' },
            { x: 3300, y: 2820, w: 260, h: 50, k: 'seesaw', label: '시소' },
          ],
          hides: [
            ...h.hides,
            { x: 2650, y: 290, w: 260, h: 130, k: 'tent', label: '천막 밑' },
            { x: 3650, y: 290, w: 260, h: 130, k: 'tent', label: '천막 밑' },
            { x: 3150, y: 620, w: 260, h: 130, k: 'tent', label: '천막 밑' },
            { x: 4150, y: 620, w: 260, h: 130, k: 'tent', label: '천막 밑' },
            { x: 2480, y: 1290, w: 130, h: 110, k: 'box', label: '상자' },
            { x: 4600, y: 600, w: 140, h: 120, k: 'box', label: '상자' },
            { x: 3900, y: 1270, w: 130, h: 110, k: 'box', label: '상자' },
            { x: 3000, y: 1540, w: 220, h: 130, k: 'car', label: '차 밑' },
            { x: 4000, y: 1550, w: 220, h: 130, k: 'car', label: '차 밑' },
            { x: 150, y: 2950, w: 240, h: 180, k: 'bush', label: '풀숲' },
            { x: 1100, y: 1720, w: 240, h: 170, k: 'bush', label: '풀숲' },
            { x: 1700, y: 2050, w: 230, h: 180, k: 'bush', label: '풀숲' },
            { x: 480, y: 2360, w: 200, h: 170, k: 'bush', label: '풀숲' },
            { x: 2050, y: 2600, w: 220, h: 190, k: 'bush', label: '풀숲' },
            { x: 1380, y: 2640, w: 200, h: 160, k: 'bush', label: '풀숲' },
            { x: 3500, y: 2300, w: 260, h: 110, k: 'tube', label: '터널' },
            { x: 4500, y: 2100, w: 130, h: 110, k: 'box', label: '상자' },
            { x: 2550, y: 2900, w: 220, h: 180, k: 'bush', label: '풀숲' },
            { x: 4250, y: 2800, w: 240, h: 190, k: 'bush', label: '풀숲' },
            { x: 3800, y: 2620, w: 180, h: 140, k: 'blanket', label: '돗자리' },
          ],
        };
      },
    },
  };
  const OPAQUE_K = new Set(['wall', 'tree', 'shelf', 'wardrobe', 'fridge', 'tower', 'stall', 'gym']);

  // 지금 맵 상태 (setMap으로 바뀜)
  let MAP_ID = '', W = 0, H = 0, ROUND_TIME = 60, HOLD = 5, ROOMS = [], SOLIDS = [], HIDES = [], SPAWN = [], OPAQUE = [], BOXES = [];
  const CELL = 40;
  let GW = 0, GH = 0, N = 0, walk = null, gScore, came, stamp, closedS, curStamp = 0;

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
  function resolve(c, extra) {
    c.x = clamp(c.x, c.r, W - c.r); c.y = clamp(c.y, c.r, H - c.r);
    const lists = extra && extra.length ? [SOLIDS, extra] : [SOLIDS];
    for (let pass = 0; pass < 2; pass++) for (const list of lists) {
      for (const o of list) {
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
  // 눈으로 볼 수 있나 (벽·나무·큰 가구가 가림)
  function sightClear(ax, ay, bx, by) {
    const d = hyp(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 20));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      for (const o of OPAQUE) if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return false;
    }
    return true;
  }

  function setMap(id) {
    if (!MAPS[id]) id = 'house';
    if (id === MAP_ID) return;
    const M = MAPS[id], b = M.build();
    MAP_ID = id; W = M.w; H = M.h; ROUND_TIME = M.time; HOLD = M.hold;
    ROOMS = b.rooms; SOLIDS = b.solids; HIDES = b.hides; SPAWN = M.spawn; BOXES = M.boxes;
    OPAQUE = SOLIDS.filter(o => OPAQUE_K.has(o.k));
    for (const h of HIDES) { h.cx = h.x + h.w / 2; h.cy = h.y + h.h / 2; }
    GW = W / CELL; GH = H / CELL; N = GW * GH;
    walk = new Uint8Array(N);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++)
      walk[gy * GW + gx] = blockedPt(gx * CELL + CELL / 2, gy * CELL + CELL / 2, R * 0.85) ? 0 : 1;
    gScore = new Float32Array(N); came = new Int32Array(N); stamp = new Uint32Array(N); closedS = new Uint32Array(N); curStamp = 0;
    Object.assign(api, { MAP_ID, W, H, ROUND_TIME, HOLD, ROOMS, SOLIDS, HIDES, SPAWN, BOXES, GW, GH, walk });
  }

  /* ---------------- 길찾기 (A*) ---------------- */
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
    while (heap.length && iter++ < 9000) {
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
      facing: slot >> 1 ? -1 : 1, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, rootT: 0, boostT: 0, pounceT: 0,
      sk: [0, 0], item: '', camoT: 0, aimX: slot >> 1 ? -1 : 1, aimY: 0, hidden: false, hideIdx: -1,
      moving: false, t: Math.random() * 10,
      bot: { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, lx: 0, ly: 0, wig: 0, dash: false, lostT: 0, sayT: 4 + Math.random() * 8 },
    };
  }
  function createGame() {
    return {
      map: MAP_ID, roundTime: ROUND_TIME,
      phase: 'lobby', round: 0, scores: [0, 0], chaserTeam: 0, timeLeft: ROUND_TIME, countT: 0, endT: 0, hold: 0,
      roundId: 0, clock: 0, lastWin: -1, lastReason: '', events: [],
      cats: [0, 1, 2, 3].map(makeCat),
      mem: [{}, {}], checked: HIDES.map(() => -99), traps: [], trapSeq: 0, reveal: [0, 0], scents: [], blocks: [], boxes: [],
      seen: [false, false, false, false], spotCd: [0, 0, 0, 0], closeCd: [0, 0, 0, 0],
      localInput: {},
    };
  }
  function placeCats(g) {
    for (const c of g.cats) {
      Object.assign(c, {
        x: SPAWN[c.id][0], y: SPAWN[c.id][1], vx: 0, vy: 0, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, rootT: 0,
        boostT: 0, pounceT: 0, sk: [0, 0], item: '', camoT: 0, facing: c.team ? -1 : 1, aimX: c.team ? -1 : 1, aimY: 0,
      });
      c.hidden = false; c.hideIdx = -1;
      Object.assign(c.bot, { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, dash: false, lostT: 0 });
    }
    g.mem = [{}, {}]; g.checked = HIDES.map(() => -99); g.traps = []; g.reveal = [0, 0]; g.scents = []; g.blocks = [];
    g.boxes = BOXES.map(([x, y], i) => ({ u: i, x, y, t: 0 }));
    g.seen = [false, false, false, false]; g.spotCd = [0, 0, 0, 0]; g.closeCd = [0, 0, 0, 0];
  }
  function startMatch(g) { g.scores = [0, 0]; g.round = 0; beginRound(g); }
  function beginRound(g) {
    g.chaserTeam = g.round % 2; placeCats(g);
    g.timeLeft = g.roundTime; g.countT = 3.2; g.hold = HOLD; g.phase = 'count'; g.roundId++;
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
  const skillsOf = (c, g) => (c.team === g.chaserTeam ? SKILLS.chase : SKILLS.run);

  // 화면에 그릴지: 숨은 상대는 가까이 가야 보인다
  function visibleTo(g, team, c) {
    if (c.team === team || !c.hidden || c.frozen || sniffed(g, team, c)) return true;
    const see = c.moving ? SEE + 20 : SEE - 15; // 숨어서 움직이면 부스럭거려서 더 잘 들킨다
    for (const m of g.cats) if (m.team === team && hyp(m.x - c.x, m.y - c.y) < see) return true;
    return false;
  }
  // 냄새 추적: 쓴 팀 고양이 주변 SNIFF 안의, 숨지 않은 상대는 벽 너머라도 보인다 (숨은 상대는 냄새 구름만)
  function sniffed(g, team, c) {
    if (!(g.reveal[team] > 0) || c.hidden) return false;
    for (const m of g.cats) if (m.team === team && hyp(m.x - c.x, m.y - c.y) < SNIFF) return true;
    return false;
  }
  // 팀이 실제로 '보고 있는지': 숨기 규칙 + 시야 거리 + 벽에 가림 (봇 판단, 발각, 미니맵)
  function teamSees(g, team, c) {
    if (c.team === team || sniffed(g, team, c)) return true;
    if (!visibleTo(g, team, c)) return false;
    for (const m of g.cats) {
      if (m.team !== team) continue;
      const d = hyp(m.x - c.x, m.y - c.y);
      if (d < SEE || (d < VIEW && sightClear(m.x, m.y, c.x, c.y))) return true;
    }
    return false;
  }

  function tickTimers(c, dt) {
    c.dashT = Math.max(0, c.dashT - dt); c.dashCd = Math.max(0, c.dashCd - dt);
    c.stun = Math.max(0, c.stun - dt); c.immune = Math.max(0, c.immune - dt); c.rootT = Math.max(0, c.rootT - dt);
    c.boostT = Math.max(0, c.boostT - dt); c.pounceT = Math.max(0, c.pounceT - dt); c.camoT = Math.max(0, c.camoT - dt);
    c.sk[0] = Math.max(0, c.sk[0] - dt); c.sk[1] = Math.max(0, c.sk[1] - dt);
  }

  /* 한 마리 이동 — 손님(클라이언트)도 자기 고양이에 같은 함수를 쓴다 */
  function moveCat(c, g, ix, iy, dash, dt) {
    tickTimers(c, dt);
    if (c.frozen || isHeld(c, g) || c.rootT > 0) { ix = 0; iy = 0; dash = false; }
    const l = hyp(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    if (ix || iy) { const m = hyp(ix, iy); c.aimX = ix / m; c.aimY = iy / m; }
    if (c.pounceT > 0 && !c.frozen) { ix = c.aimX; iy = c.aimY; }
    let dashed = false;
    if (dash && c.dashCd <= 0 && (ix || iy)) { c.dashT = 0.2; c.dashCd = 2.5; dashed = true; }
    const isCh = c.team === g.chaserTeam;
    const sp = BASE * (isCh ? CH_SPEED : 1) * (c.kind === 'bot' ? (isCh ? 0.86 : 0.94) : 1)
      * (c.dashT > 0 ? DASH : 1) * (c.boostT > 0 ? BOOST : 1) * (c.pounceT > 0 ? POUNCE : 1) * (c.stun > 0 ? 0.35 : 1);
    const k = 1 - Math.exp(-dt * (c.pounceT > 0 ? 30 : 14));
    c.vx += (ix * sp - c.vx) * k; c.vy += (iy * sp - c.vy) * k;
    if (c.frozen || c.rootT > 0) { c.vx = 0; c.vy = 0; }
    c.x += c.vx * dt; c.y += c.vy * dt; resolve(c, g.blocks);
    c.moving = hyp(c.vx, c.vy) > 30;
    if (Math.abs(c.vx) > 20) c.facing = c.vx > 0 ? 1 : -1;
    c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0 || c.camoT > 0;
    return dashed;
  }

  // 스킬 쓰기 — 성공하면 true. 손님도 자기 고양이에 미리 써서 바로 반응하게 한다.
  function useSkill(g, c, k) {
    if (g.phase !== 'play' || c.frozen || isHeld(c, g) || !(k === 0 || k === 1) || c.sk[k] > 0) return false;
    const s = skillsOf(c, g)[k];
    c.sk[k] = s.cd;
    if (s.id === 'trap') {
      const mine = g.traps.filter(t => t.owner === c.id);
      if (mine.length >= 2) g.traps.splice(g.traps.indexOf(mine[0]), 1);
      g.traps.push({ u: ++g.trapSeq, x: c.x - c.aimX * 20, y: c.y - c.aimY * 20, team: c.team, owner: c.id, t: 20 });
    } else if (s.id === 'boost') c.boostT = 2.6;
    else if (s.id === 'sniff') {
      g.reveal[c.team] = 2.6;
      // 숨은 상대는 정확한 자리 대신 근처에 냄새 구름이 남는다
      for (const o of g.cats) {
        if (o.team === c.team || o.frozen || !o.hidden || hyp(o.x - c.x, o.y - c.y) > SNIFF) continue;
        const a = Math.random() * Math.PI * 2, r = 100 + Math.random() * 120;
        const sc = { team: c.team, x: clamp(o.x + Math.cos(a) * r, R, W - R), y: clamp(o.y + Math.sin(a) * r, R, H - R), t: 4 };
        g.scents.push(sc);
        g.mem[c.team][o.id] = { x: sc.x, y: sc.y, t: g.clock };
      }
    }
    else if (s.id === 'pounce') { c.pounceT = 0.42; c.dashT = 0; }
    g.events.push({ k: 'skill', s: s.id, id: c.id, x: Math.round(c.x), y: Math.round(c.y) });
    return true;
  }

  function useItem(g, c) {
    if (g.phase !== 'play' || c.frozen || isHeld(c, g) || !c.item) return false;
    const it = c.item; c.item = '';
    if (it === 'camo') c.camoT = 5;
    else if (it === 'fish') { c.sk[0] = 0; c.sk[1] = 0; c.dashCd = 0; }
    else if (it === 'block') {
      // 뒤쪽에 가로막는 벽 (보는 방향에 수직)
      const bx = c.x - c.aimX * 62, by = c.y - c.aimY * 62, vert = Math.abs(c.aimX) > Math.abs(c.aimY);
      const w = vert ? 34 : 150, h = vert ? 150 : 34;
      g.blocks.push({ x: clamp(bx - w / 2, 0, W - w), y: clamp(by - h / 2, 0, H - h), w, h, t: 6, k: 'block', team: c.team });
      if (g.blocks.length > 6) g.blocks.shift();
    }
    g.events.push({ k: 'item', s: it, id: c.id, x: Math.round(c.x), y: Math.round(c.y) });
    return true;
  }
  function say(g, c, cat) { g.events.push({ k: 'say', id: c.id, c: cat, n: (Math.random() * 1000) | 0 }); }

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
      b.path = astar(c.x, c.y, tx, ty); b.pi = 0; b.pathT = g.clock + 0.6; b.goal = Object.assign(b.goal && !goalMoved ? b.goal : {}, { x: tx, y: ty });
    }
    if (!b.path || !b.path.length) return [0, 0];
    let wp = b.path[b.pi];
    while (wp && hyp(wp.x - c.x, wp.y - c.y) < 22 && b.pi < b.path.length - 1) { b.pi++; wp = b.path[b.pi]; }
    const d = hyp(wp.x - c.x, wp.y - c.y) || 1;
    return [(wp.x - c.x) / d, (wp.y - c.y) / d];
  }
  function knownPos(g, team, o) {
    if (teamSees(g, team, o)) return { x: o.x, y: o.y, fresh: true };
    const m = g.mem[team][o.id];
    if (m && g.clock - m.t < 5) return { x: m.x, y: m.y, fresh: false };
    return null;
  }
  // 숨는 곳 '근처'를 둘러보는 지점 — 한가운데로 들어가지 않으니 큰 풀숲 구석은 못 볼 수도 있다
  function peekPoint(h) {
    const side = Math.floor(Math.random() * 4), t = 0.2 + Math.random() * 0.6;
    let x = h.x + h.w * t, y = h.y + h.h * t;
    if (side === 0) y = h.y - 50; else if (side === 1) y = h.y + h.h + 50; else if (side === 2) x = h.x - 50; else x = h.x + h.w + 50;
    x = clamp(x, R + 2, W - R - 2); y = clamp(y, R + 2, H - R - 2);
    if (blockedPt(x, y, R)) { x = h.cx; y = h.cy; }
    return { x, y };
  }
  function think(c, g) {
    const b = c.bot;
    b.dash = false;
    if (c.frozen || isHeld(c, g) || c.rootT > 0) { b.dx = b.dy = 0; return; }
    if (hyp(c.x - b.lx, c.y - b.ly) < 4 && (b.dx || b.dy)) b.stuckT += 0.15; else b.stuckT = 0;
    b.lx = c.x; b.ly = c.y;
    if (b.stuckT > 0.6) { const a = Math.random() * Math.PI * 2; b.dx = Math.cos(a); b.dy = Math.sin(a); b.path = null; b.stuckT = 0; b.wig = g.clock + 0.35; return; }
    if (g.clock < b.wig) return;

    const chasing = c.team === g.chaserTeam;
    b.sayT -= 0.15;
    if (b.sayT <= 0) { b.sayT = 9 + Math.random() * 12; if (!c.hidden) say(g, c, chasing ? 'chase' : 'run'); }
    if (c.item === 'fish' && (c.sk[0] > 3 || c.sk[1] > 3)) useItem(g, c);
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
        b.lostT = 0;
        const { p, kp } = pick, d = hyp(kp.x - c.x, kp.y - c.y);
        let tx = kp.x, ty = kp.y;
        if (kp.fresh) { const lead = Math.min(d / 450, 0.5); tx += p.vx * lead; ty += p.vy * lead; }
        if (!kp.fresh && d < 40) delete g.mem[c.team][p.id];
        dir = goTo(c, tx, ty, g);
        const clear = kp.fresh && lineClear(c.x, c.y, p.x, p.y, c.r * 0.8);
        b.dash = clear && d < 140;
        if (c.item === 'camo' && kp.fresh && d < 450) useItem(g, c);
        if (clear && d > 60 && d < 210 && c.sk[1] <= 0 && Math.random() < 0.5) {
          c.aimX = (p.x - c.x) / d; c.aimY = (p.y - c.y) / d; useSkill(g, c, 1);
        }
      } else {
        b.lostT += 0.15;
        if (b.lostT > 7 && c.sk[0] <= 0 && g.reveal[c.team] <= 0) useSkill(g, c, 0);
        // 순찰: 숨을 만한 곳 근처를 둘러본다
        if (!b.goal || b.goal.patrol == null || hyp(b.goal.x - c.x, b.goal.y - c.y) < 50) {
          let bi = 0, bs = -1e9;
          HIDES.forEach((h, i) => {
            const s = -hyp(h.cx - c.x, h.cy - c.y) * 0.5 + (g.clock - g.checked[i]) * 20 + Math.random() * 260
              - (partner.bot.goal && partner.bot.goal.patrol === i ? 500 : 0);
            if (s > bs) { bs = s; bi = i; }
          });
          g.checked[bi] = g.clock;
          // 가끔은 숨는 곳 말고 아무 데나 돌아다닌다
          let pt = peekPoint(HIDES[bi]);
          if (Math.random() < 0.4) for (let k = 0; k < 8; k++) {
            const x = R + Math.random() * (W - 2 * R), y = R + Math.random() * (H - 2 * R);
            if (!blockedPt(x, y, R) && hideAt(x, y) < 0 && hyp(x - c.x, y - c.y) < 1400) { pt = { x, y }; break; }
          }
          b.goal = Object.assign(pt, { patrol: bi }); b.path = null;
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
      const seenByThem = hunters.some(h => hyp(h.x - c.x, h.y - c.y) < SEE + 40) || !c.hidden || sniffed(g, 1 - c.team, c);
      if (near < 240 && seenByThem) {
        dir = steer(c, (x, y) => {
          const ds = threats.map(t => hyp(x - t.x, y - t.y)).sort((a, b) => a - b);
          const m = Math.min(x, y, W - x, H - y);
          return ds[0] + (ds[1] || 0) * 0.3 - (m < 90 ? (90 - m) * 2.5 : 0) + (hideAt(x, y) >= 0 ? 30 : 0);
        });
        b.path = null; b.goal = null;
        b.dash = near < 95;
        if (c.item === 'block' && near < 200) useItem(g, c);
        else if (c.item === 'camo' && near < 300) useItem(g, c);
        if (near < 170 && c.sk[1] <= 0) useSkill(g, c, 1);
        else if (near < 260 && near > 70 && c.sk[0] <= 0 && Math.random() < 0.4) useSkill(g, c, 0);
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
          const H0 = HIDES[bi];
          b.goal = { x: H0.x + H0.w * (0.25 + Math.random() * 0.5), y: H0.y + H0.h * (0.25 + Math.random() * 0.5), hide: bi }; b.path = null;
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
    const tBefore = Math.ceil(g.timeLeft);
    g.timeLeft -= dt;
    if (tBefore <= 10 && Math.ceil(g.timeLeft) < tBefore && g.timeLeft > 0) g.events.push({ k: 'sec', n: Math.ceil(g.timeLeft) });
    const wasHold = g.hold > 0; g.hold = Math.max(0, g.hold - dt);
    if (wasHold && g.hold === 0) g.events.push({ k: 'release' });
    g.reveal[0] = Math.max(0, g.reveal[0] - dt); g.reveal[1] = Math.max(0, g.reveal[1] - dt);
    for (const sc of g.scents) sc.t -= dt;
    if (g.scents.length) g.scents = g.scents.filter(sc => sc.t > 0);
    for (const bl of g.blocks) bl.t -= dt;
    if (g.blocks.length) g.blocks = g.blocks.filter(bl => bl.t > 0);
    // 아이템 상자
    for (const bx of g.boxes) {
      if (bx.t > 0) { bx.t -= dt; continue; }
      for (const c of g.cats) {
        if (c.frozen || c.item || hyp(c.x - bx.x, c.y - bx.y) > c.r + 22) continue;
        c.item = ITEMS[(Math.random() * ITEMS.length) | 0].id; bx.t = 14;
        g.events.push({ k: 'pick', id: c.id, s: c.item, x: bx.x, y: bx.y });
        break;
      }
    }
    for (const team of [0, 1]) for (const o of g.cats) {
      if (o.team !== team && !o.frozen && teamSees(g, team, o)) g.mem[team][o.id] = { x: o.x, y: o.y, t: g.clock };
    }
    for (const c of g.cats) {
      if (c.kind === 'remote') {
        tickTimers(c, dt);
        c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0 || c.camoT > 0;
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
    // 털뭉치 트랩
    for (let i = g.traps.length - 1; i >= 0; i--) {
      const t = g.traps[i]; t.t -= dt;
      if (t.t <= 0) { g.traps.splice(i, 1); continue; }
      for (const ch of chasers) {
        if (ch.team === t.team || g.hold > 0 || ch.rootT > 0) continue;
        if (hyp(ch.x - t.x, ch.y - t.y) < ch.r + 18) {
          ch.rootT = 1.0; ch.stun = 1.8; ch.pounceT = 0; ch.vx = ch.vy = 0;
          g.traps.splice(i, 1);
          g.events.push({ k: 'trap', id: ch.id, by: t.owner, x: Math.round(t.x), y: Math.round(t.y) });
          break;
        }
      }
    }
    // 들킴(!) 판정 — 술래팀 눈에 새로 보이면
    for (const r of runners) {
      g.spotCd[r.id] = Math.max(0, g.spotCd[r.id] - dt); g.closeCd[r.id] = Math.max(0, g.closeCd[r.id] - dt);
      const s = !r.frozen && g.hold <= 0 && teamSees(g, g.chaserTeam, r);
      if (s && !g.seen[r.id] && g.spotCd[r.id] <= 0) { g.events.push({ k: 'spot', id: r.id, x: Math.round(r.x), y: Math.round(r.y) }); g.spotCd[r.id] = 4; }
      g.seen[r.id] = s;
    }
    if (g.hold <= 0) for (const ch of chasers) {
      if (ch.stun > 0) continue;
      const reach = ch.r * 2 + (ch.pounceT > 0 ? 16 : 0);
      for (const r of runners) {
        if (r.frozen) continue;
        const d = hyp(ch.x - r.x, ch.y - r.y);
        if (r.immune <= 0 && d < reach) {
          r.frozen = true; r.vx = r.vy = 0; r.boostT = 0; ch.stun = 0.35; ch.pounceT = 0;
          g.events.push({ k: 'freeze', id: r.id, by: ch.id, x: Math.round(r.x), y: Math.round(r.y), last: runners.every(o => o.frozen) });
        } else if (d < reach + 26 && g.closeCd[r.id] <= 0) {
          g.closeCd[r.id] = 3.5; g.events.push({ k: 'close', id: r.id, x: Math.round(r.x), y: Math.round(r.y) });
        }
      }
    }
    for (const a of runners) for (const b of runners) {
      if (a !== b && !a.frozen && b.frozen && hyp(a.x - b.x, a.y - b.y) < a.r + b.r + 8) {
        b.frozen = false; b.immune = 1.5;
        g.events.push({ k: 'unfreeze', id: b.id, by: a.id, x: Math.round(b.x), y: Math.round(b.y) });
      }
    }
    if (runners.every(r => r.frozen)) endRound(g, g.chaserTeam, 'all');
    else if (g.timeLeft <= 0) { g.timeLeft = 0; endRound(g, 1 - g.chaserTeam, 'time'); }
  }

  const api = {
    R, BASE, ROUNDS, SEE, VIEW, SNIFF, TEAM_NAME, CELL, SKILLS, ITEMS, MAPS, MAP_IDS: Object.keys(MAPS),
    setMap, blockedPt, hideAt, resolve, lineClear, sightClear, astar, createGame, startMatch, beginRound, placeCats, stepGame,
    moveCat, useSkill, useItem, say, skillsOf, visibleTo, teamSees, sniffed, isHeld, tickTimers,
  };
  setMap('house');
  root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
