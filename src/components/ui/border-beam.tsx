import { motion, type Transition } from 'framer-motion';
import { cn } from '@/utils/cn';
interface BorderBeamProps {
    size?: number;
    duration?: number;
    delay?: number;
    colorFrom?: string;
    colorTo?: string;
    transition?: Transition;
    className?: string;
    style?: React.CSSProperties;
    reverse?: boolean;
    initialOffset?: number;
    borderWidth?: number;
}
export const BorderBeam = ({ className, size = 50, delay = 0, duration = 6, colorFrom = '#22d3ee', colorTo = '#6366f1', transition, style, reverse = false, initialOffset = 0, borderWidth = 1, }: BorderBeamProps) => {
    return (<div className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]" style={{
            padding: borderWidth,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
        }}>
      <motion.div className={cn('absolute aspect-square', className)} style={{
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, transparent, ${colorFrom}, ${colorTo}, transparent)`,
            ...style,
        }} initial={{ offsetDistance: `${initialOffset}%` }} animate={{
            offsetDistance: reverse
                ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
                : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }} transition={{
            repeat: Infinity,
            ease: 'linear',
            duration,
            delay: -delay,
            ...transition,
        }}/>
    </div>);
};
