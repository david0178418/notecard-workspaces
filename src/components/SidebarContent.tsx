import { useCallback, useRef, useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Divider, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel
} from '@mui/material';
import { useAtomValue, useSetAtom, useAtom } from 'jotai';
import { useSnackbar } from 'notistack';
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

function SidebarContent() {
  const cards = useAtomValue(currentCardsAtom);
  const createWorkspace = useSetAtom(createWorkspaceAtom);
  const centerOnPoint = useSetAtom(centerOnPointAtom);
  const setIsSidebarOpen = useSetAtom(sidebarOpenAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const [appState, setAppState] = useAtom(appStateAtom);
  const currentWorkspaceName = currentWorkspaceId ? appState.workspaces[currentWorkspaceId]?.name : '-';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  // State for Export Dialog
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportSelection, setExportSelection] = useState<Record<string, boolean>>({});

  // State for Import Dialog
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importedWorkspaces, setImportedWorkspaces] = useState<Record<string, WorkspaceData>>({});
  const [importSelection, setImportSelection] = useState<Record<string, boolean>>({});

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
    // Initialize selection state based on current workspaces
    const initialSelection: Record<string, boolean> = {};
    Object.keys(appState.workspaces).forEach(id => {
      initialSelection[id] = true; // Default to selecting all
    });
    setExportSelection(initialSelection);
    setIsExportDialogOpen(true); // Open the export dialog
  }, [appState.workspaces]);

  const handleExportSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setExportSelection(prev => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  }, []);

  const handleConfirmExport = useCallback(() => {
    const workspacesToExport: Record<string, WorkspaceData> = {};
    Object.keys(exportSelection).forEach(id => {
      if (exportSelection[id] && appState.workspaces[id]) {
        workspacesToExport[id] = appState.workspaces[id];
      }
    });

    if (Object.keys(workspacesToExport).length === 0) {
      enqueueSnackbar("Please select at least one workspace to export.", { variant: 'warning' });
      return;
    }

    const jsonString = JSON.stringify(workspacesToExport, null, 2); // Only export selected workspaces
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `notecards_workspaces_${dateStamp}.json`; // Changed filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('Export initiated for selected workspaces');
    setIsExportDialogOpen(false); // Close dialog
  }, [appState.workspaces, exportSelection]);

  const handleCancelExport = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  // --- Import Logic ---

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click(); // Trigger file input
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const parsedData = JSON.parse(jsonString);

        // Basic validation: Check if it's an object (likely a record of workspaces)
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          // TODO: Add more robust validation for each workspace structure
          const validWorkspaces: Record<string, WorkspaceData> = {};
          const initialSelection: Record<string, boolean> = {};
          let hasValidWorkspace = false;

          for (const id in parsedData) {
              // Rudimentary check for WorkspaceData structure
              if (parsedData[id] && typeof parsedData[id] === 'object' && 'name' in parsedData[id] && 'cards' in parsedData[id] && 'viewState' in parsedData[id]) {
                validWorkspaces[id] = parsedData[id] as WorkspaceData;
                initialSelection[id] = true; // Default select valid ones
                hasValidWorkspace = true;
              } else {
                  console.warn(`Skipping invalid workspace data with id: ${id}`);
              }
          }

          if (!hasValidWorkspace) {
              throw new Error('No valid workspace data found in the file.');
          }

          setImportedWorkspaces(validWorkspaces);
          setImportSelection(initialSelection);
          setIsImportDialogOpen(true); // Open import selection dialog

        } else {
          throw new Error('Invalid file format. Expected a JSON object containing workspace data.');
        }
      } catch (error) {
        console.error('Failed to parse or validate import file:', error);
        enqueueSnackbar(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`, { variant: 'error' });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = (_error) => {
      console.error('Failed to read file:', reader.error);
      enqueueSnackbar(`Failed to read file: ${reader.error}`, { variant: 'error' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, [setAppState]); // Keep setAppState dependency for the final import step

  const handleImportSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setImportSelection(prev => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  }, []);

  const handleConfirmImport = useCallback(() => {
    const workspacesToImport: Record<string, WorkspaceData> = {};
    Object.keys(importSelection).forEach(id => {
      if (importSelection[id] && importedWorkspaces[id]) {
        workspacesToImport[id] = importedWorkspaces[id];
      }
    });

     if (Object.keys(workspacesToImport).length === 0) {
      enqueueSnackbar("Please select at least one workspace to import.", { variant: 'warning' });
      return;
    }

    // Merge selected workspaces into the existing state
    setAppState(prev => {
        const newWorkspaces = { ...prev.workspaces };
        let conflicts = false;
        for (const id in workspacesToImport) {
            const importedWs = workspacesToImport[id];
            // Ensure importedWs is not undefined before proceeding (shouldn't happen based on previous logic, but good for type safety)
            if (!importedWs) continue;

            const existingWs = newWorkspaces[id];
            if (existingWs) {
                // Simple conflict handling: Overwrite existing workspace with the same ID
                console.warn(`Workspace ID conflict: Overwriting existing workspace "${existingWs.name}" with imported workspace "${importedWs.name}" (ID: ${id})`);
                conflicts = true;
            }
            newWorkspaces[id] = importedWs; // Now TS knows importedWs is WorkspaceData
        }
        // Note: currentWorkspaceId is NOT updated here. The user stays in their current workspace.
        if (conflicts) {
            enqueueSnackbar("Some imported workspaces had conflicting IDs with existing ones. Existing workspaces with the same IDs have been overwritten.", { variant: 'warning' });
        } else {
            enqueueSnackbar("Selected workspaces imported successfully!", { variant: 'success' });
        }
        return {
            ...prev,
            workspaces: newWorkspaces,
        };
    });


    console.log('Import confirmed for selected workspaces');
    setIsImportDialogOpen(false); // Close dialog
    setImportedWorkspaces({}); // Clear imported data
    setImportSelection({}); // Clear selection
  }, [importedWorkspaces, importSelection, setAppState, enqueueSnackbar]); // Added enqueueSnackbar dependency

  const handleCancelImport = useCallback(() => {
    setIsImportDialogOpen(false);
    setImportedWorkspaces({});
    setImportSelection({});
  }, []);

  const cardList = Object.values(cards);

  const currentWorkspaceList = Object.values(appState.workspaces);
  const importedWorkspaceList = Object.values(importedWorkspaces);

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

      {/* Export Selection Dialog */}
      <Dialog open={isExportDialogOpen} onClose={handleCancelExport}>
        <DialogTitle>Select Workspaces to Export</DialogTitle>
        <DialogContent>
          <List>
            {currentWorkspaceList.map((ws) => (
              <ListItem key={ws.id} disablePadding>
                 <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!exportSelection[ws.id]}
                        onChange={handleExportSelectionChange}
                        name={ws.id}
                      />
                    }
                    label={ws.name}
                  />
              </ListItem>
            ))}
          </List>
           {currentWorkspaceList.length === 0 && <Typography>No workspaces to export.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelExport}>Cancel</Button>
          <Button onClick={handleConfirmExport} disabled={currentWorkspaceList.length === 0 || !Object.values(exportSelection).some(v => v)}>Export Selected</Button>
        </DialogActions>
      </Dialog>

      {/* Import Selection Dialog */}
      <Dialog open={isImportDialogOpen} onClose={handleCancelImport}>
        <DialogTitle>Select Workspaces to Import</DialogTitle>
        <DialogContent>
          <List>
             {importedWorkspaceList.map((ws) => {
                const existingWs = appState.workspaces[ws.id]; // Check if workspace exists
                return (
                  <ListItem key={ws.id} disablePadding>
                    <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!importSelection[ws.id]}
                            onChange={handleImportSelectionChange}
                            name={ws.id}
                          />
                        }
                        label={`${ws.name}${existingWs ? ' (Overwrite Existing)' : ''}`} // Use existingWs check
                      />
                  </ListItem>
                );
            })}
          </List>
          {importedWorkspaceList.length === 0 && <Typography>No valid workspaces found in the file.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport}>Cancel</Button>
          <Button onClick={handleConfirmImport} disabled={importedWorkspaceList.length === 0 || !Object.values(importSelection).some(v => v)}>Import Selected</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default SidebarContent; 