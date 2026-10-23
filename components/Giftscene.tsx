/**
 * components/giftScene.ts
 * The 3D gift box (Three.js): paper + ribbon + bow, PBR lighting, soft shadows,
 * click physics (hop / wobble / squash), unwrap + lid fly-off + sparkle burst.
 * Used by app/page.tsx (loaded lazily, only for first-time guests).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ───────────── procedural textures ───────────── */
function makePaperTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4a0e2a';
  g.fillRect(0, 0, size, size);

  g.strokeStyle = 'rgba(251,191,36,0.28)';
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
export type GiftScene = {
  pick: (clientX: number, clientY: number) => boolean;
  kick: (strength: number) => void;
  open: () => void;
  exit: () => void;
  resize: () => void;
  dispose: () => void;
};

export function createGiftScene(container: HTMLElement, onExited: () => void): GiftScene {
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

  // lights (saffron + gold, festive Indian palette)
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
  const rim = new THREE.DirectionalLight(0xff9933, 2.4);
  rim.position.set(-18, 12, -14);
  const fill = new THREE.DirectionalLight(0xffc266, 0.8);
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
    new THREE.MeshStandardMaterial({ color: 0xff9933, emissive: 0xff9933, emissiveIntensity: 2.2 })
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

  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, emissive: 0xffb347, emissiveIntensity: 0 });
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
    blending: THREE.AdditiveBlending, color: 0xffd27a, opacity: 0,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffb347, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
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