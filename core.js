/* 냥태그 게임 코어 — DOM 없음. 방장(호스트)과 혼자 연습 모드가 이 시뮬레이션을 돌린다. */
(function (root) {
  'use strict';
  const R = 24, BASE = 250, ROUNDS = 4, SEE = 75, WALL = 24;
  let VIEW = 620;
  let SNIFF = 800, CH_BONUS = 1;
  const TEAM_NAME = ['치즈팀', '고등어팀'];
  // 밸런스 수치 — node 시뮬레이션(봇끼리 + 숨어 있는 사람 흉내)으로 맞춤
  const TUNE = {
    chSpeed: 1.04, boost: 1.45, pounce: 2.1, dash: 2.3, botCh: 0.92, botRun: 0.94, maxThaw: 2,
    windup: 0.3, pounceDur: 0.36, whiff: 0.6, scare: 0.9, scareSpd: 1.3, dashCdRun: 2.5, dashCdCh: 3.5,
    immune: 2.5, unfreezeR: 18, boxRespawn: 7, itemMax: 3,
    cd: { trap: 7, boost: 10, sniff: 22, pounce: 11 },
  };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  // 스킬 — [술래가 아닐 때, 술래일 때]
  const SKILLS = {
    run: [{ id: 'trap', name: '털뭉치' }, { id: 'boost', name: '캣닢 가속' }],
    chase: [{ id: 'sniff', name: '냄새 추적' }, { id: 'pounce', name: '덮치기' }],
  };

  // 게임 모드
  const MODES = {
    tag: { name: '얼음땡', icon: '🧊', desc: '숨고 쫓는 술래잡기', rounds: 4 },
    gun: { name: '냥냥 총싸움', icon: '🔫', desc: '물총 팀전. 목표 킬 수를 먼저 채우면 승리', rounds: 1, time: 150 },
    zombie: { name: '로봇청소기 습격', icon: '🤖', desc: '몰려오는 청소기를 같이 막는 협동전', rounds: 1, time: 999 },
    hero: { name: '냥버워치', icon: '🦸', desc: '클래스를 골라서 하는 점령전', rounds: 1, time: 180 },
  };
  // 물총 종류: 연사 간격, 피해, 탄속, 퍼짐, 발 수, 사거리(초)
  const WEAPONS = {
    pistol: { name: '물총', rate: 0.28, dmg: 14, spd: 900, spread: 0.05, n: 1, life: 0.6 },
    shotgun: { name: '산탄 물총', rate: 0.8, dmg: 10, spd: 820, spread: 0.32, n: 6, life: 0.35 },
    rapid: { name: '기관 물총', rate: 0.09, dmg: 7, spd: 950, spread: 0.12, n: 1, life: 0.55 },
    sniper: { name: '저격 물총', rate: 1.1, dmg: 58, spd: 1800, spread: 0, n: 1, life: 0.8 },
    churu: { name: '츄르 총', rate: 0.22, dmg: 9, spd: 850, spread: 0.06, n: 1, life: 0.55 },
    rocket: { name: '냥 바주카', rate: 0.85, dmg: 30, spd: 720, spread: 0.02, n: 1, life: 0.9, boom: true },
  };
  const WEAPON_IDS = Object.keys(WEAPONS);
  // 냥버워치 클래스 (전부 고양이 오리지널)
  const CLASSES = {
    tank: { name: '방석냥', icon: '🛡️', hp: 260, spd: 0.9, wpn: 'shotgun', skill: { id: 'shield', name: '방석 방패', cd: 9 } },
    dps: { name: '돌격냥', icon: '⚡', hp: 150, spd: 1.05, wpn: 'rapid', skill: { id: 'nade', name: '털뭉치 폭탄', cd: 7 } },
    snipe: { name: '저격냥', icon: '🎯', hp: 110, spd: 1, wpn: 'sniper', skill: { id: 'camo', name: '보호색', cd: 12 } },
    heal: { name: '츄르냥', icon: '💗', hp: 140, spd: 1, wpn: 'churu', skill: { id: 'healburst', name: '츄르 폭탄', cd: 10 } },
  };
  const CLASS_IDS = Object.keys(CLASSES);
  const CSKILLS = {
    gun: [{ id: 'nade', name: '털뭉치 폭탄', cd: 8 }, { id: 'boost', name: '캣닢 가속', cd: 10 }],
    zombie: [{ id: 'nade', name: '털뭉치 폭탄', cd: 7 }, { id: 'wall', name: '바리케이드', cd: 6 }],
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


  /* ---------------- 절차 생성 맵 (시드 고정 → 방장과 손님이 같은 맵) ---------------- */
  function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  // spec: {w,h,seed, rooms, fixed:{solids,hides}, scatter:[{k,label,w,h,n,hide,area:[x,y,w,h]}], spawn, boxes:n}
  function genLayout(spec) {
    const rnd = seeded(spec.seed);
    const solids = [...(spec.fixed.solids || [])], hides = [...(spec.fixed.hides || [])];
    const taken = [...solids, ...hides].map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
    const spawnBoxes = spec.spawn.map(([x, y]) => ({ x: x - 120, y: y - 120, w: 240, h: 240 }));
    const free = (o, gap) => ![...taken, ...spawnBoxes].some(t => o.x < t.x + t.w + gap && o.x + o.w + gap > t.x && o.y < t.y + t.h + gap && o.y + o.h + gap > t.y);
    for (const it of spec.scatter) {
      const [ax, ay, aw, ah] = it.area || [60, 60, spec.w - 120, spec.h - 120];
      for (let n = 0, tries = 0; n < it.n && tries < it.n * 80; tries++) {
        const w = it.w * (0.85 + rnd() * 0.3) | 0, h = it.h * (0.85 + rnd() * 0.3) | 0;
        const o = { x: ax + rnd() * (aw - w) | 0, y: ay + rnd() * (ah - h) | 0, w, h, k: it.k, label: it.label || '' };
        if (!free(o, it.gap ?? 80)) continue;
        (it.hide ? hides : solids).push(o); taken.push(o); n++;
      }
    }
    const boxes = [];
    for (let tries = 0; boxes.length < spec.boxes && tries < 2000; tries++) {
      const x = 80 + rnd() * (spec.w - 160), y = 80 + rnd() * (spec.h - 160), o = { x: x - 30, y: y - 30, w: 60, h: 60 };
      if (free(o, 30) && !boxes.some(([bx, by]) => hyp(bx - x, by - y) < 400)) { boxes.push([x | 0, y | 0]); taken.push(o); }
    }
    return { rooms: spec.rooms, solids, hides, boxes };
  }
  function procMap(def) {
    return Object.assign(def, {
      build() { const L = genLayout(def.spec); def.boxes = L.boxes; L.lights = def.lights; return L; },
    });
  }
  const HW_LIGHTS = [[620, 260, 230], [1300, 620, 230], [2300, 620, 230], [1800, 560, 260], [300, 1300, 230], [1000, 1350, 230], [1700, 1100, 230], [2900, 1000, 230], [3400, 620, 230],
        [650, 1980, 240], [1500, 2000, 230], [2200, 1800, 230], [2600, 2400, 230], [3300, 1500, 230], [1800, 2450, 230], [3050, 250, 230]];
  const MAPS = {
    house: {
      name: '우리 집', desc: '거실, 침실, 마당이 있는 작은 집', w: 2400, h: 1600, time: 50, hold: 7,
      spawn: [[200, 300], [200, 390], [2280, 1240], [2330, 1320]],
      boxes: [[760, 420], [1000, 620], [1900, 480], [1500, 150], [700, 900], [180, 1150], [1450, 1250], [2000, 900]],
      build: house,
    },


    hanok: {
      name: '한옥 야시장', desc: '청사초롱 켜진 밤 골목과 개울', w: 3600, h: 2600, time: 65, hold: 6, sniff: 1100, view: 460, night: true,
      spawn: [[300, 1020], [400, 1080], [3330, 2460], [3230, 2400]],
      boxes: [[960, 810], [1980, 1020], [2700, 1060], [3480, 1080], [600, 1640], [1560, 1800], [2560, 1800], [3420, 1700], [700, 2300], [2000, 2420], [2950, 2300], [120, 2480]],
      build() {
        const B = (x, y, w, h, k, label = '') => ({ x, y, w, h, k, label });
        const tree = (x, y) => B(x, y, 110, 110, 'cherry');
        const stalls = [], hides = [];
        const foods = ['떡볶이', '어묵', '붕어빵', '호떡', '닭꼬치', '솜사탕', '군고구마', '식혜'];
        [300, 1300, 2300].forEach((x, i) => { stalls.push(B(x, 1440, 260, 100, 'pocha', foods[i])); hides.push(B(x + 300, 1440, 230, 140, 'tent', '포장마차 천막')); });
        [800, 1800, 2800].forEach((x, i) => { stalls.push(B(x, 2000, 260, 100, 'pocha', foods[i + 3])); hides.push(B(x - 290, 1990, 230, 140, 'tent', '포장마차 천막')); });
        stalls.push(B(3300, 1440, 240, 100, 'pocha', foods[6]), B(3300, 2000, 240, 100, 'pocha', foods[7]));
        return {
          rooms: [
            { x: 0, y: 0, w: 3600, h: 1180, k: 'madang', label: '한옥 마을' },
            { x: 0, y: 1180, w: 3600, h: 160, k: 'madang', label: '' },
            { x: 0, y: 1340, w: 3600, h: 900, k: 'baksuk', label: '야시장' },
            { x: 0, y: 2240, w: 3600, h: 360, k: 'grass', label: '' },
          ],
          solids: [
            // 개울 (다리 세 군데로만 건넌다)
            B(0, 1180, 700, 160, 'stream'), B(860, 1180, 1040, 160, 'stream'), B(2060, 1180, 940, 160, 'stream'), B(3160, 1180, 440, 160, 'stream'),
            // 한옥 네 채
            B(160, 140, 640, 320, 'hanok', '안채'), B(1100, 110, 720, 360, 'hanok', '큰집'), B(2160, 150, 600, 300, 'hanok', '사랑채'), B(2980, 190, 500, 330, 'hanok', '찻집'),
            // 돌담 (문 있음)
            ...wallsH(600, [[120, 420], [580, 900]], 'dam'), ...wallsH(600, [[1060, 1380], [1540, 1880]], 'dam'),
            ...wallsH(560, [[2120, 2380], [2540, 2820]], 'dam'), ...wallsV(2900, [[120, 360], [520, 700]], 'dam'),
            tree(920, 640), tree(1960, 700), tree(2780, 830), tree(3460, 640), tree(60, 2280), tree(1240, 2420), tree(3100, 2470),
            ...stalls,
          ],
          hides: [
            ...hides,
            B(260, 680, 180, 130, 'jar', '장독대'), B(1450, 690, 180, 130, 'jar', '장독대'), B(2400, 2350, 180, 130, 'jar', '장독대'),
            B(1180, 860, 220, 150, 'pyeong', '평상 밑'), B(2300, 760, 220, 150, 'pyeong', '평상 밑'),
            B(2500, 640, 160, 130, 'hay', '짚더미'), B(520, 2360, 170, 140, 'hay', '짚더미'),
            B(3180, 640, 240, 260, 'bamboo', '대나무숲'), B(40, 760, 200, 300, 'bamboo', '대나무숲'), B(1560, 2300, 300, 220, 'bamboo', '대나무숲'), B(3360, 2240, 220, 170, 'bamboo', '대나무숲'),
          ],
          // 밤 조명: 청사초롱 (x, y, 반지름)
          lights: [
            ...[200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400].map(x => [x, 1620, 260]),
            ...[400, 900, 1400, 1900, 2400, 2900, 3400].map(x => [x, 1940, 240]),
            [780, 1260, 200], [1980, 1260, 200], [3080, 1260, 200],
            [480, 520, 220], [1460, 520, 220], [2460, 500, 220], [3230, 560, 200], [1000, 2450, 200], [2200, 2450, 200],
          ],
        };
      },
    },
    cafe: procMap({
      name: '캣카페', desc: '방이 셋 있는 고양이 카페', w: 2800, h: 1800, time: 55, hold: 6, sniff: 900,
      spawn: [[180, 200], [180, 300], [2620, 1600], [2620, 1500]], boxes: [],
      spec: {
        w: 2800, h: 1800, seed: 77, boxes: 9, spawn: [[180, 250], [2620, 1550]],
        rooms: [
          { x: 0, y: 0, w: 1400, h: 1800, k: 'wood', label: '카페' },
          { x: 1400, y: 0, w: 1400, h: 900, k: 'tile', label: '주방' },
          { x: 1400, y: 900, w: 1400, h: 900, k: 'carpet', label: '놀이방' },
        ],
        fixed: {
          solids: [
            ...wallsV(1400, [[0, 380], [540, 1200], [1360, 1800]]),
            ...wallsH(900, [[1400, 1900], [2060, 2800]]),
            { x: 500, y: 0, w: 420, h: 80, k: 'counter', label: '주문대' },
            { x: 2300, y: 0, w: 100, h: 150, k: 'fridge', label: '냉장고' },
            { x: 1600, y: 0, w: 500, h: 70, k: 'counter', label: '싱크대' },
          ],
          hides: [{ x: 0, y: 500, w: 64, h: 300, k: 'curtain', label: '커튼' }, { x: 2736, y: 1000, w: 64, h: 300, k: 'curtain', label: '커튼' }],
        },
        scatter: [
          { k: 'table', label: '테이블', w: 150, h: 90, n: 7, area: [80, 200, 1240, 1500] },
          { k: 'tower', label: '캣타워', w: 90, h: 120, n: 4, area: [80, 100, 2640, 1600], gap: 100 },
          { k: 'tablecloth', label: '테이블 밑', w: 210, h: 140, n: 4, hide: true, area: [80, 200, 1240, 1500] },
          { k: 'blanket', label: '방석', w: 150, h: 120, n: 4, hide: true, area: [1460, 960, 1280, 780] },
          { k: 'laundry', label: '쿠션 더미', w: 150, h: 110, n: 2, hide: true, area: [1460, 960, 1280, 780] },
          { k: 'box', label: '상자', w: 130, h: 110, n: 5, hide: true },
          { k: 'counter', label: '선반', w: 260, h: 70, n: 3, area: [1460, 180, 1280, 660] },
          { k: 'pot', label: '', w: 60, h: 60, n: 6 },
        ],
      },
    }),
    snow: procMap({
      name: '눈 덮인 숲', desc: '전나무 사이 눈 덮인 덤불', w: 3600, h: 2600, time: 60, hold: 6, sniff: 1500, chBonus: 1.03,
      spawn: [[220, 260], [300, 340], [3380, 2340], [3300, 2260]], boxes: [],
      spec: {
        w: 3600, h: 2600, seed: 1213, boxes: 12, spawn: [[260, 300], [3340, 2300]],
        rooms: [{ x: 0, y: 0, w: 3600, h: 2600, k: 'snow', label: '눈 덮인 숲' }],
        fixed: {
          solids: [{ x: 1500, y: 1080, w: 600, h: 380, k: 'pond', label: '얼음 호수' }],
          hides: [],
        },
        scatter: [
          { k: 'pine', w: 100, h: 100, n: 34, gap: 70 },
          { k: 'rock', w: 120, h: 90, n: 10 },
          { k: 'snowman', w: 70, h: 70, n: 5 },
          { k: 'snowbush', label: '눈 덤불', w: 230, h: 170, n: 10, hide: true },
          { k: 'tent', label: '텐트 안', w: 220, h: 140, n: 3, hide: true },
          { k: 'box', label: '썰매 상자', w: 130, h: 110, n: 4, hide: true },
        ],
      },
    }),
    beach: procMap({
      name: '여름 해변', desc: '파라솔과 텐트가 늘어선 해변', w: 3600, h: 2400, time: 55, hold: 6, sniff: 1500, chBonus: 1.05,
      spawn: [[220, 700], [300, 780], [3380, 2200], [3300, 2120]], boxes: [],
      spec: {
        w: 3600, h: 2400, seed: 4321, boxes: 11, spawn: [[260, 740], [3340, 2160]],
        rooms: [
          { x: 0, y: 0, w: 3600, h: 2400, k: 'sand', label: '해변' },
          { x: 0, y: 2200, w: 3600, h: 200, k: 'deck', label: '' },
        ],
        fixed: {
          solids: [{ x: 0, y: 0, w: 3600, h: 420, k: 'sea', label: '' }],
          hides: [],
        },
        scatter: [
          { k: 'palm', w: 100, h: 100, n: 16, area: [60, 500, 3480, 1640] },
          { k: 'rock', w: 130, h: 90, n: 8, area: [60, 440, 3480, 500], gap: 60 },
          { k: 'umbrella', w: 80, h: 80, n: 10, area: [60, 600, 3480, 1500] },
          { k: 'tent', label: '비치 텐트', w: 220, h: 140, n: 4, hide: true, area: [60, 520, 3480, 1640] },
          { k: 'blanket', label: '돗자리', w: 180, h: 140, n: 3, hide: true, area: [60, 520, 3480, 1640] },
          { k: 'tube', label: '튜브 더미', w: 240, h: 100, n: 3, hide: true, area: [60, 520, 3480, 1640] },
          { k: 'box', label: '아이스박스', w: 120, h: 100, n: 4, hide: true, area: [60, 520, 3480, 1640] },
          { k: 'bush', label: '풀숲', w: 220, h: 170, n: 4, hide: true, area: [60, 520, 3480, 1640] },
        ],
      },
    }),
    town: {
      name: '고양이 마을', desc: '집, 시장, 공원이 다 있는 큰 마을', w: 4800, h: 3200, time: 75, hold: 6, sniff: 1300, chBonus: 1.03,
      spawn: [[200, 300], [200, 390], [4560, 2620], [4660, 2680]],
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
    school: {
      name: '냥냥 초등학교', desc: '교실부터 체육관까지 학교 한 바퀴', w: 4000, h: 2800, time: 58, hold: 6, sniff: 1350, chBonus: 1.05,
      spawn: [[200, 1250], [300, 1300], [3800, 2620], [3700, 2560]],
      boxes: [[850, 180], [500, 950], [1450, 980], [2450, 900], [3490, 960], [3460, 200], [1200, 1250], [2900, 1250], [420, 1750], [1300, 1950], [2050, 2620], [900, 2550], [3300, 1700], [3500, 2400], [2400, 1800]],
      build() {
        const B = (x, y, w, h, k, label = '') => ({ x, y, w, h, k, label });
        const desks = [];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) desks.push(B(130 + i * 200, 330 + j * 190, 100, 64, 'sdesk'));
        return {
          rooms: [
            { x: 0, y: 0, w: 1000, h: 1100, k: 'wood', label: '1학년 1반' },
            { x: 1000, y: 0, w: 1000, h: 1100, k: 'carpet', label: '음악실' },
            { x: 2000, y: 0, w: 1000, h: 1100, k: 'tile', label: '과학실' },
            { x: 3000, y: 0, w: 1000, h: 1100, k: 'tile', label: '급식실' },
            { x: 0, y: 1100, w: 4000, h: 300, k: 'hall', label: '' },
            { x: 0, y: 1400, w: 2800, h: 1400, k: 'track', label: '' },
            { x: 2800, y: 1400, w: 1200, h: 1400, k: 'court', label: '' },
          ],
          solids: [
            ...[1000, 2000, 3000].flatMap(x => wallsV(x, [[0, 480], [680, 1100]])),
            ...wallsH(1100, [[0, 380], [620, 1380], [1620, 2380], [2620, 3380], [3620, 4000]]),
            ...wallsH(1400, [[0, 600], [900, 2000], [2300, 3550], [3800, 4000]]),
            ...wallsV(2800, [[1400, 1800], [2000, 2400], [2580, 2800]]),
            // 1학년 1반
            B(250, 6, 500, 44, 'board', '칠판'), ...desks,
            // 음악실
            B(1120, 120, 280, 130, 'piano', '피아노'), B(1600, 140, 90, 90, 'drum'), B(1730, 220, 80, 80, 'drum'), B(1030, 820, 60, 220, 'shelf'),
            // 과학실
            B(2150, 300, 240, 90, 'lab', '실험대'), B(2550, 300, 240, 90, 'lab', '실험대'), B(2150, 620, 240, 90, 'lab', '실험대'), B(2550, 620, 240, 90, 'lab', '실험대'), B(2700, 30, 260, 60, 'shelf'),
            // 급식실
            B(3150, 20, 560, 80, 'counter', '급식대'), B(3880, 140, 100, 150, 'fridge', '냉장고'),
            B(3100, 300, 320, 90, 'table'), B(3560, 300, 320, 90, 'table'), B(3100, 620, 320, 90, 'table'), B(3560, 620, 320, 90, 'table'),
            // 운동장
            B(60, 1980, 70, 240, 'goal'), B(2560, 1980, 70, 240, 'goal'),
            ...[[380, 1450], [1700, 1450], [60, 2650], [1300, 2700], [2650, 2680]].map(([x, y]) => B(x, y, 90, 90, 'tree')),
            B(1000, 2720, 160, 50, 'bench', '벤치'), B(1800, 2720, 160, 50, 'bench', '벤치'),
            B(300, 2350, 220, 220, 'gym', '정글짐'), B(2200, 1600, 120, 260, 'slide', '미끄럼틀'),
            // 체육관
            B(3360, 1416, 80, 44, 'hoop'), B(3360, 2740, 80, 44, 'hoop'), B(3000, 1800, 160, 90, 'vault', '뜀틀'), B(3700, 2000, 160, 90, 'vault', '뜀틀'),
          ],
          hides: [
            B(420, 110, 170, 110, 'tablecloth', '교탁 밑'), B(60, 900, 130, 110, 'box', '상자'), B(0, 420, 64, 300, 'curtain', '커튼'),
            B(1924, 700, 64, 320, 'curtain', '무대 커튼'), B(1150, 600, 150, 120, 'blanket', '방석'), B(1500, 780, 150, 120, 'blanket', '방석'),
            B(2820, 860, 150, 110, 'laundry', '실험복 더미'), B(2060, 900, 130, 110, 'box', '상자'),
            B(3100, 860, 240, 150, 'tablecloth', '식탁 밑'), B(3640, 860, 240, 150, 'tablecloth', '식탁 밑'),
            B(700, 1112, 220, 72, 'locker', '사물함'), B(1700, 1112, 220, 72, 'locker', '사물함'), B(2700, 1112, 220, 72, 'locker', '사물함'), B(3700, 1112, 220, 72, 'locker', '사물함'),
            B(1000, 1316, 240, 72, 'locker', '사물함'), B(2500, 1316, 240, 72, 'locker', '사물함'), B(3200, 1316, 240, 72, 'locker', '사물함'),
            B(700, 1500, 230, 170, 'bush', '풀숲'), B(1500, 2400, 240, 180, 'bush', '풀숲'), B(2300, 2350, 220, 180, 'bush', '풀숲'), B(40, 1500, 200, 160, 'bush', '풀숲'),
            B(900, 2150, 260, 110, 'tube', '터널'), B(1900, 1550, 140, 120, 'box', '공 바구니'),
            B(2840, 2500, 240, 150, 'mat', '매트 더미'), B(3750, 1500, 220, 150, 'mat', '매트 더미'), B(3100, 2200, 130, 110, 'box', '공 상자'), B(3936, 1900, 64, 320, 'curtain', '무대 커튼'),
          ],
        };
      },
    },
    halloween: procMap({
      name: '할로윈 호박밭', desc: '유령 저택 옆 묘지와 옥수수밭, 밤', w: 3600, h: 2600, time: 58, hold: 6, sniff: 1350, chBonus: 1.05, view: 500, night: true, lamp: 'pumpkin',
      spawn: [[250, 300], [340, 380], [3350, 2300], [3260, 2220]], boxes: [],
      lights: HW_LIGHTS,
      spec: {
        w: 3600, h: 2600, seed: 1031, boxes: 12, spawn: [[290, 340], [3310, 2260]],
        rooms: [
          { x: 0, y: 0, w: 3600, h: 2600, k: 'dgrass', label: '' },
          { x: 1250, y: 0, w: 1100, h: 760, k: 'dirt', label: '' },
        ],
        fixed: {
          solids: [
            { x: 1400, y: 60, w: 800, h: 400, k: 'mansion', label: '유령 저택' },
            ...wallsH(1500, [[150, 450], [650, 1150]], 'ifence'), ...wallsH(2450, [[150, 700], [900, 1150]], 'ifence'),
            ...wallsV(150, [[1500, 1800], [2050, 2450]], 'ifence'), ...wallsV(1150, [[1500, 1900], [2100, 2450]], 'ifence'),
            { x: 2500, y: 1250, w: 150, h: 120, k: 'cauldron', label: '마녀 솥' },
            ...HW_LIGHTS.map(([x, y]) => ({ x: x - 30, y: y - 26, w: 60, h: 52, k: 'jack', label: '' })),
          ],
          hides: [
            { x: 2450, y: 300, w: 360, h: 280, k: 'corn', label: '옥수수밭' },
            { x: 2750, y: 1750, w: 340, h: 260, k: 'corn', label: '옥수수밭' },
            { x: 460, y: 660, w: 320, h: 260, k: 'corn', label: '옥수수밭' },
          ],
        },
        scatter: [
          { k: 'grave', w: 64, h: 46, n: 12, gap: 60, area: [200, 1560, 920, 860] },
          { k: 'coffin', label: '관 속', w: 160, h: 84, n: 3, hide: true, area: [200, 1560, 920, 860], gap: 50 },
          { k: 'deadtree', w: 100, h: 100, n: 18, gap: 80 },
          { k: 'pumpkins', label: '호박 더미', w: 190, h: 140, n: 8, hide: true },
          { k: 'hay', label: '짚더미', w: 170, h: 140, n: 4, hide: true },
          { k: 'pumpkin', w: 70, h: 60, n: 10, gap: 60 },
          { k: 'rock', w: 110, h: 80, n: 5 },
        ],
      },
    }),
    space: {
      name: '우주정거장 냥-7', desc: '불 꺼진 정거장, 비상등만 깜빡여요', w: 4000, h: 2800, time: 70, hold: 6, sniff: 1200, view: 500, night: true, lamp: 'tech',
      spawn: [[200, 360], [300, 420], [3800, 2620], [3700, 2560]],
      boxes: [[700, 500], [1200, 350], [2000, 1150], [2300, 600], [3420, 850], [3800, 500], [2000, 1400], [700, 2200], [1200, 1900], [1650, 2200], [2350, 1800], [3300, 1800], [3100, 2700], [3900, 1600]],
      build() {
        const B = (x, y, w, h, k, label = '') => ({ x, y, w, h, k, label });
        const crate = (x, y, w = 110, h = 110) => B(x, y, w, h, 'crate');
        return {
          rooms: [
            { x: 0, y: 0, w: 1500, h: 1300, k: 'metal', label: '거주 구역' },
            { x: 1500, y: 0, w: 1000, h: 1300, k: 'metal', label: '함교' },
            { x: 2500, y: 0, w: 1500, h: 1300, k: 'metal', label: '연구실' },
            { x: 0, y: 1300, w: 4000, h: 200, k: 'grate', label: '' },
            { x: 0, y: 1500, w: 1400, h: 1300, k: 'metal', label: '화물칸' },
            { x: 1400, y: 1500, w: 1200, h: 1300, k: 'grate', label: '' },
            { x: 2600, y: 1500, w: 1400, h: 1300, k: 'grass', label: '온실' },
          ],
          solids: [
            ...wallsV(1500, [[0, 500], [720, 1300]], 'hull'), ...wallsV(2500, [[0, 500], [720, 1300]], 'hull'),
            ...wallsH(1300, [[0, 500], [720, 1700], [1920, 2950], [3170, 4000]], 'hull'),
            ...wallsH(1500, [[0, 500], [720, 1700], [1920, 2300], [2520, 3300], [3520, 4000]], 'hull'),
            ...wallsV(1400, [[1500, 2000], [2220, 2800]], 'hull'), ...wallsV(2600, [[1500, 2300], [2520, 2800]], 'hull'),
            // 함교
            B(1600, 0, 800, 50, 'window'), B(1650, 190, 180, 70, 'console'), B(1910, 140, 180, 70, 'console'), B(2170, 190, 180, 70, 'console'),
            B(1850, 780, 300, 200, 'holo', '홀로맵'),
            // 거주 구역
            crate(300, 1000), crate(1100, 470),
            // 연구실
            ...[2650, 2850, 3050, 3250].map(x => B(x, 150, 110, 110, 'tank')),
            B(2700, 600, 240, 90, 'lab', '분석대'), B(3100, 600, 240, 90, 'lab', '분석대'), B(3500, 600, 240, 90, 'lab', '분석대'),
            // 화물칸
            crate(150, 1650), crate(400, 1700, 160, 110), crate(150, 1900), crate(700, 1650), crate(900, 2000, 160, 110), crate(300, 2300), crate(600, 2560), crate(1100, 2380), crate(1000, 1700),
            // 반응로
            B(1850, 1950, 300, 300, 'reactor', '반응로'), B(1550, 2580, 180, 70, 'console'), B(2270, 2580, 180, 70, 'console'),
            // 온실
            ...[[2750, 1650], [3150, 1600], [3650, 1700], [2900, 2300], [3400, 2100], [2700, 2650]].map(([x, y]) => B(x, y, 90, 90, 'tree')),
            B(3300, 2600, 60, 60, 'pot'), B(3900, 1900, 60, 60, 'pot'),
          ],
          hides: [
            ...[0, 1, 2, 3].map(i => B(120 + i * 320, 120, 200, 110, 'pod', '수면 캡슐')), ...[0, 1, 2].map(i => B(120 + i * 320, 700, 200, 110, 'pod', '수면 캡슐')),
            B(880, 1200, 220, 72, 'locker', '사물함'),
            B(3700, 150, 200, 150, 'cargo', '화물 더미'), B(2620, 950, 130, 110, 'box', '샘플 상자'), B(3400, 1000, 120, 90, 'vent', '환풍구'),
            B(1000, 1350, 120, 90, 'vent', '환풍구'), B(2200, 1350, 120, 90, 'vent', '환풍구'), B(3700, 1360, 120, 90, 'vent', '환풍구'),
            B(450, 2000, 220, 150, 'cargo', '화물 그물'), B(1080, 2600, 220, 150, 'cargo', '화물 그물'), B(120, 2550, 130, 110, 'box', '상자'),
            B(1500, 1600, 120, 90, 'vent', '환풍구'), B(2400, 2650, 120, 90, 'vent', '환풍구'),
            B(2900, 1900, 220, 170, 'bush', '풀숲'), B(3500, 1850, 230, 170, 'bush', '풀숲'), B(3150, 2450, 240, 180, 'bush', '풀숲'), B(3550, 2250, 200, 160, 'bush', '풀숲'),
          ],
          lights: [[2000, 600, 240], [1700, 380, 200], [2300, 380, 200], [400, 520, 220], [1100, 950, 220], [3000, 450, 220], [3600, 950, 220],
            [600, 1400, 200], [1500, 1400, 200], [2600, 1400, 200], [3500, 1400, 200], [400, 1850, 220], [1000, 2300, 220], [2000, 2100, 430], [3000, 1950, 240], [3500, 2500, 240]],
        };
      },
    },
  };
  const OPAQUE_K = new Set(['wall', 'tree', 'shelf', 'wardrobe', 'fridge', 'tower', 'stall', 'gym', 'pine', 'palm', 'rock', 'snowman', 'hanok', 'dam', 'cherry', 'pocha', 'piano', 'mansion', 'deadtree', 'hull', 'crate', 'tank', 'reactor']);

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
    MAP_ID = id; W = M.w; H = M.h; ROUND_TIME = M.time; HOLD = M.hold; SNIFF = M.sniff || 800; CH_BONUS = M.chBonus || 1; VIEW = M.view || 620;
    ROOMS = b.rooms; SOLIDS = b.solids; HIDES = b.hides; SPAWN = M.spawn; BOXES = b.boxes || M.boxes;
    OPAQUE = SOLIDS.filter(o => OPAQUE_K.has(o.k));
    for (const h of HIDES) { h.cx = h.x + h.w / 2; h.cy = h.y + h.h / 2; }
    GW = W / CELL; GH = H / CELL; N = GW * GH;
    walk = new Uint8Array(N);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++)
      walk[gy * GW + gx] = blockedPt(gx * CELL + CELL / 2, gy * CELL + CELL / 2, R * 0.85) ? 0 : 1;
    gScore = new Float32Array(N); came = new Int32Array(N); stamp = new Uint32Array(N); closedS = new Uint32Array(N); curStamp = 0;
    Object.assign(api, { MAP_ID, SNIFF, VIEW, NIGHT: !!M.night, LAMP: M.lamp || 'chorong', LIGHTS: b.lights || [], W, H, ROUND_TIME, HOLD, ROOMS, SOLIDS, HIDES, SPAWN, BOXES, GW, GH, walk });
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
  // 팀 인원이 늘어나면 시작 자리를 기본 자리 주변에 펼친다
  function spawnPos(team, i) {
    const [bx, by] = SPAWN[team * 2], [ox, oy] = SPAWN[team * 2 + 1];
    if (i === 0) return [bx, by];
    if (i === 1) return [ox, oy];
    const k = i - 2, dx = ((k % 3) - 1) * 70 * (team ? -1 : 1), dy = (Math.floor(k / 3) + 1) * 70 * (by > H / 2 ? -1 : 1);
    let x = clamp(bx + dx, R + 2, W - R - 2), y = clamp(by + dy, R + 2, H - R - 2);
    for (let rad = 0; rad < 400 && (blockedPt(x, y, R) || hideAt(x, y) >= 0); rad += 20) {
      const a = rad * 0.7; x = clamp(bx + dx + Math.cos(a) * rad, R + 2, W - R - 2); y = clamp(by + dy + Math.sin(a) * rad, R + 2, H - R - 2);
    }
    return [x, y];
  }
  function makeCat(slot, ts, mode) {
    const team = mode === 'zombie' ? 0 : slot >= ts ? 1 : 0, [sx, sy] = spawnPos(team, mode === 'zombie' ? slot : slot - team * ts);
    return {
      id: slot, team, kind: 'bot', x: sx, y: sy, vx: 0, vy: 0, r: R,
      facing: team ? -1 : 1, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, rootT: 0, boostT: 0, pounceT: 0, windT: 0, pounced: false, scareT: 0,
      sk: [0, 0], items: [], camoT: 0, aimX: team ? -1 : 1, aimY: 0, hidden: false, hideIdx: -1,
      moving: false, t: Math.random() * 10,
      bot: { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, lx: 0, ly: 0, wig: 0, dash: false, lostT: 0, sayT: 4 + Math.random() * 8 },
    };
  }
  function createGame(ts = 2, mode = 'tag') {
    ts = clamp(ts | 0, 1, 8); if (!MODES[mode]) mode = 'tag';
    const n = ts * 2, M = MODES[mode];
    return {
      ts, mode, rounds: M.rounds,
      map: MAP_ID, roundTime: mode === 'tag' ? Math.round(ROUND_TIME * (ts === 1 ? 0.8 : 1 + 0.07 * (ts - 2))) : M.time,
      shots: [], nades: [], mobs: [], mobSeq: 0, combo: 0, comboT: 0, pts: 0, bestCombo: 0, wave: 0, waveLeft: 0, spawnT: 0, breakT: 0, cp: null, killGoal: Math.max(5, ts * 5), flowT: 0,
      phase: 'lobby', round: 0, scores: [0, 0], chaserTeam: 0, timeLeft: ROUND_TIME, countT: 0, endT: 0, hold: 0,
      roundId: 0, clock: 0, lastWin: -1, lastReason: '', events: [],
      cats: Array.from({ length: n }, (_, i) => makeCat(i, ts, mode)),
      mem: [{}, {}], checked: HIDES.map(() => -99), traps: [], trapSeq: 0, reveal: [0, 0], scents: [], blocks: [], boxes: [],
      seen: Array(n).fill(false), spotCd: Array(n).fill(0), closeCd: Array(n).fill(0),
      localInput: {},
    };
  }
  function placeCats(g) {
    for (const c of g.cats) {
      const [sx, sy] = spawnPos(c.team, g.mode === 'zombie' ? c.id : c.id - c.team * g.ts);
      initCombat(g, c);
      Object.assign(c, {
        x: sx, y: sy, vx: 0, vy: 0, frozen: false, immune: 0, dashT: 0, dashCd: 0, stun: 0, rootT: 0,
        boostT: 0, pounceT: 0, windT: 0, pounced: false, scareT: 0, sk: [0, 0], items: [], camoT: 0, facing: c.team ? -1 : 1, aimX: c.team ? -1 : 1, aimY: 0,
      });
      c.hidden = false; c.hideIdx = -1;
      Object.assign(c.bot, { dx: 0, dy: 0, cd: 0, path: null, pi: 0, pathT: 0, goal: null, stuckT: 0, dash: false, lostT: 0 });
    }
    g.mem = [{}, {}]; g.checked = HIDES.map(() => -99); g.traps = []; g.reveal = [0, 0]; g.scents = []; g.blocks = [];
    g.boxes = BOXES.map(([x, y], i) => ({ u: i, x, y, t: 0 }));
    g.seen = g.cats.map(() => false); g.spotCd = g.cats.map(() => 0); g.closeCd = g.cats.map(() => 0);
    g.shots = []; g.nades = []; g.mobs = [];
    if (g.mode === 'hero') { const [x, y] = cpSpot(); g.cp = { x, y, r: 170, prog: [0, 0], owner: -1 }; }
    if (g.mode === 'zombie') { g.wave = 0; g.breakT = 3; g.waveLeft = 0; }
  }
  function startMatch(g) { g.scores = [0, 0]; g.round = 0; beginRound(g); }
  function beginRound(g) {
    g.chaserTeam = g.mode === 'tag' ? g.round % 2 : -1; placeCats(g);
    g.timeLeft = g.roundTime; g.countT = 3.2;
    for (const c of g.cats) c.thaws = 0; g.hold = g.mode === 'tag' ? HOLD : 0; g.phase = 'count'; g.roundId++;
    g.events.push({ k: 'round', round: g.round, chaser: g.chaserTeam });
  }
  function endRound(g, winner, reason) {
    if (winner >= 0 && g.mode === 'tag') g.scores[winner]++;
    g.phase = 'roundEnd'; g.endT = 3; g.lastWin = winner; g.lastReason = reason;
    g.events.push({ k: 'roundEnd', winner, reason });
  }
  function nextRound(g) {
    g.round++;
    if (g.round >= (g.rounds || ROUNDS)) { g.phase = 'over'; g.events.push({ k: 'over', scores: g.scores.slice(), winner: g.lastWin, wave: g.wave, pts: g.pts, bc: g.bestCombo }); }
    else beginRound(g);
  }
  const isHeld = (c, g) => g.phase !== 'play' || (c.team === g.chaserTeam && g.hold > 0);
  const skillsOf = (c, g) => g.mode === 'hero' ? [CLASSES[c.cls || 'dps'].skill, { id: 'boost', name: '캣닢 가속', cd: 10 }]
    : CSKILLS[g.mode] || (c.team === g.chaserTeam ? SKILLS.chase : SKILLS.run);

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
      if (m.team !== team || m.dead) continue;
      const d = hyp(m.x - c.x, m.y - c.y);
      if (d < SEE || (d < VIEW && sightClear(m.x, m.y, c.x, c.y))) return true;
    }
    return false;
  }

  function tickTimers(c, dt) {
    c.dashT = Math.max(0, c.dashT - dt); c.dashCd = Math.max(0, c.dashCd - dt);
    c.stun = Math.max(0, c.stun - dt); c.immune = Math.max(0, c.immune - dt); c.rootT = Math.max(0, c.rootT - dt);
    c.boostT = Math.max(0, c.boostT - dt); c.camoT = Math.max(0, c.camoT - dt); c.scareT = Math.max(0, c.scareT - dt);
    if (c.windT > 0) { c.windT -= dt; if (c.windT <= 0) { c.windT = 0; if (!c.frozen) { c.pounceT = TUNE.pounceDur; c.pounced = true; } } }
    if (c.pounceT > 0) {
      c.pounceT = Math.max(0, c.pounceT - dt);
      if (c.pounceT === 0 && c.pounced) { c.pounced = false; c.stun = Math.max(c.stun, TUNE.whiff); c.whiff = true; } // 빗나감 → 비틀
    }
    c.sk[0] = Math.max(0, c.sk[0] - dt); c.sk[1] = Math.max(0, c.sk[1] - dt);
  }

  /* 한 마리 이동 — 손님(클라이언트)도 자기 고양이에 같은 함수를 쓴다 */
  function moveCat(c, g, ix, iy, dash, dt) {
    tickTimers(c, dt);
    if (c.frozen || c.dead || isHeld(c, g) || c.rootT > 0) { ix = 0; iy = 0; dash = false; }
    const l = hyp(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    if ((ix || iy) && c.pounceT <= 0) { const m = hyp(ix, iy); c.aimX = ix / m; c.aimY = iy / m; }
    if (c.windT > 0) { ix *= 0.25; iy *= 0.25; dash = false; } // 웅크리는 중엔 거의 못 움직인다
    if (c.pounceT > 0 && !c.frozen) { ix = c.aimX; iy = c.aimY; }
    let dashed = false;
    const isCh = c.team === g.chaserTeam;
    if (dash && c.dashCd <= 0 && (ix || iy) && c.pounceT <= 0) { c.dashT = 0.2; c.dashCd = isCh ? TUNE.dashCdCh : TUNE.dashCdRun; dashed = true; }
    const sp = BASE * (isCh ? TUNE.chSpeed * CH_BONUS : 1) * (c.kind === 'bot' ? (isCh ? TUNE.botCh : TUNE.botRun) : 1)
      * (c.dashT > 0 ? TUNE.dash : 1) * (c.boostT > 0 ? TUNE.boost : c.scareT > 0 ? TUNE.scareSpd : 1) * (c.pounceT > 0 ? TUNE.pounce : 1) * (c.stun > 0 ? 0.35 : 1)
      * (g.mode === 'hero' ? CLASSES[c.cls || 'dps'].spd : 1) * (c.shieldT > 0 ? 0.6 : 1) * (g.mode !== 'tag' && c.kind === 'bot' ? 0.95 / (isCh ? TUNE.botCh : TUNE.botRun) : 1);
    const k = 1 - Math.exp(-dt * (c.pounceT > 0 ? 30 : c.kind === 'bot' ? 14 : 20)); // 사람은 덜 미끄럽게
    c.vx += (ix * sp - c.vx) * k; c.vy += (iy * sp - c.vy) * k;
    if (c.frozen || c.rootT > 0 || c.dead) { c.vx = 0; c.vy = 0; }
    c.x += c.vx * dt; c.y += c.vy * dt; resolve(c, g.blocks);
    c.moving = hyp(c.vx, c.vy) > 30;
    if (Math.abs(c.vx) > 20) c.facing = c.vx > 0 ? 1 : -1;
    c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0 || c.camoT > 0;
    return dashed;
  }

  // 스킬 쓰기 — 성공하면 true. 손님도 자기 고양이에 미리 써서 바로 반응하게 한다.
  function skillCd(g, id) { return id === 'sniff' ? TUNE.cd.sniff * clamp(g.ts / 2, 0.55, 1) : TUNE.cd[id]; }
  function useSkill(g, c, k) {
    if (g.phase !== 'play' || c.frozen || c.dead || isHeld(c, g) || !(k === 0 || k === 1) || c.sk[k] > 0 || c.windT > 0 || c.pounceT > 0) return false;
    const s = skillsOf(c, g)[k];
    c.sk[k] = s.cd || skillCd(g, s.id);
    if (s.id === 'nade') {
      const a = c.gunA ?? Math.atan2(c.aimY, c.aimX), d = 300;
      let tx = c.x + Math.cos(a) * d, ty = c.y + Math.sin(a) * d;
      tx = clamp(tx, R, W - R); ty = clamp(ty, R, H - R);
      g.nades.push({ x: c.x, y: c.y, sx: c.x, sy: c.y, tx, ty, t: 0, T: 0.75, team: c.team, owner: c.id });
      g.events.push({ k: 'nade', sx: Math.round(c.x), sy: Math.round(c.y), tx: Math.round(tx), ty: Math.round(ty), id: c.id });
    } else if (s.id === 'wall') {
      const a = c.gunA ?? Math.atan2(c.aimY, c.aimX), ax = Math.cos(a), ay = Math.sin(a), vert = Math.abs(ax) > Math.abs(ay);
      const bx = c.x + ax * 70, by = c.y + ay * 70, w = vert ? 34 : 170, h = vert ? 170 : 34;
      g.blocks.push({ x: clamp(bx - w / 2, 0, W - w), y: clamp(by - h / 2, 0, H - h), w, h, t: 40, k: 'block', team: c.team, hp: 220 });
      if (g.blocks.length > 14) g.blocks.shift();
    } else if (s.id === 'shield') c.shieldT = 3.5;
    else if (s.id === 'camo') c.camoT = 4;
    else if (s.id === 'healburst') {
      for (const o of g.cats) if (o.team === c.team && !o.dead && hyp(o.x - c.x, o.y - c.y) < 240) { o.hp = Math.min(o.maxHp, o.hp + 70); }
    }
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
    else if (s.id === 'pounce') { c.windT = TUNE.windup; c.dashT = 0; }
    g.events.push({ k: 'skill', s: s.id, id: c.id, x: Math.round(c.x), y: Math.round(c.y) });
    return true;
  }

  function useItem(g, c) {
    if (g.phase !== 'play' || c.frozen || isHeld(c, g) || !c.items.length) return false;
    const it = c.items.shift();
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
    if (c.items[0] === 'fish' && (c.sk[0] > 3 || c.sk[1] > 3)) useItem(g, c);
    else if (c.items[0] === 'block' && chasing) useItem(g, c); // 술래 봇한테 블럭은 쓸모없으니 버린다
    let dir = [0, 0];
    if (chasing) {
      const prey = g.cats.filter(o => o.team !== c.team && !o.frozen);
      const mates = g.cats.filter(o => o.team === c.team && o !== c);
      let pick = null, ps = 1e9;
      for (const p of prey) {
        const kp = knownPos(g, c.team, p); if (!kp) continue;
        let s = hyp(kp.x - c.x, kp.y - c.y) + (kp.fresh ? 0 : 200);
        if (prey.length > 1 && mates.some(m => hyp(m.x - kp.x, m.y - kp.y) < s - 60)) s += 160; // 동료가 더 가까우면 다른 애를 노린다
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
        if (c.items[0] === 'camo' && kp.fresh && d < 450) useItem(g, c);
        if (clear && d > 70 && d < 170 && c.sk[1] <= 0 && Math.random() < 0.35) {
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
              - (mates.some(m => m.bot.goal && m.bot.goal.patrol === i) ? 500 : 0);
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
      const mates = g.cats.filter(o => o.team === c.team && o !== c);
      // 가장 가까운 얼은 동료
      let mate = null;
      for (const m of mates) if (m.frozen && (m.thaws | 0) < TUNE.maxThaw && (!mate || hyp(m.x - c.x, m.y - c.y) < hyp(mate.x - c.x, mate.y - c.y))) mate = m;
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
        if (c.items[0] === 'block' && near < 200) useItem(g, c);
        else if (c.items[0] === 'camo' && near < 300) useItem(g, c);
        if (near < 170 && c.sk[1] <= 0) useSkill(g, c, 1);
        else if (near < 260 && near > 70 && c.sk[0] <= 0 && Math.random() < 0.4) useSkill(g, c, 0);
      } else if (mate && tdist(mate.x, mate.y) > 220 && hyp(mate.x - c.x, mate.y - c.y) < 1400) {
        dir = goTo(c, mate.x, mate.y, g);
      } else if (c.hidden && near > 160) {
        dir = [0, 0];
      } else {
        if (!b.goal || b.goal.hide == null || tdist(b.goal.x, b.goal.y) < 200) {
          let bi = 0, bs = -1e9;
          HIDES.forEach((h, i) => {
            const mateThere = mates.some(m => m.hideIdx === i || (m.bot.goal && m.bot.goal.hide === i));
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


  /* ---------------- 전투 모드 (총싸움 · 로봇청소기 습격 · 냥버워치) ---------------- */
  function initCombat(g, c) {
    const cls = g.mode === 'hero' ? CLASSES[c.cls || 'dps'] : null;
    c.maxHp = cls ? cls.hp : g.mode === 'zombie' ? 120 : 100; c.hp = c.maxHp; c.dead = false; c.respawnT = 0; c.revT = 0;
    c.wpn = cls ? cls.wpn : 'pistol'; c.fireCd = 0; c.kills = c.kills || 0; c.deaths = c.deaths || 0; c.lastHit = -99; c.shieldT = 0; c.fire = false;
    c.gunA = c.team ? Math.PI : 0;
  }
  // 점령 지점: 두 팀 시작 자리 한가운데에서 가장 가까운 걸을 수 있는 곳
  function cpSpot() {
    const mx = (SPAWN[0][0] + SPAWN[2][0]) / 2, my = (SPAWN[0][1] + SPAWN[2][1]) / 2;
    for (let rad = 0; rad < 900; rad += 30) for (let a = 0; a < 6.28; a += 0.5) {
      const x = mx + Math.cos(a) * rad, y = my + Math.sin(a) * rad;
      if (!blockedPt(x, y, 70) && hideAt(x, y) < 0) return [x | 0, y | 0];
    }
    return [mx | 0, my | 0];
  }
  // 같은 시드면 같은 탄도 → 방장은 판정, 손님은 그림만
  function makeShots(c, x, y, a, wid, seed) {
    const W0 = WEAPONS[wid] || WEAPONS.pistol, rnd = seeded(seed + 1), out = [];
    for (let i = 0; i < W0.n; i++) {
      const aa = a + (rnd() - 0.5) * 2 * W0.spread, sp = W0.spd * (0.92 + rnd() * 0.16);
      out.push({ x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: W0.life, team: c.team, owner: c.id, dmg: W0.dmg, w: wid });
    }
    return out;
  }
  const shotBlocked = (x, y) => {
    if (x < 0 || y < 0 || x > W || y > H) return true;
    for (const o of SOLIDS) if (o.k !== 'pond' && o.k !== 'stream' && o.k !== 'sea' && x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
    return false;
  };
  function hurt(g, t, dmg, by, sx, sy) {
    if (t.dead || t.immune > 0 || g.phase !== 'play') return;
    if (t.shieldT > 0 && sx != null) {
      const fa = t.gunA ?? 0, da = Math.atan2(sy - t.y, sx - t.x), diff = Math.abs(Math.atan2(Math.sin(da - fa), Math.cos(da - fa)));
      if (diff < 1.2) dmg *= 0.12; // 방석 방패: 앞에서 오는 건 거의 막는다
    }
    t.hp -= dmg; t.lastHit = g.clock;
    g.events.push({ k: 'hit', id: t.id, by, d: Math.round(dmg) });
    if (t.hp <= 0) {
      t.hp = 0; t.dead = true; t.deaths++; t.vx = t.vy = 0; t.shieldT = 0; t.camoT = 0;
      t.respawnT = g.mode === 'gun' ? 3 : g.mode === 'hero' ? 5 : 0;
      const k = by >= 0 && g.cats[by] ? g.cats[by] : null;
      if (k && k.team !== t.team) { k.kills++; if (g.mode === 'gun') g.scores[k.team]++; }
      g.events.push({ k: 'kill', id: t.id, by, x: Math.round(t.x), y: Math.round(t.y) });
    }
  }
  function boom(g, x, y, team, owner) {
    g.events.push({ k: 'boom', x: Math.round(x), y: Math.round(y) });
    for (const c of g.cats) { const d = hyp(c.x - x, c.y - y); if (c.team !== team && d < 130) hurt(g, c, 70 * (1 - d / 160), owner, x, y); }
    for (const m of g.mobs) { const d = hyp(m.x - x, m.y - y); if (d < 140) hurtMob(g, m, 90 * (1 - d / 180), owner); }
  }
  function hurtMob(g, m, dmg, by) {
    if (m.hp <= 0) return;
    m.hp -= dmg; m.hitT = 0.15;
    if (m.hp <= 0) {
      const k = g.cats[by]; if (k) k.kills++;
      // 팀 콤보: 2.5초 안에 계속 부수면 배율이 오른다
      g.combo = g.comboT > 0 ? g.combo + 1 : 1; g.comboT = 2.5; g.bestCombo = Math.max(g.bestCombo, g.combo);
      g.pts += (MOBS[m.kind] || MOBS.vac).pts * Math.min(10, 1 + Math.floor(g.combo / 5));
      g.events.push({ k: 'mobdie', u: m.u, x: Math.round(m.x), y: Math.round(m.y), kind: m.kind, by, c: g.combo });
    }
  }
  function fireCat(g, c) {
    const W0 = WEAPONS[c.wpn] || WEAPONS.pistol;
    c.fireCd = W0.rate;
    const seed = (Math.random() * 1e6) | 0;
    for (const sh of makeShots(c, c.x, c.y, c.gunA, c.wpn, seed)) g.shots.push(sh);
    g.events.push({ k: 'fire', id: c.id, x: Math.round(c.x), y: Math.round(c.y), a: Math.round(c.gunA * 1000) / 1000, w: c.wpn, s: seed });
  }

  // 로봇청소기 길찾기: 살아 있는 고양이까지의 거리 지도(BFS)를 깔고 내리막으로 간다
  let flow = null;
  function buildFlow(g) {
    if (!flow || flow.length !== N) flow = new Int32Array(N);
    flow.fill(1e9);
    const q = new Int32Array(N); let qh = 0, qt = 0;
    for (const c of g.cats) {
      if (c.dead) continue;
      const i = nearestWalk(c.x, c.y); if (i < 0 || flow[i] === 0) continue;
      flow[i] = 0; q[qt++] = i;
    }
    while (qh < qt) {
      const cur = q[qh++], cx = cur % GW, cy = (cur / GW) | 0, d = flow[cur] + 1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const ni = ny * GW + nx; if (!walk[ni] || flow[ni] <= d) continue;
        flow[ni] = d; q[qt++] = ni;
      }
    }
  }
  const MOBS = { vac: { hp: 60, spd: 150, dmg: 12, r: 26, pts: 10 }, mini: { hp: 25, spd: 230, dmg: 6, r: 16, pts: 5 }, big: { hp: 320, spd: 95, dmg: 28, r: 40, pts: 50 }, boss: { hp: 1400, spd: 85, dmg: 40, r: 62, pts: 500 } };
  // 웨이브를 넘길 때마다 모두에게 새 무기
  const UNLOCK = { 2: 'shotgun', 3: 'rapid', 5: 'rocket', 7: 'sniper' };
  function spawnMob(g) {
    const n = g.wave, roll = Math.random();
    const boss = n % 5 === 0 && !g.bossOut; if (boss) g.bossOut = true;
    const kind = boss ? 'boss' : n >= 3 && roll < 0.12 + n * 0.01 ? 'big' : roll < 0.45 ? 'mini' : 'vac', M = MOBS[kind];
    // 고양이들한테서 먼 가장자리에서 나온다
    let best = null, bd = -1;
    for (let k = 0; k < 14; k++) {
      const side = (Math.random() * 4) | 0, t = Math.random();
      let x = side < 2 ? t * W : side === 2 ? 40 : W - 40, y = side >= 2 ? t * H : side === 0 ? 40 : H - 40;
      const i = nearestWalk(x, y); if (i < 0) continue;
      x = (i % GW) * CELL + CELL / 2; y = ((i / GW) | 0) * CELL + CELL / 2;
      const d = Math.min(...g.cats.filter(c => !c.dead).map(c => hyp(c.x - x, c.y - y)), 1e9);
      if (d > bd) { bd = d; best = [x, y]; }
    }
    if (!best) return;
    const hpS = 1 + (n - 1) * 0.18, players = g.cats.length;
    g.mobs.push({ u: ++g.mobSeq, kind, x: best[0], y: best[1], vx: 0, vy: 0, r: M.r, hp: M.hp * hpS * (0.7 + players * 0.06), maxHp: M.hp * hpS * (0.7 + players * 0.06), spd: M.spd * (1 + n * 0.02), dmg: M.dmg, atkCd: 0, hitT: 0, a: 0 });
  }
  function stepMobs(g, dt) {
    g.flowT -= dt; if (g.flowT <= 0) { buildFlow(g); g.flowT = 0.35; }
    for (const m of g.mobs) {
      m.hitT = Math.max(0, m.hitT - dt); m.atkCd = Math.max(0, m.atkCd - dt);
      // 가까우면 바로 고양이로, 아니면 거리 지도 내리막
      let tx = null, ty = null, best = 1e9;
      for (const c of g.cats) { if (c.dead) continue; const d = hyp(c.x - m.x, c.y - m.y); if (d < best) { best = d; tx = c.x; ty = c.y; } }
      if (tx == null) break;
      let dx = 0, dy = 0;
      if (best < 220 && lineClear(m.x, m.y, tx, ty, m.r * 0.7)) { dx = tx - m.x; dy = ty - m.y; }
      else if (flow) {
        const gx = clamp(Math.floor(m.x / CELL), 0, GW - 1), gy = clamp(Math.floor(m.y / CELL), 0, GH - 1); let bv = flow[gy * GW + gx], bi = -1;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const v = flow[ny * GW + nx]; if (v < bv) { bv = v; bi = ny * GW + nx; } }
        if (bi >= 0) { dx = (bi % GW) * CELL + CELL / 2 - m.x; dy = ((bi / GW) | 0) * CELL + CELL / 2 - m.y; } else { dx = tx - m.x; dy = ty - m.y; }
      }
      const l = hyp(dx, dy) || 1, k = 1 - Math.exp(-dt * 8);
      m.vx += (dx / l * m.spd - m.vx) * k; m.vy += (dy / l * m.spd - m.vy) * k;
      // 서로 밀어내기
      for (const o of g.mobs) { if (o === m) continue; const ex = m.x - o.x, ey = m.y - o.y, d = hyp(ex, ey); if (d > 0 && d < m.r + o.r) { m.vx += ex / d * 60; m.vy += ey / d * 60; } }
      const px = m.x, py = m.y;
      m.x += m.vx * dt; m.y += m.vy * dt; resolve(m, g.blocks);
      m.a = Math.atan2(m.vy, m.vx);
      // 바리케이드에 막히면 부순다
      if (hyp(m.x - px, m.y - py) < m.spd * dt * 0.3) for (const b of g.blocks) {
        if (b.hp != null && circleHitsRect(m.x, m.y, m.r + 6, b) && m.atkCd <= 0) { b.hp -= m.dmg; m.atkCd = 0.7; if (b.hp <= 0) { b.t = 0; g.events.push({ k: 'wallbreak', x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2) }); } }
      }
      for (const c of g.cats) if (!c.dead && m.atkCd <= 0 && hyp(c.x - m.x, c.y - m.y) < c.r + m.r + 4) { hurt(g, c, m.dmg, -1); m.atkCd = 0.8; }
    }
    g.mobs = g.mobs.filter(m => m.hp > 0);
  }

  // 전투 봇: 보이는 적을 겨누고, 무기에 맞는 거리를 유지하며 옆으로 움직인다
  function botCombat(c, g) {
    const b = c.bot; b.dash = false; c.fire = false;
    if (c.dead) { b.dx = b.dy = 0; return; }
    if (hyp(c.x - b.lx, c.y - b.ly) < 4 && (b.dx || b.dy)) b.stuckT += 0.15; else b.stuckT = 0;
    b.lx = c.x; b.ly = c.y;
    if (b.stuckT > 0.6) { const a = Math.random() * 6.28; b.dx = Math.cos(a); b.dy = Math.sin(a); b.path = null; b.stuckT = 0; b.wig = g.clock + 0.35; return; }
    if (g.clock < b.wig) return;
    const W0 = WEAPONS[c.wpn] || WEAPONS.pistol, range = W0.spd * W0.life * 0.85;
    const pref = c.wpn === 'sniper' ? 520 : c.wpn === 'shotgun' ? 130 : 280;
    let tgt = null, td = 1e9;
    if (g.mode === 'zombie') { for (const m of g.mobs) { const d = hyp(m.x - c.x, m.y - c.y); if (d < td && d < 700 && sightClear(c.x, c.y, m.x, m.y)) { td = d; tgt = m; } } }
    else for (const o of g.cats) { if (o.team === c.team || o.dead) continue; const d = hyp(o.x - c.x, o.y - c.y); if (d < td && teamSees(g, c.team, o)) { td = d; tgt = o; } }
    // 힐러: 다친 아군 옆으로
    let healT = null;
    if (c.wpn === 'churu') for (const o of g.cats) if (o !== c && o.team === c.team && !o.dead && o.hp < o.maxHp * 0.7 && hyp(o.x - c.x, o.y - c.y) < 500) { healT = o; break; }
    let dir = [0, 0];
    if (tgt) {
      const lead = td / W0.spd, ax = tgt.x + (tgt.vx || 0) * lead, ay = tgt.y + (tgt.vy || 0) * lead;
      c.gunA = Math.atan2(ay - c.y, ax - c.x) + (Math.random() - 0.5) * 0.12;
      c.fire = td < range && lineClear(c.x, c.y, tgt.x, tgt.y, 4);
      const side = Math.sin(g.clock * 1.3 + c.id) > 0 ? 1 : -1, ux = (tgt.x - c.x) / td, uy = (tgt.y - c.y) / td;
      if (c.hp < c.maxHp * 0.3 && g.mode !== 'zombie') { dir = [-ux, -uy]; b.dash = true; }
      else if (td > pref + 80) dir = goTo(c, tgt.x, tgt.y, g);
      else if (td < pref - 80) dir = [-ux + -uy * side * 0.6, -uy + ux * side * 0.6];
      else dir = [-uy * side, ux * side];
      // 스킬
      if (c.sk[0] <= 0) {
        const s0 = skillsOf(c, g)[0].id;
        if (s0 === 'nade' && td > 140 && td < 380 && Math.random() < 0.3) useSkill(g, c, 0);
        else if (s0 === 'shield' && c.hp < c.maxHp * 0.8 && g.clock - c.lastHit < 1) useSkill(g, c, 0);
        else if (s0 === 'camo' && c.hp < c.maxHp * 0.5) useSkill(g, c, 0);
        else if (s0 === 'wall' && td < 260 && Math.random() < 0.25) useSkill(g, c, 0);
      }
    } else {
      c.gunA = Math.atan2(b.dy || 0.01, b.dx || 0.01);
      let goal = null;
      if (healT) goal = [healT.x, healT.y];
      else if (g.mode === 'hero' && g.cp) goal = [g.cp.x + Math.cos(c.id * 2.1) * 90, g.cp.y + Math.sin(c.id * 2.1) * 90];
      else if (g.mode === 'zombie') { const al = g.cats.filter(o => !o.dead); goal = [al.reduce((a, o) => a + o.x, 0) / al.length, al.reduce((a, o) => a + o.y, 0) / al.length]; }
      else {
        if (!b.goal || hyp(b.goal.x - c.x, b.goal.y - c.y) < 60) { const bx = g.boxes.filter(x => x.t <= 0); const pick = bx.length && Math.random() < 0.5 ? bx[(Math.random() * bx.length) | 0] : null; b.goal = pick ? { x: pick.x, y: pick.y } : { x: R + Math.random() * (W - 2 * R), y: R + Math.random() * (H - 2 * R) }; if (blockedPt(b.goal.x, b.goal.y, R)) b.goal = null; }
        if (b.goal) goal = [b.goal.x, b.goal.y];
      }
      if (goal && hyp(goal[0] - c.x, goal[1] - c.y) > 50) dir = goTo(c, goal[0], goal[1], g);
    }
    if (healT && !tgt) { c.gunA = Math.atan2(healT.y - c.y, healT.x - c.x); c.fire = hyp(healT.x - c.x, healT.y - c.y) < 400; }
    if (c.items[0] === 'fish' || (c.items[0] && tgt)) useItem(g, c);
    b.dx = dir[0]; b.dy = dir[1];
  }

  function stepCombat(g, dt) {
    g.timeLeft -= dt;
    // 고양이
    for (const c of g.cats) {
      c.fireCd = Math.max(0, c.fireCd - dt); c.shieldT = Math.max(0, (c.shieldT || 0) - dt);
      if (c.dead) {
        if (c.respawnT > 0) {
          c.respawnT -= dt;
          if (c.respawnT <= 0) { const [sx, sy] = spawnPos(c.team, c.id - c.team * g.ts); c.x = sx; c.y = sy; c.dead = false; c.hp = c.maxHp; c.immune = 1.5; g.events.push({ k: 'respawn', id: c.id }); }
        } else if (g.mode === 'zombie') {
          // 동료가 옆에 2초 있으면 부활
          const helper = g.cats.find(o => !o.dead && hyp(o.x - c.x, o.y - c.y) < 70);
          c.revT = helper ? (c.revT || 0) + dt : 0;
          if (c.revT > 2) { c.dead = false; c.hp = c.maxHp * 0.4; c.immune = 1.5; c.revT = 0; g.events.push({ k: 'revive', id: c.id, by: helper.id }); }
        }
      } else if (g.clock - c.lastHit > 4) c.hp = Math.min(c.maxHp, c.hp + 8 * dt); // 안 맞으면 천천히 회복
      // 힐러 주변 회복
      if (!c.dead && c.wpn === 'churu') for (const o of g.cats) if (o !== c && o.team === c.team && !o.dead && hyp(o.x - c.x, o.y - c.y) < 170) o.hp = Math.min(o.maxHp, o.hp + 7 * dt);
      if (c.kind === 'remote') { tickTimers(c, dt); c.hideIdx = hideAt(c.x, c.y); c.hidden = c.hideIdx >= 0 || c.camoT > 0; }
      else {
        let ix = 0, iy = 0, dash = false;
        if (c.kind === 'bot') { c.bot.cd -= dt; if (c.bot.cd <= 0) { botCombat(c, g); c.bot.cd = 0.1 + Math.random() * 0.06; } ix = c.bot.dx; iy = c.bot.dy; dash = c.bot.dash; }
        else { const inp = g.localInput[c.id] || {}; ix = inp.x || 0; iy = inp.y || 0; dash = !!inp.dash; if (typeof inp.ga === 'number') c.gunA = inp.ga; c.fire = !!inp.fire; }
        if (moveCat(c, g, ix, iy, dash, dt)) g.events.push({ k: 'dash', id: c.id });
      }
      if (c.fire && !c.dead && c.fireCd <= 0) { fireCat(g, c); if (c.camoT > 0) c.camoT = 0; }
    }
    // 총알
    for (const sh of g.shots) {
      const steps = 2;
      for (let k = 0; k < steps && sh.life > 0; k++) {
        sh.x += sh.vx * dt / steps; sh.y += sh.vy * dt / steps;
        if (shotBlocked(sh.x, sh.y)) { sh.life = 0; sh.hit = true; break; }
        let hitBlock = false;
        for (const b of g.blocks) if (sh.x > b.x && sh.x < b.x + b.w && sh.y > b.y && sh.y < b.y + b.h) { if (b.team !== sh.team) { hitBlock = true; if (b.hp != null) b.hp -= sh.dmg * 0.5; } }
        if (hitBlock) { sh.life = 0; sh.hit = true; break; }
        for (const c of g.cats) {
          if (c.dead || c.id === sh.owner || hyp(c.x - sh.x, c.y - sh.y) > c.r + 6) continue;
          if (c.team === sh.team) { if (sh.w === 'churu') { c.hp = Math.min(c.maxHp, c.hp + sh.dmg); sh.life = 0; g.events.push({ k: 'heal', id: c.id }); } continue; }
          hurt(g, c, sh.dmg, sh.owner, sh.x - sh.vx * 0.05, sh.y - sh.vy * 0.05); sh.life = 0; sh.hit = true; break;
        }
        if (sh.life > 0) for (const m of g.mobs) if (m.hp > 0 && hyp(m.x - sh.x, m.y - sh.y) < m.r + 6) { hurtMob(g, m, sh.dmg, sh.owner); sh.life = 0; sh.hit = true; break; }
      }
      sh.life -= dt;
      if (sh.life <= 0 && WEAPONS[sh.w] && WEAPONS[sh.w].boom) boom(g, sh.x - (sh.hit ? sh.vx * 0.02 : 0), sh.y - (sh.hit ? sh.vy * 0.02 : 0), sh.team, sh.owner);
    }
    g.shots = g.shots.filter(s => s.life > 0);
    // 털뭉치 폭탄
    for (const n of g.nades) { n.t += dt; const k = Math.min(1, n.t / n.T); n.x = n.sx + (n.tx - n.sx) * k; n.y = n.sy + (n.ty - n.sy) * k; if (n.t >= n.T) { n.done = true; boom(g, n.tx, n.ty, n.team, n.owner); } }
    g.nades = g.nades.filter(n => !n.done);
    for (const b of g.blocks) b.t -= dt;
    g.blocks = g.blocks.filter(b => b.t > 0 && (b.hp == null || b.hp > 0));
    // 아이템 상자: 총싸움은 무기·회복, 나머지는 기존 아이템
    for (const bx of g.boxes) {
      if (bx.t > 0) { bx.t -= dt; continue; }
      for (const c of g.cats) {
        if (c.dead || hyp(c.x - bx.x, c.y - bx.y) > c.r + 22) continue;
        if (g.mode === 'hero') { c.hp = Math.min(c.maxHp, c.hp + 60); bx.t = 10; g.events.push({ k: 'pick', id: c.id, s: 'heal', x: bx.x, y: bx.y }); break; }
        const roll = Math.random();
        if (roll < 0.55) { const pool = g.mode === 'zombie' ? ['shotgun', 'rapid', 'sniper', 'rocket', 'rocket'] : ['shotgun', 'rapid', 'sniper'], w = pool[(Math.random() * pool.length) | 0]; c.wpn = w; g.events.push({ k: 'pick', id: c.id, s: 'w:' + w, x: bx.x, y: bx.y }); }
        else if (roll < 0.85 || c.items.length >= TUNE.itemMax) { c.hp = Math.min(c.maxHp, c.hp + 50); g.events.push({ k: 'pick', id: c.id, s: 'heal', x: bx.x, y: bx.y }); }
        else { const it = ITEMS[(Math.random() * ITEMS.length) | 0].id; c.items.push(it); g.events.push({ k: 'pick', id: c.id, s: it, x: bx.x, y: bx.y }); }
        bx.t = TUNE.boxRespawn + 3; break;
      }
    }
    // 모드별 승패
    if (g.mode === 'gun') {
      for (const t of [0, 1]) if (g.scores[t] >= g.killGoal) { endRound(g, t, 'kills'); return; }
      if (g.timeLeft <= 0) { g.timeLeft = 0; endRound(g, g.scores[0] === g.scores[1] ? -1 : g.scores[0] > g.scores[1] ? 0 : 1, 'time'); }
    } else if (g.mode === 'hero') {
      const cp = g.cp, inside = [0, 0];
      for (const c of g.cats) if (!c.dead && hyp(c.x - cp.x, c.y - cp.y) < cp.r) inside[c.team]++;
      const own = inside[0] && !inside[1] ? 0 : inside[1] && !inside[0] ? 1 : -1;
      cp.contested = inside[0] > 0 && inside[1] > 0;
      if (own >= 0) { cp.prog[own] = Math.min(100, cp.prog[own] + dt * (1.6 + Math.min(inside[own], 3) * 0.5)); if (cp.owner !== own) { cp.owner = own; g.events.push({ k: 'cap', team: own }); } }
      g.scores = [Math.floor(cp.prog[0]), Math.floor(cp.prog[1])];
      for (const t of [0, 1]) if (cp.prog[t] >= 100) { endRound(g, t, 'cap'); return; }
      if (g.timeLeft <= 0) { g.timeLeft = 0; endRound(g, cp.prog[0] === cp.prog[1] ? -1 : cp.prog[0] > cp.prog[1] ? 0 : 1, 'time'); }
    } else if (g.mode === 'zombie') {
      g.timeLeft = 999;
      if (g.waveLeft <= 0 && !g.mobs.length) {
        if (g.breakT > 0) {
          g.breakT -= dt;
          if (g.breakT <= 0) {
            g.wave++; g.waveLeft = Math.round((5 + g.wave * 4) * (0.6 + g.cats.length * 0.12)); g.spawnT = 0; g.bossOut = false;
            const uw = UNLOCK[g.wave]; if (uw) { for (const c of g.cats) c.wpn = uw; g.events.push({ k: 'unlock', w: uw }); }
            for (const c of g.cats) if (c.dead) { c.dead = false; c.hp = c.maxHp * 0.6; c.immune = 2; }
            g.events.push({ k: 'wave', n: g.wave });
          }
        } else { g.breakT = 6; g.scores = [g.wave, 0]; if (g.wave > 0) g.events.push({ k: 'waveclear', n: g.wave }); }
      }
      if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }
      if (g.waveLeft > 0) { g.spawnT -= dt; if (g.spawnT <= 0) { spawnMob(g); g.waveLeft--; g.spawnT = Math.max(0.25, 1.3 - g.wave * 0.08); } }
      stepMobs(g, dt);
      if (g.cats.every(c => c.dead)) { g.scores = [g.wave, 0]; endRound(g, 1, 'wipe'); }
    }
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
    if (g.mode && g.mode !== 'tag') { stepCombat(g, dt); return; }
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
        if (c.frozen || hyp(c.x - bx.x, c.y - bx.y) > c.r + 22) continue;
        if (c.items.length >= TUNE.itemMax) {
          if (!(g.clock - (bx.full || -9) < 2)) { bx.full = g.clock; g.events.push({ k: 'full', id: c.id, x: bx.x, y: bx.y }); }
          continue;
        }
        const it = ITEMS[(Math.random() * ITEMS.length) | 0].id;
        c.items.push(it); bx.t = TUNE.boxRespawn;
        g.events.push({ k: 'pick', id: c.id, s: it, x: bx.x, y: bx.y });
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
    for (const c of g.cats) if (c.whiff) { c.whiff = false; g.events.push({ k: 'whiff', id: c.id, x: Math.round(c.x), y: Math.round(c.y) }); }
    const chasers = g.cats.filter(c => c.team === g.chaserTeam), runners = g.cats.filter(c => c.team !== g.chaserTeam);
    // 털뭉치 트랩
    for (let i = g.traps.length - 1; i >= 0; i--) {
      const t = g.traps[i]; t.t -= dt;
      if (t.t <= 0) { g.traps.splice(i, 1); continue; }
      for (const ch of chasers) {
        if (ch.team === t.team || g.hold > 0 || ch.rootT > 0) continue;
        if (hyp(ch.x - t.x, ch.y - t.y) < ch.r + 18) {
          ch.rootT = 1.0; ch.stun = 1.8; ch.pounceT = 0; ch.windT = 0; ch.pounced = false; ch.vx = ch.vy = 0;
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
      if (s && !g.seen[r.id] && g.spotCd[r.id] <= 0) {
        g.events.push({ k: 'spot', id: r.id, x: Math.round(r.x), y: Math.round(r.y) }); g.spotCd[r.id] = 4;
        r.scareT = TUNE.scare; // 깜짝 놀라서 잠깐 빨라진다
      }
      g.seen[r.id] = s;
    }
    if (g.hold <= 0) for (const ch of chasers) {
      if (ch.stun > 0) continue;
      const reach = ch.r * 2 + (ch.pounceT > 0 ? 16 : 0);
      for (const r of runners) {
        if (r.frozen) continue;
        const d = hyp(ch.x - r.x, ch.y - r.y);
        if (r.immune <= 0 && d < reach) {
          r.frozen = true; r.vx = r.vy = 0; r.boostT = 0; r.scareT = 0; ch.stun = 0.35; ch.pounceT = 0; ch.pounced = false;
          g.events.push({ k: 'freeze', id: r.id, by: ch.id, x: Math.round(r.x), y: Math.round(r.y), last: runners.every(o => o.frozen), deep: (r.thaws | 0) >= TUNE.maxThaw });
        } else if (d < reach + 26 && g.closeCd[r.id] <= 0) {
          g.closeCd[r.id] = 3.5; g.events.push({ k: 'close', id: r.id, x: Math.round(r.x), y: Math.round(r.y) });
        }
      }
    }
    for (const a of runners) for (const b of runners) {
      if (a !== b && !a.frozen && b.frozen && (b.thaws | 0) < TUNE.maxThaw && hyp(a.x - b.x, a.y - b.y) < a.r + b.r + TUNE.unfreezeR) {
        b.frozen = false; b.immune = TUNE.immune; b.thaws = (b.thaws | 0) + 1;
        g.events.push({ k: 'unfreeze', id: b.id, by: a.id, x: Math.round(b.x), y: Math.round(b.y) });
      }
    }
    if (runners.every(r => r.frozen)) endRound(g, g.chaserTeam, 'all');
    else if (g.timeLeft <= 0) { g.timeLeft = 0; endRound(g, 1 - g.chaserTeam, 'time'); }
  }

  const api = {
    R, BASE, ROUNDS, SEE, TEAM_NAME, skillCd, CELL, SKILLS, ITEMS, TUNE, spawnPos, MAPS, MAP_IDS: Object.keys(MAPS),
    setMap, blockedPt, hideAt, resolve, lineClear, sightClear, astar, createGame, startMatch, beginRound, placeCats, stepGame,
    moveCat, useSkill, useItem, say, skillsOf, makeShots, shotBlocked, MODES, WEAPONS, WEAPON_IDS, CLASSES, CLASS_IDS, MOBS, visibleTo, teamSees, sniffed, isHeld, tickTimers,
  };
  setMap('house');
  root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
