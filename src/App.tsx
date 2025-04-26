import React, { useCallback, useEffect } from 'react';
import { Box, Fab, Drawer, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  currentWorkspaceIdAtom,
  sidebarOpenAtom, // Import sidebar state
  toggleThemeModeAtom, // Import theme toggle
  themeModeAtom, // Import theme mode
  addCardAtom, // Import add card action
  currentViewStateAtom, // Import view state
  viewportSizeAtom, // Import viewport size
  isAppStateHydratedAtom, // Import hydration state
  addInitialSampleCardsAtom, // Import the new action atom
} from './state/atoms';
// import Toolbar from './components/Toolbar'; // No longer needed
import Workspace from './components/Workspace';
import SidebarContent from './components/SidebarContent'; // Import sidebar content

function App() {
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(sidebarOpenAtom);
  const toggleTheme = useSetAtom(toggleThemeModeAtom);
  const currentMode = useAtomValue(themeModeAtom);
  const addCard = useSetAtom(addCardAtom);
  const viewState = useAtomValue(currentViewStateAtom); // Get view state
  const viewportSize = useAtomValue(viewportSizeAtom); // Get viewport size
  // Hydration state
  const [isHydrated, setIsHydrated] = useAtom(isAppStateHydratedAtom);
  const addSampleCards = useSetAtom(addInitialSampleCardsAtom); // Get the action setter

  // Effect to mark state as hydrated after initial mount
  useEffect(() => {
    // This effect runs after the first render.
    // We assume atomWithStorage has loaded the initial value from localStorage by this time.
    // This is usually safe for client-side rendering with localStorage.
    setIsHydrated(true);
  }, [setIsHydrated]);

  // Effect to add sample cards after hydration and viewport measurement
  useEffect(() => {
    // Only run if hydrated, a workspace is selected, and viewport is measured
    if (isHydrated && currentWorkspaceId && viewportSize.width > 0) {
      // The atom itself checks if the workspace is empty
      addSampleCards();
    }
    // Run once after hydration + viewport measurement for the initial workspace
  }, [isHydrated, currentWorkspaceId, viewportSize, addSampleCards]);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setIsSidebarOpen(open);
  };

  const handleAddCardClick = useCallback(() => {
    const centerX = (viewportSize.width / 2 - viewState.pan.x) / viewState.zoom;
    const centerY = (viewportSize.height / 2 - viewState.pan.y) / viewState.zoom;

    addCard({ text: '', position: { x: centerX, y: centerY } });
  }, [addCard, viewState, viewportSize]);

  return (
    // Main container for positioning
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={isSidebarOpen} onClose={toggleDrawer(false)}>
        <SidebarContent />
      </Drawer>

      {/* Menu FAB (Top Left) */}
      <Fab
        color="primary"
        aria-label="open drawer"
        onClick={toggleDrawer(true)}
        sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1100 /* Below drawer overlay */ }}
        size="small"
      >
        <MenuIcon />
      </Fab>

      {/* Theme Toggle FAB (Top Right) */}
      <Fab
        color="secondary"
        aria-label="toggle theme"
        onClick={toggleTheme}
        sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1100 }}
        size="small"
      >
        {currentMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </Fab>

      {/* Add Card FAB (Bottom Right) */}
      <Fab
        color="primary"
        aria-label="add card"
        onClick={handleAddCardClick} // Use the new handler
        sx={{ position: 'absolute', bottom: 48, right: 16, zIndex: 1100 }}
        size="medium"
        disabled={!currentWorkspaceId} // Disable if no workspace selected
      >
        <AddIcon />
      </Fab>

      {/* Workspace Area - Conditional Rendering */}
      <Box sx={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {!isHydrated ? (
          // Show loading spinner while waiting for hydration
          <CircularProgress />
        ) : currentWorkspaceId ? (
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