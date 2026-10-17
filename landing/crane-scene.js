// Cena 3D da landing. O three.js entra pelo import map do index.html.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function mountCraneScene(canvas, opts) {
  opts = opts || {};
  const reduced = !!opts.reducedMotion;
  const paintHex = opts.paint || '#E7E8E4';
  const quality = opts.quality || 'high';

  // ---------------- renderer ----------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : 1);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.5, 3000);

  // ---------------- sky ----------------
  const SUN_DIR = new THREE.Vector3(-0.78, 0.12, -0.62).normalize();
  const cTop = new THREE.Color('#123E4C');
  const cMid = new THREE.Color('#6A929B');
  const cHor = new THREE.Color('#E2CDB6');
  const cSun = new THREE.Color('#FFD7A6');
  function skyMat() {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: cTop }, mid: { value: cMid }, hor: { value: cHor }, sunC: { value: cSun }, sunDir: { value: SUN_DIR } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunC; uniform vec3 sunDir; varying vec3 vDir;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 col = mix(hor, mid, smoothstep(0.0, 0.25, h));
          col = mix(col, top, smoothstep(0.2, 0.8, h));
          if (h < 0.0) col = hor;
          // thin high clouds
          vec2 uv = d.xz / max(h, 0.05) * 1.6;
          float c = n2(uv * 0.9) * 0.6 + n2(uv * 2.3) * 0.4;
          c = smoothstep(0.55, 0.85, c) * smoothstep(0.02, 0.25, h) * (1.0 - smoothstep(0.35, 0.8, h));
          float s = max(dot(d, sunDir), 0.0);
          col = mix(col, mix(vec3(0.95,0.84,0.74), sunC, pow(s, 4.0)), c * 0.35);
          float haze = pow(s, 5.0) * 0.6 * (1.0 - smoothstep(0.0, 0.45, h));
          col += sunC * (pow(s, 1200.0) * 9.0 + pow(s, 80.0) * 0.7 + haze);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
  }
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), skyMat());
  scene.add(sky);
  scene.fog = new THREE.Fog(cHor.clone().lerp(cMid, 0.3), 60, 380);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat()));
  const eg = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: '#55534f' }));
  eg.rotation.x = -Math.PI / 2; eg.position.y = -3; envScene.add(eg);
  const envRT = pmrem.fromScene(envScene, 0.03);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.9;

  // ---------------- lights ----------------
  scene.add(new THREE.HemisphereLight('#b2ccd3', '#4b4843', 0.7));
  const sun = new THREE.DirectionalLight('#ffdcb8', 3.4);
  sun.position.copy(SUN_DIR).multiplyScalar(140).add(new THREE.Vector3(0, 22, 0));
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 'high' ? 4096 : 2048, quality === 'high' ? 4096 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 20, far: 340 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#c9dde3', 0.7); fill.position.set(50, 30, 60); scene.add(fill);

  // ---------------- utilities ----------------
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), m);
  function extrudeProfile(shape, depth, bevel, mat, segs) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, depth - bevel * 2), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: segs || 3, curveSegments: 16 });
    g.translate(0, 0, -(depth - bevel * 2) / 2);
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }
  function roundRectShape(w, h, r, cx, cy) {
    const s = new THREE.Shape(); const x = (cx || 0) - w / 2, y = (cy || 0) - h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  const rbox = (w, h, d, r, m) => extrudeProfile(roundRectShape(w, h, Math.min(r, w / 3, h / 3)), d, Math.min(r, d / 3), m);

  // world-space grime + wear for painted parts
  function addGrime(mat, strength) {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP;
        float gh(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float gn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(gh(i),gh(i+vec3(1,0,0)),f.x),mix(gh(i+vec3(0,1,0)),gh(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(gh(i+vec3(0,0,1)),gh(i+vec3(1,0,1)),f.x),mix(gh(i+vec3(0,1,1)),gh(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float nz = gn(vWP * 2.3) * 0.55 + gn(vWP * 7.0) * 0.3 + gn(vWP * 0.6) * 0.15;
          float low = 1.0 - smoothstep(0.2, 2.6, vWP.y);
          float streak = smoothstep(0.55, 0.95, gn(vec3(vWP.x * 6.0, vWP.y * 0.4, vWP.z * 6.0)));
          float dirt = clamp(low * (0.55 + 0.6 * nz) + streak * 0.12 + (nz - 0.5) * 0.12, 0.0, 1.0) * ${strength.toFixed(2)};
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.52, 0.47, 0.41), dirt);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + dirt * 0.35 + (nz - 0.5) * 0.08, 0.04, 1.0);`);
    };
    return mat;
  }

  function canvasTex(w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }

  // ---------------- materials ----------------
  const M = {
    paint: addGrime(new THREE.MeshPhysicalMaterial({ color: paintHex, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 }), 0.9),
    paint2: addGrime(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paintHex).multiplyScalar(0.9), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 }), 0.9),
    chassis: addGrime(new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.62, metalness: 0.45 }), 0.8),
    black: addGrime(new THREE.MeshStandardMaterial({ color: '#17191c', roughness: 0.7, metalness: 0.2 }), 0.6),
    chrome: new THREE.MeshStandardMaterial({ color: '#e4e8ec', roughness: 0.08, metalness: 1.0 }),
    rim: addGrime(new THREE.MeshStandardMaterial({ color: '#a9aeb3', roughness: 0.38, metalness: 0.85 }), 0.7),
    glass: new THREE.MeshPhysicalMaterial({ color: '#1b2a31', roughness: 0.02, metalness: 0.0, clearcoat: 1, envMapIntensity: 1.4 }),
    steel: addGrime(new THREE.MeshStandardMaterial({ color: '#8d969b', roughness: 0.5, metalness: 0.7 }), 0.4),
    primer: addGrime(new THREE.MeshStandardMaterial({ color: '#7b3f2e', roughness: 0.72, metalness: 0.15 }), 0.35),
    cable: new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.42, metalness: 0.9 }),
    wood: addGrime(new THREE.MeshStandardMaterial({ color: '#6d5236', roughness: 0.93 }), 0.5),
    orange: new THREE.MeshStandardMaterial({ color: '#e08a2e', roughness: 0.45, emissive: '#ff8a1a', emissiveIntensity: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff1d0', emissiveIntensity: 2.2 }),
    red: new THREE.MeshStandardMaterial({ color: '#8f1414', roughness: 0.35, emissive: '#ff2020', emissiveIntensity: 0.5 }),
    petrol: addGrime(new THREE.MeshPhysicalMaterial({ color: '#0F4C5C', roughness: 0.4, clearcoat: 0.4 }), 0.6),
    concreteCol: addGrime(new THREE.MeshStandardMaterial({ color: '#a3a29c', roughness: 0.9 }), 0.4)
  };
  M.glass2 = M.glass.clone(); M.glass2.side = THREE.DoubleSide;
  M.liner = M.black.clone(); M.liner.side = THREE.DoubleSide; M.liner.onBeforeCompile = M.black.onBeforeCompile;
  const tread = canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a';
    for (let y = 0; y < h; y += 16) { g.fillRect(4, y, 22, 7); g.fillRect(38, y + 8, 22, 7); }
    g.fillRect(29, 0, 6, h);
  });
  tread.wrapS = tread.wrapT = THREE.RepeatWrapping;
  M.rubber = new THREE.MeshStandardMaterial({ color: '#151617', roughness: 0.9, bumpMap: tread, bumpScale: 2.5 });
  M.rubberSide = new THREE.MeshStandardMaterial({ color: '#18191a', roughness: 0.85 });
  const hazardTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#efefe9'; g.fillRect(0, 0, w, h); g.fillStyle = '#b11d1d';
    for (let i = -h; i < w + h; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - h, h); g.lineTo(i - h, h); g.closePath(); g.fill(); }
  }, true);
  M.hazard = addGrime(new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.5 }), 0.6);

  // ---------------- ground ----------------
  const concreteMap = canvasTex(1024, 1024, (g) => {
    const r = rng(7); g.fillStyle = '#9b9a95'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) {
      const x = r() * 1024, y = r() * 1024, rad = 6 + r() * 80, dark = r() < 0.6;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, dark ? 'rgba(55,53,50,0.11)' : 'rgba(205,203,196,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const img = g.getImageData(0, 0, 1024, 1024), d = img.data;
    for (let p = 0; p < d.length; p += 4) { const n = (r() - 0.5) * 26; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(38,36,34,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 1.5); g.lineTo(1024, 1.5); g.moveTo(1.5, 0); g.lineTo(1.5, 1024); g.stroke();
    for (let k = 0; k < 10; k++) {
      g.strokeStyle = 'rgba(30,28,26,' + (0.03 + r() * 0.05) + ')'; g.lineWidth = 14 + r() * 18;
      const sx = r() * 1024; g.beginPath(); g.moveTo(sx, 0); g.bezierCurveTo(sx + r() * 200 - 100, 340, sx + r() * 200 - 100, 680, sx + r() * 300 - 150, 1024); g.stroke();
    }
    for (let k = 0; k < 40; k++) { g.strokeStyle = 'rgba(40,38,35,0.25)'; g.lineWidth = 1; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += r() * 40 - 20; y += r() * 40 - 20; g.lineTo(x, y); } g.stroke(); }
  }, true);
  const roughMap = canvasTex(512, 512, (g) => {
    const r = rng(11); g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++) { // damp patches (low roughness -> reflect the sky)
      const x = r() * 512, y = r() * 512, rad = 20 + r() * 70;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(40,40,40,0.95)'); grd.addColorStop(0.6, 'rgba(90,90,90,0.6)'); grd.addColorStop(1, 'rgba(232,232,232,0)');
      g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, rad * (1 + r()), rad, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
  concreteMap.wrapS = concreteMap.wrapT = roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
  concreteMap.repeat.set(80, 80); roughMap.repeat.set(9, 9);
  const groundMat = new THREE.MeshStandardMaterial({ map: concreteMap, roughnessMap: roughMap, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(960, 960), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const lineMat = new THREE.MeshStandardMaterial({ color: '#d8d4c8', roughness: 0.75, transparent: true, opacity: 0.65 });
  [[-10, 13], [-10, -11]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(160, 0.16), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, z); l.receiveShadow = true; scene.add(l); });

  // ---------------- the crane ----------------
  const crane = new THREE.Group(); scene.add(crane);
  const LIFT = 0.1;
  const carrier = new THREE.Group(); carrier.position.y = LIFT; crane.add(carrier);
  const axles = [4.6, 3.0, -1.0, -2.6, -4.2];
  const AR = 0.84, AY = 0.66;

  // chassis rails
  carrier.add(at(box(13.4, 0.6, 1.05, M.chassis), 0, 1.0, 0));
  // body with wheel arches (side profile extruded across the width)
  (function () {
    const s = new THREE.Shape(); const yb = 1.02, yt = 1.88;
    s.moveTo(-6.95, yb);
    const sorted = axles.slice().sort((a, b) => a - b);
    const dy = yb - AY; const dx = Math.sqrt(AR * AR - dy * dy); const a0 = Math.atan2(dy, -dx), a1 = Math.atan2(dy, dx);
    sorted.forEach((ax) => { s.lineTo(ax - dx, yb); s.absarc(ax, AY, AR, a0, a1, true); });
    s.lineTo(6.95, yb); s.lineTo(6.95, yt - 0.1); s.quadraticCurveTo(6.95, yt, 6.85, yt);
    s.lineTo(-6.85, yt); s.quadraticCurveTo(-6.95, yt, -6.95, yt - 0.1); s.lineTo(-6.95, yb);
    carrier.add(extrudeProfile(s, 2.74, 0.035, M.paint, 2));
    // inner arch liners (dark)
    sorted.forEach((ax) => {
      const g = new THREE.CylinderGeometry(AR - 0.02, AR - 0.02, 2.6, 40, 1, true, Math.PI * 0.62, Math.PI * 0.76);
      const m = new THREE.Mesh(g, M.liner); m.rotation.x = Math.PI / 2; m.position.set(ax, AY, 0); carrier.add(m);
    });
  })();
  // petrol coach line + panel seams
  [1, -1].forEach((sd) => {
    carrier.add(at(box(9.6, 0.09, 0.012, M.petrol), -1.6, 1.74, sd * 1.375));
    for (const sx of [-5.2, -3.4, 1.8]) carrier.add(at(box(0.012, 0.55, 0.012, M.black), sx, 1.6, sd * 1.376));
    // tool boxes / steps
    carrier.add(at(rbox(1.25, 0.55, 0.32, 0.05, M.paint2), 1.0, 1.3, sd * 1.25));
    for (let k = 0; k < 3; k++) carrier.add(at(box(0.42, 0.03, 0.26, M.chassis), 1.0 + (k - 1) * 0.0, 1.0 - k * 0.0, sd * 1.25));
  });
  // deck plating + handrail (right side)
  carrier.add(at(box(9.2, 0.03, 1.1, M.chassis), -1.6, 1.9, 0.75));
  for (let x = -5.8; x <= 1.6; x += 1.48) carrier.add(at(cyl(0.022, 0.022, 0.75, M.chassis, 8), x, 2.27, 1.3));
  { const rail = at(cyl(0.028, 0.028, 7.5, M.chassis, 8), -2.1, 2.64, 1.3); rail.rotation.z = Math.PI / 2; carrier.add(rail); }

  // driver cab — side profile, left side
  (function () {
    const s = new THREE.Shape();
    s.moveTo(4.05, 1.88); s.lineTo(6.92, 1.88); s.lineTo(6.98, 2.62);
    s.lineTo(6.78, 3.55); s.quadraticCurveTo(6.72, 3.78, 6.48, 3.78); s.lineTo(4.32, 3.78);
    s.quadraticCurveTo(4.05, 3.78, 4.05, 3.52); s.lineTo(4.05, 1.88);
    const cab = extrudeProfile(s, 1.34, 0.07, M.paint, 3); cab.position.z = -0.66; carrier.add(cab);
    // windshield
    const wsS = new THREE.Shape(); wsS.moveTo(-0.6, 0); wsS.lineTo(0.6, 0); wsS.lineTo(0.6, 0.92); wsS.lineTo(-0.6, 0.92); wsS.lineTo(-0.6, 0);
    const ws = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(1.16, 0.9, 0.06)), M.glass2);
    ws.position.set(6.9, 3.08, -0.66); ws.rotation.y = Math.PI / 2; ws.rotation.order = 'YXZ'; ws.rotation.x = -0.2; carrier.add(ws);
    // side windows
    [-1, 1].forEach((sd) => {
      const w = new THREE.Shape(); w.moveTo(4.95, 2.72); w.lineTo(6.55, 2.72); w.lineTo(6.73, 3.5); w.quadraticCurveTo(6.7, 3.6, 6.58, 3.6); w.lineTo(4.95, 3.6); w.lineTo(4.95, 2.72);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(w), M.glass2); m.position.z = -0.66 + sd * 0.675;
      carrier.add(m);
      carrier.add(at(box(0.012, 0.95, 0.012, M.black), 4.85, 2.4, -0.66 + sd * 0.678));
      carrier.add(at(box(1.9, 0.012, 0.012, M.black), 5.85, 2.62, -0.66 + sd * 0.678));
    });
    // grille slats, lights, visor, mirrors, beacon
    for (let i = 0; i < 5; i++) carrier.add(at(box(0.03, 0.045, 0.95, M.black), 6.99, 2.0 + i * 0.1, -0.66));
    carrier.add(at(box(0.16, 0.05, 1.3, M.paint2), 6.82, 3.66, -0.66));
    carrier.add(at(box(0.25, 0.1, 0.4, M.orange), 5.2, 3.86, -0.66));
    const arm = at(box(0.04, 0.04, 0.5, M.black), 6.4, 3.3, -1.55); carrier.add(arm);
    carrier.add(at(rbox(0.1, 0.5, 0.22, 0.03, M.black), 6.4, 3.12, -1.8));
  })();
  // front engine module (right) + bumper + lights
  carrier.add(at(rbox(2.0, 0.85, 1.18, 0.12, M.paint), 5.55, 2.28, 0.73));
  for (let i = 0; i < 6; i++) carrier.add(at(box(1.4, 0.02, 0.01, M.black), 5.4, 2.0 + i * 0.09, 1.33));
  carrier.add(at(rbox(0.42, 0.52, 2.74, 0.06, M.chassis), 6.95, 1.15, 0));
  [[-0.98], [0.98]].forEach(([z]) => { carrier.add(at(rbox(0.05, 0.14, 0.38, 0.02, M.lamp), 7.17, 1.3, z)); });
  [[-1.05], [1.05]].forEach(([z]) => { carrier.add(at(box(0.04, 0.16, 0.32, M.red), -6.98, 1.35, z)); });
  // fuel tank + air tanks under body
  { const t = at(cyl(0.34, 0.34, 1.3, M.chrome, 32), 2.0, 1.05, 1.05); t.rotation.z = Math.PI / 2; carrier.add(t); }
  { const t = at(cyl(0.18, 0.18, 1.0, M.chassis, 16), -3.4, 0.95, -1.0); t.rotation.z = Math.PI / 2; carrier.add(t); }

  // wheels (lathe profile tyre with tread, dished rim, studs)
  (function () {
    const R = 0.68, W = 0.56, rIn = 0.43;
    const pts = [];
    pts.push(new THREE.Vector2(rIn, -W / 2));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(R - 0.08 + Math.cos(a) * 0.08, -W / 2 + 0.08 + Math.sin(a) * 0.08)); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(R - 0.08 + Math.cos(a) * 0.08, W / 2 - 0.08 + Math.sin(a) * 0.08)); }
    pts.push(new THREE.Vector2(rIn, W / 2));
    const tyreGeo = new THREE.LatheGeometry(pts, 64);
    tread.repeat.set(1, 6);
    const rimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 40);
    const dishGeo = new THREE.CylinderGeometry(0.33, 0.36, 0.06, 40);
    const hubGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.12, 24);
    const studGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 8);
    axles.forEach((ax) => [1, -1].forEach((sd) => {
      const w = new THREE.Group(); w.position.set(ax, AY, sd * 1.07); w.rotation.x = Math.PI / 2;
      w.add(new THREE.Mesh(tyreGeo, M.rubber));
      w.add(new THREE.Mesh(rimGeo, M.rim));
      const dish = new THREE.Mesh(dishGeo, M.rim); dish.position.y = sd * 0.23; w.add(dish);
      const hub = new THREE.Mesh(hubGeo, M.chassis); hub.position.y = sd * 0.28; w.add(hub);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const st = new THREE.Mesh(studGeo, M.chrome); st.position.set(Math.cos(a) * 0.2, sd * 0.27, Math.sin(a) * 0.2); w.add(st); }
      w.rotation.y = Math.random() * 6.28;
      carrier.add(w);
    }));
  })();

  // outriggers with hazard stripes, jacks, pads and timber mats
  [2.05, -5.6].forEach((ox) => [1, -1].forEach((sd) => {
    const g = new THREE.Group(); g.position.set(ox, 1.18, 0); carrier.add(g);
    g.add(at(rbox(0.66, 0.56, 2.62, 0.05, M.paint2), 0, 0, 0));
    g.add(at(rbox(0.46, 0.38, 3.1, 0.04, M.paint), 0, -0.02, sd * 2.0));
    const head = at(rbox(0.56, 0.86, 0.56, 0.05, M.hazard), 0, -0.05, sd * 3.62); g.add(head);
    g.add(at(cyl(0.15, 0.15, 0.62, M.paint2, 24), 0, -0.68, sd * 3.62));
    g.add(at(cyl(0.11, 0.11, 0.55, M.chrome, 24), 0, -1.0, sd * 3.62));
    g.add(at(cyl(0.36, 0.42, 0.1, M.chassis, 40), 0, -1.27 - LIFT + 0.12, sd * 3.62));
    const mat = at(box(1.4, 0.15, 1.4, M.wood), ox, 0.075, sd * 3.62); crane.add(mat);
    for (let k = -2; k <= 2; k++) crane.add(at(box(1.4, 0.005, 0.01, M.black), ox, 0.153, sd * 3.62 + k * 0.28));
  }));

  // superstructure
  const upper = new THREE.Group(); upper.position.set(-2.6, 1.9 + LIFT, 0); crane.add(upper);
  upper.add(at(cyl(1.3, 1.3, 0.3, M.chassis, 64), 0, 0.15, 0));
  (function () {
    const s = new THREE.Shape(); s.moveTo(-3.6, 0.3); s.lineTo(1.6, 0.3); s.lineTo(1.95, 0.75); s.lineTo(1.6, 1.2); s.lineTo(-3.6, 1.2); s.lineTo(-3.6, 0.3);
    upper.add(extrudeProfile(s, 2.6, 0.05, M.paint, 2));
    // counterweight with chamfered slabs
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Shape(); c.moveTo(-4.55, 0); c.lineTo(-3.55, 0); c.lineTo(-3.55, 0.42); c.lineTo(-4.35, 0.42); c.lineTo(-4.55, 0.22); c.lineTo(-4.55, 0);
      const m = extrudeProfile(c, 2.66, 0.03, i % 2 ? M.paint : M.paint2, 2); m.position.y = 1.22 + i * 0.44; upper.add(m);
    }
    // engine hood with louvers
    upper.add(at(rbox(1.7, 0.8, 1.05, 0.12, M.paint), -1.5, 1.6, -0.75));
    for (let i = 0; i < 7; i++) upper.add(at(box(0.9, 0.025, 0.012, M.black), -1.5, 1.35 + i * 0.07, -1.28));
    // winch drum with wraps
    const drum = at(cyl(0.44, 0.44, 1.05, M.chassis, 40), -2.3, 1.62, 0.55); drum.rotation.x = Math.PI / 2; upper.add(drum);
    const wraps = at(cyl(0.47, 0.47, 0.95, M.cable, 40), -2.3, 1.62, 0.55); wraps.rotation.x = Math.PI / 2; upper.add(wraps);
    // operator cab with sloped glass
    const oc = new THREE.Shape(); oc.moveTo(0, 0); oc.lineTo(1.85, 0); oc.lineTo(2.2, 0.75); oc.lineTo(2.05, 1.55); oc.quadraticCurveTo(2.0, 1.65, 1.85, 1.65); oc.lineTo(0.15, 1.65); oc.quadraticCurveTo(0, 1.65, 0, 1.5); oc.lineTo(0, 0);
    const ocab = extrudeProfile(oc, 0.95, 0.05, M.paint, 3); ocab.position.set(-0.4, 1.2, -1.0); upper.add(ocab);
    const og = new THREE.Shape(); og.moveTo(0.55, 0.55); og.lineTo(1.9, 0.55); og.lineTo(2.12, 0.78); og.lineTo(1.98, 1.5); og.lineTo(0.55, 1.5); og.lineTo(0.55, 0.55);
    const ogm = new THREE.Mesh(new THREE.ShapeGeometry(og), M.glass2); ogm.position.set(-0.4, 1.2, -1.0 - 0.478); upper.add(ogm);
    const ogm2 = new THREE.Mesh(new THREE.ShapeGeometry(og), M.glass2); ogm2.position.set(-0.4, 1.2, -1.0 + 0.478); upper.add(ogm2);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.8), M.glass2); fr.position.set(1.75, 2.35, -1.0); fr.rotation.y = Math.PI / 2; fr.rotation.order = 'YXZ'; fr.rotation.x = -0.18; upper.add(fr);
    upper.add(at(box(0.22, 0.09, 0.22, M.orange), 0.6, 2.92, -1.0));
    // boom foot brackets
    upper.add(at(rbox(1.3, 1.35, 0.2, 0.05, M.paint2), -1.3, 1.65, 0.98));
    upper.add(at(rbox(1.3, 1.35, 0.2, 0.05, M.paint2), -1.3, 1.65, -0.38));
    upper.add(at(rbox(0.8, 0.7, 0.7, 0.06, M.chassis), 1.0, 1.0, 0.3));
  })();

  // telescopic boom with oval U-profile sections
  function boomProfile(w, h) {
    const s = new THREE.Shape(); const r = 0.1;
    const hw = w / 2; const top = h / 2; const mid = -h * 0.05;
    s.moveTo(-hw + r, top); s.lineTo(hw - r, top); s.quadraticCurveTo(hw, top, hw, top - r);
    s.lineTo(hw, mid);
    s.absellipse(0, mid, hw, h / 2 + mid, 0, Math.PI, true);
    s.lineTo(-hw, top - r); s.quadraticCurveTo(-hw, top, -hw + r, top);
    return s;
  }
  function boomSection(len, w, h, mat) {
    const g = new THREE.ExtrudeGeometry(boomProfile(w, h), { depth: len, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 20 });
    g.rotateY(Math.PI / 2); // extrude along +x
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }
  const boomPivot = new THREE.Group(); boomPivot.position.set(-1.3, 2.1, 0.3); upper.add(boomPivot);
  const SEC = 5, secLen = [11.2, 10.3, 10.3, 10.3, 10.3];
  const sections = []; let parent = boomPivot;
  for (let i = 0; i < SEC; i++) {
    const sg = new THREE.Group(); parent.add(sg);
    const w = 0.86 - i * 0.11, h = 1.12 - i * 0.14;
    const m = boomSection(secLen[i], w, h, i === 0 ? M.paint : M.paint);
    m.position.x = i === 0 ? -0.7 : 0; sg.add(m);
    // collar at the end of each section
    sg.add(at(rbox(0.22, h + 0.08, w + 0.08, 0.04, M.paint2), secLen[i] - (i === 0 ? 0.7 : 0) - 0.11, -h * 0.03, 0));
    if (i === 0) {
      sg.add(at(box(secLen[i] - 2.4, 0.08, 0.012, M.petrol), secLen[i] / 2, 0.2, w / 2 + 0.02));
      sg.add(at(box(secLen[i] - 2.4, 0.08, 0.012, M.petrol), secLen[i] / 2, 0.2, -w / 2 - 0.02));
      // pivot pin
      const pin = at(cyl(0.16, 0.16, 1.5, M.chrome, 20), 0, 0, 0); pin.rotation.x = Math.PI / 2; sg.add(pin);
    }
    sections.push(sg); parent = sg;
  }
  const lastSec = sections[SEC - 1];
  const head = new THREE.Group(); head.position.set(secLen[SEC - 1] + 0.02, 0, 0); lastSec.add(head);
  head.add(at(rbox(1.1, 0.62, 0.48, 0.08, M.paint), 0.35, -0.02, 0));
  [-0.12, 0.12].forEach((z) => { const sh = at(cyl(0.38, 0.38, 0.1, M.chassis, 40), 0.85, -0.12, z); sh.rotation.x = Math.PI / 2; head.add(sh); });
  { const pin = at(cyl(0.06, 0.06, 0.56, M.chrome, 12), 0.85, -0.12, 0); pin.rotation.x = Math.PI / 2; head.add(pin); }
  const tipAnchor = new THREE.Object3D(); tipAnchor.position.set(0.85, -0.5, 0); head.add(tipAnchor);
  head.add(at(cyl(0.018, 0.018, 0.7, M.chassis, 8), 0.2, 0.62, 0)); head.add(at(box(0.1, 0.1, 0.1, M.red), 0.2, 0.98, 0));

  // luffing cylinder
  const luffAttach = new THREE.Object3D(); luffAttach.position.set(5.6, -0.48, 0); sections[0].add(luffAttach);
  const luff = new THREE.Group(); luff.position.set(1.0, 1.05, 0.3); upper.add(luff);
  const barrelGeo = new THREE.CylinderGeometry(0.27, 0.27, 1, 32); barrelGeo.rotateX(Math.PI / 2); barrelGeo.translate(0, 0, 0.5);
  const rodGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 28); rodGeo.rotateX(Math.PI / 2); rodGeo.translate(0, 0, 0.5);
  const barrel = new THREE.Mesh(barrelGeo, M.paint2); luff.add(barrel);
  const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 32).rotateX(Math.PI / 2), M.chassis); luff.add(gland);
  const rod = new THREE.Mesh(rodGeo, M.chrome); luff.add(rod);

  crane.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------------- hook, ropes, truss ----------------
  const ropeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 8); ropeGeo.translate(0, -0.5, 0);
  const ropes = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(ropeGeo, M.cable); m.castShadow = true; scene.add(m); return m; });
  const hook = new THREE.Group(); scene.add(hook);
  {
    const blockS = new THREE.Shape(); blockS.moveTo(-0.42, 0); blockS.lineTo(0.42, 0); blockS.lineTo(0.42, -0.85); blockS.lineTo(0.2, -1.15); blockS.lineTo(-0.2, -1.15); blockS.lineTo(-0.42, -0.85); blockS.lineTo(-0.42, 0);
    const blk = extrudeProfile(blockS, 0.52, 0.04, M.petrol, 2); blk.position.y = -0.1; hook.add(blk);
    hook.add(at(box(0.86, 0.04, 0.54, M.hazard), 0, -0.45, 0));
    [-0.12, 0.12].forEach((z) => { const sh = at(cyl(0.32, 0.32, 0.08, M.chassis, 32), 0, -0.05, z); sh.rotation.x = Math.PI / 2; hook.add(sh); });
    hook.add(at(cyl(0.08, 0.08, 0.35, M.chrome, 16), 0, -1.38, 0));
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.075, 14, 40, Math.PI * 1.5), M.chassis); hk.position.set(0.02, -1.78, 0); hk.rotation.z = Math.PI * 0.8; hook.add(hk);
  }
  hook.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  const truss = new THREE.Group(); scene.add(truss);
  const TL = 15, TH = 1.8, TD = 0.5;
  function member(ax, ay, bx, by, t, mat, z) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, t, t), mat); m.position.set((ax + bx) / 2, (ay + by) / 2, z || 0); m.rotation.z = Math.atan2(dy, dx); return m;
  }
  function hBeam(L, h, b, mat) { // I-section along x
    const g = new THREE.Group(); g.add(at(box(L, 0.025, b, mat), 0, h / 2, 0)); g.add(at(box(L, 0.025, b, mat), 0, -h / 2, 0)); g.add(at(box(L, h, 0.018, mat), 0, 0, 0)); return g;
  }
  truss.add(at(hBeam(TL, 0.3, 0.3, M.primer), 0, TH / 2, 0));
  truss.add(at(hBeam(TL, 0.3, 0.3, M.primer), 0, -TH / 2, 0));
  const panels = 10;
  for (let i = 0; i <= panels; i++) {
    const x = -TL / 2 + (TL / panels) * i;
    truss.add(member(x, -TH / 2, x, TH / 2, 0.13, M.primer));
    if (i < panels) { const nx = x + TL / panels; truss.add(i < panels / 2 ? member(x, TH / 2, nx, -TH / 2, 0.1, M.primer) : member(x, -TH / 2, nx, TH / 2, 0.1, M.primer)); }
    truss.add(at(box(0.36, 0.36, 0.02, M.primer), x, TH / 2 - 0.12, 0.16)); truss.add(at(box(0.36, 0.36, 0.02, M.primer), x, -TH / 2 + 0.12, 0.16));
  }
  truss.add(at(box(0.4, TH + 0.3, 0.4, M.primer), -TL / 2, 0, 0)); truss.add(at(box(0.4, TH + 0.3, 0.4, M.primer), TL / 2, 0, 0));
  const tagGeo = new THREE.CylinderGeometry(0.016, 0.016, 5, 6); tagGeo.translate(0, -2.5, 0);
  const tags = [-TL / 2 + 0.2, TL / 2 - 0.2].map((x) => { const t = new THREE.Mesh(tagGeo, M.orange); t.position.set(x, -TH / 2, 0); truss.add(t); return t; });
  truss.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const slingGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6); slingGeo.translate(0, 0.5, 0);
  const slingPts = [new THREE.Vector3(-TL * 0.32, TH / 2 + 0.16, 0), new THREE.Vector3(TL * 0.32, TH / 2 + 0.16, 0)];
  const slings = slingPts.map(() => { const s = new THREE.Mesh(slingGeo, M.orange); s.castShadow = true; scene.add(s); return s; });
  const restGroup = new THREE.Group(); scene.add(restGroup);
  const destGroup = new THREE.Group(); scene.add(destGroup);

  // ---------------- background: port ----------------
  const bg = new THREE.Group(); scene.add(bg);
  const corr = canvasTex(512, 128, (g) => {
    for (let x = 0; x < 512; x++) { const v = 0.5 + 0.5 * Math.sin((x / 512) * Math.PI * 2 * 40); const l = Math.round(150 + v * 85); g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, 0, 1, 128); }
    const r = rng(21); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(80,48,28,${r() * 0.14})`; g.fillRect(r() * 512, r() * 128, 2 + r() * 30, 2 + r() * 50); }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 512, 6); g.fillRect(0, 122, 512, 6);
  }, true);
  const contColors = ['#3d6f7d', '#9a4b37', '#8e969a', '#c27a40', '#e0dfd8', '#4c5c6a', '#7d3a31', '#a8afac', '#cfcbbf', '#2f5966'];
  const contMats = contColors.map((c) => new THREE.MeshStandardMaterial({ color: c, map: corr, bumpMap: corr, bumpScale: 1.2, roughness: 0.68, metalness: 0.3 }));
  const contGeo = new THREE.BoxGeometry(12.2, 2.6, 2.44);
  const cr = rng(99);
  function stackRow(x0, z0, n, maxH) {
    for (let i = 0; i < n; i++) { const hc = 1 + Math.floor(cr() * maxH); for (let h = 0; h < hc; h++) { const m = new THREE.Mesh(contGeo, contMats[Math.floor(cr() * contMats.length)]); m.position.set(x0 + (cr() - 0.5) * 0.25, 1.3 + h * 2.6, z0 + i * 2.62); m.castShadow = m.receiveShadow = true; bg.add(m); } }
  }
  [[-30, -48, 9, 3], [-43, -48, 9, 4], [-56, -48, 9, 3], [-17, -52, 7, 2], [18, -54, 8, 4], [31, -54, 8, 3], [-78, -36, 10, 4], [46, -70, 10, 4], [-36, -80, 12, 5], [-8, -82, 12, 5], [60, -30, 6, 3]].forEach((a) => stackRow(...a));
  const gantryMat = new THREE.MeshStandardMaterial({ color: '#c8ccce', roughness: 0.6, metalness: 0.4 });
  function gantry(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    [[-8, -7], [8, -7], [-8, 7], [8, 7]].forEach(([a, b]) => g.add(at(box(1.2, 42, 1.2, gantryMat), a, 21, b)));
    g.add(at(box(18, 2.2, 16, gantryMat), 0, 42, 0)); g.add(at(box(1.8, 2.4, 100, gantryMat), -6, 46, 22)); g.add(at(box(1.8, 2.4, 100, gantryMat), 6, 46, 22));
    g.add(at(box(14, 6, 4, gantryMat), 0, 52, -3)); g.add(at(box(2, 24, 2, gantryMat), 0, 57, -6));
    g.add(member(-8, 6, 8, 36, 0.5, gantryMat, 7)); g.add(member(-8, 6, 8, 36, 0.5, gantryMat, -7));
    g.rotation.y = Math.PI / 2; bg.add(g);
  }
  [-150, -85, -20, 60].forEach((x, i) => gantry(x, -225 - i * 6));
  const hullMat = new THREE.MeshStandardMaterial({ color: '#2b3840', roughness: 0.8, metalness: 0.3 });
  const ship = new THREE.Group(); ship.position.set(-40, 0, -265); bg.add(ship);
  ship.add(at(box(240, 16, 32, hullMat), 0, 4, 0)); ship.add(at(box(22, 26, 30, new THREE.MeshStandardMaterial({ color: '#e3e3dc', roughness: 0.8 })), 102, 25, 0));
  { const sr = rng(5); for (let x = -105; x < 85; x += 13) { const hh = 2 + Math.floor(sr() * 5); ship.add(at(box(12.4, hh * 2.6, 30, contMats[Math.floor(sr() * contMats.length)]), x, 12 + hh * 1.3, 0)); } }
  function mast(x, z) { bg.add(at(cyl(0.2, 0.36, 30, gantryMat, 12), x, 15, z)); bg.add(at(box(1.8, 0.35, 0.5, gantryMat), x, 30.1, z)); bg.add(at(box(1.7, 0.1, 0.45, M.lamp), x, 29.9, z)); }
  mast(-38, -64); mast(56, -76); mast(-90, -40);
  function hills(z, color, seed, hgt) {
    const hr = rng(seed); const s = new THREE.Shape(); const W = 3200; s.moveTo(-W / 2, -5);
    for (let x = -W / 2; x <= W / 2; x += 30) s.lineTo(x, hgt * (0.45 + 0.35 * Math.sin(x * 0.0035 + seed) + 0.2 * Math.sin(x * 0.01 + seed * 2)) + hr() * hgt * 0.05);
    s.lineTo(W / 2, -5); s.lineTo(-W / 2, -5);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, fog: false })); m.position.set(0, 0, z); bg.add(m);
  }
  hills(-1100, cMid.clone().lerp(cHor, 0.6), 3, 170);
  hills(-850, cMid.clone().lerp(cHor, 0.4).multiplyScalar(0.9), 7, 110);
  // steel frame under construction (destination) — background columns and beams
  function hColumn(h, mat) {
    const g = new THREE.Group(); g.add(at(box(0.34, h, 0.025, mat), 0, h / 2, 0.16)); g.add(at(box(0.34, h, 0.025, mat), 0, h / 2, -0.16)); g.add(at(box(0.02, h, 0.32, mat), 0, h / 2, 0));
    g.add(at(box(0.7, 0.04, 0.7, mat), 0, 0.02, 0)); g.add(at(box(0.5, 0.04, 0.5, mat), 0, h, 0)); return g;
  }

  // ---------------- pose: progress -> crane state ----------------
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const sm = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const seg = (p, a, b) => sm(clamp01((p - a) / (b - a)));
  const REST_YAW = 0.42, END_YAW = 2.05, COL_H = 7.2, BLOCK_H = 0.42;
  function setCrane(p) {
    const lift = seg(p, 0.08, 0.36);
    upper.rotation.y = REST_YAW + (END_YAW - REST_YAW) * seg(p, 0.36, 0.78);
    boomPivot.rotation.z = THREE.MathUtils.degToRad(52 + 8 * seg(p, 0.06, 0.34) - 5 * seg(p, 0.5, 0.86));
    const ext = 0.32 + 0.14 * seg(p, 0.1, 0.4) + 0.06 * seg(p, 0.5, 0.86);
    for (let i = 1; i < SEC; i++) sections[i].position.x = secLen[i - 1] * ext - (i === 1 ? 0.7 : 0);
    crane.updateMatrixWorld(true);
    return lift;
  }
  function tipAt(p) { setCrane(p); return tipAnchor.getWorldPosition(new THREE.Vector3()); }
  const HOOK_TO_TRUSS = 1.95 + 3.6 + TH / 2; // hook origin -> truss centre
  const restTip = tipAt(0), endTip = tipAt(1);
  const restHookY = BLOCK_H + TH / 2 + HOOK_TO_TRUSS + 0.15;
  const endHookY = COL_H + 0.15 + TH / 2 + HOOK_TO_TRUSS;

  let lastTime = 0;
  function pose(p, time) {
    const lift = setCrane(p);
    const tip = tipAnchor.getWorldPosition(tmp.set(0, 0, 0)).clone();
    const lower = seg(p, 0.8, 0.96);
    const topY = tip.y - 7.2;
    let hookY = restHookY + (topY - restHookY) * lift;
    hookY = hookY + (endHookY - hookY) * lower;
    const airborne = lift * (1 - lower);
    const sway = (Math.sin(time * 0.8) * 0.07 + Math.sin(time * 0.47) * 0.05) * airborne;
    hook.position.set(tip.x + sway, hookY, tip.z + sway * 0.7);
    hook.rotation.y = upper.rotation.y;
    // four falls of rope
    ropes.forEach((r, i) => {
      const off = (i - 1.5) * 0.11;
      tmp2.set(0, 0, off).applyAxisAngle(UP, upper.rotation.y);
      r.position.set(tip.x + tmp2.x, tip.y + 0.25, tip.z + tmp2.z);
      const d = new THREE.Vector3(hook.position.x + tmp2.x - r.position.x, hook.position.y - 0.05 - r.position.y, hook.position.z + tmp2.z - r.position.z);
      const L = d.length(); r.scale.set(1, L, 1); r.quaternion.setFromUnitVectors(DOWN, d.normalize());
    });
    const hookTip = new THREE.Vector3(hook.position.x, hook.position.y - 1.95, hook.position.z);
    truss.position.set(hookTip.x, hookTip.y - 3.6 - TH / 2, hookTip.z);
    truss.rotation.set(0, upper.rotation.y + 0.73 + (0.04 - 0.73) * seg(p, 0.36, 0.8) + Math.sin(time * 0.29) * 0.04 * airborne, Math.sin(time * 0.66) * 0.01 * airborne);
    truss.updateMatrixWorld(true);
    tags.forEach((t, i) => { t.rotation.z = Math.sin(time * 0.9 + i) * 0.06 * airborne; t.scale.y = 1 - 0.55 * (1 - airborne); });
    slingPts.forEach((lp, k) => {
      const w = lp.clone().applyMatrix4(truss.matrixWorld); const s = slings[k]; s.position.copy(w);
      const d = hookTip.clone().sub(w); const L = d.length(); s.scale.set(1, L, 1); s.quaternion.setFromUnitVectors(UP, d.normalize());
    });
    // luff cylinder
    luffAttach.getWorldPosition(tmp); luff.lookAt(tmp);
    const dist = tmp.distanceTo(luff.getWorldPosition(tmp2));
    const bl = Math.min(4.4, dist * 0.6); barrel.scale.z = bl; gland.position.z = bl; rod.position.z = bl - 0.3; rod.scale.z = Math.max(0.4, dist - bl + 0.3);
    lastTime = time;
  }
  // place rest blocks and destination columns at the right spots
  pose(0, 0);
  [-TL * 0.38, TL * 0.38].forEach((lx) => {
    const w = new THREE.Vector3(lx, -TH / 2, 0).applyMatrix4(truss.matrixWorld);
    const b = at(box(0.9, BLOCK_H, 1.7, M.wood), w.x, BLOCK_H / 2, w.z); b.rotation.y = truss.rotation.y; b.castShadow = b.receiveShadow = true; restGroup.add(b);
  });
  pose(1, 0);
  [-TL / 2, TL / 2].forEach((lx) => {
    const w = new THREE.Vector3(lx, 0, 0).applyMatrix4(truss.matrixWorld);
    const c = hColumn(COL_H, M.primer); c.position.set(w.x, 0, w.z); c.rotation.y = truss.rotation.y; destGroup.add(c);
    // pedestal
    const ped = at(box(1.4, 0.5, 1.4, M.concreteCol), w.x, -0.2, w.z); ped.rotation.y = truss.rotation.y; destGroup.add(ped);
  });
  // more of the frame behind the destination (columns already up, with one truss placed)
  (function () {
    const dir = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, truss.rotation.y); // along truss
    const perp = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, truss.rotation.y);
    const base = truss.position.clone(); base.y = 0;
    for (let k = 1; k <= 3; k++) {
      [-TL / 2, TL / 2].forEach((lx) => {
        const pnt = base.clone().addScaledVector(dir, lx).addScaledVector(perp, k * 7.5);
        const c = hColumn(COL_H, M.primer); c.position.copy(pnt); c.rotation.y = truss.rotation.y; destGroup.add(c);
      });
      if (k >= 2) { tags.forEach((t) => (t.visible = false)); const t2 = truss.clone(); tags.forEach((t) => (t.visible = true)); t2.position.copy(base.clone().addScaledVector(perp, k * 7.5)); t2.position.y = COL_H + 0.15 + TH / 2; t2.rotation.set(0, truss.rotation.y, 0); destGroup.add(t2); }
    }
    // purlins between the placed trusses
    for (let j = -3; j <= 3; j++) {
      const pnt = base.clone().addScaledVector(dir, j * 2.1).addScaledVector(perp, 2.5 * 7.5); pnt.y = COL_H + TH + 0.3;
      const pl = box(0.12, 0.18, 7.5, M.primer); pl.position.copy(pnt); pl.rotation.y = truss.rotation.y; destGroup.add(pl);
    }
  })();
  destGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // contact shadow under the carrier
  const aoTex = canvasTex(256, 128, (g) => { const grd = g.createRadialGradient(128, 64, 4, 128, 64, 128); grd.addColorStop(0, 'rgba(0,0,0,0.8)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 128); });
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 4.4), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: 0.7 }));
  ao.rotation.x = -Math.PI / 2; ao.position.y = 0.02; scene.add(ao);

  // optional: swap the procedural crane for a supplied GLB (keeps rigging/animation of hook & truss)
  if (opts.modelUrl) {
    new GLTFLoader().load(opts.modelUrl, (gltf) => {
      const m = gltf.scene; m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      if (opts.modelScale) m.scale.setScalar(opts.modelScale);
      crane.visible = false; scene.add(m);
    });
  }

  // ---------------- camera path (by progress) ----------------
  const view = { w: 1, h: 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const camKeys = [
    { p: 0.0, az: 24, el: 3.0, dist: 40, tx: 1.5, ty: 7.0, tz: -1 },
    { p: 0.45, az: 38, el: 5.5, dist: 46, tx: -1, ty: 10.5, tz: -3 },
    { p: 0.75, az: 92, el: 6.5, dist: 50, tx: -5, ty: 9.5, tz: -7 },
    { p: 1.0, az: 138, el: 5.5, dist: 44, tx: -8, ty: 8, tz: -9 }
  ];
  function camAt(p) {
    let a = camKeys[0], b = camKeys[camKeys.length - 1];
    for (let i = 0; i < camKeys.length - 1; i++) if (p >= camKeys[i].p && p <= camKeys[i + 1].p) { a = camKeys[i]; b = camKeys[i + 1]; break; }
    const t = sm(clamp01((p - a.p) / Math.max(1e-6, b.p - a.p)));
    const o = {}; for (const k of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) o[k] = a[k] + (b[k] - a[k]) * t; return o;
  }
  const focusTarget = new THREE.Vector3();
  function frame(p, time) {
    const aspect = view.w / view.h, narrow = aspect < 1.05;
    const c = camAt(p);
    const az = THREE.MathUtils.degToRad(c.az + Math.sin(time * 0.07) * 1.5 + pointer.x * 2.0);
    const dist = c.dist * (narrow ? 1.2 : 1);
    const tgt = tmp.set(c.tx, c.ty, c.tz);
    camera.position.set(tgt.x + Math.cos(az) * dist, 1.6 + Math.sin(THREE.MathUtils.degToRad(c.el + pointer.y)) * dist * 0.35 + Math.sin(time * 0.31) * 0.05, tgt.z + Math.sin(az) * dist);
    camera.lookAt(tgt);
    camera.fov = narrow ? 40 : 30; camera.aspect = aspect;
    if (narrow) camera.setViewOffset(view.w, view.h, view.w * 0.04, -view.h * 0.24, view.w, view.h);
    else camera.setViewOffset(view.w, view.h, -view.w * 0.13, -view.h * 0.02, view.w, view.h);
    camera.updateProjectionMatrix();
  }

  // ---------------- post-processing ----------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (quality === 'high') {
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.5, 0.96);
  composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, { focus: 40, aperture: 0.00007, maxblur: 0.004 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());

  function resize() {
    const r = (canvas.parentElement || canvas).getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === view.w && h === view.h) return false;
    view.w = w; view.h = h; renderer.setSize(w, h, false); composer.setSize(w, h);
    if (gtao) gtao.setSize(w * DPR, h * DPR);
    return true;
  }

  // ---------------- loop ----------------
  let progress = opts.initialProgress != null ? opts.initialProgress : 0, shown = progress;
  let raf = 0, running = false, disposed = false; const t0 = performance.now();
  function renderFrame(p, time) {
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    pose(p, time); frame(p, time);
    upper.getWorldPosition(focusTarget).lerp(hook.position, 0.35);
    bokeh.uniforms.focus.value = camera.position.distanceTo(focusTarget);
    composer.render();
  }
  function tick() {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    resize();
    const time = (performance.now() - t0) / 1000;
    let target = progress;
    if (typeof opts.getProgress === 'function') { const v = opts.getProgress(time); if (v != null && isFinite(v)) target = v; }
    shown += (target - shown) * (reduced ? 1 : 0.075);
    if (Math.abs(target - shown) < 0.0004) shown = target;
    if (opts.onProgress) opts.onProgress(shown);
    renderFrame(shown, reduced ? 0 : time);
  }
  function start() { if (running || disposed) return; running = true; tick(); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  resize();
  renderFrame(shown, 0);
  let io = null;
  if (window.IntersectionObserver) { io = new IntersectionObserver((es) => { if (es[0].isIntersecting) start(); else stop(); }, { threshold: 0.01 }); io.observe(canvas); }
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; pointer.ty = -((e.clientY - r.top) / r.height - 0.5) * 2; };
  if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });
  if (!opts.noLoop) start();

  return {
    stop() { stop(); },
    setProgress(p) { progress = clamp01(p); },
    renderAt(p, time) { resize(); shown = progress = clamp01(p); renderFrame(shown, time || 0); },
    dispose() {
      disposed = true; stop(); if (io) io.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      Object.values(M).forEach((m) => m.dispose && m.dispose());
      composer.dispose && composer.dispose(); envRT.dispose(); pmrem.dispose(); renderer.dispose();
    }
  };
}

