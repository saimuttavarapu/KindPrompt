import { useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';

interface SpotlightSurfaceProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
}

export function SpotlightSurface({
  children,
  className = '',
  glowColor = 'rgba(13, 148, 136, 0.14)',
  enableTilt = false,
}: SpotlightSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const mouseX = useMotionValue(-300);
  const mouseY = useMotionValue(-300);
  const spotOpacity = useMotionValue(0);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);

  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 24 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 24 });
  const smoothOpacity = useSpring(spotOpacity, { stiffness: 260, damping: 28 });

  const backgroundGlow = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 75%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);
    spotOpacity.set(1);

    if (enableTilt && rect.width > 0 && rect.height > 0) {
      const normalizedX = (x / rect.width - 0.5) * 2; // -1 to 1
      const normalizedY = (y / rect.height - 0.5) * 2; // -1 to 1
      rawRotateY.set(normalizedX * 4);
      rawRotateX.set(-normalizedY * 4);
    }
  };

  const handleMouseLeave = () => {
    spotOpacity.set(0);
    if (enableTilt) {
      rawRotateX.set(0);
      rawRotateY.set(0);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        enableTilt && !prefersReducedMotion
          ? {
              transformPerspective: 1000,
              rotateX,
              rotateY,
            }
          : undefined
      }
      className={`relative overflow-hidden ${className}`}
    >
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: backgroundGlow,
            opacity: smoothOpacity,
          }}
        />
      )}
      <div className="relative z-20 h-full">{children}</div>
    </motion.div>
  );
}
