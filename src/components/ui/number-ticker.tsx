import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/utils/cn';
interface NumberTickerProps {
    value: number;
    direction?: 'up' | 'down';
    className?: string;
}
export const NumberTicker: React.FC<NumberTickerProps> = ({ value, direction = 'up', className, }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === 'down' ? value : 0);
    const springValue = useSpring(motionValue, { damping: 50, stiffness: 120 });
    const isInView = useInView(ref, { once: true });
    useEffect(() => {
        if (isInView) {
            motionValue.set(direction === 'down' ? 0 : value);
        }
    }, [motionValue, isInView, value, direction]);
    useEffect(() => {
        springValue.on('change', (latest) => {
            if (ref.current) {
                ref.current.textContent = String(Math.round(latest));
            }
        });
    }, [springValue]);
    return (<span className={cn('inline-block tabular-nums font-mono font-bold text-[var(--text-primary)]', className)} ref={ref}>
      0
    </span>);
};
