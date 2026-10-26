// The 3D stage: a living orb with orbiting tech tiles, a particle field, a
// low-poly laptop and a floating shard field. All geometry and textures are
// procedural (made in code at runtime), so there are no model or image files.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, Group, Vector2, Vector3,
  IcosahedronGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, ShaderMaterial,
  Mesh, BufferGeometry, Float32BufferAttribute, Points, AdditiveBlending, CanvasTexture,
  SpriteMaterial, Sprite, TorusGeometry, MeshBasicMaterial, BoxGeometry, MeshStandardMaterial,
  PlaneGeometry, AmbientLight, PointLight, DirectionalLight, OctahedronGeometry,
  TetrahedronGeometry, CatmullRomCurve3, SRGBColorSpace, MathUtils, DoubleSide, InstancedMesh,
  Object3D,
} from 'three';

const ORANGE = new Color('#EA580C');
const RED = new Color('#DC2626');
const AMBER = new Color('#fb923c');

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function glowTexture(size = 256, stops = [[0, 'rgba(255,170,90,1)'], [0.25, 'rgba(234,88,12,.55)'], [0.6, 'rgba(220,38,38,.12)'], [1, 'rgba(0,0,0,0)']]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function tileTexture(label) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  roundRect(g, 18, 18, s - 36, s - 36, 48);
  const bg = g.createLinearGradient(0, 0, s, s);
  bg.addColorStop(0, 'rgba(40,30,28,.92)');
  bg.addColorStop(1, 'rgba(14,12,16,.92)');
  g.fillStyle = bg;
  g.fill();
  const br = g.createLinearGradient(0, 0, s, s);
  br.addColorStop(0, '#fb923c');
  br.addColorStop(0.5, 'rgba(234,88,12,.35)');
  br.addColorStop(1, '#DC2626');
  g.lineWidth = 6;
  g.strokeStyle = br;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.08)';
  roundRect(g, 30, 30, s - 60, 70, 34);
  g.fill();
  const tg = g.createLinearGradient(0, 70, 0, 190);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(1, '#fdba74');
  g.fillStyle = tg;
  const size = label.length > 3 ? 70 : label.length > 2 ? 84 : 100;
  g.font = `700 ${size}px "Space Grotesk", "Inter", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, s / 2, s / 2 + 6);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function screenTexture() {
  // An illustrative dashboard for the laptop screen (decorative, no real data).
  const w = 1024, h = 640;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b10'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#121218'; g.fillRect(0, 0, 210, h);
  // logo
  const lg = g.createLinearGradient(30, 30, 80, 80);
  lg.addColorStop(0, '#fb923c'); lg.addColorStop(1, '#DC2626');
  g.fillStyle = lg; roundRect(g, 28, 30, 44, 44, 12); g.fill();
  g.fillStyle = '#fff'; g.font = '700 30px "Space Grotesk", system-ui, sans-serif'; g.textBaseline = 'middle';
  g.fillText('Rether', 86, 53);
  const nav = ['Overview', 'Projects', 'Deployments', 'Domains', 'Billing', 'Settings'];
  g.font = '500 20px Inter, system-ui, sans-serif';
  nav.forEach((n, i) => {
    if (i === 2) { g.fillStyle = 'rgba(234,88,12,.18)'; roundRect(g, 16, 112 + i * 54, 178, 42, 10); g.fill(); }
    g.fillStyle = i === 2 ? '#fdba74' : '#8a8580';
    g.fillText(n, 34, 133 + i * 54);
  });
  g.fillStyle = '#f4f1ee'; g.font = '700 34px "Space Grotesk", system-ui, sans-serif';
  g.fillText('Deployments', 250, 62);
  const btn = g.createLinearGradient(820, 40, 990, 84);
  btn.addColorStop(0, '#EA580C'); btn.addColorStop(1, '#DC2626');
  g.fillStyle = btn; roundRect(g, 820, 38, 170, 48, 24); g.fill();
  g.fillStyle = '#fff'; g.font = '600 20px Inter, system-ui, sans-serif'; g.fillText('New deploy', 850, 63);
  const rows = [['my-site', 'Production', '#4ade80'], ['blog', 'Preview', '#fb923c'], ['docs', 'Production', '#4ade80'], ['api', 'Building', '#fbbf24'], ['store', 'Production', '#4ade80']];
  rows.forEach(([name, env, col], i) => {
    const y = 120 + i * 96;
    g.fillStyle = '#15151c'; roundRect(g, 250, y, 740, 80, 16); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(286, y + 40, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f1ee'; g.font = '600 24px Inter, system-ui, sans-serif'; g.fillText(name, 312, y + 32);
    g.fillStyle = '#7d7770'; g.font = '400 18px Inter, system-ui, sans-serif'; g.fillText('main · ' + env.toLowerCase(), 312, y + 58);
    g.fillStyle = 'rgba(255,255,255,.05)'; roundRect(g, 820, y + 22, 140, 36, 18); g.fill();
    g.fillStyle = col; g.font = '600 17px Inter, system-ui, sans-serif'; g.fillText(env, 842, y + 41);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createStage(canvas, { mobile = false, onProgress = () => {} } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  const maxDpr = mobile ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor('#08080b', 1);
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.fog = new Fog('#08080b', 12, 34);
  const camera = new PerspectiveCamera(mobile ? 55 : 42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  onProgress(0.15);

  // ---------- lights (for the laptop + shards) ----------
  scene.add(new AmbientLight('#ffffff', 0.25));
  const key = new PointLight(ORANGE, 40, 30, 1.6); key.position.set(4, 3, 3); scene.add(key);
  const rim = new PointLight(RED, 30, 30, 1.6); rim.position.set(-4, -2, -2); scene.add(rim);
  const dir = new DirectionalLight('#ffd9c2', 0.6); dir.position.set(5, 8, 6); scene.add(dir);

  // ---------- the orb ----------
  const core = new Group();
  scene.add(core);
  const orbUniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.13 }, uMouse: { value: new Vector2() },
    uC1: { value: new Color('#701507') }, uC2: { value: ORANGE.clone() }, uC3: { value: RED.clone() }, uC4: { value: AMBER.clone() },
  };
  const orbMat = new ShaderMaterial({
    uniforms: orbUniforms,
    vertexShader: NOISE + /* glsl */`
      uniform float uTime; uniform float uAmp; uniform vec2 uMouse;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        vec3 p = position;
        float n = snoise(normal * 1.4 + vec3(uTime*.25, uTime*.18, uMouse.x*.6));
        float n2 = snoise(normal * 3.2 - vec3(uTime*.35));
        float d = n * uAmp + n2 * uAmp * .25;
        p += normal * d;
        vD = d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4; uniform float uTime;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        vec3 n = normalize(vN); vec3 v = normalize(vView);
        float f = pow(1. - max(dot(n, v), 0.), 2.);
        vec3 col = mix(uC1, uC3, smoothstep(-.12, .14, vD));
        col = mix(col, uC2, smoothstep(.04, .2, vD));
        vec3 L = normalize(vec3(.6, .8, .7));
        float diff = max(dot(n, L), 0.);
        col *= .62 + .6 * diff;
        float spec = pow(max(dot(reflect(-L, n), v), 0.), 28.);
        col += vec3(1., .78, .6) * spec * .55;
        col = mix(col, uC4, f * .85);
        col += uC2 * pow(f, 4.) * .8;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const orb = new Mesh(new IcosahedronGeometry(1.25, mobile ? 32 : 48), orbMat);
  core.add(orb);

  const glow = new Sprite(new SpriteMaterial({ map: glowTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  glow.scale.setScalar(7.5);
  core.add(glow);

  const shell = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(2.05, 1)), new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
  core.add(shell);

  const rings = new Group();
  core.add(rings);
  [[2.7, 0.6, 0.2], [3.2, -0.4, 0.9], [3.8, 1.2, -0.5]].forEach(([r, rx, rz], i) => {
    const ring = new Mesh(new TorusGeometry(r, 0.006, 6, 160), new MeshBasicMaterial({ color: i === 1 ? RED : ORANGE, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false }));
    ring.rotation.set(Math.PI / 2 + rx, 0, rz);
    rings.add(ring);
  });
  onProgress(0.35);

  // ---------- orbiting tech tiles ----------
  const labels = ['JS', 'Node', 'API', 'AI', 'SQL', '</>', 'UPI', 'Bot', '{ }'];
  const tiles = labels.map((label, i) => {
    const s = new Sprite(new SpriteMaterial({ map: tileTexture(label), transparent: true, depthWrite: false }));
    const base = mobile ? 0.55 : 0.62;
    s.scale.setScalar(base);
    s.userData = { r: 2.0 + (i % 3) * 0.32, speed: 0.12 + (i % 4) * 0.025, phase: (i / labels.length) * Math.PI * 2, tilt: (i % 3 - 1) * 0.5, y: ((i * 37) % 7 - 3) * 0.12, base };
    core.add(s);
    return s;
  });
  onProgress(0.5);

  // ---------- particles ----------
  const count = mobile ? 700 : 2200;
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 22;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th) + 2;
    pos[i * 3 + 1] = (r * Math.cos(ph)) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 4;
    sizes[i] = Math.random() * 1.6 + 0.4;
  }
  const pGeo = new BufferGeometry();
  pGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  pGeo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  const pMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: dpr } },
    vertexShader: /* glsl */`
      attribute float aSize; uniform float uTime; uniform float uDpr; varying float vA;
      void main(){
        vec3 p = position; p.y += sin(uTime*.3 + position.x*.4) * .15;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        gl_PointSize = aSize * uDpr * (26. / -mv.z);
        vA = smoothstep(34., 6., -mv.z) * (.4 + .6*fract(aSize*7.3));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); if(d>.5) discard; float a = smoothstep(.5,0.,d);
        gl_FragColor = vec4(mix(vec3(1.,.55,.25), vec3(1.,.85,.7), a), a * vA); }`,
  });
  const particles = new Points(pGeo, pMat);
  scene.add(particles);

  // ---------- low-poly laptop (Work station) ----------
  const laptop = new Group();
  laptop.position.set(7.4, -0.9, -3.2);
  laptop.rotation.set(0.08, -0.55, 0);
  const metal = new MeshStandardMaterial({ color: '#1c1b20', metalness: 0.7, roughness: 0.35 });
  const dark = new MeshStandardMaterial({ color: '#0d0d11', metalness: 0.3, roughness: 0.7 });
  const base = new Mesh(new BoxGeometry(3.2, 0.1, 2.2), metal); laptop.add(base);
  const deck = new Mesh(new BoxGeometry(2.8, 0.02, 1.0), dark); deck.position.set(0, 0.06, -0.35); laptop.add(deck);
  const keys = new InstancedMesh(new BoxGeometry(0.16, 0.025, 0.16), new MeshStandardMaterial({ color: '#26252c', roughness: 0.6, emissive: '#3a1405', emissiveIntensity: 0.6 }), 14 * 5);
  const o = new Object3D(); let k = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { o.position.set(-1.27 + c * 0.195, 0.08, -0.75 + r * 0.19); o.updateMatrix(); keys.setMatrixAt(k++, o.matrix); }
  laptop.add(keys);
  const pad = new Mesh(new BoxGeometry(0.9, 0.012, 0.55), dark); pad.position.set(0, 0.058, 0.55); laptop.add(pad);
  const hinge = new Group(); hinge.position.set(0, 0.05, -1.08); laptop.add(hinge);
  hinge.rotation.x = -0.28;
  const lid = new Mesh(new BoxGeometry(3.2, 2.05, 0.08), metal); lid.position.set(0, 1.03, 0); hinge.add(lid);
  const screenMat = new MeshBasicMaterial({ map: screenTexture(), toneMapped: false });
  const screen = new Mesh(new PlaneGeometry(2.96, 1.85), screenMat); screen.position.set(0, 1.03, 0.045); hinge.add(screen);
  const sglow = new Sprite(new SpriteMaterial({ map: glowTexture(128, [[0, 'rgba(234,88,12,.5)'], [1, 'rgba(0,0,0,0)']]), blending: AdditiveBlending, depthWrite: false, transparent: true }));
  sglow.scale.set(7, 4.5, 1); sglow.position.set(0, 1, -0.6); hinge.add(sglow);
  scene.add(laptop);
  onProgress(0.65);

  // ---------- shard field (GitHub / Skills stations) ----------
  const shards = new Group();
  shards.position.set(-1, -3.2, -9);
  const shardMatA = new MeshStandardMaterial({ color: '#2a1610', metalness: 0.6, roughness: 0.3, flatShading: true, emissive: '#5a1a05', emissiveIntensity: 0.5 });
  const shardMatB = new MeshBasicMaterial({ color: AMBER, wireframe: true, transparent: true, opacity: 0.35 });
  const nShards = mobile ? 14 : 26;
  for (let i = 0; i < nShards; i++) {
    const geo = i % 2 ? new OctahedronGeometry(0.35 + Math.random() * 0.5, 0) : new TetrahedronGeometry(0.35 + Math.random() * 0.5, 0);
    const m = new Mesh(geo, i % 5 === 0 ? shardMatB : shardMatA);
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 8);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    m.userData = { s: 0.2 + Math.random() * 0.5, f: Math.random() * 6 };
    shards.add(m);
  }
  scene.add(shards);

  // grid floor
  const gridMat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uC: { value: ORANGE.clone() } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uC; varying vec2 vUv; varying vec3 vW;
      void main(){
        vec2 g = abs(fract(vW.xz*.5 - vec2(0., uTime*.05)) - .5) / fwidth(vW.xz*.5);
        float line = 1. - min(min(g.x, g.y), 1.);
        float fade = smoothstep(.5, .1, length(vUv-.5));
        gl_FragColor = vec4(uC, line * fade * .22);
      }`,
  });
  const grid = new Mesh(new PlaneGeometry(60, 60), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, -4.2, -6);
  scene.add(grid);
  onProgress(0.8);

  // ---------- camera stations (one per section) ----------
  // [camera position, look-at target]; the narrow layout gets its own framing.
  const wide = () => camera.aspect > 1.05;
  function stations() {
    if (wide()) return [
      [new Vector3(-0.7, 0.2, 11), new Vector3(-3.7, 0, 0)],             // hero: orb sits right of the title
      [new Vector3(-6.2, 1.8, 6.2), new Vector3(-0.6, -0.3, -0.5)],       // about: orbit to the side
      [new Vector3(3.6, 1.1, 4.4), new Vector3(5.8, -1.45, -3.3)],         // work: the laptop, upper right
      [new Vector3(0.5, 6, -4), new Vector3(-1, -3.4, -11)],             // github: over the shard field, orb out of frame
      [new Vector3(-7.5, 1.2, -2.5), new Vector3(-1.5, -2.8, -9)],        // skills: among the shards
      [new Vector3(0, 0.1, 8.4), new Vector3(0, 0.1, 0)],                 // contact: back to the orb
    ];
    return [
      [new Vector3(0, -0.9, 11), new Vector3(0, -2.1, 0)],
      [new Vector3(-3.8, 1.2, 9), new Vector3(0, -1.2, 0)],
      [new Vector3(6.4, 1.4, 4.2), new Vector3(7.6, -0.2, -3.2)],
      [new Vector3(0, 6, -4), new Vector3(-1, -3.4, -11)],
      [new Vector3(-6.5, 1, -2.5), new Vector3(-1, -2.8, -9)],
      [new Vector3(0, 0.3, 10.5), new Vector3(0, 0.3, 0)],
    ];
  }
  let posCurve, tgtCurve;
  function buildCurves() {
    const s = stations();
    posCurve = new CatmullRomCurve3(s.map((x) => x[0]), false, 'centripetal');
    tgtCurve = new CatmullRomCurve3(s.map((x) => x[1]), false, 'centripetal');
  }

  const state = { scroll: 0, sections: 6, mouse: new Vector2(), mouseS: new Vector2(), vel: 0, running: true };
  const X_AXIS = new Vector3(1, 0, 0), tmp2 = new Vector3();
  const camPos = new Vector3(), camTgt = new Vector3(), curPos = new Vector3(0, 0, 12), curTgt = new Vector3(), tmp = new Vector3();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 55 : 42;
    camera.updateProjectionMatrix();
    buildCurves();
  }
  resize();

  let last = performance.now(), elapsed = 0;
  let frames = 0, fpsT = 0, checked = false;
  function tick() {
    if (!state.running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; elapsed += dt;
    const t = elapsed;
    frames++; fpsT += dt;
    // adaptive quality: after ~2 s, drop the pixel ratio if we're under ~40 fps
    if (!checked && fpsT > 2) {
      checked = true;
      const fps = frames / fpsT;
      if (fps < 40 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); pMat.uniforms.uDpr.value = 1; resize(); }
    }

    state.mouseS.lerp(state.mouse, 1 - Math.pow(0.001, dt));
    state.vel *= Math.pow(0.02, dt);

    const f = MathUtils.clamp(state.scroll, 0, 1);
    posCurve.getPoint(f, camPos);
    tgtCurve.getPoint(f, camTgt);
    // mouse parallax
    camPos.x += state.mouseS.x * 0.55; camPos.y += state.mouseS.y * 0.35;
    const k = 1 - Math.pow(0.004, dt);
    curPos.lerp(camPos, k); curTgt.lerp(camTgt, k);
    camera.position.copy(curPos);
    camera.lookAt(curTgt);

    orbUniforms.uTime.value = t;
    orbUniforms.uMouse.value.copy(state.mouseS);
    orbUniforms.uAmp.value = MathUtils.lerp(orbUniforms.uAmp.value, 0.13 + Math.min(Math.abs(state.vel) * 0.04, 0.2) + state.mouseS.length() * 0.03, 0.08);
    orb.rotation.y = t * 0.15 + state.mouseS.x * 0.6;
    orb.rotation.x = state.mouseS.y * -0.4;
    shell.rotation.y = -t * 0.08 - f * 2;
    shell.rotation.x = t * 0.05;
    rings.rotation.y = t * 0.1 + f * 1.5;
    rings.rotation.z = state.mouseS.x * 0.2;
    glow.material.opacity = 0.75 + Math.sin(t * 1.4) * 0.1;

    // tiles spread out toward the contact section and quieten behind the content
    const spread = 1 + MathUtils.smoothstep(f, 0.8, 1) * (wide() ? 1.5 : 0.45);
    const quiet = 1 - MathUtils.smoothstep(f, 0.04, 0.16) * 0.75 + MathUtils.smoothstep(f, 0.88, 1) * 0.35;
    for (const s of tiles) {
      const u = s.userData;
      const a = u.phase + t * u.speed + f * 1.2;
      tmp.set(Math.cos(a) * u.r * spread * (wide() ? 0.84 : 1), u.y * spread + Math.sin(a * 1.3) * 0.25, Math.sin(a) * u.r * spread * 0.8);
      tmp.applyAxisAngle(X_AXIS, u.tilt * 0.6);
      s.position.copy(tmp);
      s.scale.setScalar(u.base * (1 + Math.sin(t * 2 + u.phase) * 0.04));
      s.getWorldPosition(tmp2);
      const near = MathUtils.smoothstep(tmp2.distanceTo(camera.position), 2.5, 5.5);
      s.material.opacity = quiet * near;
    }
    const sh = MathUtils.smoothstep(f, 0.3, 0.55);
    shards.scale.setScalar(Math.max(sh, 0.001));
    shards.visible = sh > 0.01;

    particles.rotation.y = t * 0.012 + f * 0.4;
    pMat.uniforms.uTime.value = t;
    const lap = 1 - MathUtils.smoothstep(f, 0.8, 0.94);
    laptop.visible = lap > 0.01;
    laptop.scale.setScalar(Math.max(lap, 0.001));
    laptop.position.y = -0.9 + Math.sin(t * 0.8) * 0.12;
    laptop.rotation.y = -0.55 + Math.sin(t * 0.4) * 0.06 + state.mouseS.x * 0.12;
    shards.children.forEach((m) => { m.rotation.x += dt * m.userData.s; m.rotation.y += dt * m.userData.s * 0.7; m.position.y += Math.sin(t + m.userData.f) * dt * 0.15; });
    gridMat.uniforms.uTime.value = t;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  let raf = 0;

  // compile shaders up front so the first scrolled frame doesn't hitch
  renderer.compile(scene, camera);
  onProgress(1);

  return {
    start() { if (state.running && raf) return; state.running = true; last = performance.now(); raf = requestAnimationFrame(tick); },
    stop() { state.running = false; cancelAnimationFrame(raf); raf = 0; },
    setScroll(v) { state.scroll = v; },
    setVelocity(v) { state.vel = v; },
    setMouse(x, y) { state.mouse.set(x, y); },
    resize,
    renderOnce() { renderer.render(scene, camera); },
    get info() { return { dpr, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls }; },
  };
}
