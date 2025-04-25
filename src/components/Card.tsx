import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card as MuiCard, CardContent, Typography, TextField, Box, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteForever'; // Example delete icon
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { currentCardsAtom, updateCardPositionAtom, updateCardTextAtom, deleteCardAtom, currentViewStateAtom } from '../state/atoms';
import type { Point } from '../types';

interface CardProps {
  cardId: string;
}

function Card({ cardId }: CardProps) {
  const cards = useAtomValue(currentCardsAtom);
  const cardData = cards[cardId];
  const { zoom } = useAtomValue(currentViewStateAtom); // Needed for drag calculations
  const updatePosition = useSetAtom(updateCardPositionAtom);
  const updateText = useSetAtom(updateCardTextAtom);
  const deleteCard = useSetAtom(deleteCardAtom);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cardData?.text ?? '');
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 }); // Offset from card corner to pointer
  const touchIdentifier = useRef<number | null>(null);

  // Update local edit text if card data changes externally
  useEffect(() => {
    if (cardData && !isEditing) {
      setEditText(cardData.text);
    }
  }, [cardData?.text, isEditing]); // Dependency includes optional chaining

  // --- Text Editing --- //
  const handleDoubleClick = useCallback(() => {
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
    if (event.key === 'Enter' && !event.shiftKey) {
      handleTextBlur(); // Save on Enter
      event.preventDefault();
    } else if (event.key === 'Escape') {
      setEditText(cardData?.text ?? ''); // Revert on Escape
      setIsEditing(false);
    }
  }, [handleTextBlur, cardData?.text]);

  // --- Dragging --- //
  const startDrag = useCallback((clientX: number, clientY: number, identifier?: number) => {
    if (!cardRef.current || !cardData) return;
    isDragging.current = true;
    if (identifier !== undefined) {
      touchIdentifier.current = identifier;
    }
    const rect = cardRef.current.getBoundingClientRect();
    // Calculate offset from top-left corner where drag started
    // We need to account for the current page zoom
    dragStartOffset.current = {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    if (cardRef.current) cardRef.current.style.cursor = 'grabbing';
  }, [cardData, zoom]);

  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current || !cardData) return;
    // Calculate the new top-left position in *workspace coordinates*
    const newPositionX = clientX / zoom - dragStartOffset.current.x;
    const newPositionY = clientY / zoom - dragStartOffset.current.y;
    // We directly update the position without local state for smoother dragging
    updatePosition({ cardId, position: { x: newPositionX, y: newPositionY } });
  }, [cardId, cardData, updatePosition, zoom]);

  const endDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      touchIdentifier.current = null;
      document.body.style.userSelect = ''; // Re-enable text selection
      if (cardRef.current) cardRef.current.style.cursor = 'grab';
    }
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (event: React.MouseEvent) => {
    // Only start drag on left click and not when editing text
    if (event.button !== 0 || isEditing) return;
    event.stopPropagation(); // Prevent workspace pan
    startDrag(event.clientX, event.clientY);
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Listen globally for mouse move when dragging
    if (isDragging.current && touchIdentifier.current === null) { // Ensure it's a mouse drag
      handleDrag(event.clientX, event.clientY);
    }
  }, [handleDrag]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 0 && touchIdentifier.current === null) { // Only end mouse drag
        endDrag();
    }
  }, [endDrag]);

  // Touch drag handlers
  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1 && !isEditing) {
      const touch = event.touches[0];
      if (!touch) return;
      event.stopPropagation(); // Prevent workspace pan
      startDrag(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDragging.current && touchIdentifier.current !== null) {
      let activeTouch: Touch | null = null;
      for (let i = 0; i < event.touches.length; i++) {
        const t = event.touches[i];
        if (t && t.identifier === touchIdentifier.current) {
          activeTouch = t;
          break;
        }
      }
      if (activeTouch) {
        handleDrag(activeTouch.clientX, activeTouch.clientY);
      }
    }
  }, [handleDrag]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
      let wasDraggingTouch = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
          const t = event.changedTouches[i];
          if (t && t.identifier === touchIdentifier.current) {
              wasDraggingTouch = true;
              break;
          }
      }
      if (wasDraggingTouch) {
          endDrag();
      }
  }, [endDrag]);

  // Add/Remove global listeners for mouse/touch move/end
  useEffect(() => {
    if (isDragging.current) {
      // Use window listeners for events outside the card element
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isDragging.current, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // --- Deletion --- //
  const handleDelete = useCallback(() => {
    // Optional: Add confirmation dialog later
    deleteCard(cardId);
  }, [cardId, deleteCard]);

  // Render nothing if cardData isn't available (e.g., deleted)
  if (!cardData) {
    return null;
  }

  return (
    <MuiCard
      ref={cardRef}
      sx={{
        position: 'absolute',
        // Apply position from Jotai state
        left: cardData.position.x,
        top: cardData.position.y,
        minWidth: 150,
        cursor: isEditing ? 'default' : 'grab',
        userSelect: isEditing ? 'text' : 'none', // Allow text selection only when editing
        zIndex: isDragging.current ? 1000 : 1, // Bring to front while dragging
        opacity: isDragging.current ? 0.8 : 1,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent sx={{ position: 'relative', padding: '16px', paddingRight: '40px' /* Space for delete */ }}>
        {isEditing ? (
          <TextField
            multiline
            fullWidth
            variant="standard"
            value={editText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            autoFocus
            InputProps={{ disableUnderline: true }}
            sx={{ textarea: { padding: 0 } }} // Remove padding inside textarea
          />
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' /* Preserve whitespace */ }}>
            {cardData.text}
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
    </MuiCard>
  );
}

export default Card; 