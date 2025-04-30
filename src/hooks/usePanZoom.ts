import { useState, useCallback, useRef, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateViewStateAtom } from '../state/atoms';
import type { Point, ViewState } from '../types';

interface UsePanZoomProps {
  initialViewState: ViewState;
  containerRef: React.RefObject<SVGSVGElement | null>;
}

// Helper function to calculate distance between two points
function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Helper function to calculate the midpoint between two points
function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function usePanZoom({ initialViewState, containerRef }: UsePanZoomProps) {
  const [pan, setPan] = useState<Point>(initialViewState.pan);
  const [zoom, setZoom] = useState<number>(initialViewState.zoom);
  const isPanning = useRef(false);
  const isPinching = useRef(false);
  const startPanPoint = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);
  const pinchTouches = useRef<[number, number] | null>(null);
  const initialPinchState = useRef<{ distance: number, midpoint: Point, pan: Point, zoom: number } | null>(null);
  const endPanInteractionRef = useRef<(() => void) | null>(null);

  const updateStateAtom = useSetAtom(updateViewStateAtom);

  useEffect(() => {
    setPan(initialViewState.pan);
    setZoom(initialViewState.zoom);
  }, [initialViewState]);

  // --- Define Global Listener Callbacks --- //

  const handleMouseMoveGlobal = useCallback(
    (event: MouseEvent) => {
      if (!isPanning.current) return;
      const newX = event.clientX - startPanPoint.current.x;
      const newY = event.clientY - startPanPoint.current.y;
      setPan({ x: newX, y: newY });
    },
    []
  );

  const handleTouchMoveGlobal = useCallback((event: TouchEvent) => {
    // Pinch Move Logic
    if (isPinching.current && event.touches.length === 2 && pinchTouches.current && initialPinchState.current) {
      let currentTouch1: Touch | null = null;
      let currentTouch2: Touch | null = null;
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches.item(i);
        if (touch?.identifier === pinchTouches.current?.[0]) currentTouch1 = touch;
        if (touch?.identifier === pinchTouches.current?.[1]) currentTouch2 = touch;
      }
      if (currentTouch1 && currentTouch2) {
          const p1 = { x: currentTouch1.clientX, y: currentTouch1.clientY };
          const p2 = { x: currentTouch2.clientX, y: currentTouch2.clientY };
          const currentDistance = getDistance(p1, p2);
          const currentMidpoint = getMidpoint(p1, p2);
          const { distance: initialDistance, midpoint: initialMidpoint, pan: initialPan, zoom: initialZoom } = initialPinchState.current;
          if (initialDistance === 0) return;
          const zoomFactor = currentDistance / initialDistance;
          const newZoom = initialZoom * zoomFactor;
          const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
          const initialMidpointWorkspaceX = (initialMidpoint.x - initialPan.x) / initialZoom;
          const initialMidpointWorkspaceY = (initialMidpoint.y - initialPan.y) / initialZoom;
          const newPanX = currentMidpoint.x - initialMidpointWorkspaceX * clampedZoom;
          const newPanY = currentMidpoint.y - initialMidpointWorkspaceY * clampedZoom;
          const newPan = { x: newPanX, y: newPanY };
          setZoom(clampedZoom);
          setPan(newPan);
           // Also prevent default during pinch
          event.preventDefault();
      }
    }
    // Single Finger Pan Move
    else if (isPanning.current && touchIdentifier.current !== null) {
      let activeTouch: Touch | null = null;
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches.item(i);
        if (touch && touch.identifier === touchIdentifier.current) {
          activeTouch = touch;
          break;
        }
      }
      if (activeTouch) {
        const newX = activeTouch.clientX - startPanPoint.current.x;
        const newY = activeTouch.clientY - startPanPoint.current.y;
        setPan({ x: newX, y: newY });
        // Prevent default during pan
        event.preventDefault();
      }
    }
  }, []); // Depends only on refs

  // Define end handlers (will remove listeners)
  const handleMouseUpOrLeaveGlobal = useCallback((event: MouseEvent) => {
    if (event.button === 0 && isPanning.current) {
      endPanInteractionRef.current?.();
    }
  }, []); // Depends only on ref

  const handleTouchEndOrCancelGlobal = useCallback((event: TouchEvent) => {
    if (isPinching.current) {
      let pinchEnded = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches.item(i);
        if (touch?.identifier === pinchTouches.current?.[0] || touch?.identifier === pinchTouches.current?.[1]) {
          pinchEnded = true;
          break;
        }
      }
      if (pinchEnded) {
        endPanInteractionRef.current?.();
      }
    } else if (isPanning.current) {
      let wasPanningTouch = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const changedTouch = event.changedTouches.item(i);
        if (changedTouch && changedTouch.identifier === touchIdentifier.current) {
          wasPanningTouch = true;
          break;
        }
      }
      if (wasPanningTouch) {
        endPanInteractionRef.current?.();
      }
    }
  }, []); // Depends only on refs

  // The actual function to end interaction and remove listeners
  const endPanInteraction = useCallback(() => {
    if (isPanning.current || isPinching.current) {
        updateStateAtom({ pan, zoom }); // Update state atom

        // Remove listeners
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpOrLeaveGlobal);
        window.removeEventListener('mouseleave', handleMouseUpOrLeaveGlobal);
        window.removeEventListener('touchmove', handleTouchMoveGlobal);
        window.removeEventListener('touchend', handleTouchEndOrCancelGlobal);
        window.removeEventListener('touchcancel', handleTouchEndOrCancelGlobal);

        // Reset state vars
        isPanning.current = false;
        isPinching.current = false;
        touchIdentifier.current = null;
        initialPinchState.current = null;
        pinchTouches.current = null;
        if (containerRef.current) {
            containerRef.current.style.cursor = 'auto';
        }
    }
  }, [pan, zoom, updateStateAtom, containerRef, handleMouseMoveGlobal, handleMouseUpOrLeaveGlobal, handleTouchMoveGlobal, handleTouchEndOrCancelGlobal]);

  // Update the ref
  useEffect(() => {
    endPanInteractionRef.current = endPanInteraction;
  }, [endPanInteraction]);

  // --- Wheel Zoom (React handles this now) ---
  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      if (!containerRef.current) return;

      const scrollDelta = -event.deltaY;
      const zoomFactor = 1.1;
      const newZoom = scrollDelta > 0 ? zoom * zoomFactor : zoom / zoomFactor;
      const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
      const rect = containerRef.current.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const pointUnderPointerX = (pointerX - pan.x) / zoom;
      const pointUnderPointerY = (pointerY - pan.y) / zoom;
      const newPanX = pointerX - pointUnderPointerX * clampedZoom;
      const newPanY = pointerY - pointUnderPointerY * clampedZoom;
      const newPan = { x: newPanX, y: newPanY };

      setZoom(clampedZoom);
      setPan(newPan);
      updateStateAtom({ pan: newPan, zoom: clampedZoom });
    },
    [zoom, pan, containerRef, updateStateAtom]
  );

  // --- Start Pan/Pinch Logic (Attach Listeners Here) --- //
  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const targetElement = event.target as Element;
    const closestCard = targetElement.closest('g[data-draggable-card="true"]');
    if (closestCard || event.button !== 0 || isPanning.current || isPinching.current) return;

    isPanning.current = true;
    startPanPoint.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'move';
    }
    // Attach mouse listeners
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpOrLeaveGlobal);
    window.addEventListener('mouseleave', handleMouseUpOrLeaveGlobal);
  }, [pan, containerRef, handleMouseMoveGlobal, handleMouseUpOrLeaveGlobal]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<SVGSVGElement>) => {
      const targetElement = event.target as Element;
      const closestCard = targetElement.closest('g[data-draggable-card="true"]');
      if (closestCard || isPanning.current || isPinching.current) return;

      // --- Pinch Start --- //
      if (event.touches.length === 2) {
        isPinching.current = true;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        if (!touch1 || !touch2) return;
        pinchTouches.current = [touch1.identifier, touch2.identifier];
        const p1 = { x: touch1.clientX, y: touch1.clientY };
        const p2 = { x: touch2.clientX, y: touch2.clientY };
        initialPinchState.current = {
          distance: getDistance(p1, p2),
          midpoint: getMidpoint(p1, p2),
          pan: { ...pan },
          zoom: zoom,
        };
        // Attach common touch listeners for pinch
        window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
        window.addEventListener('touchend', handleTouchEndOrCancelGlobal);
        window.addEventListener('touchcancel', handleTouchEndOrCancelGlobal);
      }
      // --- Single Finger Pan Start --- //
      else if (event.touches.length === 1) {
        isPanning.current = true;
        const touch = event.touches.item(0);
        if (!touch) return;
        touchIdentifier.current = touch.identifier;
        startPanPoint.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
        if (containerRef.current) {
          containerRef.current.style.cursor = 'move';
        }
        // Attach common touch listeners for pan
        window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
        window.addEventListener('touchend', handleTouchEndOrCancelGlobal);
        window.addEventListener('touchcancel', handleTouchEndOrCancelGlobal);
      }
    },
    [pan, zoom, containerRef, handleTouchMoveGlobal, handleTouchEndOrCancelGlobal]
  );

  // --- Cleanup Effect --- //
  useEffect(() => {
    // Use the ref to call the *latest* endPanInteraction on unmount
    const cleanup = () => {
        endPanInteractionRef.current?.();
    };
    return cleanup;
  }, []); // Empty dependency array: runs only on mount/unmount

  return {
    containerProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onWheel: handleWheel,
    },
    svgTransform: `translate(${pan.x}, ${pan.y}) scale(${zoom})`,
  };
} 