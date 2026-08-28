'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Aurora animated background                                          */
/* ------------------------------------------------------------------ */
export function AuroraBackground({
  className,
  variant = 'light',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          'absolute -left-1/4 top-[-10%] h-[55vh] w-[55vh] rounded-full blur-[100px] animate-aurora-1',
          variant === 'light'
            ? 'bg-[#0f4c81]/20'
            : 'bg-[#0f4c81]/40'
        )}
      />
      <div
        className={cn(
          'absolute right-[-15%] top-[20%] h-[45vh] w-[45vh] rounded-full blur-[100px] animate-aurora-2',
          variant === 'light'
            ? 'bg-[#0d9488]/20'
            : 'bg-[#0d9488]/40'
        )}
      />
      <div
        className={cn(
          'absolute bottom-[-20%] left-1/3 h-[50vh] w-[50vh] rounded-full blur-[110px] animate-aurora-3',
          variant === 'light'
            ? 'bg-[#10b981]/15'
            : 'bg-[#10b981]/30'
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spotlight card — glow follows the cursor                            */
/* ------------------------------------------------------------------ */
export function SpotlightCard({
  children,
  className,
  glowColor = 'rgba(13, 148, 136, 0.18)',
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [visible, setVisible] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, ${glowColor}, transparent 45%)`,
          opacity: visible ? 1 : 0,
        }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Count-up number animation                                           */
/* ------------------------------------------------------------------ */
export function CountUp({
  end,
  duration = 800,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [value, setValue] = useState(end);

  useEffect(() => {
    let animFrame: number;
    const start = performance.now();
    const startVal = value;
    const change = end - startVal;

    if (Math.abs(change) < 0.01) {
      setValue(end);
      return;
    }

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startVal + change * eased);
      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [end, duration]);

  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Magnetic button — subtly pulls toward the cursor                    */
/* ------------------------------------------------------------------ */
export function MagneticButton({
  children,
  className,
  strength = 0.25,
  ...props
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({ x: x * strength, y: y * strength });
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular progress ring                                             */
/* ------------------------------------------------------------------ */
export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 10,
  className,
  label,
  sublabel,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    setOffset(circumference - (progress / 100) * circumference);
  }, [progress, circumference]);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f4c81" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
          opacity={0.3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="font-display text-3xl font-bold text-foreground">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="mt-0.5 text-xs font-medium text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gradient text                                                       */
/* ------------------------------------------------------------------ */
export function GradientText({
  children,
  className,
  from = '#0f4c81',
  to = '#0d9488',
}: {
  children: ReactNode;
  className?: string;
  from?: string;
  to?: string;
}) {
  return (
    <span
      className={className}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stagger container + item — sequential entrance                       */
/* ------------------------------------------------------------------ */
const StaggerContext = createContext(0);

export function StaggerContainer({
  children,
  delay = 60,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <StaggerContext.Provider value={delay}>
      <div className={className}>{children}</div>
    </StaggerContext.Provider>
  );
}

export function StaggerItem({
  children,
  index = 0,
  className,
  id,
  ...props
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  id?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const delay = useContext(StaggerContext);
  return (
    <div
      id={id}
      className={cn('animate-slide-up opacity-0', className)}
      style={{
        animationDelay: `${index * delay}ms`,
        animationFillMode: 'forwards',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shimmer border — animated gradient border                           */
/* ------------------------------------------------------------------ */
export function ShimmerBorder({
  children,
  className,
  rounded = 'rounded-2xl',
}: {
  children: ReactNode;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={cn('relative', rounded, className)}>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] opacity-60',
          rounded
        )}
        style={{
          background:
            'linear-gradient(120deg, transparent 30%, rgba(13,148,136,0.4) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-border 3s linear infinite',
        }}
        aria-hidden
      />
      <div className={cn('relative', rounded)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tilt card — 3D tilt on hover (desktop only)                         */
/* ------------------------------------------------------------------ */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const tiltX = (py - 0.5) * -2 * maxTilt;
    const tiltY = (px - 0.5) * 2 * maxTilt;
    setTransform(
      `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.01)`
    );
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setTransform('')}
      style={{
        transform,
        transition: 'transform 0.2s ease-out',
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
