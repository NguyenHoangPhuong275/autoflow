import { useRef, useCallback, useEffect, type RefObject, type MouseEvent } from 'react';
import { getErrorMessage } from '@/core/utils/errors';

const STORAGE_KEY = 'autoflow_pipeline_positions_v1';

interface Position {
  left: number;
  top: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
}

function getStoredPositions(): Record<string, Position> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error: unknown) {
    console.warn(`Không thể đọc vị trí pipeline: ${getErrorMessage(error)}`);
    return {};
  }
}

function savePosition(id: string, pos: Position): void {
  try {
    const all = getStoredPositions();
    all[id] = pos;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error: unknown) {
    console.warn(`Không thể lưu vị trí pipeline: ${getErrorMessage(error)}`);
  }
}

export function clearStoredPositions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error: unknown) {
    console.warn(`Không thể xóa vị trí pipeline: ${getErrorMessage(error)}`);
  }
}

export function useDraggable(
  id: string,
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

  useEffect(() => {
    const el = ref.current;
    if (!el || !id) return;

    const saved = getStoredPositions()[id];
    if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
      el.style.position = 'relative';
      el.style.left = `${saved.left}px`;
      el.style.top = `${saved.top}px`;
      requestAnimationFrame(() => {
        onDragMove?.();
      });
    }
  }, [id, ref, onDragMove]);

  const handlePointerDown = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      const container = containerRef.current;
      if (!el || !container) return;

      e.preventDefault();
      e.stopPropagation();

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

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

      let lastLeft = currentLeft;
      let lastTop = currentTop;

      const handlePointerMove = (ev: PointerEvent) => {
        if (!stateRef.current.isDragging || !el) return;

        const dx = ev.clientX - stateRef.current.startX;
        const dy = ev.clientY - stateRef.current.startY;

        let newLeft = stateRef.current.originLeft + dx;
        let newTop = stateRef.current.originTop + dy;

        const elCurrentRect = el.getBoundingClientRect();
        const elW = elCurrentRect.width;
        const elH = elCurrentRect.height;

        const maxLeft = containerRect.width - elW - 8;
        const maxTop = containerRect.height - elH - 8;

        newLeft = Math.max(-elRect.left + containerRect.left, Math.min(newLeft, maxLeft));
        newTop = Math.max(-elRect.top + containerRect.top, Math.min(newTop, maxTop));

        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
        lastLeft = newLeft;
        lastTop = newTop;

        onDragMove?.();
      };

      const handlePointerUp = () => {
        stateRef.current.isDragging = false;
        if (el) {
          el.style.cursor = 'grab';
          el.style.zIndex = '10';
        }

        if (id) {
          savePosition(id, { left: lastLeft, top: lastTop });
        }

        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [id, ref, containerRef, onDragMove]
  );

  return {
    onPointerDown: handlePointerDown,
    style: { cursor: 'grab', position: 'relative' as const, userSelect: 'none' as const },
  };
}
