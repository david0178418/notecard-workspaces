import React, { useCallback } from 'react';
import { AppBar, Toolbar as MuiToolbar, Button, Typography, Box } from '@mui/material';
import { useSetAtom } from 'jotai';
import { addCardAtom, createWorkspaceAtom } from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';

// Placeholder for Toolbar component
function Toolbar() {
  const addCard = useSetAtom(addCardAtom);
  const createWorkspace = useSetAtom(createWorkspaceAtom);

  const handleNewCard = useCallback(() => {
    // Only pass the text, position is calculated by the atom
    addCard({ text: 'New Card' });
  }, [addCard]);

  const handleNewWorkspace = useCallback(() => {
    // TODO: Prompt user for workspace name?
    const name = prompt('Enter new workspace name:', 'New Workspace');
    if (name) {
      createWorkspace(name);
    }
  }, [createWorkspace]);

  return (
    <AppBar position="static">
      <MuiToolbar variant="dense">
        <Typography variant="h6" component="div" sx={{ mr: 2 }}>
          Note Cards
        </Typography>
        <WorkspaceSwitcher />
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={handleNewCard}>
          New Card
        </Button>
        <Button color="inherit" onClick={handleNewWorkspace}>
          New Workspace
        </Button>
      </MuiToolbar>
    </AppBar>
  );
}

export default Toolbar; 