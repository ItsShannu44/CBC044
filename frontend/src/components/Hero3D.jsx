// The 3D hero: a stack of books with a graduation cap, and the gold thread
// (sutra) that winds down around them and draws itself in. Built with
// three.js, which is loaded only when this component mounts, so the rest of
// the app does not pay for it. It follows the pointer and the page scroll,
// pauses when off screen, renders a still frame for reduced motion, and calls
// onFail when WebGL is not available so the page can show a flat picture.
import { useEffect, useRef } from 'react';

const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

export default function Hero3D({ className = '', onFail, compact = false }) {
  const host = useRef(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (async () => {
      const THREE = await import('three');
      const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed || !host.current) return;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        onFail?.();
        return;
      }
      const el = host.current;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.98;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.45;

      const camera = new THREE.PerspectiveCamera(compact ? 32 : 30, 1, 0.1, 100);
      camera.position.set(0, 3.1, 11.5);
      camera.lookAt(0, 0.9, 0);

      // Lights: warm key from the moon side, mint rim from behind.
      scene.add(new THREE.HemisphereLight('#cfeee8', '#0a2427', 0.9));
      const key = new THREE.DirectionalLight('#ffe2a8', 2.2);
      key.position.set(4, 6, 5);
      scene.add(key);
      const rim = new THREE.PointLight('#3cc7b4', 30, 20);
      rim.position.set(-4, 3, -3);
      scene.add(rim);
      const glow = new THREE.PointLight('#f6c86a', 18, 10);
      glow.position.set(0, 3.4, 2);
      scene.add(glow);

      const disposables = [envTex, pmrem];
      const track = (x) => { disposables.push(x); return x; };

      const root = new THREE.Group();
      scene.add(root);

      // ---- Books ----
      const paper = track(new THREE.MeshStandardMaterial({ color: '#f4ecd6', roughness: 0.9 }));
      const BOOKS = [
        { w: 3.6, h: 0.5, d: 2.5, color: '#145c58', rot: 0.06 },
        { w: 3.2, h: 0.46, d: 2.3, color: '#c98f2c', rot: -0.16 },
        { w: 3.35, h: 0.44, d: 2.35, color: '#1f7d74', rot: 0.12 },
      ];
      const books = [];
      let y = 0;
      for (const b of BOOKS) {
        const g = new THREE.Group();
        const cover = new THREE.Mesh(
          track(new RoundedBoxGeometry(b.w, b.h, b.d, 4, 0.07)),
          track(new THREE.MeshPhysicalMaterial({ color: b.color, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.35 })),
        );
        const pages = new THREE.Mesh(track(new THREE.BoxGeometry(b.w - 0.16, b.h - 0.14, b.d - 0.06)), paper);
        pages.position.set(0.1, 0, 0);
        // A thin gold band on the spine side.
        const band = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.06, b.h + 0.01, b.d * 0.82)),
          track(new THREE.MeshStandardMaterial({ color: '#f1c96b', metalness: 0.9, roughness: 0.3 })),
        );
        band.position.set(-b.w / 2 + 0.28, 0, 0);
        g.add(cover, pages, band);
        y += b.h / 2;
        g.userData = { restY: y, rot: b.rot };
        g.position.y = y;
        g.rotation.y = b.rot;
        y += b.h / 2 + 0.02;
        root.add(g);
        books.push(g);
      }
      const stackTop = y;

      // ---- Graduation cap ----
      const cap = new THREE.Group();
      const capMat = track(new THREE.MeshPhysicalMaterial({ color: '#123c40', roughness: 0.55, clearcoat: 0.4 }));
      const skull = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.05, 0.62, 48)), capMat);
      skull.position.y = 0.31;
      const board = new THREE.Mesh(track(new RoundedBoxGeometry(2.7, 0.1, 2.7, 3, 0.04)), capMat);
      board.position.y = 0.68;
      board.rotation.y = Math.PI / 4;
      const gold = track(new THREE.MeshPhysicalMaterial({ color: '#e9b44c', metalness: 1, roughness: 0.22, emissive: '#5a3a00', emissiveIntensity: 0.25 }));
      const button = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 24, 24)), gold);
      button.position.y = 0.76;
      cap.add(skull, board, button);
      cap.userData.restY = stackTop;
      cap.position.y = stackTop;
      cap.rotation.y = -0.2;
      root.add(cap);

      // ---- The thread: from the cap's button, over the brim, winding down the stack ----
      const top = stackTop + 0.76;
      const pts = [new THREE.Vector3(0, top, 0), new THREE.Vector3(0.9, top + 0.02, 0.15), new THREE.Vector3(1.75, top - 0.25, 0.4)];
      const turns = 1.7;
      for (let i = 1; i <= 28; i += 1) {
        const t = i / 28;
        const a = 0.25 + t * Math.PI * 2 * turns;
        const r = 2.35 + Math.sin(t * Math.PI) * 0.25;
        pts.push(new THREE.Vector3(Math.cos(a) * r, top - 0.45 - t * (top - 0.35), Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      const TUBE_SEG = 420;
      const RADIAL = 10;
      const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, TUBE_SEG, 0.045, RADIAL, false)), gold);
      root.add(tube);
      const totalIdx = tube.geometry.index.count;
      const bead = new THREE.Mesh(track(new THREE.SphereGeometry(0.17, 32, 32)), gold);
      bead.position.copy(curve.getPoint(1));
      root.add(bead);
      const tassel = new THREE.Mesh(track(new THREE.ConeGeometry(0.14, 0.42, 20)), gold);
      tassel.position.copy(curve.getPoint(1)).add(new THREE.Vector3(0, -0.3, 0));
      tassel.rotation.x = Math.PI;
      root.add(tassel);

      // ---- Soft floor shadow ----
      const sc = document.createElement('canvas');
      sc.width = sc.height = 128;
      const sx = sc.getContext('2d');
      const grd = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,10,12,0.55)');
      grd.addColorStop(1, 'rgba(0,10,12,0)');
      sx.fillStyle = grd;
      sx.fillRect(0, 0, 128, 128);
      const shadowTex = track(new THREE.CanvasTexture(sc));
      const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(7.5, 5)), track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.01;
      root.add(shadow);

      // ---- Gold dust ----
      const N = compact ? 90 : 180;
      const dust = new Float32Array(N * 3);
      for (let i = 0; i < N; i += 1) {
        dust[i * 3] = (Math.random() - 0.5) * 9;
        dust[i * 3 + 1] = Math.random() * 6;
        dust[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
      const dustGeo = track(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
      const points = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({
        color: '#f6d58a', size: 0.05, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      scene.add(points);

      root.position.y = -0.4;

      // ---- Size, input, visibility ----
      const resize = () => {
        const w = Math.max(1, el.clientWidth);
        const h = Math.max(1, el.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(() => { resize(); if (reduce) renderer.render(scene, camera); });
      ro.observe(el);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e) => {
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); });
      io.observe(el);

      // ---- Animation ----
      const t0 = performance.now();
      let raf = 0;
      const frame = (now) => {
        raf = 0;
        const t = (now - t0) / 1000;
        // Intro: books drop in one by one, then the cap, then the thread draws.
        books.forEach((b, i) => {
          const p = reduce ? 1 : clamp01((t - 0.15 - i * 0.18) / 0.7);
          b.position.y = b.userData.restY + (1 - easeOutBack(p)) * 4;
          b.visible = p > 0;
        });
        const cp = reduce ? 1 : clamp01((t - 0.8) / 0.8);
        cap.position.y = cap.userData.restY + (1 - easeOutBack(cp)) * 4.5;
        cap.rotation.y = -0.2 + (1 - cp) * 2.4;
        cap.visible = cp > 0;
        const draw = reduce ? 1 : easeInOut(clamp01((t - 1.5) / 2.2));
        tube.geometry.setDrawRange(0, Math.floor((totalIdx * draw) / 6) * 6);
        const bp = reduce ? 1 : clamp01((t - 3.5) / 0.5);
        bead.scale.setScalar(easeOutBack(bp) || 0.0001);
        tassel.scale.setScalar(easeOutBack(bp) || 0.0001);

        // Idle: float, follow the pointer, turn with the scroll.
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        const scroll = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
        const idle = reduce ? 0 : Math.sin(t * 0.35) * 0.18;
        root.rotation.y = -0.45 + idle + pointer.x * 0.35 + scroll * 1.4;
        root.rotation.x = pointer.y * 0.08;
        root.position.y = -0.4 + (reduce ? 0 : Math.sin(t * 0.9) * 0.08) - scroll * 0.6;
        cap.rotation.z = reduce ? 0 : Math.sin(t * 0.7) * 0.025;

        const pos = dustGeo.attributes.position;
        if (!reduce) {
          for (let i = 0; i < N; i += 1) {
            let yy = pos.getY(i) + 0.004;
            if (yy > 6) yy = 0;
            pos.setY(i, yy);
          }
          pos.needsUpdate = true;
          points.rotation.y = t * 0.02;
        }

        renderer.render(scene, camera);
        if (!reduce && visible && !document.hidden) start();
      };
      function start() { if (!raf && !disposed) raf = requestAnimationFrame(frame); }
      const onVis = () => { if (!document.hidden) start(); };
      document.addEventListener('visibilitychange', onVis);
      start();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', onVis);
        disposables.forEach((d) => d.dispose?.());
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement.remove();
      };
    })().catch(() => onFail?.());

    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className={`relative ${className}`} />;
}
