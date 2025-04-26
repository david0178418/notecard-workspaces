import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, Button, List, ListItem, Typography
} from '@mui/material';
import { useSetAtom } from 'jotai';
import { appStateAtom, usePushToastMsg } from '../state/atoms';
import type { WorkspaceData } from '../types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  workspacesToImport: Record<string, WorkspaceData>;
  existingWorkspaceIds: string[];
}

function ImportDialog({ open, onClose, workspacesToImport, existingWorkspaceIds }: ImportDialogProps) {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const setAppState = useSetAtom(appStateAtom);
  const pushToastMsg = usePushToastMsg();
  const workspaceList = Object.values(workspacesToImport);

  // Initialize selection when dialog opens or imported data changes
  useEffect(() => {
    if (open) {
      const initialSelection: Record<string, boolean> = {};
      workspaceList.forEach(ws => {
        initialSelection[ws.id] = true; // Default select all
      });
      setSelection(initialSelection);
    }
  }, [open, workspaceList]);

  const handleSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSelection(prev => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  }, []);

  const handleConfirmImport = useCallback(() => {
    const selectedWorkspaces: Record<string, WorkspaceData> = {};
    Object.keys(selection).forEach(id => {
      if (selection[id] && workspacesToImport[id]) {
        selectedWorkspaces[id] = workspacesToImport[id];
      }
    });

    if (Object.keys(selectedWorkspaces).length === 0) {
      pushToastMsg("Please select at least one workspace to import.");
      return;
    }

    // Merge selected workspaces into the existing state
    setAppState(prev => {
        const newWorkspaces = { ...prev.workspaces };
        let conflicts = false;
        for (const id in selectedWorkspaces) {
            const importedWs = selectedWorkspaces[id];
            if (!importedWs) continue; // Should not happen

            if (newWorkspaces[id]) {
                console.warn(`Workspace ID conflict: Overwriting existing workspace "${newWorkspaces[id].name}" with imported workspace "${importedWs.name}" (ID: ${id})`);
                conflicts = true;
            }
            newWorkspaces[id] = importedWs;
        }

        if (conflicts) {
            pushToastMsg("Some imported workspaces had conflicting IDs with existing ones. Existing workspaces with the same IDs have been overwritten.");
        } else {
            pushToastMsg("Selected workspaces imported successfully!");
        }
        return {
            ...prev,
            workspaces: newWorkspaces,
        };
    });

    console.log('Import confirmed for selected workspaces');
    onClose(); // Close dialog via callback
  }, [workspacesToImport, selection, setAppState, pushToastMsg, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Workspaces to Import</DialogTitle>
      <DialogContent>
        <List>
          {workspaceList.map((ws) => {
            const exists = existingWorkspaceIds.includes(ws.id);
            return (
              <ListItem key={ws.id} disablePadding>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!selection[ws.id]}
                      onChange={handleSelectionChange}
                      name={ws.id}
                    />
                  }
                  label={`${ws.name}${exists ? ' (Overwrite Existing)' : ''}`}
                />
              </ListItem>
            );
          })}
        </List>
        {workspaceList.length === 0 && <Typography>No valid workspaces found in the file.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmImport} disabled={workspaceList.length === 0 || !Object.values(selection).some(v => v)}>Import Selected</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportDialog; 