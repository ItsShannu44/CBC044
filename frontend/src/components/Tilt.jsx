// 3D tilt for any card: springs toward the pointer and adds a soft glare.
// Follows the approach of React Bits' TiltedCard, generalised to any content.
// Does nothing on touch screens or when reduced motion is on.
import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

const SPRING = { damping: 30, stiffness: 140, mass: 1.2 };

export default function Tilt({ children, className = '', max = 10, scale = 1.025, glare = true, as = 'div' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const rx = useSpring(0, SPRING);
  const ry = useSpring(0, SPRING);
  const s = useSpring(1, SPRING);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const go = useSpring(0, { damping: 30, stiffness: 200 });
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(255,255,255,0.32), transparent 45%)`;
  const Comp = motion[as] || motion.div;

  const onMove = (e) => {
    if (reduce || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onEnter = (e) => { if (!reduce && e.pointerType !== 'touch') { s.set(scale); go.set(1); } };
  const onLeave = () => { rx.set(0); ry.set(0); s.set(1); go.set(0); };

  return (
    <div style={{ perspective: 900 }} className="h-full">
      <Comp ref={ref} onPointerMove={onMove} onPointerEnter={onEnter} onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, scale: s, transformStyle: 'preserve-3d' }}
        className={`relative h-full will-change-transform ${className}`}>
        {children}
        {glare && (
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
            style={{ background: glareBg, opacity: go }} />
        )}
      </Comp>
    </div>
  );
}
