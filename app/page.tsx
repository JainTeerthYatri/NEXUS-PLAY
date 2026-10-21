'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Radio, Sparkles, MessageSquare, Users, Video, Shield, ArrowRight, Cpu, Zap, Gift } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   SEQUENCE OVERVIEW
   1. Click the gift 3x  -> every click = physical hop + wobble + squash (spring sim)
   2. 3rd click          -> bow unties, ribbon unwraps, lid flies off, sparkles burst
   3. Layout flies out of the box (navbar / hero / cards / footer, NO text yet)
   4. Words are sown like seeds across the whole screen, gift box shrinks away
   5. Words get sucked into a vortex -> rotate as a 3D globe
   6. Every word flies from the globe to its fixed spot (emojis included)
──────────────────────────────────────────────────────────────────────────── */

/* ───────────── math helpers ───────────── */
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

  // diamond lattice
  g.strokeStyle = 'rgba(16,185,129,0.25)';
  g.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + size, size); g.stroke();
    g.beginPath(); g.moveTo(i + size, 0); g.lineTo(i, size); g.stroke();
  }

  // gold stars in the diamond centres
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

  // paper fibre noise
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

  // Image based lighting -> realistic reflections on ribbon / paper
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // Lights
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
  const rim = new THREE.DirectionalLight(0x06b6d4, 2.2);
  rim.position.set(-18, 12, -14);
  const fill = new THREE.DirectionalLight(0x10b981, 0.8);
  fill.position.set(-12, 6, 18);
  scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.15));

  // Podium
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

  // Materials
  const paperTex = makePaperTexture();
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTex, bumpMap: paperTex, bumpScale: 0.6, roughness: 0.5, metalness: 0.05 });
  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xe9c46a, metalness: 0.75, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 });

  const mark = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // Gift = body + ribbon straps + lid (+ lid straps + bow)
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

  // glowing mouth that becomes visible once the lid is gone
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

  // Bow
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

  // Sparkle burst + glow
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

  /* camera framing */
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

  /* ───── physics state ───── */
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

  /* ───── timelines ───── */
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

    // hop + gravity
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
    // damped springs for wobble + squash
    tiltXV += (-70 * tiltX - 2.5 * tiltXV) * dt; tiltX += tiltXV * dt;
    tiltZV += (-70 * tiltZ - 2.5 * tiltZV) * dt; tiltZ += tiltZV * dt;
    sqV += (-140 * sq - 9 * sqV) * dt; sq += sqV * dt;
    spinV *= Math.exp(-2.2 * dt);
    yaw += (spinV + idleSpin) * dt;

    gift.position.y = hop;
    gift.rotation.set(tiltX, yaw, tiltZ);

    // opening choreography
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

    // sparkles
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

    // exit: box shrinks & spirals away
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

/* ───────────── WORD ENGINE (DOM, 3D-projected) ───────────── */
type Word = {
  src: HTMLElement;
  el: HTMLSpanElement;
  w: number; h: number;
  tx: number; ty: number;       // final target (viewport coords, centre)
  sx: number; sy: number;       // scatter landing
  arc: number; sr: number; curve: number; swirl: number; ph: number;
  d1: number; d2: number; d3: number;
  v0: number; v1: number; v2: number; // unit-sphere point
  done: boolean;
};

/** Splits text into word spans so every word can be animated individually. */
function W({ children }: { children: string }) {
  const parts = children.split(' ').filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          <span className="aw">{p}</span>
          {i < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

const modules = [
  { emoji: '📡', title: 'Universal Web-OBS Studio', description: 'Browser-native live broadcasting compositor with multi-layer canvas, facecam PiP, and direct RTMP streaming bridge.', href: '/studio', icon: Radio, tag: 'RTMP_CORE // v2.4' },
  { emoji: '🎨', title: 'AI Thumbnail & Logo Forge', description: 'Zero-cost neural text-to-image engine with real-time progress steps and 2D canvas sticker overlay editors.', href: '/dashboard', icon: Sparkles, tag: 'NEURAL_GEN // STABLE' },
  { emoji: '💬', title: 'Unrestricted Global Comms', description: 'Real-time open chat rooms with instant moderation and Web Crypto API end-to-end encrypted direct messaging.', href: '/chat', icon: MessageSquare, tag: 'E2EE_SECURE // ACTIVE' },
  { emoji: '🎯', title: 'Neural LFG Matchmaker', description: 'Automated regional skill filters, slot-locked party lobbies, and live squad host controls.', href: '/lfg', icon: Users, tag: 'LFG_NODE // SYNCED' },
  { emoji: '🎬', title: 'Highlight Clips Vault', description: 'Scroll-snap vertical shorts video feed with strict 2MB validation and automatic XP leveling rewards.', href: '/clips', icon: Video, tag: 'SHORTS_VAULT // 2MB' },
  { emoji: '🛡️', title: '5-Tier RBAC Command Center', description: 'Comprehensive moderation dashboard with audit logs, ban enforcement, and DPDP Act compliance desks.', href: '/mod', icon: Shield, tag: 'SECURITY // RBAC' },
];

const navLinks = [
  { label: 'STUDIO', href: '/studio' },
  { label: 'DASHBOARD', href: '/dashboard' },
  { label: 'CHAT', href: '/chat' },
  { label: 'LFG', href: '/lfg' },
  { label: 'CLIPS', href: '/clips' },
  { label: 'MOD', href: '/mod' },
];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const wordLayerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GiftScene | null>(null);
  const timers = useRef<number[]>([]);
  const wordRaf = useRef(0);
  const clicksRef = useRef(0);

  const [clicks, setClicks] = useState(0);
  const [stage, setStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [boxGone, setBoxGone] = useState(false);
  const [bgFaded, setBgFaded] = useState(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* init the 3D scene once */
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage('done');
      setBoxGone(true);
      return;
    }

    let gs: GiftScene;
    try {
      gs = createGiftScene(host, () => setBoxGone(true));
    } catch (err) {
      console.error('WebGL init failed, skipping intro', err);
      setStage('done');
      setBoxGone(true);
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

  /* ── STEP 3: layout flies out of the box (no text yet) ── */
  const flyLayout = () => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-fly]'));
    const vcx = window.innerWidth / 2;
    const vcy = window.innerHeight * 0.42;
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = vcx - (r.left + r.width / 2);
      const dy = vcy - (r.top + r.height / 2);
      el.classList.add('fly-on');
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(${(i % 2 ? 1 : -1) * (25 + i * 6)}deg)`, opacity: 0 },
          { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
        ],
        { duration: 1200, delay: i * 110, easing: 'cubic-bezier(0.34, 1.35, 0.64, 1)', fill: 'backwards' }
      );
    });
  };

  /* ── STEPS 4-6: scatter -> vortex globe -> settle ── */
  const startWords = () => {
    const root = rootRef.current;
    const layer = wordLayerRef.current;
    const core = coreRef.current;
    if (!root || !layer) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.aw'));
    const n = nodes.length;
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);

    const words: Word[] = nodes.map((src, i) => {
      const r = src.getBoundingClientRect();
      const cs = getComputedStyle(src);
      const el = document.createElement('span');
      el.textContent = src.textContent;
      Object.assign(el.style, {
        position: 'absolute', left: '0px', top: '0px',
        width: `${r.width}px`, height: `${r.height}px`,
        lineHeight: `${r.height}px`, textAlign: 'center', whiteSpace: 'nowrap',
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, color: cs.color,
        textShadow: '0 0 12px rgba(16,185,129,0.65)',
        willChange: 'transform, opacity', opacity: '0',
      } as Partial<CSSStyleDeclaration>);
      layer.appendChild(el);

      // fibonacci sphere point (random assignment so the globe looks even)
      const idx = order[i];
      const y = 1 - (2 * (idx + 0.5)) / n;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = idx * 2.399963229728653;

      return {
        src, el, w: r.width, h: r.height,
        tx: r.left + r.width / 2, ty: r.top + r.height / 2,
        sx: vw * (0.05 + 0.9 * Math.random()), sy: vh * (0.08 + 0.84 * Math.random()),
        arc: 80 + Math.random() * 180, sr: (Math.random() - 0.5) * 120,
        curve: (Math.random() - 0.5) * 160, swirl: Math.PI * 2 * (1 + Math.random() * 0.4),
        ph: Math.random() * 6.28,
        d1: Math.random() * 550, d2: Math.random() * 650, d3: Math.random() * 950,
        v0: Math.cos(phi) * rr, v1: y, v2: Math.sin(phi) * rr,
        done: false,
      };
    });

    // ---- timing (ms from sequence start) ----
    const GATHER = 2000;  // words start getting sucked into the vortex
    const SETTLE = 6800;  // words leave the globe and fly to their final spot
    const R = Math.min(vw, vh) * 0.36;
    const F = R * 3.4;
    const t0 = performance.now();
    let boxExited = false;

    const finish = () => {
      layer.innerHTML = '';
      if (core) core.style.opacity = '0';
      document.body.style.overflow = '';
      setStage('done');
    };

    const step = (now: number) => {
      const t = now - t0;

      if (!boxExited && t > 900) {
        boxExited = true;
        sceneRef.current?.exit(); // box shrinks away once seeds are sown
      }

      const u = Math.max(0, (t - GATHER) / 1000);
      const yaw = 0.35 * u + 0.18 * u * u;           // spins faster and faster
      const pitch = 0.42 + 0.22 * Math.sin(u * 0.8);
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);

      let alive = 0;
      for (const wd of words) {
        if (wd.done) continue;

        // current point on the rotating 3D globe
        const x1 = wd.v0 * cyaw + wd.v2 * syaw;
        const z1 = -wd.v0 * syaw + wd.v2 * cyaw;
        const y1 = wd.v1 * cp - z1 * sp;
        const z2 = wd.v1 * sp + z1 * cp;
        const persp = F / (F - z2 * R);
        const ox = cx + x1 * R * persp;
        const oy = cy + y1 * R * persp;
        const os = persp * 0.85;
        const oo = 0.3 + 0.7 * ((z2 + 1) / 2);

        // phase A: seeds flung from the box
        const p1 = clamp01((t - wd.d1) / 1100);
        const e1 = easeOutCubic(p1);
        let x = lerp(cx, wd.sx, e1);
        let y = lerp(cy, wd.sy, e1) - Math.sin(Math.PI * e1) * wd.arc;
        if (p1 >= 1) {
          x += Math.sin(t * 0.0013 + wd.ph) * 4;
          y += Math.cos(t * 0.0011 + wd.ph) * 4;
        }
        let rot = wd.sr * e1;
        let sc = 0.15 + 0.85 * e1;
        let op = clamp01(p1 * 5);
        let z = 0;

        // phase B: black-hole spiral into the globe
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

        // phase C: leave the globe, curve into the final slot
        const p3 = clamp01((t - SETTLE - wd.d3) / 1400);
        if (p3 > 0) {
          const e3 = easeInOutCubic(p3);
          const dx = wd.tx - ox, dy = wd.ty - oy;
          const len = Math.hypot(dx, dy) || 1;
          const bend = Math.sin(Math.PI * e3) * wd.curve;
          x = lerp(ox, wd.tx, e3) + (-dy / len) * bend;
          y = lerp(oy, wd.ty, e3) + (dx / len) * bend;
          sc = lerp(os, 1, e3);
          op = lerp(oo, 1, e3);
          rot = 0;
        }

        wd.el.style.transform = `translate3d(${x - wd.w / 2}px, ${y - wd.h / 2}px, 0) rotate(${rot}deg) scale(${sc})`;
        wd.el.style.opacity = String(op);
        wd.el.style.zIndex = String(z);

        if (p3 >= 1) {
          wd.done = true;
          wd.src.classList.add('aw-on'); // the real word appears exactly under the clone
          wd.el.remove();
        } else {
          alive++;
        }
      }

      // glowing singularity in the middle of the globe
      if (core) {
        const c = clamp01((t - GATHER) / 1500) * (1 - clamp01((t - (SETTLE + 300)) / 1200));
        core.style.opacity = String(c * 0.9);
        core.style.transform = `translate(-50%, -50%) scale(${0.6 + 1.2 * c})`;
      }

      if (alive > 0) wordRaf.current = requestAnimationFrame(step);
      else finish();
    };
    wordRaf.current = requestAnimationFrame(step);
  };

  /* ── master sequence, runs after the 3rd click ── */
  const runSequence = () => {
    const gs = sceneRef.current;
    if (!gs) return;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    setStage('running');
    later(() => { gs.open(); setBgFaded(true); }, 1000);      // after the big final shake
    later(flyLayout, 1000 + 1500);                            // as the lid lifts off
    later(startWords, 1000 + 1500 + 2300);                    // once layout has landed
  };

  /* ── input ── */
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
      ref={rootRef}
      data-intro={stage === 'done' ? 'done' : 'pending'}
      className="relative min-h-screen w-full bg-[#050203] text-white"
    >
      {/* dark stage backdrop, fades once the box opens */}
      <div
        className={`fixed inset-0 z-[15] pointer-events-none transition-opacity duration-[2200ms] ${bgFaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'radial-gradient(circle at 50% 58%, #0d3b2e 0%, #07130f 40%, #050203 75%)' }}
      />

      {/* THREE.JS canvas host */}
      <div
        ref={canvasHostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className={`fixed inset-0 z-20 ${stage !== 'idle' ? 'pointer-events-none' : ''} ${boxGone ? 'hidden' : ''}`}
      />

      {/* click prompt */}
      {stage === 'idle' && !boxGone && (
        <div className="fixed z-30 bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 pointer-events-none select-none">
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

      {/* vortex core glow + flying words */}
      <div
        ref={coreRef}
        className="fixed left-1/2 top-1/2 z-[35] w-[420px] h-[420px] rounded-full pointer-events-none opacity-0"
        style={{ background: 'radial-gradient(circle, rgba(52,255,176,0.45) 0%, rgba(6,182,212,0.18) 35%, rgba(0,0,0,0) 70%)', transform: 'translate(-50%, -50%)' }}
      />
      <div ref={wordLayerRef} className="fixed inset-0 z-40 pointer-events-none overflow-hidden" />

      {/* ───────── PAGE LAYOUT (hidden until it flies out of the box) ───────── */}
      <div className="relative z-10 flex flex-col min-h-screen px-4">
        {/* NAVBAR */}
        <nav
          data-fly
          className="relative w-full max-w-7xl mx-auto mt-4 px-5 py-3 flex items-center justify-between rounded-xl bg-[#050203]/90 border border-zinc-800 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 font-mono font-bold text-white">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span className="tracking-widest text-sm"><W>🎮 ASTROID</W></span>
          </div>
          <div className="hidden md:flex items-center gap-6 font-mono text-xs text-zinc-300 uppercase tracking-wider">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-emerald-400 transition-colors">
                <W>{l.label}</W>
              </Link>
            ))}
          </div>
          <Link href="/chat" className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors">
            <W>JOIN NOW 🚀</W>
          </Link>
        </nav>

        {/* MAIN */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full py-12">
          {/* Hero */}
          <div
            data-fly
            className="text-center space-y-6 max-w-4xl mb-16 p-8 rounded-2xl bg-[#050203]/90 border border-zinc-800/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)]"
          >
            <h1 className="text-4xl sm:text-7xl font-black tracking-tighter text-white uppercase font-mono drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <W>ASTROID</W>{' '}
              <span className="text-emerald-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.9)]">
                <W>GAMING CLOUD</W>
              </span>
            </h1>

            <p className="text-emerald-300 font-mono text-sm sm:text-base max-w-2xl mx-auto leading-relaxed tracking-wider">
              <W>{'> SIX MODULES. ONE CLOUD. ZERO LIMITS. STREAM, CHAT, CLIP & SQUAD UP. 🔥'}</W>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/studio"
                className="group relative flex items-center space-x-2 px-8 py-4 rounded-lg bg-emerald-500 text-black font-mono font-bold hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:scale-105 uppercase tracking-wider overflow-hidden active:scale-95"
              >
                <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span><W>Initialize Studio</W></span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </Link>

              <Link
                href="/dashboard"
                className="group flex items-center space-x-2 px-8 py-4 rounded-lg bg-black/90 border border-cyan-500/60 text-cyan-400 font-mono font-bold hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 uppercase tracking-wider backdrop-blur-xl active:scale-95"
              >
                <Cpu className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                <span><W>Neural Dashboard</W></span>
              </Link>
            </div>
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.title}
                  href={mod.href}
                  data-fly
                  className="group relative p-6 rounded-xl bg-[#050203]/95 backdrop-blur-2xl border border-zinc-800 hover:border-cyan-400 transition-[transform,box-shadow,border-color] duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(6,182,212,0.4)] flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 group-hover:text-cyan-400 group-hover:border-cyan-400/60 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                        <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-black/90 border border-emerald-500/40 text-cyan-400 tracking-wider">
                        <W>{mod.tag}</W>
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white font-mono group-hover:text-emerald-400 transition-colors tracking-tight">
                      <W>{`${mod.emoji} ${mod.title}`}</W>
                    </h3>

                    <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                      <W>{mod.description}</W>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-emerald-400 pt-6 group-hover:text-cyan-400 group-hover:translate-x-2 transition-all relative z-10">
                    <span><W>EXEC_MODULE()</W></span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </main>

        {/* FOOTER */}
        <footer
          data-fly
          className="relative w-full max-w-7xl mx-auto mb-4 px-5 py-4 rounded-xl bg-[#050203]/90 border border-zinc-800 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-zinc-400 tracking-wider uppercase"
        >
          <span><W>© 2026 ASTROID GAMING CLOUD 💚</W></span>
          <span><W>E2EE · RBAC · DPDP COMPLIANT 🔒</W></span>
        </footer>
      </div>

      <style jsx global>{`
        .aw { display: inline-block; }
        [data-intro='pending'] .aw { opacity: 0; }
        [data-intro='pending'] .aw.aw-on { opacity: 1; }
        [data-intro='pending'] [data-fly]:not(.fly-on) { opacity: 0; }
      `}</style>
    </div>
  );
}
