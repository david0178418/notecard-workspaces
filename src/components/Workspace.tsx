import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentCardsAtom,
  currentViewStateAtom,
  viewportSizeAtom,
} from '../state/atoms';
import { usePanZoom } from '../hooks/usePanZoom';
import Card from './Card'; // Import the Card component

// Placeholder for Workspace component
// This will display the cards and handle pan/zoom
function Workspace() {
  // Get state from Jotai
  const cards = useAtomValue(currentCardsAtom);
  const initialViewState = useAtomValue(currentViewStateAtom);
  const setViewportSize = useSetAtom(viewportSizeAtom); // Get setter for viewport size

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

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: '100%', // Explicitly set height
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
      {...containerProps}
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