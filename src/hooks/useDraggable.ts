import { useCallback, useRef, useState, useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { updateCardPositionAtom, currentViewStateAtom, bringCardToFrontAtom } from '../state/atoms';
import type { Point } from '../types';

interface UseDraggableProps {
  cardId: string;
  initialPosition: Point;
  cardRef: React.RefObject<HTMLElement | null>;
  isEnabled: boolean;
}

export function useDraggable({
  cardId,
  initialPosition,
  cardRef,
  isEnabled,
}: UseDraggableProps) {
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false); // Use ref for sync checks in listeners
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);

  const { pan, zoom } = useAtomValue(currentViewStateAtom);
  const updatePosition = useSetAtom(updateCardPositionAtom);
  const bringToFront = useSetAtom(bringCardToFrontAtom);

  const startDrag = useCallback(
    (clientX: number, clientY: number, identifier?: number) => {
      if (!cardRef.current || !isEnabled) return;
      bringToFront(cardId);
      isDragging.current = true;
      setIsDraggingState(true);

      if (identifier !== undefined) {
        touchIdentifier.current = identifier;
      }
      const pointerWorkspaceX = (clientX - pan.x) / zoom;
      const pointerWorkspaceY = (clientY - pan.y) / zoom;
      dragStartOffset.current = {
        x: pointerWorkspaceX - initialPosition.x,
        y: pointerWorkspaceY - initialPosition.y,
      };
      document.body.style.userSelect = 'none';
      if (cardRef.current) cardRef.current.style.cursor = 'grabbing';
    },
    [cardId, initialPosition, cardRef, isEnabled, bringToFront, pan, zoom]
  );

  const handleDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging.current) return;
      const pointerWorkspaceX = (clientX - pan.x) / zoom;
      const pointerWorkspaceY = (clientY - pan.y) / zoom;
      const newPositionX = pointerWorkspaceX - dragStartOffset.current.x;
      const newPositionY = pointerWorkspaceY - dragStartOffset.current.y;
      updatePosition({ cardId, position: { x: newPositionX, y: newPositionY } });
    },
    [cardId, updatePosition, pan, zoom]
  );

  const endDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsDraggingState(false);
      touchIdentifier.current = null;
      document.body.style.userSelect = '';
      if (cardRef.current) cardRef.current.style.cursor = 'grab';
    }
  }, [cardRef]);

  // --- Event Handlers to attach to the element --- //
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as Element).closest('[data-resize-handle="true"]') || event.button !== 0 || !isEnabled) return;
      event.stopPropagation();
      startDrag(event.clientX, event.clientY);
    },
    [startDrag, isEnabled]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if ((event.target as Element).closest('[data-resize-handle="true"]') || event.touches.length !== 1 || !isEnabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.stopPropagation();
      startDrag(touch.clientX, touch.clientY, touch.identifier);
    },
    [startDrag, isEnabled]
  );

  // --- Global Listeners Logic --- //
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDragging.current && touchIdentifier.current === null) {
        handleDrag(event.clientX, event.clientY);
      }
    },
    [handleDrag]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (event.button === 0 && touchIdentifier.current === null) {
        endDrag();
      }
    },
    [endDrag]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (isDragging.current && touchIdentifier.current !== null) {
        let activeTouch: Touch | null = null;
        for (let i = 0; i < event.touches.length; i++) {
          const t = event.touches[i];
          if (t && t.identifier === touchIdentifier.current) {
            activeTouch = t;
            break;
          }
        }
        if (activeTouch) {
          handleDrag(activeTouch.clientX, activeTouch.clientY);
        }
      }
    },
    [handleDrag]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      let wasDraggingTouch = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches[i];
        if (t && t.identifier === touchIdentifier.current) {
          wasDraggingTouch = true;
          break;
        }
      }
      if (wasDraggingTouch) {
        endDrag();
      }
    },
    [endDrag]
  );

  // Effect to manage global listeners
  useEffect(() => {
    if (isDraggingState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isDraggingState, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return {
    isDragging: isDraggingState,
    draggableProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
  };
} 