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

  // Update atom when local state changes
  useEffect(() => {
    updateStateAtom({ pan, zoom });
  }, [pan, zoom, updateStateAtom]);

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

      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan, containerRef]
  );

  // --- Pan Logic (Mouse) --- //
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
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

  const handleMouseUpOrLeave = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  }, [containerRef]);

  // --- Pan Logic (Touch) --- //
  // Store active touch identifier to handle multi-touch scenarios simply
  const touchIdentifier = useRef<number | null>(null);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) { // Only pan with one finger
      const touch = event.touches[0];
      if (!touch) return;
      isPanning.current = true;
      touchIdentifier.current = touch.identifier;
      startPanPoint.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'; // May not be visible on touch
      }
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

  const handleTouchEndOrCancel = useCallback((event: React.TouchEvent) => {
      // Check if the ended touch was the one we were tracking
      let wasPanningTouch = false;
      for(let i=0; i < event.changedTouches.length; i++){
        const changedTouch = event.changedTouches[i];
        if(changedTouch && changedTouch.identifier === touchIdentifier.current){
          wasPanningTouch = true;
          break;
        }
      }

      if (isPanning.current && wasPanningTouch) {
          isPanning.current = false;
          touchIdentifier.current = null;
          if (containerRef.current) {
              containerRef.current.style.cursor = 'grab';
          }
      }
  }, [containerRef]);


  return {
    // We return the state directly, the useEffect handles atom updates
    // pan, 
    // zoom,
    containerProps: {
      ref: containerRef, // Pass the ref
      onWheel: handleWheel,
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