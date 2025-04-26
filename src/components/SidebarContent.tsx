import { useCallback, useRef, useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Divider, Button, Typography,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteForever';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useAtomValue, useSetAtom } from 'jotai';
import { usePushToastMsg } from '../state/atoms';
import {
  currentWorkspaceIdAtom,
  createWorkspaceAtom,
  centerOnPointAtom,
  sidebarOpenAtom,
  appStateAtom,
  deleteCardAtom,
  deleteWorkspaceAtom,
  bringCardToFrontAtom,
  updateCardOrderAtom,
} from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { MIN_CARD_WIDTH, MIN_CARD_HEIGHT } from './Card';
import type { WorkspaceData, CardData } from '../types';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import InputDialog from './InputDialog';
import ConfirmDialog from './ConfirmDialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

function SidebarContent() {
  // 1. State from Atoms
  const createWorkspace = useSetAtom(createWorkspaceAtom);
  const centerOnPoint = useSetAtom(centerOnPointAtom);
  const setIsSidebarOpen = useSetAtom(sidebarOpenAtom);
  const appState = useAtomValue(appStateAtom);
  const deleteCard = useSetAtom(deleteCardAtom);
  const deleteWorkspace = useSetAtom(deleteWorkspaceAtom);
  const bringCardToFront = useSetAtom(bringCardToFrontAtom);
  const updateCardOrder = useSetAtom(updateCardOrderAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const pushToastMsg = usePushToastMsg();

  // 2. Local Component State (Dialogs, Refs, etc.)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedWorkspaces, setImportedWorkspaces] = useState<Record<string, WorkspaceData>>({});
  const [isNewWorkspaceDialogOpen, setIsNewWorkspaceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{ id: string; name: string } | null>(null);

  // 3. Derived State
  const currentWorkspace = currentWorkspaceId ? appState.workspaces[currentWorkspaceId] : null;
  const currentWorkspaceName = currentWorkspace?.name ?? '-';
  // Ensure cardOrder is always an array, even if workspace is loading/null initially
  const cardOrder = currentWorkspace?.cardOrder ?? [];
  const orderedCards = cardOrder.map(id => currentWorkspace?.cards[id]).filter(Boolean) as CardData[];
  const existingWorkspaceIds = Object.keys(appState.workspaces);
  const canDeleteWorkspace = currentWorkspaceId !== null && existingWorkspaceIds.length > 1;

  // 4. Callbacks / Handlers (Defined AFTER state/refs)

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }
    if (destination.droppableId !== 'sidebar-card-list') {
        return;
    }
    const newOrder = Array.from(cardOrder);
    newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, draggableId);
    if (currentWorkspaceId) {
        updateCardOrder({ workspaceId: currentWorkspaceId, newOrder });
    }
  }, [cardOrder, updateCardOrder, currentWorkspaceId]);

  const handleNewWorkspaceClick = useCallback(() => {
    setIsNewWorkspaceDialogOpen(true);
  }, []);

  const handleCreateWorkspaceSubmit = useCallback((name: string) => {
    if (name) createWorkspace(name);
  }, [createWorkspace]);

  const handleCloseNewWorkspaceDialog = useCallback(() => {
    setIsNewWorkspaceDialogOpen(false);
  }, []);

  const handleDeleteWorkspaceClick = useCallback(() => {
    if (!currentWorkspaceId) { pushToastMsg("No workspace selected."); return; }
    const workspaceCount = Object.keys(appState.workspaces).length;
    if (workspaceCount <= 1) { pushToastMsg("Cannot delete the last workspace."); return; }
    const workspaceName = appState.workspaces[currentWorkspaceId]?.name ?? 'this workspace';
    setWorkspaceToDelete({ id: currentWorkspaceId, name: workspaceName });
    setIsDeleteDialogOpen(true);
  }, [currentWorkspaceId, appState.workspaces, pushToastMsg]); // Ensure appState.workspaces is dependency

  const handleConfirmDeleteWorkspace = useCallback(() => {
    if (workspaceToDelete) {
      deleteWorkspace(workspaceToDelete.id);
      pushToastMsg(`Workspace "${workspaceToDelete.name}" deleted.`);
    }
    setWorkspaceToDelete(null);
    // Dialog closes itself via prop
  }, [workspaceToDelete, deleteWorkspace, pushToastMsg]);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setWorkspaceToDelete(null);
  }, []);

  const handleCardClick = useCallback((cardId: string) => {
    const card = currentWorkspace?.cards[cardId]; // Use currentWorkspace
    if (!card) return;
    bringCardToFront(cardId);
    const cardWidth = card.size?.width ?? MIN_CARD_WIDTH;
    const cardHeight = card.size?.height ?? MIN_CARD_HEIGHT;
    const cardCenterX = card.position.x + cardWidth / 2;
    const cardCenterY = card.position.y + cardHeight / 2;
    centerOnPoint({ x: cardCenterX, y: cardCenterY });
    setIsSidebarOpen(false);
  }, [currentWorkspace, centerOnPoint, bringCardToFront, setIsSidebarOpen]); // Added currentWorkspace

  const handleDeleteCard = useCallback((event: React.MouseEvent, cardId: string) => {
    event.stopPropagation();
    deleteCard(cardId);
  }, [deleteCard]);

  const handleExportClick = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

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
            if (ws && typeof ws === 'object' && 'name' in ws && 'cards' in ws && 'viewState' in ws && 'cardOrder' in ws) { // Added cardOrder check
              validWorkspaces[id] = ws as WorkspaceData;
              hasValidWorkspace = true;
            } else {
              console.warn(`Skipping invalid workspace data with id: ${id}`);
            }
          }
          if (!hasValidWorkspace) throw new Error('No valid workspace data found in file.');
          setImportedWorkspaces(validWorkspaces);
          setIsImportDialogOpen(true);
        } else {
          throw new Error('Invalid file format. Expected JSON object of workspaces.');
        }
      } catch (error) {
        console.error('Failed to parse/validate import file:', error);
        pushToastMsg(`Import Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = (_error) => {
      console.error('Failed to read file:', reader.error);
      pushToastMsg(`File Read Error: ${reader.error}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }, [pushToastMsg]);

  const handleCloseImportDialog = useCallback(() => {
    setIsImportDialogOpen(false);
    setImportedWorkspaces({});
  }, []);

  // --- Render --- //
  return (
    <Box sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cards in "{currentWorkspaceName}"
        </Typography>
      </Box>
      <Divider />
      {/* DND List */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sidebar-card-list">
          {(provided) => (
            <List
              sx={{ flexGrow: 1, overflowY: 'auto' }}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {orderedCards.length > 0 ? (
                orderedCards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(providedDraggable, snapshot) => (
                       <ListItem
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          disablePadding
                          secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteCard(e, card.id)} size="small">
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          }
                          sx={{ backgroundColor: snapshot.isDragging ? 'action.hover' : 'transparent' }}
                       >
                         <Box {...providedDraggable.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', mr: 1 }}>
                           <DragIndicatorIcon fontSize="small" />
                         </Box>
                         <ListItemButton onClick={() => handleCardClick(card.id)} sx={{ pl: 0 }}>
                            <ListItemText
                              primary={(card.text || 'New Card').substring(0, 50) + ((card.text || 'New Card').length > 50 ? '...' : '')}
                              sx={{ pr: 1 }}
                            />
                          </ListItemButton>
                       </ListItem>
                    )}
                  </Draggable>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No cards yet" />
                </ListItem>
              )}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>
      <Divider />
      {/* Workspace Controls */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <WorkspaceSwitcher />
        <IconButton
            onClick={handleDeleteWorkspaceClick}
            disabled={!canDeleteWorkspace}
            size="small"
            color="error"
            sx={{ ml: 1 }}
            aria-label="delete current workspace"
            title="Delete Current Workspace"
        >
            <DeleteIcon fontSize="inherit" />
        </IconButton>
      </Box>
      {/* Action Buttons */}
      <Button onClick={handleNewWorkspaceClick} sx={{ m: 2, mt: 0 }}>
        New Workspace
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 2, pt: 0 }}>
        <Button onClick={handleImportClick} size="small" startIcon={<FileUploadIcon />}>
          Import
        </Button>
        <Button onClick={handleExportClick} size="small" startIcon={<FileDownloadIcon />}>
          Export
        </Button>
      </Box>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />
      {/* Dialogs */}
      <ExportDialog
        open={isExportDialogOpen}
        onClose={handleCloseExportDialog}
        workspaces={appState.workspaces}
      />
      <ImportDialog
        open={isImportDialogOpen}
        onClose={handleCloseImportDialog}
        workspacesToImport={importedWorkspaces}
        existingWorkspaceIds={existingWorkspaceIds}
      />
      <InputDialog
        open={isNewWorkspaceDialogOpen}
        onClose={handleCloseNewWorkspaceDialog}
        onSubmit={handleCreateWorkspaceSubmit}
        title="Create New Workspace"
        label="Workspace Name"
        defaultValue="New Workspace"
      />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDeleteWorkspace}
        title="Confirm Delete Workspace"
      >
        Are you sure you want to delete workspace "{workspaceToDelete?.name ?? ''}"?
        This action cannot be undone.
      </ConfirmDialog>
    </Box>
  );
}

export default SidebarContent; 