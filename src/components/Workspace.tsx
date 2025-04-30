import React, { useRef, useEffect, useCallback } from 'react';
// Import SVG elements if needed, but basic ones are JSX intrinsics
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentCardsAtom,
  currentViewStateAtom,
  viewportSizeAtom,
  addCardAtom,
  interactionOrderAtom,
} from '../state/atoms';
import { usePanZoom } from '../hooks/usePanZoom';
// Re-import the refactored Card component
import Card from './Card';

// Placeholder for Workspace component
// This will display the cards and handle pan/zoom
function Workspace() {
  // Get state from Jotai
  const cards = useAtomValue(currentCardsAtom);
  const initialViewState = useAtomValue(currentViewStateAtom);
  const viewState = useAtomValue(currentViewStateAtom); // Also get current view state for coords
  const setViewportSize = useSetAtom(viewportSizeAtom); // Get setter for viewport size
  const addCard = useSetAtom(addCardAtom); // Get addCard setter
  const interactionOrder = useAtomValue(interactionOrderAtom); // Get interaction order

  // Ref now points to the SVG element
  const containerRef = useRef<SVGSVGElement>(null);

  // Use the updated pan/zoom hook
  const {
    containerProps, // Props for the outer SVG
    svgTransform, // SVG transform string for the inner group
  } = usePanZoom({ initialViewState, containerRef });

  // Effect to update viewport size atom on resize
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Initial size update
    setViewportSize({ width: element.clientWidth, height: element.clientHeight });

    // Observe size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setViewportSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Cleanup observer on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [setViewportSize]); // Dependency on the atom setter

  // Handler for double-clicking the workspace background (SVG)
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      // Prevent double-clicks originating from card elements (groups)
      const targetElement = event.target as Element;
      if (targetElement.closest('g[data-draggable-card="true"]')) {
          return;
      }

      if (!containerRef.current) return; // Ensure ref is current

      const { clientX, clientY } = event;
      const { pan, zoom } = viewState;

      // Get the SVG element's bounding box
      const svgRect = containerRef.current.getBoundingClientRect();

      // Calculate click position relative to the SVG top-left
      const svgX = clientX - svgRect.left;
      const svgY = clientY - svgRect.top;

      // Convert SVG click coordinates to workspace coordinates (considering pan/zoom)
      const workspaceX = (svgX - pan.x) / zoom;
      const workspaceY = (svgY - pan.y) / zoom;

      addCard({ text: '', position: { x: workspaceX, y: workspaceY } });
    },
    [addCard, viewState] // Dependencies
  );

  // Create a sorted list of card IDs based on interactionOrder
  // Cards not in interactionOrder yet can be appended
  const sortedCardIds = React.useMemo(() => {
      const currentCardIds = Object.keys(cards);
      const ordered = interactionOrder.filter(id => currentCardIds.includes(id));
      const unordered = currentCardIds.filter(id => !interactionOrder.includes(id));
      return [...ordered, ...unordered];
  }, [cards, interactionOrder]);

  return (
    // Replace outer Box with svg
    <svg
      ref={containerRef}
      width="100%"
      height="100%"
      style={{
        display: 'block', // Prevent extra space below SVG
        cursor: 'auto', // Default cursor
        background: 'var(--mui-palette-background-default)', // Use theme variable
        touchAction: 'none', // Still needed for interaction handling
        userSelect: 'none', // Prevent text selection on background
      }}
      {...containerProps} // Spread mouse/touch handlers from usePanZoom
      onDoubleClick={handleDoubleClick}
    >
      {/* Inner content wrapper is now an SVG group */}
      <g transform={svgTransform}>
        {/* Render cards based on the sorted order */}
        {sortedCardIds.map((cardId) => (
          <Card key={cardId} cardId={cardId} />
        ))}

        {/* Original card rendering - commented out for now
        {Object.values(cards).map((card) => (
          <Card key={card.id} cardId={card.id} />
        ))}
        */}
      </g>
    </svg>
  );
}

export default Workspace; 