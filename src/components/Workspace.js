import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
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
    const containerRef = useRef(null);
    // Use the pan/zoom hook
    const { containerProps, // Props to spread onto the container element
    contentTransform, // Transform string for the content wrapper
     } = usePanZoom({ initialViewState, containerRef });
    return (_jsx(Box, { sx: { flexGrow: 1, overflow: 'hidden', background: '#e0e0e0' }, ...containerProps, children: _jsx(Box, { sx: {
                position: 'relative', // Needed for absolute positioning of cards
                width: '100%', // Take full width initially
                height: '100%', // Take full height initially
                transform: contentTransform, // Apply pan/zoom transform
                transformOrigin: 'top left', // Zoom from the top-left corner
            }, children: Object.values(cards).map((card) => (_jsx(Card, { cardId: card.id }, card.id))) }) }));
}
export default Workspace;
