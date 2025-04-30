import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Typography, TextField, Box, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteForever';
import ResizeIcon from '@mui/icons-material/AspectRatio';
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
import { useTheme } from '@mui/material/styles';
import { useResizable } from '../hooks/useResizable';

// Define minimum card size and EXPORT them
export const MIN_CARD_WIDTH = 150;
export const MIN_CARD_HEIGHT = 80;

// Define default card text
export const DEFAULT_CARD_TEXT = "New Card";

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
  const [scale, setScale] = useState(0); // Initial scale state

  // Ref now points to the main SVG group element
  const cardRef = useRef<SVGGElement>(null);

  // Use Draggable Hook
  const { isDragging, draggableProps } = useDraggable({
    cardId,
    initialPosition: cardData?.position ?? { x: 0, y: 0 },
    cardRef,
    isEnabled: !isEditing,
  });

  // Use Resizable Hook
  const { isResizing, resizableProps } = useResizable({
    cardId,
    initialSize: cardData?.size ?? { width: MIN_CARD_WIDTH, height: MIN_CARD_HEIGHT },
    cardRef,
    isEnabled: !isEditing,
  });

  // Update local edit text if card data changes externally
  useEffect(() => {
    if (cardData && !isEditing) {
      setEditText(cardData.text);
    }
  }, [cardData?.text, isEditing]);

  // Effect to trigger edit mode for the last created card
  useEffect(() => {
    if (lastCreatedCardId === cardId) {
      setIsEditing(true);
      setLastCreatedCardId(null);
    }
  }, [lastCreatedCardId, cardId, setLastCreatedCardId]);

  // --- Text Editing --- //
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
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
      setEditText(cardData?.text ?? '');
      setIsEditing(false);
      event.preventDefault();
    }
  }, [cardData?.text]);

  // --- Deletion --- //
  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    deleteCard(cardId);
  }, [cardId, deleteCard]);

  // Render nothing if cardData isn't available (e.g., deleted)
  if (!cardData) {
    return null;
  }

  // Use default size if not set (should be set by addCardAtom now)
  const currentSize = cardData.size ?? { width: MIN_CARD_WIDTH, height: MIN_CARD_HEIGHT };
  const currentPos = cardData.position ?? { x: 0, y: 0 };

  // --- SVG Specific calculations --- //
  const cardTransform = `translate(${currentPos.x}, ${currentPos.y})`;
  const foreignObjectPadding = 8;
  const deleteButtonSize = 24;
  const resizeHandleSize = 20;
  const resizeHandleOffset = 4; // Small offset from the corner

  // Memoize styles/attributes that depend on theme
  const rectStyle = useMemo(() => ({
    fill: theme.palette.background.paper,
    stroke: theme.palette.divider,
    strokeWidth: 1,
    rx: theme.shape.borderRadius, // Use theme for rounded corners
  }), [theme]);

  // Effect to animate scale-in on mount
  useEffect(() => {
    // Double requestAnimationFrame ensures the initial state (scale 0)
    // has rendered before we trigger the transition to scale 1.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScale(1);
      });
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <g
      ref={cardRef}
      transform={`${cardTransform} scale(${scale})`}
      data-draggable-card="true"
      {...draggableProps}
      onDoubleClick={handleDoubleClick}
      style={{
        cursor: isEditing ? 'default' : 'grab',
        opacity: isDragging ? 0.8 : 1,
        transition: 'transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)', // Example transition
        transformOrigin: `${currentSize.width / 2}px ${currentSize.height / 2}px`,
      }}
    >
      <rect
        x={0}
        y={0}
        width={currentSize.width}
        height={currentSize.height}
        {...rectStyle}
      />

      <foreignObject
        x={foreignObjectPadding}
        y={foreignObjectPadding}
        width={currentSize.width - foreignObjectPadding * 2 - (deleteButtonSize / 2)}
        height={currentSize.height - foreignObjectPadding * 2}
        style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isEditing ? 'transparent' : 'transparent',
            color: 'text.primary',
            fontSize: theme.typography.body2.fontSize,
            fontFamily: theme.typography.body2.fontFamily,
            lineHeight: theme.typography.body2.lineHeight,
          }}
        >
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
              placeholder={DEFAULT_CARD_TEXT}
              InputProps={{ disableUnderline: true }}
              sx={{
                pointerEvents: 'auto',
                '& .MuiInputBase-inputMultiline': {
                  textAlign: 'center',
                  padding: 0,
                  lineHeight: 1.2,
                  color: 'text.primary',
                },
                width: '100%',
              }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
                overflowY: 'auto',
                maxHeight: '100%',
                width: '100%',
                color: 'inherit',
                pointerEvents: 'none',
              }}
            >
              {cardData.text || DEFAULT_CARD_TEXT}
            </Typography>
          )}
        </Box>
      </foreignObject>

      <foreignObject
        x={currentSize.width - deleteButtonSize - 4}
        y={4}
        width={deleteButtonSize}
        height={deleteButtonSize}
      >
        <IconButton
          aria-label="delete card"
          onClick={handleDelete}
          size="small"
          sx={{
            padding: '2px',
            opacity: 0.5,
            color: 'text.secondary',
            '&:hover': {
              opacity: 1,
              color: 'error.main'
            }
          }}
        >
          <DeleteIcon sx={{ fontSize: '18px' }} />
        </IconButton>
      </foreignObject>

      {/* Resize Handle */}
      <g
        {...resizableProps} // Spread the props from the hook (contains onMouseDown)
        style={{ cursor: 'nwse-resize' }}
        transform={`translate(${currentSize.width - resizeHandleSize - resizeHandleOffset}, ${currentSize.height - resizeHandleSize - resizeHandleOffset})`}
      >
        <foreignObject
          width={resizeHandleSize}
          height={resizeHandleSize}
          style={{ pointerEvents: 'auto' }} // Ensure the handle receives mouse events
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              opacity: 0.6,
              '&:hover': { opacity: 1 }
            }}
          >
            <ResizeIcon sx={{ fontSize: '16px' }} />
          </Box>
        </foreignObject>
      </g>

    </g>
  );
}

export default Card; 