import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentCardsAtom,
  currentViewStateAtom,
  viewportSizeAtom,
  addCardAtom,
} from '../state/atoms';
import { usePanZoom } from '../hooks/usePanZoom';
import Card from './Card'; // Import the Card component

// Placeholder for Workspace component
// This will display the cards and handle pan/zoom
function Workspace() {
  // Get state from Jotai
  const cards = useAtomValue(currentCardsAtom);
  const initialViewState = useAtomValue(currentViewStateAtom);
  const viewState = useAtomValue(currentViewStateAtom); // Also get current view state for coords
  const setViewportSize = useSetAtom(viewportSizeAtom); // Get setter for viewport size
  const addCard = useSetAtom(addCardAtom); // Get addCard setter

  const containerRef = useRef<HTMLDivElement>(null);

  // Use the pan/zoom hook
  const {
    containerProps, // Props to spread onto the container element
    contentTransform, // Transform string for the content wrapper
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
        // Use contentRect for more accurate dimensions
        const { width, height } = entry.contentRect;
        console.log(`[Workspace] Resized to ${width}x${height}`); // LOG
        setViewportSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Cleanup observer on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [setViewportSize]); // Dependency on the atom setter

  // Handler for double-clicking the workspace background
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Remove the target check - allow clicks on inner transformed box too
      // if (event.target !== containerRef.current) {
      //   console.log("[Workspace] Double-click ignored (not on background)");
      //   return;
      // }

      // Card's onDoubleClick handler should prevent this from firing if clicked on a card

      const { clientX, clientY } = event;
      const { pan, zoom } = viewState; // Use current view state

      // Calculate click position in workspace coordinates
      const workspaceX = (clientX - pan.x) / zoom;
      const workspaceY = (clientY - pan.y) / zoom;

      console.log(`[Workspace] Double-click at viewport (${clientX},${clientY}), workspace (${workspaceX},${workspaceY}). Adding card.`);

      // Add a new card at the calculated position
      addCard({ text: '', position: { x: workspaceX, y: workspaceY } });
    },
    [addCard, viewState] // Include dependencies
  );

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: '100%', // Explicitly set height
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
      {...containerProps}
      onDoubleClick={handleDoubleClick}
    >
      {/* Inner content wrapper */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transform: contentTransform,
          transformOrigin: 'top left',
          willChange: 'transform',
        }}
      >
        {/* Render cards */}
        {Object.values(cards).map((card) => (
          <Card key={card.id} cardId={card.id} />
        ))}
      </Box>
    </Box>
  );
}

export default Workspace; 