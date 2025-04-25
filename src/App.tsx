import React from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { currentWorkspaceIdAtom } from './state/atoms';
import Toolbar from './components/Toolbar';
import Workspace from './components/Workspace';
// Import WorkspaceSwitcher if it's not part of the Toolbar

function App() {
  // Get current workspace ID from Jotai
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar />
      <Box sx={{ flexGrow: 1, position: 'relative' /* For positioning Workspace content */ }}>
        {/* Render workspace only if an ID is set */}
        {currentWorkspaceId ? (
          <Workspace />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            Create or select a workspace to begin.
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App; 