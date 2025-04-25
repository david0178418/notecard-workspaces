import React, { useCallback } from 'react';
import { AppBar, Toolbar as MuiToolbar, Button, Typography, Box, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Moon icon
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Sun icon
import { useSetAtom, useAtomValue } from 'jotai';
import {
  addCardAtom,
  createWorkspaceAtom,
  themeModeAtom, // Import theme state
  toggleThemeModeAtom, // Import toggle action
} from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';

// Placeholder for Toolbar component
function Toolbar() {
  const addCard = useSetAtom(addCardAtom);
  const createWorkspace = useSetAtom(createWorkspaceAtom);
  const toggleThemeMode = useSetAtom(toggleThemeModeAtom);
  const currentMode = useAtomValue(themeModeAtom);

  const handleNewCard = useCallback(() => {
    // Only pass the text, position is calculated by the atom
    addCard({ text: '' });
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
        <IconButton sx={{ ml: 1 }} onClick={toggleThemeMode} color="inherit">
          {currentMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
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