import { useEffect, useRef, type DependencyList } from 'react';
export function useAutoScroll<T extends HTMLElement>(enabled: boolean, dependencies: DependencyList, behavior: ScrollBehavior = 'smooth') {
    const targetRef = useRef<T>(null);
    useEffect(() => {
        if (enabled) {
            targetRef.current?.scrollIntoView({ behavior });
        }
    }, dependencies);
    return targetRef;
}
