import React, { type CSSProperties } from 'react';
import { cn } from '@/utils/cn';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#22d3ee',
      shimmerSize = '0.1em',
      shimmerDuration = '2.5s',
      borderRadius = '6px',
      background = 'rgba(16, 185, 129, 1)',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            '--shimmer-color': shimmerColor,
            '--shimmer-size': shimmerSize,
            '--speed': shimmerDuration,
            '--radius': borderRadius,
            '--bg': background,
          } as CSSProperties
        }
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-4 py-1.5 [background:var(--bg)] [border-radius:var(--radius)] transition-all',
          'hover:brightness-110 active:scale-[0.97]',
          'disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
        {...props}
      >
        <div
          className="absolute inset-0 overflow-hidden [border-radius:var(--radius)]"
          style={{ WebkitMask: 'none', mask: 'none' }}
        >
          <div className="absolute inset-[-100%] animate-shimmer-slide [background:linear-gradient(to_right,transparent,var(--shimmer-color),transparent)]"
               style={{ animationDuration: 'var(--speed)' }} />
        </div>

        <span className="relative z-10 flex items-center gap-1.5 text-white font-bold text-xs">
          {children}
        </span>
      </button>
    );
  },
);
ShimmerButton.displayName = 'ShimmerButton';
