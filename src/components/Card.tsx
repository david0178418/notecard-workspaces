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
  const { pan, zoom } = useAtomValue(currentViewStateAtom);
  const updatePosition = useSetAtom(updateCardPositionAtom);
  const updateText = useSetAtom(updateCardTextAtom);
  const deleteCard = useSetAtom(deleteCardAtom);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cardData?.text ?? '');
  const [isDraggingState, setIsDraggingState] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
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
    console.log(`[Card ${cardId}] startDrag called`);
    if (!cardRef.current || !cardData) {
      console.log(`[Card ${cardId}] startDrag aborted (no ref or data)`);
      return;
    }
    isDragging.current = true;
    setIsDraggingState(true);
    console.log(`[Card ${cardId}] isDragging.current = true, isDraggingState = true`);
    if (identifier !== undefined) {
      touchIdentifier.current = identifier;
    }

    // Calculate pointer position in workspace coordinates
    const pointerWorkspaceX = (clientX - pan.x) / zoom;
    const pointerWorkspaceY = (clientY - pan.y) / zoom;

    // Calculate offset relative to card's *workspace position*
    dragStartOffset.current = {
      x: pointerWorkspaceX - cardData.position.x,
      y: pointerWorkspaceY - cardData.position.y,
    };
    console.log(`[Card ${cardId}] Calculated drag offset:`, dragStartOffset.current);

    document.body.style.userSelect = 'none';
    if (cardRef.current) cardRef.current.style.cursor = 'grabbing';
  }, [cardData, pan, zoom, setIsDraggingState]);

  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current || !cardData) return;

    // Calculate pointer position in workspace coordinates
    const pointerWorkspaceX = (clientX - pan.x) / zoom;
    const pointerWorkspaceY = (clientY - pan.y) / zoom;

    // Calculate the new top-left position in workspace coordinates
    // by subtracting the drag offset (which is relative to the card's top-left)
    const newPositionX = pointerWorkspaceX - dragStartOffset.current.x;
    const newPositionY = pointerWorkspaceY - dragStartOffset.current.y;

    updatePosition({ cardId, position: { x: newPositionX, y: newPositionY } });
    // No need to update local state, rely on Jotai update cycle
  }, [cardId, cardData, updatePosition, pan, zoom]);

  const endDrag = useCallback(() => {
    if (isDragging.current) {
      console.log(`[Card ${cardId}] endDrag called`);
      isDragging.current = false;
      setIsDraggingState(false);
      touchIdentifier.current = null;
      document.body.style.userSelect = '';
      if (cardRef.current) cardRef.current.style.cursor = 'grab';
    }
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (event: React.MouseEvent) => {
    console.log(`[Card ${cardId}] handleMouseDown fired`);
    if (event.button !== 0 || isEditing) {
      console.log(`[Card ${cardId}] handleMouseDown ignored (button!=0 or editing)`);
      return;
    }
    console.log(`[Card ${cardId}] handleMouseDown calling stopPropagation`);
    event.stopPropagation(); // Prevent workspace pan
    console.log(`[Card ${cardId}] handleMouseDown calling startDrag`);
    startDrag(event.clientX, event.clientY);
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging.current && touchIdentifier.current === null) {
      handleDrag(event.clientX, event.clientY);
    }
  }, [handleDrag]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 0 && touchIdentifier.current === null) {
        endDrag();
    }
  }, [endDrag]);

  // Touch drag handlers
  const handleTouchStart = (event: React.TouchEvent) => {
    console.log(`[Card ${cardId}] handleTouchStart fired`);
    if (event.touches.length === 1 && !isEditing) {
      const touch = event.touches[0];
      if (!touch) return;
      console.log(`[Card ${cardId}] handleTouchStart calling stopPropagation`);
      event.stopPropagation(); // Prevent workspace pan
      console.log(`[Card ${cardId}] handleTouchStart calling startDrag`);
      startDrag(touch.clientX, touch.clientY, touch.identifier);
    } else {
       console.log(`[Card ${cardId}] handleTouchStart ignored (touches!=1 or editing)`);
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

  // Add/Remove global listeners based on isDraggingState
  useEffect(() => {
    if (isDraggingState) {
      console.log(`[Card ${cardId}] useEffect adding global listeners`);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        console.log(`[Card ${cardId}] useEffect removing global listeners`);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isDraggingState, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
      data-draggable-card="true"
      sx={{
        position: 'absolute',
        // Apply position from Jotai state
        left: cardData.position.x,
        top: cardData.position.y,
        minWidth: 150,
        cursor: isEditing ? 'default' : 'grab',
        userSelect: isEditing ? 'text' : 'none', // Allow text selection only when editing
        zIndex: isDraggingState ? 1000 : 1, // Use state for zIndex
        opacity: isDraggingState ? 0.8 : 1, // Use state for opacity
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