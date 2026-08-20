import { useRef } from 'react';
import { AnimatePresence, motion, useInView, type MotionProps, type UseInViewOptions, type Variants, } from 'framer-motion';
type MarginType = UseInViewOptions['margin'];
interface BlurFadeProps extends MotionProps {
    children: React.ReactNode;
    className?: string;
    variant?: Variants;
    duration?: number;
    delay?: number;
    offset?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
    inView?: boolean;
    inViewMargin?: MarginType;
    blur?: string;
}
const getFilter = (variant: Variants[string]) => typeof variant === 'function' ? undefined : variant.filter;
export function BlurFade({ children, className, variant, duration = 0.4, delay = 0, offset = 6, direction = 'down', inView = false, inViewMargin = '-50px', blur = '6px', ...props }: BlurFadeProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
    const isInView = !inView || inViewResult;
    const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
    const initialOffset = direction === 'right' || direction === 'down' ? -offset : offset;
    const defaultVariants: Variants = {
        hidden: {
            [axis]: initialOffset,
            opacity: 0,
            filter: `blur(${blur})`,
        },
        visible: {
            [axis]: 0,
            opacity: 1,
            filter: 'blur(0px)',
        },
    };
    const combinedVariants = variant ?? defaultVariants;
    const hiddenFilter = getFilter(combinedVariants.hidden);
    const visibleFilter = getFilter(combinedVariants.visible);
    const shouldTransitionFilter = hiddenFilter != null && visibleFilter != null && hiddenFilter !== visibleFilter;
    return (<AnimatePresence>
      <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} exit="hidden" variants={combinedVariants} transition={{
            delay: 0.04 + delay,
            duration,
            ease: 'easeOut',
            ...(shouldTransitionFilter ? { filter: { duration } } : {}),
        }} className={className} {...props}>
        {children}
      </motion.div>
    </AnimatePresence>);
}
