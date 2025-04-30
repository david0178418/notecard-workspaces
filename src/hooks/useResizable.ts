import { useState, useCallback, useRef, RefObject, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateCardSizeAtom } from '../state/atoms';
import { useAtomValue } from 'jotai';
import { currentViewStateAtom } from '../state/atoms';
import { MIN_CARD_WIDTH, MIN_CARD_HEIGHT } from '../components/Card'; // Import min sizes

interface Size {
  width: number;
  height: number;
}

interface UseResizableProps {
  cardId: string;
  initialSize: Size;
  cardRef: RefObject<SVGGElement | null>; // Allow null ref
  isEnabled?: boolean;
}

interface ResizableProps {
  onMouseDown: (event: React.MouseEvent<SVGElement>) => void;
}

interface UseResizableReturn {
  isResizing: boolean;
  resizableProps: ResizableProps;
}

export function useResizable({
  cardId,
  initialSize,
  cardRef,
  isEnabled = true,
}: UseResizableProps): UseResizableReturn {
  const updateSize = useSetAtom(updateCardSizeAtom);
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState<Size>(initialSize);
  const [startMousePos, setStartMousePos] = useState<{ x: number; y: number } | null>(null);
  const cardSvgRef = useRef<SVGSVGElement | null>(null);
  const startScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  const { zoom } = useAtomValue(currentViewStateAtom);

  // Get the SVG element reference once
  useEffect(() => {
    if (cardRef.current) {
      cardSvgRef.current = cardRef.current.ownerSVGElement;
    }
  }, [cardRef]);


  const getMousePositionInSvg = useCallback((event: MouseEvent): { x: number; y: number } | null => {
    if (!cardSvgRef.current) return null;

    const svgPoint = cardSvgRef.current.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;

    const screenCTM = cardSvgRef.current.getScreenCTM();
    if (!screenCTM) return null;

    const { x, y } = svgPoint.matrixTransform(screenCTM.inverse());
    return { x, y };
  }, []);


  const handleMouseDown = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!isEnabled || event.button !== 0 || !cardRef.current) return;

    event.stopPropagation(); // Prevent card dragging while resizing
    setIsResizing(true);
    const currentCardElement = cardRef.current;
    const currentSize = {
        width: parseFloat(currentCardElement.querySelector('rect')?.getAttribute('width') || '0'),
        height: parseFloat(currentCardElement.querySelector('rect')?.getAttribute('height') || '0')
    };
    setStartSize(currentSize);

    const mousePos = getMousePositionInSvg(event.nativeEvent);
    if(mousePos) {
      startScreenPosRef.current = { x: event.clientX, y: event.clientY };
    }

  }, [isEnabled, cardRef, updateSize, cardId, getMousePositionInSvg]);


  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing || !startScreenPosRef.current || !cardRef.current ) return;

    const currentScreenX = event.clientX;
    const currentScreenY = event.clientY;

    const screenDeltaX = currentScreenX - startScreenPosRef.current.x;
    const screenDeltaY = currentScreenY - startScreenPosRef.current.y;

    const scaledDx = screenDeltaX / zoom;
    const scaledDy = screenDeltaY / zoom;

    const newWidth = Math.max(MIN_CARD_WIDTH, startSize.width + scaledDx);
    const newHeight = Math.max(MIN_CARD_HEIGHT, startSize.height + scaledDy);

    updateSize({ cardId, size: { width: newWidth, height: newHeight } });

  }, [isResizing, startScreenPosRef, startSize, cardId, updateSize, cardRef, getMousePositionInSvg, zoom]);


  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isResizing) return;

    event.stopPropagation();
    setIsResizing(false);
    setStartMousePos(null);
    startScreenPosRef.current = null;

  }, [isResizing, handleMouseMove]);


  // Manage global listeners based on isResizing state
  useEffect(() => {
    if (!isResizing) {
      return; // Do nothing if not resizing
    }

    // Add listeners when resizing starts
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup function to remove listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]); // Dependencies: run when isResizing or handlers change


  return {
    isResizing,
    resizableProps: {
      onMouseDown: handleMouseDown,
    },
  };
} 