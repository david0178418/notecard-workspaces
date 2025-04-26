import { useCallback, useRef, useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Divider, Button, Typography,
} from '@mui/material';
import { useAtomValue, useSetAtom, useAtom } from 'jotai';
import { usePushToastMsg } from '../state/atoms';
import {
  currentCardsAtom,
  currentWorkspaceIdAtom,
  createWorkspaceAtom,
  centerOnPointAtom,
  sidebarOpenAtom,
  appStateAtom,
} from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { MIN_CARD_WIDTH, MIN_CARD_HEIGHT } from './Card';
import type { WorkspaceData } from '../types';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';

function SidebarContent() {
  const cards = useAtomValue(currentCardsAtom);
  const createWorkspace = useSetAtom(createWorkspaceAtom);
  const centerOnPoint = useSetAtom(centerOnPointAtom);
  const setIsSidebarOpen = useSetAtom(sidebarOpenAtom);
  const [appState] = useAtom(appStateAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const pushToastMsg = usePushToastMsg();
  const currentWorkspaceName = currentWorkspaceId ? appState.workspaces[currentWorkspaceId]?.name : '-';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Export Dialog visibility
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // State for Import Dialog visibility and data
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedWorkspaces, setImportedWorkspaces] = useState<Record<string, WorkspaceData>>({});

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

    centerOnPoint({ x: cardCenterX, y: cardCenterY });

    setIsSidebarOpen(false);

  }, [cards, centerOnPoint, setIsSidebarOpen]);

  // --- Export Logic ---
  const handleExportClick = useCallback(() => {
    setIsExportDialogOpen(true); // Just open the dialog
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  // --- Import Logic ---
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const parsedData = JSON.parse(jsonString);

        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          const validWorkspaces: Record<string, WorkspaceData> = {};
          let hasValidWorkspace = false;
          for (const id in parsedData) {
            const ws = parsedData[id];
             // Check structure (can be improved with more robust validation)
            if (ws && typeof ws === 'object' && 'name' in ws && 'cards' in ws && 'viewState' in ws) {
              validWorkspaces[id] = ws as WorkspaceData;
              hasValidWorkspace = true;
            } else {
              console.warn(`Skipping invalid workspace data with id: ${id}`);
            }
          }

          if (!hasValidWorkspace) {
            throw new Error('No valid workspace data found in the file.');
          }

          setImportedWorkspaces(validWorkspaces);
          setIsImportDialogOpen(true); // Open import selection dialog
        } else {
          throw new Error('Invalid file format. Expected JSON object of workspaces.');
        }
      } catch (error) {
        console.error('Failed to parse or validate import file:', error);
        pushToastMsg(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = (_error) => {
      console.error('Failed to read file:', reader.error);
      pushToastMsg(`Failed to read file: ${reader.error}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, [pushToastMsg]); // Removed setAppState, handled in ImportDialog

  const handleCloseImportDialog = useCallback(() => {
    setIsImportDialogOpen(false);
    setImportedWorkspaces({}); // Clear data when closing
  }, []);

  const cardList = Object.values(cards);
  const existingWorkspaceIds = Object.keys(appState.workspaces);

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
                  primary={(card.text || 'New Card').substring(0, 50) + ((card.text || 'New Card').length > 50 ? '...' : '')}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 2, pt: 0 }}>
        <Button onClick={handleImportClick} size="small">
          Import Workspaces
        </Button>
        <Button onClick={handleExportClick} size="small">
          Export Workspaces
        </Button>
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Export Dialog Component */}
      <ExportDialog
        open={isExportDialogOpen}
        onClose={handleCloseExportDialog}
        workspaces={appState.workspaces}
      />

      {/* Import Dialog Component */}
      <ImportDialog
        open={isImportDialogOpen}
        onClose={handleCloseImportDialog}
        workspacesToImport={importedWorkspaces}
        existingWorkspaceIds={existingWorkspaceIds}
      />
    </Box>
  );
}

export default SidebarContent; 