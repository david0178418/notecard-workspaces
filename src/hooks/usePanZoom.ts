import { useState, useCallback, useRef, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateViewStateAtom } from '../state/atoms';
import type { Point, ViewState } from '../types';

interface UsePanZoomProps {
  initialViewState: ViewState;
  containerRef: React.RefObject<HTMLElement | null>;
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
  const isPinching = useRef(false); // <-- Ref for pinching state
  const startPanPoint = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);

  // Refs for pinch gesture state
  const pinchTouches = useRef<[number, number] | null>(null); // Store IDs of two fingers
  const initialPinchState = useRef<{ distance: number, midpoint: Point, pan: Point, zoom: number } | null>(null);

  const updateStateAtom = useSetAtom(updateViewStateAtom);

  // Effect 2: Update internal state if the initialViewState prop changes
  useEffect(() => {
    setPan(initialViewState.pan);
    setZoom(initialViewState.zoom);
  }, [initialViewState]);

  // --- Zoom Logic --- //
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      if (!containerRef.current) return;

      const scrollDelta = -event.deltaY;
      const zoomFactor = 1.1;
      const newZoom = scrollDelta > 0 ? zoom * zoomFactor : zoom / zoomFactor;
      const clampedZoom = Math.max(0.1, Math.min(newZoom, 10)); // Clamp zoom level

      const rect = containerRef.current.getBoundingClientRect();
      // Pointer position relative to the container element
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      // Calculate the point in the *content* space under the pointer before zoom
      const pointUnderPointerX = (pointerX - pan.x) / zoom;
      const pointUnderPointerY = (pointerY - pan.y) / zoom;

      // Calculate the new pan required to keep that point under the pointer after zoom
      const newPanX = pointerX - pointUnderPointerX * clampedZoom;
      const newPanY = pointerY - pointUnderPointerY * clampedZoom;
      const newPan = { x: newPanX, y: newPanY }; // Create new object for atom update

      setZoom(clampedZoom);
      setPan(newPan);
      // Update atom directly on zoom
      updateStateAtom({ pan: newPan, zoom: clampedZoom });
    },
    [zoom, pan, containerRef, updateStateAtom] // Add updateStateAtom dependency
  );

  // --- Manual Event Listener Attachment for Wheel --- //
  useEffect(() => {
    const element = containerRef.current;
    // Type assertion for the handler to satisfy addEventListener
    const wheelHandler = handleWheel as unknown as EventListener;
    if (element) {
      // Explicitly cast options object
      element.addEventListener('wheel', wheelHandler, { passive: false } as EventListenerOptions);
      return () => {
        element.removeEventListener('wheel', wheelHandler, { passive: false } as EventListenerOptions);
      };
    }
  }, [containerRef, handleWheel]);

  // --- Pan Logic (Mouse) ---
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const targetElement = event.target as Element;
    const closestCard = targetElement.closest('[data-draggable-card="true"]');
    if (closestCard) return;

    isPanning.current = true;
    startPanPoint.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'move';
    }
  }, [pan, containerRef]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning.current) return;
    const newX = event.clientX - startPanPoint.current.x;
    const newY = event.clientY - startPanPoint.current.y;
    setPan({ x: newX, y: newY });
  }, []);

  const handleMouseUpOrLeave = useCallback(() => {
    if (isPanning.current) {
      updateStateAtom({ pan, zoom });
      isPanning.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'auto';
      }
    }
  }, [containerRef, pan, zoom, updateStateAtom]);

  // --- Pan Logic (Touch) ---
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      const targetElement = event.target as Element;
      const closestCard = targetElement.closest('[data-draggable-card="true"]');
      if (closestCard) return;

      if (event.touches.length === 2) {
        isPanning.current = false; // Stop panning if starting pinch
        isPinching.current = true;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        if (!touch1 || !touch2) return; // Should not happen

        pinchTouches.current = [touch1.identifier, touch2.identifier];
        const p1 = { x: touch1.clientX, y: touch1.clientY };
        const p2 = { x: touch2.clientX, y: touch2.clientY };

        initialPinchState.current = {
          distance: getDistance(p1, p2),
          midpoint: getMidpoint(p1, p2),
          pan: { ...pan }, // Store initial pan/zoom at pinch start
          zoom: zoom,
        };
      }
      else if (event.touches.length === 1 && !isPinching.current) {
        isPanning.current = true;
        const touch = event.touches.item(0) as Touch | null;
        if (!touch) return;
        touchIdentifier.current = touch.identifier;
        startPanPoint.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
        if (containerRef.current) {
          containerRef.current.style.cursor = 'move';
        }
      }
    },
    [pan, zoom, containerRef]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      // --- Pinch Move Logic ---
      if (isPinching.current && event.touches.length === 2 && pinchTouches.current && initialPinchState.current) {
        let currentTouch1: Touch | null = null;
        let currentTouch2: Touch | null = null;
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches.item(i) as Touch | null;
          if (touch?.identifier === pinchTouches.current?.[0]) currentTouch1 = touch;
          if (touch?.identifier === pinchTouches.current?.[1]) currentTouch2 = touch;
        }

        if (currentTouch1 && currentTouch2) {
          const p1 = { x: currentTouch1.clientX, y: currentTouch1.clientY };
          const p2 = { x: currentTouch2.clientX, y: currentTouch2.clientY };
          const currentDistance = getDistance(p1, p2);
          const currentMidpoint = getMidpoint(p1, p2);

          const { distance: initialDistance, midpoint: initialMidpoint, pan: initialPan, zoom: initialZoom } = initialPinchState.current;

          if (initialDistance === 0) return; // Avoid divide by zero

          // Calculate new zoom
          const zoomFactor = currentDistance / initialDistance;
          const newZoom = initialZoom * zoomFactor;
          const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));

          // Calculate workspace point under initial midpoint
          const initialMidpointWorkspaceX = (initialMidpoint.x - initialPan.x) / initialZoom;
          const initialMidpointWorkspaceY = (initialMidpoint.y - initialPan.y) / initialZoom;

          // Calculate new pan to keep that point under the current midpoint
          const newPanX = currentMidpoint.x - initialMidpointWorkspaceX * clampedZoom;
          const newPanY = currentMidpoint.y - initialMidpointWorkspaceY * clampedZoom;
          const newPan = { x: newPanX, y: newPanY };

          // Apply the new pan and zoom
          setZoom(clampedZoom);
          setPan(newPan);

          // Optimization: Update initial state for smoother continuous pinch?
          // Or rely on state update triggering re-render?
          // Let's try relying on state update first.
        }
      }
      // --- Single Finger Pan Move ---
      else if (isPanning.current && touchIdentifier.current !== null) {
        let activeTouch: Touch | null = null;
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches.item(i) as Touch | null;
          if (touch && touch.identifier === touchIdentifier.current) {
            activeTouch = touch;
            break;
          }
        }
        if (activeTouch) {
          const newX = activeTouch.clientX - startPanPoint.current.x;
          const newY = activeTouch.clientY - startPanPoint.current.y;
          setPan({ x: newX, y: newY });
        }
      }
    },
    [] // Dependencies handled implicitly via refs and state setters
  );

  const handleTouchEndOrCancel = useCallback(
    (event: React.TouchEvent) => {
      if (isPinching.current) {
        updateStateAtom({ pan, zoom });
        isPinching.current = false;
        initialPinchState.current = null;
        pinchTouches.current = null;
        if (containerRef.current) {
          containerRef.current.style.cursor = 'auto';
        }
      }
      else {
        let wasPanningTouch = false;
        for (let i = 0; i < event.changedTouches.length; i++) {
          const changedTouch = event.changedTouches.item(i) as Touch | null;
          if (changedTouch && changedTouch.identifier === touchIdentifier.current) {
            wasPanningTouch = true;
            break;
          }
        }
        if (isPanning.current && wasPanningTouch) {
          updateStateAtom({ pan, zoom });
          isPanning.current = false;
          touchIdentifier.current = null;
          if (containerRef.current) {
            containerRef.current.style.cursor = 'auto';
          }
        }
      }
    },
    [containerRef, pan, zoom, updateStateAtom]
  );

  return {
    containerProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUpOrLeave,
      onMouseLeave: handleMouseUpOrLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEndOrCancel,
      onTouchCancel: handleTouchEndOrCancel,
      style: {
        touchAction: 'none'
      },
    },
    contentTransform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  };
} 