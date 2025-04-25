import { useState, useCallback, useRef, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateViewStateAtom } from '../state/atoms';
import type { Point, ViewState } from '../types';

interface UsePanZoomProps {
  initialViewState: ViewState;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function usePanZoom({ initialViewState, containerRef }: UsePanZoomProps) {
  const [pan, setPan] = useState<Point>(initialViewState.pan);
  const [zoom, setZoom] = useState<number>(initialViewState.zoom);
  const isPanning = useRef(false);
  const startPanPoint = useRef<Point>({ x: 0, y: 0 });

  const updateStateAtom = useSetAtom(updateViewStateAtom);

  // Effect 2: Update internal state if the initialViewState prop changes
  useEffect(() => {
    console.log("[usePanZoom] initialViewState prop changed:", initialViewState);
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

  // --- Pan Logic (Mouse) --- //
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    console.log("[Workspace] handleMouseDown fired");
    const targetElement = event.target as Element;
    const closestCard = targetElement.closest('[data-draggable-card="true"]');
    console.log("[Workspace] Closest card check:", closestCard);

    // Check if the event target is inside a draggable card
    if (closestCard) {
      console.log("[Workspace] Detected card drag, ignoring pan.");
      return; // Don't pan the workspace if dragging a card
    }
    console.log("[Workspace] Initiating pan.");
    isPanning.current = true;
    startPanPoint.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, [pan, containerRef]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning.current) return;
    const newX = event.clientX - startPanPoint.current.x;
    const newY = event.clientY - startPanPoint.current.y;
    setPan({ x: newX, y: newY });
  }, []);

  // Update atom only when panning STOPS
  const handleMouseUpOrLeave = useCallback(() => {
    if (isPanning.current) {
      console.log("[usePanZoom] Mouse pan ended, updating atom:", { pan, zoom }); // LOG
      // Update the atom with the final pan/zoom state
      updateStateAtom({ pan, zoom });
      isPanning.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  }, [containerRef, pan, zoom, updateStateAtom]); // Add pan, zoom, updateStateAtom dependency

  // --- Pan Logic (Touch) --- //
  // Store active touch identifier to handle multi-touch scenarios simply
  const touchIdentifier = useRef<number | null>(null);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    console.log("[Workspace] handleTouchStart fired");
    const targetElement = event.target as Element;
    const closestCard = targetElement.closest('[data-draggable-card="true"]');
    console.log("[Workspace] Closest card check:", closestCard);

    // Check if the event target is inside a draggable card
    if (closestCard) {
      console.log("[Workspace] Detected card drag, ignoring pan.");
      return; // Don't pan the workspace if dragging a card
    }
    console.log("[Workspace] Touch check passed, checking touch count.");

    if (event.touches.length === 1) { // Only pan with one finger
      console.log("[Workspace] Initiating pan via touch.");
      const touch = event.touches[0];
      if (!touch) return;
      isPanning.current = true;
      touchIdentifier.current = touch.identifier;
      startPanPoint.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'; // May not be visible on touch
      }
    } else {
      console.log("[Workspace] Ignoring touch pan (touch count != 1)");
    }
  }, [pan, containerRef]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isPanning.current || touchIdentifier.current === null) return;

    // Find the active touch
    let activeTouch: React.Touch | null = null;
    for (let i = 0; i < event.touches.length; i++) {
      const currentTouch = event.touches[i];
      if (currentTouch && currentTouch.identifier === touchIdentifier.current) {
        activeTouch = currentTouch;
        break;
      }
    }

    if (activeTouch) {
      const newX = activeTouch.clientX - startPanPoint.current.x;
      const newY = activeTouch.clientY - startPanPoint.current.y;
      setPan({ x: newX, y: newY });
    }
  }, []);

  // Update atom only when panning STOPS
  const handleTouchEndOrCancel = useCallback((event: React.TouchEvent) => {
    let wasPanningTouch = false;
    for(let i=0; i < event.changedTouches.length; i++){
        const changedTouch = event.changedTouches[i];
        if(changedTouch && changedTouch.identifier === touchIdentifier.current){
          wasPanningTouch = true;
          break;
        }
      }

      if (isPanning.current && wasPanningTouch) {
          console.log("[usePanZoom] Touch pan ended, updating atom:", { pan, zoom }); // LOG
          // Update the atom with the final pan/zoom state
          updateStateAtom({ pan, zoom });
          isPanning.current = false;
          touchIdentifier.current = null;
          if (containerRef.current) {
              containerRef.current.style.cursor = 'grab';
          }
      }
  }, [containerRef, pan, zoom, updateStateAtom]); // Add pan, zoom, updateStateAtom dependency


  return {
    // We return the state directly, the useEffect handles atom updates
    // pan, 
    // zoom,
    containerProps: {
      ref: containerRef, // Pass the ref
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUpOrLeave,
      onMouseLeave: handleMouseUpOrLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEndOrCancel,
      onTouchCancel: handleTouchEndOrCancel,
      style: { cursor: 'grab', touchAction: 'none' }, // touchAction none prevents browser scroll/zoom
    },
    // The transform applies the pan and zoom to the direct child (content wrapper)
    contentTransform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  };
} 