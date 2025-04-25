import React, { useCallback } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Divider, Button, Typography } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentCardsAtom,
  workspacesAtom,
  currentWorkspaceIdAtom,
  createWorkspaceAtom,
  centerOnPointAtom,
  sidebarOpenAtom,
} from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { MIN_CARD_WIDTH, MIN_CARD_HEIGHT } from './Card';

function SidebarContent() {
  const cards = useAtomValue(currentCardsAtom);
  const createWorkspace = useSetAtom(createWorkspaceAtom);
  const centerOnPoint = useSetAtom(centerOnPointAtom);
  const setIsSidebarOpen = useSetAtom(sidebarOpenAtom);
  const workspacesRecord = useAtomValue(workspacesAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const currentWorkspaceName = currentWorkspaceId ? workspacesRecord[currentWorkspaceId]?.name : '-';

  const handleNewWorkspace = useCallback(() => {
    const name = prompt('Enter new workspace name:', 'New Workspace');
    if (name) {
      createWorkspace(name);
    }
  }, [createWorkspace]);

  const handleCardClick = useCallback((cardId: string) => {
    const card = cards[cardId];
    if (!card) return;

    const cardWidth = card.size?.width ?? MIN_CARD_WIDTH;
    const cardHeight = card.size?.height ?? MIN_CARD_HEIGHT;

    const cardCenterX = card.position.x + cardWidth / 2;
    const cardCenterY = card.position.y + cardHeight / 2;

    console.log(`[Sidebar] Centering on card ${cardId} at`, { x: cardCenterX, y: cardCenterY });
    centerOnPoint({ x: cardCenterX, y: cardCenterY });

    setIsSidebarOpen(false);

  }, [cards, centerOnPoint, setIsSidebarOpen]);

  const cardList = Object.values(cards);

  return (
    <Box sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cards in "{currentWorkspaceName}"
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {cardList.length > 0 ? (
          cardList.map((card) => (
            <ListItem key={card.id} disablePadding>
              <ListItemButton onClick={() => handleCardClick(card.id)}>
                <ListItemText
                  primary={card.text.substring(0, 50) + (card.text.length > 50 ? '...' : 'New Card')}
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No cards yet" />
          </ListItem>
        )}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <WorkspaceSwitcher />
      </Box>
      <Button onClick={handleNewWorkspace} sx={{ m: 2, mt: 0 }}>
        New Workspace
      </Button>
    </Box>
  );
}

export default SidebarContent; 