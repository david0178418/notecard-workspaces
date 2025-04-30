import { useState, useCallback, useRef, RefObject, useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import {
  updateCardPositionAtom,
  currentViewStateAtom,
  bringCardToFrontAtom,
} from '../state/atoms';
import type { Point, ViewState } from '../types';

// Define props specifically for SVGGElement as used in Card.tsx
interface UseDraggableProps {
  cardId: string;
  initialPosition: Point;
  cardRef: RefObject<SVGGElement | null>; // Expecting SVG Ref from Card
  isEnabled: boolean;
}

interface DraggableProps {
  onMouseDown: (event: React.MouseEvent<SVGGElement>) => void;
  onTouchStart: (event: React.TouchEvent<SVGGElement>) => void;
}

interface UseDraggableReturn {
  isDragging: boolean;
  draggableProps: DraggableProps;
}

export function useDraggable({
  cardId,
  initialPosition,
  cardRef,
  isEnabled,
}: UseDraggableProps): UseDraggableReturn {
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false); // Internal flag using ref
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);

  const { pan, zoom } = useAtomValue(currentViewStateAtom);
  const updatePosition = useSetAtom(updateCardPositionAtom);
  const bringToFront = useSetAtom(bringCardToFrontAtom);

  // --- Define Global Listener Handlers --- //
  // These need to be stable references, hence useCallback

  // Using useRef for handlers to avoid including them in dependency arrays
  // of other hooks like useEffect or useCallback, ensuring stability.
  const handleDragRef = useRef((_clientX: number, _clientY: number) => {});
  const handleMouseMoveRef = useRef((_event: MouseEvent) => {});
  const handleMouseUpOrLeaveRef = useRef((_event: MouseEvent) => {});
  const handleTouchMoveRef = useRef((_event: TouchEvent) => {});
  const handleTouchEndOrCancelRef = useRef((_event: TouchEvent) => {});
  const endDragInteractionRef = useRef(() => {});

  // Actual handler logic, stored in refs
  handleDragRef.current = (clientX: number, clientY: number) => {
    const pointerWorkspaceX = (clientX - pan.x) / zoom;
    const pointerWorkspaceY = (clientY - pan.y) / zoom;
    const newPositionX = pointerWorkspaceX - dragStartOffset.current.x;
    const newPositionY = pointerWorkspaceY - dragStartOffset.current.y;
    updatePosition({ cardId, position: { x: newPositionX, y: newPositionY } });
  };

  handleMouseMoveRef.current = (event: MouseEvent) => {
    if (isDragging.current && touchIdentifier.current === null) {
      handleDragRef.current(event.clientX, event.clientY);
    }
  };

  handleTouchMoveRef.current = (event: TouchEvent) => {
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
        event.preventDefault(); // Prevent scrolling while dragging
        handleDragRef.current(activeTouch.clientX, activeTouch.clientY);
      }
    }
  };

  endDragInteractionRef.current = () => {
    if (isDragging.current) {
      // Call bringToFront *before* resetting state and removing listeners
      bringToFront(cardId);

      // Remove listeners using the refs
      window.removeEventListener('mousemove', handleMouseMoveRef.current);
      window.removeEventListener('mouseup', handleMouseUpOrLeaveRef.current);
      window.removeEventListener('mouseleave', handleMouseUpOrLeaveRef.current);
      window.removeEventListener('touchmove', handleTouchMoveRef.current);
      window.removeEventListener('touchend', handleTouchEndOrCancelRef.current);
      window.removeEventListener('touchcancel', handleTouchEndOrCancelRef.current);

      // Reset state
      isDragging.current = false;
      setIsDraggingState(false);
      touchIdentifier.current = null;
      if (cardRef.current) {
        cardRef.current.style.cursor = 'grab'; // Reset cursor
      }
      document.body.style.userSelect = ''; // Re-enable text selection
    }
  };

  handleMouseUpOrLeaveRef.current = (event: MouseEvent) => {
    if (event.button === 0 && touchIdentifier.current === null) {
      endDragInteractionRef.current();
    }
  };

  handleTouchEndOrCancelRef.current = (_event: TouchEvent) => {
    if (touchIdentifier.current !== null) {
      endDragInteractionRef.current();
    }
  };

  // Add useEffect to ensure listeners are cleaned up if component unmounts while dragging
  useEffect(() => {
    // Return the cleanup function
    return () => {
      // Use the ref to ensure the *latest* cleanup logic is called
      endDragInteractionRef.current();
    };
  }, []); // Empty array: Run cleanup only on unmount

  // --- Element-Specific Event Handlers --- //

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (
        !isEnabled ||
        event.button !== 0 ||
        touchIdentifier.current !== null || // Don't allow mouse drag if touch is active
        !cardRef.current
      ) {
        return;
      }

      // Check if the click originated on a resize handle or delete button
      const targetElement = event.target as Element;
      if (targetElement.closest('[style*="cursor: nwse-resize"], [aria-label="delete card"]')) {
        return;
      }

      event.stopPropagation(); // Prevent pan/zoom if starting drag on card
      // bringToFront is now handled by useEffect based on isDraggingState

      isDragging.current = true;
      setIsDraggingState(true);

      // Calculate starting offset relative to card's top-left in workspace coords
      const pointerWorkspaceX = (event.clientX - pan.x) / zoom;
      const pointerWorkspaceY = (event.clientY - pan.y) / zoom;
      dragStartOffset.current = {
        x: pointerWorkspaceX - initialPosition.x,
        y: pointerWorkspaceY - initialPosition.y,
      };

      // Set styles and attach global listeners using refs
      document.body.style.userSelect = 'none';
      // Check cardRef.current again just before accessing style
      if (cardRef.current) {
        cardRef.current.style.cursor = 'grabbing';
      }
      window.addEventListener('mousemove', handleMouseMoveRef.current);
      window.addEventListener('mouseup', handleMouseUpOrLeaveRef.current);
      window.addEventListener('mouseleave', handleMouseUpOrLeaveRef.current);
    },
    [
      cardId,
      initialPosition,
      cardRef,
      isEnabled,
      pan,
      zoom,
      // Refs are stable, no need to include handleMouseMoveRef etc. here
    ]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<SVGGElement>) => {
      if (event.touches.length !== 1 || !isEnabled || isDragging.current) return;

      // Check if the touch originated on a resize handle or delete button
      const targetElement = event.target as Element;
      if (targetElement.closest('[style*="cursor: nwse-resize"], [aria-label="delete card"]')) {
        return;
      }

      event.stopPropagation(); // Prevent pan/zoom
      // bringToFront is now handled by useEffect based on isDraggingState

      const touch = event.touches[0];
      // Add null check for touch and cardRef
      if (!touch || !cardRef.current) return;

      isDragging.current = true;
      setIsDraggingState(true);
      touchIdentifier.current = touch.identifier;

      // Calculate starting offset
      const pointerWorkspaceX = (touch.clientX - pan.x) / zoom;
      const pointerWorkspaceY = (touch.clientY - pan.y) / zoom;
      dragStartOffset.current = {
        x: pointerWorkspaceX - initialPosition.x,
        y: pointerWorkspaceY - initialPosition.y,
      };

      // Set styles and attach global listeners using refs
      document.body.style.userSelect = 'none';
      // Check cardRef.current again just before accessing style
      if (cardRef.current) {
        cardRef.current.style.cursor = 'grabbing';
      }
      window.addEventListener('touchmove', handleTouchMoveRef.current, { passive: false });
      window.addEventListener('touchend', handleTouchEndOrCancelRef.current);
      window.addEventListener('touchcancel', handleTouchEndOrCancelRef.current);
    },
    [
      cardId,
      initialPosition,
      cardRef,
      isEnabled,
      pan,
      zoom,
      // Refs are stable, no need to include handleTouchMoveRef etc. here
    ]
  );

  return {
    isDragging: isDraggingState,
    draggableProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
  };
} 