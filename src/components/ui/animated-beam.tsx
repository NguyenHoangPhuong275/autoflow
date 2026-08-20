import React, { RefObject, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
export interface AnimatedBeamProps {
    className?: string;
    containerRef: RefObject<HTMLElement>;
    fromRef: RefObject<HTMLElement>;
    toRef: RefObject<HTMLElement>;
    curvature?: number;
    reverse?: boolean;
    pathColor?: string;
    beamColor?: string;
    duration?: number;
    delay?: number;
    startXOffset?: number;
    startYOffset?: number;
    endXOffset?: number;
    endYOffset?: number;
    isActive?: boolean;
}
export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({ className, containerRef, fromRef, toRef, curvature = 0, reverse = false, duration = 3, delay = 0, pathColor = '#1e293b', beamColor = '#38bdf8', startXOffset = 0, startYOffset = 0, endXOffset = 0, endYOffset = 0, isActive = true, }) => {
    const [pathD, setPathD] = useState('');
    const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
    useEffect(() => {
        const updatePath = () => {
            if (!containerRef.current || !fromRef.current || !toRef.current)
                return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const rectA = fromRef.current.getBoundingClientRect();
            const rectB = toRef.current.getBoundingClientRect();
            const svgWidth = containerRect.width;
            const svgHeight = containerRect.height;
            setSvgDimensions({ width: svgWidth, height: svgHeight });
            const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
            const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
            const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
            const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;
            const controlY = startY - curvature;
            const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;
            setPathD(d);
        };
        updatePath();
        const resizeObserver = new ResizeObserver(() => updatePath());
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        window.addEventListener('resize', updatePath);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updatePath);
        };
    }, [
        containerRef,
        fromRef,
        toRef,
        curvature,
        startXOffset,
        startYOffset,
        endXOffset,
        endYOffset,
    ]);
    return (<svg fill="none" width={svgDimensions.width} height={svgDimensions.height} xmlns="http://www.w3.org/2000/svg" className={cn('pointer-events-none absolute left-0 top-0', className)} viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}>

      <path d={pathD} stroke={pathColor} strokeWidth={1.5} strokeLinecap="round"/>

      {isActive && (<motion.path d={pathD} stroke={beamColor} strokeWidth={2} strokeLinecap="round" initial={{ pathLength: 0.1, pathOffset: reverse ? 1 : 0 }} animate={{ pathOffset: reverse ? 0 : 1 }} transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear',
            }}/>)}
    </svg>);
};
