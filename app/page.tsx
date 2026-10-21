'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Gift } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   components/GiftIntro.tsx   (drop-in replacement, same API: <GiftIntro onComplete />)

   1. Realistic 3D gift box (paper + ribbon + bow, PBR lighting, soft shadows)
   2. 3 clicks -> every click = real hop / wobble / squash physics
   3. 3rd click -> bow unties, ribbon unwraps, lid flies off, sparkles burst
   4. Words + emojis are sown out of the box like seeds across the screen
   5. Box shrinks away, words spiral into a vortex and spin as a 3D globe
   6. Globe collapses into a flash -> intro fades -> onComplete() -> your page
──────────────────────────────────────────────────────────────────────────── */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ───────────── procedural textures ───────────── */
function makePaperTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b3b2e';
  g.fillRect(0, 0, size, size);

  g.strokeStyle = 'rgba(16,185,129,0.25)';
  g.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + size, size); g.stroke();
    g.beginPath(); g.moveTo(i + size, 0); g.lineTo(i, size); g.stroke();
  }

  g.fillStyle = 'rgba(250,222,130,0.9)';
  for (let x = 0; x <= size; x += 32) {
    for (let y = 0; y <= size; y += 32) {
      if ((((x - y) % 64) + 64) % 64 === 32 && (x + y) % 64 === 32) {
        g.beginPath();
        g.moveTo(x, y - 9); g.lineTo(x + 3, y - 3); g.lineTo(x + 9, y);
        g.lineTo(x + 3, y + 3); g.lineTo(x, y + 9); g.lineTo(x - 3, y + 3);
        g.lineTo(x - 9, y); g.lineTo(x - 3, y - 3);
        g.closePath(); g.fill();
      }
    }
  }

  for (let i = 0; i < 5000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ───────────── 3D GIFT SCENE ───────────── */
type GiftScene = {
  pick: (clientX: number, clientY: number) => boolean;
  kick: (strength: number) => void;
  open: () => void;
  exit: () => void;
  resize: () => void;
  dispose: () => void;
};

function createGiftScene(container: HTMLElement, onExited: () => void): GiftScene {
  const BODY_W = 10;
  const BODY_H = 8;
  const LID_W = 10.8;
  const LID_H = 2.6;
  const STRAP_W = 1.9;
  const LID_BASE_Y = BODY_H + LID_H / 2 - 0.45;

  const getSize = () => ({ w: container.clientWidth || window.innerWidth, h: container.clientHeight || window.innerHeight });
  let { w, h } = getSize();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // lights (emerald + purple rim to match the site's palette)
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(14, 26, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xa855f7, 2.4);
  rim.position.set(-18, 12, -14);
  const fill = new THREE.DirectionalLight(0x10b981, 0.8);
  fill.position.set(-12, 6, 18);
  scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.15));

  // podium
  const stage = new THREE.Group();
  scene.add(stage);
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11.6, 0.6, 96),
    new THREE.MeshStandardMaterial({ color: 0x0a1210, metalness: 0.85, roughness: 0.28 })
  );
  podium.position.y = -0.3;
  podium.receiveShadow = true;
  stage.add(podium);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(11.3, 0.07, 12, 128),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.2 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  stage.add(ring);

  // materials
  const paperTex = makePaperTexture();
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTex, bumpMap: paperTex, bumpScale: 0.6, roughness: 0.5, metalness: 0.05 });
  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xe9c46a, metalness: 0.75, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 });

  const mark = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const gift = new THREE.Group();
  gift.rotation.order = 'YXZ';
  scene.add(gift);

  const body = mark(new THREE.Mesh(new RoundedBoxGeometry(BODY_W, BODY_H, BODY_W, 6, 0.35), paperMat));
  body.position.y = BODY_H / 2;
  gift.add(body);

  const bs1 = mark(new THREE.Mesh(new THREE.BoxGeometry(STRAP_W, BODY_H + 0.01, BODY_W + 0.1), ribbonMat));
  const bs2 = mark(new THREE.Mesh(new THREE.BoxGeometry(BODY_W + 0.1, BODY_H + 0.02, STRAP_W), ribbonMat));
  bs1.position.y = bs2.position.y = BODY_H / 2;
  gift.add(bs1, bs2);

  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x021a12, emissive: 0x34ffb0, emissiveIntensity: 0 });
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(BODY_W - 1.4, BODY_W - 1.4), mouthMat);
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = BODY_H + 0.03;
  gift.add(mouth);

  const lid = new THREE.Group();
  lid.position.y = LID_BASE_Y;
  gift.add(lid);
  lid.add(mark(new THREE.Mesh(new RoundedBoxGeometry(LID_W, LID_H, LID_W, 6, 0.3), paperMat)));
  const ls1 = mark(new THREE.Mesh(new THREE.BoxGeometry(STRAP_W + 0.1, LID_H + 0.05, LID_W + 0.1), ribbonMat));
  const ls2 = mark(new THREE.Mesh(new THREE.BoxGeometry(LID_W + 0.1, LID_H + 0.08, STRAP_W + 0.1), ribbonMat));
  lid.add(ls1, ls2);

  // bow
  const bow = new THREE.Group();
  const BOW_Y = LID_H / 2 + 0.06;
  bow.position.y = BOW_Y;
  lid.add(bow);
  const loopGeo = new THREE.TorusGeometry(1.55, 0.34, 20, 56);
  for (const ry of [0, Math.PI / 2]) {
    const set = new THREE.Group();
    set.rotation.y = ry;
    for (const side of [-1, 1]) {
      const loop = mark(new THREE.Mesh(loopGeo, ribbonMat));
      loop.scale.set(1, 1.15, 0.5);
      loop.position.set(side * 1.75, 1.2, 0);
      loop.rotation.z = -side * 0.55;
      set.add(loop);
    }
    bow.add(set);
  }
  const knot = mark(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ribbonMat));
  knot.scale.set(1.2, 0.85, 1.2);
  knot.position.y = 0.5;
  bow.add(knot);
  for (const side of [-1, 1]) {
    const tail = mark(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 4.2), ribbonMat));
    tail.position.set(side * 0.7, 0.1, 1.9);
    tail.rotation.y = side * 0.35;
    bow.add(tail);
  }

  // sparkles + glow
  const glowTex = makeGlowTexture();
  const N = 260;
  const pPos = new Float32Array(N * 3);
  const pVel = new Float32Array(N * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.9, map: glowTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0x7dffd0, opacity: 0,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x34ffb0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
  }));
  glow.position.set(0, 9, 0);
  scene.add(glow);

  // camera
  let baseDist = 34;
  let dolly = 0;
  const frameCamera = () => {
    const aspect = w / h;
    camera.aspect = aspect;
    baseDist = aspect < 1 ? (34 / Math.max(aspect, 0.45)) * 0.8 : 34;
    camera.position.set(0, 10, baseDist * (1 - 0.1 * dolly));
    camera.lookAt(0, 5, 0);
    camera.updateProjectionMatrix();
  };
  frameCamera();

  // physics
  const G = 48;
  let hop = 0, hopV = 0;
  let tiltX = 0, tiltXV = 0, tiltZ = 0, tiltZV = 0;
  let yaw = 0, spinV = 0, idleSpin = 0.28;
  let sq = 0, sqV = 0;
  const sgn = () => (Math.random() < 0.5 ? -1 : 1);

  const kick = (s: number) => {
    hopV = 5.5 + s * 3.2;
    tiltXV += sgn() * (0.8 + Math.random() * 0.5) * (0.7 + 0.35 * s);
    tiltZV += sgn() * (0.8 + Math.random() * 0.5) * (0.7 + 0.35 * s);
    spinV += sgn() * (2.5 + s * 1.8);
  };

  let elapsed = 0;
  let openT0 = -1;
  let burstDone = false;
  let burstT0 = -1;
  let exitT0 = -1;
  let exitScale = 1;
  let raf = 0;
  let last = performance.now();
  let stopped = false;

  const burst = () => {
    burstT0 = elapsed;
    for (let i = 0; i < N; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 6;
      pPos[i * 3 + 1] = BODY_H + 0.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      pVel[i * 3] = (Math.random() - 0.5) * 12;
      pVel[i * 3 + 1] = 8 + Math.random() * 16;
      pVel[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
  };

  const tick = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    elapsed += dt;

    hopV -= G * dt;
    hop += hopV * dt;
    if (hop < 0) {
      hop = 0;
      if (hopV < -2) {
        const imp = -hopV;
        hopV = imp * 0.25;
        if (hopV < 1.5) hopV = 0;
        sqV += imp * 1.2;
        tiltXV += (Math.random() - 0.5) * imp * 0.12;
        tiltZV += (Math.random() - 0.5) * imp * 0.12;
      } else {
        hopV = 0;
      }
    }
    tiltXV += (-70 * tiltX - 2.5 * tiltXV) * dt; tiltX += tiltXV * dt;
    tiltZV += (-70 * tiltZ - 2.5 * tiltZV) * dt; tiltZ += tiltZV * dt;
    sqV += (-140 * sq - 9 * sqV) * dt; sq += sqV * dt;
    spinV *= Math.exp(-2.2 * dt);
    yaw += (spinV + idleSpin) * dt;

    gift.position.y = hop;
    gift.rotation.set(tiltX, yaw, tiltZ);

    if (openT0 >= 0) {
      idleSpin = 0;
      const t = elapsed - openT0;

      const pb = clamp01(t / 1.1);
      if (pb < 1) {
        bow.position.y = BOW_Y + 5 * easeOutCubic(pb);
        bow.rotation.y = pb * 7;
        bow.scale.setScalar(Math.max(0.02, 1 + 0.2 * Math.sin(Math.PI * pb) - 0.95 * easeInCubic(pb)));
      } else bow.visible = false;

      const ps = clamp01((t - 0.6) / 0.7);
      const es = easeInOutCubic(ps);
      bs1.scale.x = ls1.scale.x = Math.max(0.001, 1 - es);
      bs2.scale.z = ls2.scale.z = Math.max(0.001, 1 - es);
      if (ps >= 1) { bs1.visible = bs2.visible = ls1.visible = ls2.visible = false; }

      const pl = clamp01((t - 1.3) / 1.3);
      if (pl > 0 && pl < 1) {
        lid.position.y = LID_BASE_Y + 3 * easeOutCubic(Math.min(pl * 2, 1)) + 30 * easeInCubic(pl);
        lid.position.x = 14 * pl * pl;
        lid.rotation.z = -0.9 * pl;
        lid.rotation.x = 0.6 * pl;
        lid.rotation.y = 1.4 * pl;
      }
      if (pl >= 1) lid.visible = false;

      if (t >= 1.3 && !burstDone) { burstDone = true; burst(); }
      mouthMat.emissiveIntensity = 1.6 * easeOutCubic(clamp01((t - 1.5) / 0.8));

      const pg = clamp01((t - 1.2) / 1.6);
      glow.scale.setScalar(6 + 22 * pg);
      (glow.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * pg) * 0.9;

      dolly = easeInOutCubic(clamp01(t / 2));
      camera.position.z = baseDist * (1 - 0.1 * dolly);
    }

    if (burstT0 >= 0) {
      const tb = elapsed - burstT0;
      for (let i = 0; i < N; i++) {
        pVel[i * 3 + 1] -= 9 * dt;
        pPos[i * 3] += pVel[i * 3] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = tb < 0.15 ? tb / 0.15 : clamp01(1 - (tb - 0.8) / 2.2);
    }

    if (exitT0 >= 0) {
      const p = clamp01((elapsed - exitT0) / 0.9);
      exitScale = Math.max(0.0001, 1 - easeInCubic(p));
      yaw += dt * 9 * p;
      stage.scale.setScalar(exitScale);
      if (p >= 1) {
        gift.visible = false;
        stage.visible = false;
        glow.visible = false;
        points.visible = false;
        stopped = true;
        cancelAnimationFrame(raf);
        onExited();
        return;
      }
    }
    gift.scale.set((1 + sq * 0.03) * exitScale, (1 - sq * 0.05) * exitScale, (1 + sq * 0.03) * exitScale);

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  return {
    pick: (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(gift, true).length > 0;
    },
    kick,
    open: () => { openT0 = elapsed; },
    exit: () => { exitT0 = elapsed; },
    resize: () => {
      ({ w, h } = getSize());
      renderer.setSize(w, h);
      frameCamera();
    },
    dispose: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) {
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
            const mm = x as THREE.MeshStandardMaterial;
            mm.map?.dispose();
            mm.bumpMap?.dispose();
            x.dispose();
          });
        }
      });
      glowTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
  };
}

/* ───────────── WORDS that burst out of the box ───────────── */
const WORD_POOL: { t: string; c: string; s: number }[] = [
  { t: 'ASTROID', c: '#ffffff', s: 44 }, { t: 'GAMING', c: '#10b981', s: 40 }, { t: 'CLOUD', c: '#a855f7', s: 40 },
  { t: 'STREAM', c: '#34d399', s: 26 }, { t: 'CHAT', c: '#22d3ee', s: 26 }, { t: 'CLIP', c: '#a78bfa', s: 26 },
  { t: 'SQUAD', c: '#ffffff', s: 26 }, { t: 'LFG', c: '#10b981', s: 30 }, { t: 'STUDIO', c: '#34d399', s: 24 },
  { t: 'XP', c: '#a855f7', s: 28 }, { t: 'LIVE', c: '#f87171', s: 24 }, { t: 'RTMP', c: '#22d3ee', s: 18 },
  { t: 'E2EE', c: '#34d399', s: 18 }, { t: 'RBAC', c: '#a78bfa', s: 18 }, { t: 'VAULT', c: '#ffffff', s: 22 },
  { t: 'NEURAL', c: '#10b981', s: 22 }, { t: 'LEVEL UP', c: '#fbbf24', s: 24 }, { t: 'GG', c: '#ffffff', s: 34 },
  { t: 'WIN', c: '#fbbf24', s: 28 }, { t: 'ZERO LIMITS', c: '#34d399', s: 18 }, { t: 'SHORTS', c: '#22d3ee', s: 20 },
  { t: 'MATCHMAKER', c: '#a78bfa', s: 18 }, { t: 'DASHBOARD', c: '#ffffff', s: 18 }, { t: 'CREATE', c: '#10b981', s: 22 },
  { t: '🎮', c: '#fff', s: 40 }, { t: '🚀', c: '#fff', s: 36 }, { t: '🔥', c: '#fff', s: 34 }, { t: '💚', c: '#fff', s: 30 },
  { t: '⚡', c: '#fff', s: 34 }, { t: '🎯', c: '#fff', s: 32 }, { t: '🎬', c: '#fff', s: 32 }, { t: '💬', c: '#fff', s: 30 },
  { t: '📡', c: '#fff', s: 30 }, { t: '🛡️', c: '#fff', s: 30 }, { t: '🏆', c: '#fff', s: 36 }, { t: '👾', c: '#fff', s: 34 },
];

type Word = {
  el: HTMLSpanElement;
  w: number; h: number;
  sx: number; sy: number;
  arc: number; sr: number; swirl: number; ph: number;
  d1: number; d2: number; d3: number;
  v0: number; v1: number; v2: number;
  done: boolean;
};

export default function GiftIntro({ onComplete }: { onComplete: () => void }) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const wordLayerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GiftScene | null>(null);
  const timers = useRef<number[]>([]);
  const wordRaf = useRef(0);
  const clicksRef = useRef(0);
  const finishedRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const [clicks, setClicks] = useState(0);
  const [running, setRunning] = useState(false);
  const [boxGone, setBoxGone] = useState(false);
  const [fading, setFading] = useState(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** fade the whole intro out, then hand control back to the page */
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(wordRaf.current);
    setFading(true);
    later(() => completeRef.current(), 700);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const host = canvasHostRef.current;
    if (!host) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      completeRef.current();
      return;
    }

    let gs: GiftScene;
    try {
      gs = createGiftScene(host, () => setBoxGone(true));
    } catch (err) {
      console.error('WebGL init failed, skipping gift intro', err);
      completeRef.current();
      return;
    }
    sceneRef.current = gs;

    const onResize = () => gs.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      gs.dispose();
      sceneRef.current = null;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      cancelAnimationFrame(wordRaf.current);
      document.body.style.overflow = '';
    };
  }, []);

  /* seeds -> vortex -> globe -> collapse */
  const startWords = () => {
    const layer = wordLayerRef.current;
    const core = coreRef.current;
    const flash = flashRef.current;
    if (!layer) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;
    const ox0 = cx;
    const oy0 = vh * 0.5; // where the box mouth is on screen

    // use the pool twice on big screens so the globe looks full
    const pool = vw > 700 ? [...WORD_POOL, ...WORD_POOL.slice(0, 24)] : WORD_POOL;
    const n = pool.length;
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    const scaleK = vw < 600 ? 0.7 : 1;

    const words: Word[] = pool.map((p, i) => {
      const el = document.createElement('span');
      el.textContent = p.t;
      Object.assign(el.style, {
        position: 'absolute', left: '0px', top: '0px', whiteSpace: 'nowrap',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontWeight: '800', letterSpacing: '0.08em', color: p.c,
        fontSize: `${Math.round(p.s * scaleK)}px`, lineHeight: '1.2',
        textShadow: `0 0 14px ${p.c}aa`,
        willChange: 'transform, opacity', opacity: '0',
      } as Partial<CSSStyleDeclaration>);
      layer.appendChild(el);
      const r = el.getBoundingClientRect();

      const idx = order[i];
      const y = 1 - (2 * (idx + 0.5)) / n;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = idx * 2.399963229728653;

      return {
        el, w: r.width, h: r.height,
        sx: vw * (0.05 + 0.9 * Math.random()), sy: vh * (0.08 + 0.84 * Math.random()),
        arc: 80 + Math.random() * 180, sr: (Math.random() - 0.5) * 120,
        swirl: Math.PI * 2 * (1 + Math.random() * 0.4), ph: Math.random() * 6.28,
        d1: Math.random() * 550, d2: Math.random() * 650, d3: Math.random() * 700,
        v0: Math.cos(phi) * rr, v1: y, v2: Math.sin(phi) * rr,
        done: false,
      };
    });

    const GATHER = 1900;   // vortex starts
    const COLLAPSE = 5800; // globe collapses into the core
    const R = Math.min(vw, vh) * 0.34;
    const F = R * 3.4;
    const t0 = performance.now();
    let boxExited = false;
    let flashed = false;

    const step = (now: number) => {
      const t = now - t0;

      if (!boxExited && t > 900) {
        boxExited = true;
        sceneRef.current?.exit();
      }

      const u = Math.max(0, (t - GATHER) / 1000);
      const yaw = 0.35 * u + 0.18 * u * u;
      const pitch = 0.42 + 0.22 * Math.sin(u * 0.8);
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);

      let alive = 0;
      for (const wd of words) {
        if (wd.done) continue;

        const x1 = wd.v0 * cyaw + wd.v2 * syaw;
        const z1 = -wd.v0 * syaw + wd.v2 * cyaw;
        const y1 = wd.v1 * cp - z1 * sp;
        const z2 = wd.v1 * sp + z1 * cp;
        const persp = F / (F - z2 * R);
        const ox = cx + x1 * R * persp;
        const oy = cy + y1 * R * persp;
        const os = persp * 0.85;
        const oo = 0.3 + 0.7 * ((z2 + 1) / 2);

        // A: seeds fly out of the box
        const p1 = clamp01((t - wd.d1) / 1100);
        const e1 = easeOutCubic(p1);
        let x = lerp(ox0, wd.sx, e1);
        let y = lerp(oy0, wd.sy, e1) - Math.sin(Math.PI * e1) * wd.arc;
        if (p1 >= 1) {
          x += Math.sin(t * 0.0013 + wd.ph) * 4;
          y += Math.cos(t * 0.0011 + wd.ph) * 4;
        }
        let rot = wd.sr * e1;
        let sc = 0.15 + 0.85 * e1;
        let op = clamp01(p1 * 5);
        let z = 0;

        // B: spiral into the globe
        const p2 = clamp01((t - GATHER - wd.d2) / 1500);
        if (p2 > 0) {
          const e2 = easeInOutCubic(p2);
          const ang = e2 * wd.swirl;
          const rx = x - cx, ry = y - cy;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          x = cx + lerp(rx * ca - ry * sa, ox - cx, e2);
          y = cy + lerp(rx * sa + ry * ca, oy - cy, e2);
          rot = lerp(rot, 0, e2);
          sc = lerp(sc, os, e2);
          op = lerp(op, oo, e2);
          z = Math.round((z2 + 1) * 100) * e2;
        }

        // C: collapse into the glowing core
        const p3 = clamp01((t - COLLAPSE - wd.d3) / 1000);
        if (p3 > 0) {
          const e3 = easeInCubic(p3);
          x = lerp(ox, cx, e3);
          y = lerp(oy, cy, e3);
          sc = lerp(os, 0.05, e3);
          op = lerp(oo, 0, e3);
          rot = e3 * 220;
        }

        wd.el.style.transform = `translate3d(${x - wd.w / 2}px, ${y - wd.h / 2}px, 0) rotate(${rot}deg) scale(${sc})`;
        wd.el.style.opacity = String(op);
        wd.el.style.zIndex = String(z);

        if (p3 >= 1) {
          wd.done = true;
          wd.el.remove();
        } else {
          alive++;
        }
      }

      // singularity core
      if (core) {
        const rise = clamp01((t - GATHER) / 1500);
        const surge = clamp01((t - COLLAPSE) / 1400);
        const c = rise * (1 - clamp01((t - (COLLAPSE + 1500)) / 500));
        core.style.opacity = String(Math.min(1, c * (0.9 + surge * 0.4)));
        core.style.transform = `translate(-50%, -50%) scale(${0.6 + 1.2 * rise + 2.4 * surge})`;
      }

      if (!flashed && alive === 0) {
        flashed = true;
        if (flash) {
          flash.style.transition = 'opacity 120ms ease-out';
          flash.style.opacity = '0.85';
          window.setTimeout(() => { flash.style.transition = 'opacity 700ms ease-in'; flash.style.opacity = '0'; }, 140);
        }
        finish();
        return;
      }
      wordRaf.current = requestAnimationFrame(step);
    };
    wordRaf.current = requestAnimationFrame(step);
  };

  const runSequence = () => {
    const gs = sceneRef.current;
    if (!gs) return;
    setRunning(true);
    later(() => gs.open(), 1000);       // after the big final shake
    later(startWords, 1000 + 1700);     // as the lid flies off
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const gs = sceneRef.current;
    if (!gs || clicksRef.current >= 3) return;
    if (!gs.pick(e.clientX, e.clientY)) return;
    clicksRef.current += 1;
    const n = clicksRef.current;
    setClicks(n);
    gs.kick(n);
    if (n === 3) runSequence();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gs = sceneRef.current;
    if (!gs) return;
    e.currentTarget.style.cursor = clicksRef.current < 3 && gs.pick(e.clientX, e.clientY) ? 'pointer' : 'default';
  };

  const hintText = clicks === 0 ? 'TAP THE GIFT BOX 3 TIMES TO OPEN IT' : clicks === 1 ? 'IT MOVED! KEEP GOING...' : 'ONE MORE TAP...';

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(circle at 50% 58%, #0d3b2e 0%, #07130f 40%, #0a0a0c 75%)' }}
    >
      {/* 3D canvas */}
      <div
        ref={canvasHostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className={`absolute inset-0 ${running ? 'pointer-events-none' : ''} ${boxGone ? 'hidden' : ''}`}
      />

      {/* vortex core + words + flash */}
      <div
        ref={coreRef}
        className="absolute left-1/2 top-1/2 w-[420px] h-[420px] rounded-full pointer-events-none opacity-0"
        style={{ background: 'radial-gradient(circle, rgba(52,255,176,0.5) 0%, rgba(168,85,247,0.22) 38%, rgba(0,0,0,0) 70%)', transform: 'translate(-50%, -50%)' }}
      />
      <div ref={wordLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
      <div ref={flashRef} className="absolute inset-0 pointer-events-none opacity-0" style={{ background: 'radial-gradient(circle, #ffffff 0%, #34ffb0 40%, rgba(0,0,0,0) 75%)' }} />

      {/* prompt */}
      {!running && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 pointer-events-none select-none">
          <div className="px-6 py-3 rounded-xl bg-black/85 border border-emerald-500/80 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.6)] flex items-center space-x-3">
            <Gift className="w-6 h-6 text-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-widest">{hintText}</span>
          </div>
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`w-3 h-3 rounded-full border border-emerald-400 transition-all duration-300 ${clicks >= i ? 'bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.9)] scale-110' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
      )}

      {/* skip */}
      <button
        onClick={finish}
        className="absolute top-5 right-5 z-10 px-3 py-1.5 rounded-md border border-zinc-700 bg-black/60 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/60 font-mono text-[11px] tracking-widest uppercase transition-colors"
      >
        Skip ›
      </button>
    </div>
  );
}
