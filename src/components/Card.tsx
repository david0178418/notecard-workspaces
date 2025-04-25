import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card as MuiCard, CardContent, Typography, TextField, Box, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteForever'; // Example delete icon
import ResizeIcon from '@mui/icons-material/AspectRatio'; // Or another suitable icon
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { currentCardsAtom, updateCardPositionAtom, updateCardTextAtom, deleteCardAtom, currentViewStateAtom, updateCardSizeAtom } from '../state/atoms';
import type { Point, CardSize } from '../types';

// Define minimum card size
const MIN_CARD_WIDTH = 100;
const MIN_CARD_HEIGHT = 50;

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
  const updateSize = useSetAtom(updateCardSizeAtom); // Use new atom

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cardData?.text ?? '');
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [isResizing, setIsResizing] = useState(false); // <-- State for resizing
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartOffset = useRef<Point>({ x: 0, y: 0 });
  const touchIdentifier = useRef<number | null>(null);
  // Refs for resizing
  const resizeStartPointer = useRef<Point>({ x: 0, y: 0 });
  const resizeStartSize = useRef<CardSize | null>(null);

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

  // --- Resizing --- //
  const startResize = useCallback((clientX: number, clientY: number) => {
      if (!cardData?.size) return; // Should have size by now
      console.log(`[Card ${cardId}] startResize called`);
      setIsResizing(true);
      resizeStartPointer.current = { x: clientX, y: clientY };
      resizeStartSize.current = { ...cardData.size }; // Store starting size
      document.body.style.userSelect = 'none'; // Prevent selection during resize
  }, [cardData?.size]);

  const handleResize = useCallback((clientX: number, clientY: number) => {
    if (!isResizing || !resizeStartSize.current) return;

    const deltaX = clientX - resizeStartPointer.current.x;
    const deltaY = clientY - resizeStartPointer.current.y;

    // Calculate new dimensions based on delta, accounting for zoom
    const newWidth = resizeStartSize.current.width + deltaX / zoom;
    const newHeight = resizeStartSize.current.height + deltaY / zoom;

    // Enforce minimum dimensions
    const clampedWidth = Math.max(MIN_CARD_WIDTH, newWidth);
    const clampedHeight = Math.max(MIN_CARD_HEIGHT, newHeight);

    updateSize({ cardId, size: { width: clampedWidth, height: clampedHeight } });

  }, [cardId, isResizing, updateSize, zoom]);

  const endResize = useCallback(() => {
    if (isResizing) {
        console.log(`[Card ${cardId}] endResize called`);
        setIsResizing(false);
        resizeStartSize.current = null;
        document.body.style.userSelect = '';
    }
  }, [isResizing]);

  // --- Event Handlers for Card Element --- //
  const handleCardMouseDown = (event: React.MouseEvent) => {
    if ((event.target as Element).closest('[data-resize-handle="true"]') || event.button !== 0 || isEditing) return;
    event.stopPropagation();
    startDrag(event.clientX, event.clientY);
  };
  const handleCardTouchStart = (event: React.TouchEvent) => {
    if ((event.target as Element).closest('[data-resize-handle="true"]') || event.touches.length !== 1 || isEditing) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.stopPropagation();
    startDrag(touch.clientX, touch.clientY, touch.identifier);
  };

  // --- Event Handlers for Resize Handle --- //
  const handleResizeMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    startResize(event.clientX, event.clientY);
  };
  const handleResizeTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (!touch) return;
      event.stopPropagation();
      startResize(touch.clientX, touch.clientY);
    }
  };

  // --- Global Listeners --- //
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDraggingState && touchIdentifier.current === null) {
      handleDrag(event.clientX, event.clientY);
    } else if (isResizing) {
      handleResize(event.clientX, event.clientY);
    }
  }, [isDraggingState, isResizing, handleDrag, handleResize]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      if (isDraggingState && touchIdentifier.current === null) {
        endDrag();
      } else if (isResizing) {
        endResize();
      }
    }
  }, [isDraggingState, isResizing, endDrag, endResize]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDraggingState && touchIdentifier.current !== null) {
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
    } else if (isResizing) {
      // Assume single touch for resize
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (touch) handleResize(touch.clientX, touch.clientY);
      }
    }
  }, [isDraggingState, isResizing, handleDrag, handleResize]);

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
      } else if (isResizing) {
          endResize();
      }
  }, [isResizing, endDrag, endResize]);

  // (useEffect for adding/removing global listeners)
  useEffect(() => {
    const isActive = isDraggingState || isResizing;
    if (isActive) {
      console.log(`[Card ${cardId}] useEffect adding global listeners (drag: ${isDraggingState}, resize: ${isResizing})`);
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
  }, [isDraggingState, isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
  const dynamicStyles = useMemo((): React.CSSProperties => ({
    left: cardData.position.x,
    top: cardData.position.y,
    width: currentSize.width,
    height: currentSize.height,
    zIndex: (isDraggingState || isResizing) ? 1000 : 1,
    opacity: isDraggingState ? 0.8 : 1,
    position: 'absolute', 
  }), [
    cardData.position.x,
    cardData.position.y,
    currentSize.width,
    currentSize.height,
    isDraggingState,
    isResizing,
  ]);

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
      onMouseDown={handleCardMouseDown}
      onTouchStart={handleCardTouchStart}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent
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
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              textAlign: 'center', // Center text within Typography
              overflowY: 'auto', // Allow scrolling if text overflows card size
              maxHeight: '100%' // Ensure Typography doesn't exceed CardContent height
            }}
          >
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

      {/* Resize Handle */}
      <Box
        data-resize-handle="true"
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
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
    </MuiCard>
  );
}

export default Card; 