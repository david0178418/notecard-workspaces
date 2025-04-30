import { useCallback, useRef, useState, useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { updateCardPositionAtom, currentViewStateAtom, bringCardToFrontAtom } from '../state/atoms';
import type { Point } from '../types';

// Make the ref type more generic to accept SVG or HTML elements
interface UseDraggableProps<T extends SVGElement | HTMLElement = HTMLElement> {
  cardId: string;
  initialPosition: Point;
  cardRef: React.RefObject<T | null>;
  isEnabled: boolean;
}

export function useDraggable<T extends SVGElement | HTMLElement = HTMLElement>({
  cardId,
  initialPosition,
  cardRef,
  isEnabled,
}: UseDraggableProps<T>) {
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false);
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);

  const { pan, zoom } = useAtomValue(currentViewStateAtom);
  const updatePosition = useSetAtom(updateCardPositionAtom);
  const bringToFront = useSetAtom(bringCardToFrontAtom);

  // --- Define Global Listener Handlers --- //
  // These need to be stable references, hence useCallback
  // Define handleDrag first as it's used by move listeners
  const handleDrag = useCallback(
    (clientX: number, clientY: number) => {
      const pointerWorkspaceX = (clientX - pan.x) / zoom;
      const pointerWorkspaceY = (clientY - pan.y) / zoom;
      const newPositionX = pointerWorkspaceX - dragStartOffset.current.x;
      const newPositionY = pointerWorkspaceY - dragStartOffset.current.y;
      updatePosition({ cardId, position: { x: newPositionX, y: newPositionY } });
    },
    [cardId, updatePosition, pan, zoom]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (touchIdentifier.current === null) {
        handleDrag(event.clientX, event.clientY);
      }
    },
    [handleDrag]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (touchIdentifier.current !== null) {
        let activeTouch: Touch | null = null;
        for (let i = 0; i < event.touches.length; i++) {
          const t = event.touches[i];
          if (t && t.identifier === touchIdentifier.current) {
            activeTouch = t;
            break;
          }
        }
        if (activeTouch) {
          event.preventDefault();
          handleDrag(activeTouch.clientX, activeTouch.clientY);
        }
      }
    },
    [handleDrag]
  );

  // Define end handlers BEFORE endDrag
  // We need a stable reference to endDrag, so we use a ref for the callback itself
  const endDragRef = useRef<() => void>();

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (event.button === 0 && touchIdentifier.current === null) {
        // Call the function via the ref
        endDragRef.current?.();
      }
    },
    [] // No dependencies needed as it only calls the ref
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
        // Call the function via the ref
        endDragRef.current?.();
      }
    },
    [] // No dependencies needed as it only calls the ref
  );

  // Now define endDrag
  const endDrag = useCallback(() => {
    if (!isDragging.current) return;

    // Remove listeners using the stable callbacks defined above
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchEnd); // Can reuse touchEnd here

    isDragging.current = false;
    setIsDraggingState(false);
    touchIdentifier.current = null;
    document.body.style.userSelect = '';
    if (cardRef.current) {
      cardRef.current.style.cursor = 'grab';
    }
    // Dependencies: only things *used inside* endDrag, not the functions calling it
  }, [cardRef, handleMouseMove, handleTouchMove, handleMouseUp, handleTouchEnd]);

  // Assign the latest endDrag function to the ref
  useEffect(() => {
    endDragRef.current = endDrag;
  }, [endDrag]);

  // --- startDrag now also attaches listeners --- //
  const startDrag = useCallback(
    (clientX: number, clientY: number, identifier?: number) => {
      if (!cardRef.current || !isEnabled || isDragging.current) return;

      bringToFront(cardId);
      isDragging.current = true;
      setIsDraggingState(true);

      if (identifier !== undefined) {
        touchIdentifier.current = identifier;
        // --- Attach Touch Listeners --- //
        window.addEventListener('touchmove', handleTouchMove, { passive: false }); // Need passive false for preventDefault
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
      } else {
        // --- Attach Mouse Listeners --- //
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      const pointerWorkspaceX = (clientX - pan.x) / zoom;
      const pointerWorkspaceY = (clientY - pan.y) / zoom;
      dragStartOffset.current = {
        x: pointerWorkspaceX - initialPosition.x,
        y: pointerWorkspaceY - initialPosition.y,
      };
      document.body.style.userSelect = 'none';
      cardRef.current.style.cursor = 'grabbing';
    },
    // Dependencies include the handlers that will be attached
    [cardId, initialPosition, cardRef, isEnabled, bringToFront, pan, zoom, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]
  );

  // --- Element-Specific Event Handlers --- //
  // These just initiate the drag
  const handleMouseDownElement = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as Element).closest('[data-resize-handle="true"]') || event.button !== 0 || !isEnabled) return;
      event.stopPropagation();
      startDrag(event.clientX, event.clientY);
    },
    [startDrag, isEnabled]
  );

  const handleTouchStartElement = useCallback(
    (event: React.TouchEvent) => {
      if ((event.target as Element).closest('[data-resize-handle="true"]') || event.touches.length !== 1 || !isEnabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.stopPropagation();
      startDrag(touch.clientX, touch.clientY, touch.identifier);
    },
    [startDrag, isEnabled]
  );

  // --- Cleanup Effect --- //
  // Ensure listeners are removed if component unmounts while dragging
  useEffect(() => {
    // Use the ref to ensure cleanup calls the latest endDrag
    const cleanup = () => {
        if (isDragging.current) {
            endDragRef.current?.();
        }
    };
    return cleanup;
  }, []); // Run only on mount/unmount

  return {
    isDragging: isDraggingState,
    draggableProps: {
      onMouseDown: handleMouseDownElement,
      onTouchStart: handleTouchStartElement,
    },
  };
} 