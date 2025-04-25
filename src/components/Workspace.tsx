import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { currentCardsAtom, currentViewStateAtom } from '../state/atoms';
import { usePanZoom } from '../hooks/usePanZoom';
import Card from './Card'; // Import the Card component

// Placeholder for Workspace component
// This will display the cards and handle pan/zoom
function Workspace() {
  // Get state from Jotai
  const cards = useAtomValue(currentCardsAtom);
  const initialViewState = useAtomValue(currentViewStateAtom);

  const containerRef = useRef<HTMLDivElement>(null);

  // Use the pan/zoom hook
  const {
    containerProps, // Props to spread onto the container element
    contentTransform, // Transform string for the content wrapper
  } = usePanZoom({ initialViewState, containerRef });

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: '100%', // Explicitly set height
        overflow: 'hidden',
        background: '#e0e0e0'
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