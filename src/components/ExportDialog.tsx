import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, Button, List, ListItem, Typography
} from '@mui/material';
import type { WorkspaceData } from '../types';
import { usePushToastMsg } from '../state/atoms';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  workspaces: Record<string, WorkspaceData>;
}

function ExportDialog({ open, onClose, workspaces }: ExportDialogProps) {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const workspaceList = Object.values(workspaces);
  const pushToastMsg = usePushToastMsg();

  // Initialize selection when dialog opens or workspaces change
  useEffect(() => {
    if (open) {
      const initialSelection: Record<string, boolean> = {};
      workspaceList.forEach(ws => {
        initialSelection[ws.id] = true; // Default select all
      });
      setSelection(initialSelection);
    }
  }, [open, workspaceList]); // Rerun if list changes while open (unlikely but safe)

  const handleSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSelection(prev => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  }, []);

  const handleConfirmExport = useCallback(() => {
    const workspacesToExport: Record<string, WorkspaceData> = {};
    Object.keys(selection).forEach(id => {
      if (selection[id] && workspaces[id]) {
        workspacesToExport[id] = workspaces[id];
      }
    });

    if (Object.keys(workspacesToExport).length === 0) {
      pushToastMsg("Please select at least one workspace to export.");
      return;
    }

    const jsonString = JSON.stringify(workspacesToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `notecards_workspaces_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('Export initiated for selected workspaces');
    onClose(); // Close dialog via callback
  }, [workspaces, selection, onClose, pushToastMsg]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Workspaces to Export</DialogTitle>
      <DialogContent>
        <List>
          {workspaceList.map((ws) => (
            <ListItem key={ws.id} disablePadding>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!selection[ws.id]}
                    onChange={handleSelectionChange}
                    name={ws.id}
                  />
                }
                label={ws.name}
              />
            </ListItem>
          ))}
        </List>
        {workspaceList.length === 0 && <Typography>No workspaces to export.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmExport} disabled={workspaceList.length === 0 || !Object.values(selection).some(v => v)}>Export Selected</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportDialog; 