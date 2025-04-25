import { useCallback, useRef, useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { updateCardSizeAtom, currentViewStateAtom, bringCardToFrontAtom } from '../state/atoms';
import type { Point, CardSize, CardData } from '../types';
import { MIN_CARD_WIDTH, MIN_CARD_HEIGHT } from '../components/Card'; // Use exported constants

interface UseResizableProps {
  cardId: string;
  cardData: CardData | undefined;
  sizerRef: React.RefObject<HTMLDivElement | null>;
  cardContentRef: React.RefObject<HTMLDivElement | null>;
  isEnabled: boolean;
}

export function useResizable({
  cardId,
  cardData,
  sizerRef,
  cardContentRef,
  isEnabled,
}: UseResizableProps) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPointer = useRef<Point>({ x: 0, y: 0 });
  const resizeStartSize = useRef<CardSize | null>(null);

  const { zoom } = useAtomValue(currentViewStateAtom);
  const updateSize = useSetAtom(updateCardSizeAtom);
  const bringToFront = useSetAtom(bringCardToFrontAtom);

  const startResize = useCallback(
    (clientX: number, clientY: number) => {
      if (!cardData?.size || !isEnabled) return;
      bringToFront(cardId);
      setIsResizing(true);
      resizeStartPointer.current = { x: clientX, y: clientY };
      resizeStartSize.current = { ...cardData.size };
      document.body.style.userSelect = 'none';
    },
    [cardId, cardData?.size, bringToFront, isEnabled]
  );

  const getVerticalPadding = useCallback(() => {
    if (cardContentRef.current) {
      const styles = window.getComputedStyle(cardContentRef.current);
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;
      return paddingTop + paddingBottom;
    }
    return 16 + 8; // Fallback to previous estimate
  }, [cardContentRef]);

  const handleResize = useCallback(
    (clientX: number, clientY: number) => {
      if (!isResizing || !resizeStartSize.current || !sizerRef.current || !cardData || !cardContentRef.current) return;
      const deltaX = clientX - resizeStartPointer.current.x;
      const deltaY = clientY - resizeStartPointer.current.y;
      const newWidth = resizeStartSize.current.width + deltaX / zoom;
      const newHeight = resizeStartSize.current.height + deltaY / zoom;
      const clampedWidth = Math.max(MIN_CARD_WIDTH, newWidth);
      const userClampedHeight = Math.max(MIN_CARD_HEIGHT, newHeight);

      sizerRef.current.innerText = cardData.text;
      sizerRef.current.style.width = `${clampedWidth}px`;
      const textScrollHeight = sizerRef.current.scrollHeight;
      const verticalPadding = getVerticalPadding();
      const minHeightForText = textScrollHeight + verticalPadding;
      const finalHeight = Math.max(userClampedHeight, minHeightForText, MIN_CARD_HEIGHT);
      updateSize({ cardId, size: { width: clampedWidth, height: finalHeight } });
    },
    [cardId, isResizing, updateSize, zoom, cardData?.text, sizerRef, cardContentRef, getVerticalPadding]
  );

  const endResize = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      resizeStartSize.current = null;
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

  // --- Event Handlers for resize handle --- //
  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0 || !isEnabled) return;
      event.stopPropagation();
      startResize(event.clientX, event.clientY);
    },
    [startResize, isEnabled]
  );

  const handleResizeTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 1 && isEnabled) {
        const touch = event.touches[0];
        if (!touch) return;
        event.stopPropagation();
        startResize(touch.clientX, touch.clientY);
      }
    },
    [startResize, isEnabled]
  );

  return {
    isResizing,
    resizableHandleProps: {
      onMouseDown: handleResizeMouseDown,
      onTouchStart: handleResizeTouchStart,
      // Include the data attribute for identification
      'data-resize-handle': 'true',
    },
    // Pass internal handlers needed for global listeners
    _handleResize: handleResize,
    _endResize: endResize,
    _getVerticalPadding: getVerticalPadding,
  };
} 