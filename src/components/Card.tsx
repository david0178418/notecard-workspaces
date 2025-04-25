import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card as MuiCard, CardContent, Typography, TextField, Box, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteForever'; // Example delete icon
import ResizeIcon from '@mui/icons-material/AspectRatio'; // Or another suitable icon
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import {
  currentCardsAtom,
  updateCardTextAtom,
  deleteCardAtom,
  interactionOrderAtom,
  lastCreatedCardIdAtom,
  updateCardSizeAtom,
} from '../state/atoms';
import { useDraggable } from '../hooks/useDraggable';
import { useResizable } from '../hooks/useResizable';
import { useTheme } from '@mui/material/styles';

// Define minimum card size and EXPORT them
export const MIN_CARD_WIDTH = 150;
export const MIN_CARD_HEIGHT = 80;

interface CardProps {
  cardId: string;
}

function Card({ cardId }: CardProps) {
  const cards = useAtomValue(currentCardsAtom);
  const cardData = cards[cardId];
  const updateText = useSetAtom(updateCardTextAtom);
  const deleteCard = useSetAtom(deleteCardAtom);
  const updateSize = useSetAtom(updateCardSizeAtom);
  const interactionOrder = useAtomValue(interactionOrderAtom);
  const [lastCreatedCardId, setLastCreatedCardId] = useAtom(lastCreatedCardIdAtom);
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cardData?.text ?? '');
  const cardRef = useRef<HTMLDivElement>(null);
  const typographyRef = useRef<HTMLParagraphElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null); // Ref for CardContent

  // Use Draggable Hook
  const { isDragging, draggableProps } = useDraggable({
    cardId,
    initialPosition: cardData?.position ?? { x: 0, y: 0 }, // Provide initial pos
    cardRef,
    isEnabled: !isEditing, // Disable drag while editing
  });

  // Use Resizable Hook
  const {
    isResizing,
    resizableHandleProps,
    _getVerticalPadding, // Get padding function
  } = useResizable({
    cardId,
    cardData,
    sizerRef,
    cardContentRef, // Pass content ref
    isEnabled: !isEditing,
  });

  // Update local edit text if card data changes externally
  useEffect(() => {
    if (cardData && !isEditing) {
      setEditText(cardData.text);
    }
  }, [cardData?.text, isEditing]); // Dependency includes optional chaining

  // Effect to trigger edit mode for the last created card
  useEffect(() => {
    if (lastCreatedCardId === cardId) {
      setIsEditing(true);
      setLastCreatedCardId(null);
    }
  }, [lastCreatedCardId, cardId, setLastCreatedCardId]);

  // --- Text Editing --- //
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    // Stop propagation to prevent workspace double-click handler
    event.stopPropagation();
    if (cardData) {
      setEditText(cardData.text);
      setIsEditing(true);
    }
  }, [cardData]);

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(event.target.value);
  }, []);

  const handleTextBlur = useCallback(() => {
    if (cardData && editText !== cardData.text) {
      updateText({ cardId, text: editText });
    }
    setIsEditing(false);
  }, [cardId, cardData, editText, updateText]);

  const handleTextKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setEditText(cardData?.text ?? ''); // Revert on Escape
      setIsEditing(false);
      event.preventDefault(); // Prevent other actions on Escape
    }
    // Allow Enter key's default behavior (newline in multiline TextField)
  }, [handleTextBlur, cardData?.text]);

  // --- Auto-Adjust Height Effect --- //
  useEffect(() => {
    // Use padding from hook, check for isResizing
    if (!isEditing && !isResizing && typographyRef.current && cardData?.size) {
      const currentHeight = cardData.size.height;
      const scrollHeight = typographyRef.current.scrollHeight;
      const verticalPadding = _getVerticalPadding(); // Use function from hook
      const requiredHeight = scrollHeight + verticalPadding;
      const heightDifference = requiredHeight - currentHeight;

      if (heightDifference > 5) {
        updateSize({ cardId, size: { width: cardData.size.width, height: requiredHeight } });
      }
    }
    // Add _getVerticalPadding to dependencies
  }, [cardData?.text, cardData?.size?.width, cardData?.size?.height, isEditing, isResizing, cardId, updateSize, _getVerticalPadding]);

  // --- Deletion --- //
  const handleDelete = useCallback(() => {
    // Optional: Add confirmation dialog later
    deleteCard(cardId);
  }, [cardId, deleteCard]);

  // Render nothing if cardData isn't available (e.g., deleted)
  if (!cardData) {
    return null;
  }

  // Use default size if not set (should be set by addCardAtom now)
  const currentSize = cardData.size ?? { width: MIN_CARD_WIDTH, height: MIN_CARD_HEIGHT };

  // Memoize dynamic styles applied via the style prop
  const dynamicStyles = useMemo((): React.CSSProperties => {
    const baseZIndex = interactionOrder.findIndex(id => id === cardId);
    // Use isDragging and isResizing states from hooks
    const zIndex = (isDragging || isResizing)
        ? interactionOrder.length + 10
        : (baseZIndex >= 0 ? baseZIndex + 1 : 1);

    return {
      left: cardData.position.x,
      top: cardData.position.y,
      width: currentSize.width,
      height: currentSize.height,
      zIndex: zIndex,
      opacity: isDragging ? 0.8 : 1, // Use isDragging from hook
      position: 'absolute',
    };
  }, [
    cardData.position.x,
    cardData.position.y,
    currentSize.width,
    currentSize.height,
    isDragging, // Use state from hook
    isResizing, // Use state from hook
    interactionOrder,
    cardId,
  ]);

  // Define sizer styles (mirror Typography styles using theme)
  const sizerStyles = useMemo((): React.CSSProperties => {
    const body2 = theme.typography.body2;
    return {
      position: 'absolute',
      left: -9999,
      top: -9999,
      // Use theme values
      fontSize: body2.fontSize,
      lineHeight: body2.lineHeight,
      fontFamily: body2.fontFamily,
      fontWeight: body2.fontWeight,
      letterSpacing: body2.letterSpacing,
      whiteSpace: 'pre-wrap',
      padding: '0',
      margin: '0',
      boxSizing: 'border-box',
      visibility: 'hidden',
    };
  }, [theme]); // Depend on theme

  return (
    <MuiCard
      ref={cardRef}
      data-draggable-card="true"
      sx={{
        cursor: isEditing ? 'default' : 'grab',
        userSelect: isEditing ? 'text' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        willChange: 'transform, opacity',
      }}
      style={dynamicStyles}
      {...draggableProps}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent
        ref={cardContentRef} // Attach ref
        sx={{
            position: 'relative',
            padding: '8px 8px 8px 8px', // Minimal padding, adjust as needed
            paddingRight: '40px', // Keep space for delete button
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center', // Vertical center
            justifyContent: 'center', // Horizontal center
            overflow: 'hidden', // Prevent content itself from overflowing CardContent bounds
        }}
        >
        {isEditing ? (
          <TextField
            multiline
            fullWidth // Allow TextField to fill the centered space
            variant="standard"
            value={editText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            autoFocus
            placeholder="New Card"
            InputProps={{ disableUnderline: true }}
            sx={{
              // Target the textarea for text alignment and padding
              '& .MuiInputBase-inputMultiline': {
                textAlign: 'center',
                padding: 0, // Remove internal padding
                lineHeight: 1.2, // Adjust line height for better centering
              },
              width: '100%', // Ensure it fills flex item width
            }}
          />
        ) : (
          <Typography
            ref={typographyRef}
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              textAlign: 'center', // Center text within Typography
              overflowY: 'auto', // Allow scrolling if text overflows card size
              maxHeight: '100%' // Ensure Typography doesn't exceed CardContent height
            }}
          >
            {cardData.text || "New Card"}
          </Typography>
        )}
        <IconButton
          aria-label="delete card"
          onClick={handleDelete}
          size="small"
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0.5, // Make it subtle
            '&:hover': {
              opacity: 1,
              color: 'error.main'
            }
          }}
        >
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      </CardContent>

      {/* Resize Handle */}
      <Box
        {...resizableHandleProps}
        sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            cursor: 'nwse-resize',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            color: 'action.active'
        }}
      >
        <ResizeIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }}/>
      </Box>

      {/* Hidden Sizer Element */}
      <div ref={sizerRef} style={sizerStyles}></div>
    </MuiCard>
  );
}

export default Card; 