import { useRef, useCallback, type RefObject, type MouseEvent } from 'react';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
}

/**
 * Makes an element draggable within its parent container.
 * Returns event handlers to spread onto the target element.
 * Calls `onDragMove` on every frame so external state (e.g. beam paths) can update.
 */
export function useDraggable(
  ref: RefObject<HTMLElement>,
  containerRef: RefObject<HTMLElement>,
  onDragMove?: () => void
) {
  const stateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  });

  const handlePointerDown = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      const container = containerRef.current;
      if (!el || !container) return;

      e.preventDefault();
      e.stopPropagation();

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Ensure the element has position: relative/absolute so left/top work
      if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
      }

      const currentLeft = parseFloat(el.style.left || '0') || 0;
      const currentTop = parseFloat(el.style.top || '0') || 0;

      stateRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: currentLeft,
        originTop: currentTop,
      };

      el.style.cursor = 'grabbing';
      el.style.zIndex = '50';
      el.style.transition = 'none';

      const handlePointerMove = (ev: PointerEvent) => {
        if (!stateRef.current.isDragging || !el) return;

        const dx = ev.clientX - stateRef.current.startX;
        const dy = ev.clientY - stateRef.current.startY;

        let newLeft = stateRef.current.originLeft + dx;
        let newTop = stateRef.current.originTop + dy;

        // Clamp within container
        const elCurrentRect = el.getBoundingClientRect();
        const elW = elCurrentRect.width;
        const elH = elCurrentRect.height;

        const maxLeft = containerRect.width - elW - 8;
        const maxTop = containerRect.height - elH - 8;

        newLeft = Math.max(-elRect.left + containerRect.left, Math.min(newLeft, maxLeft));
        newTop = Math.max(-elRect.top + containerRect.top, Math.min(newTop, maxTop));

        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;

        onDragMove?.();
      };

      const handlePointerUp = () => {
        stateRef.current.isDragging = false;
        if (el) {
          el.style.cursor = 'grab';
          el.style.zIndex = '10';
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [ref, containerRef, onDragMove]
  );

  return {
    onPointerDown: handlePointerDown,
    style: { cursor: 'grab', position: 'relative' as const, userSelect: 'none' as const },
  };
}
