import { useCallback } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { workspacesAtom, currentWorkspaceIdAtom, switchWorkspaceAtom } from '../state/atoms';

// Placeholder for WorkspaceSwitcher component
function WorkspaceSwitcher() {
  const workspacesRecord = useAtomValue(workspacesAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const switchWorkspace = useSetAtom(switchWorkspaceAtom);

  // Convert record to array for mapping
  const workspacesList = Object.values(workspacesRecord);

  const handleChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const newId = event.target.value;
      if (newId) {
        switchWorkspace(newId);
      }
    },
    [switchWorkspace]
  );

  // Render null or some placeholder if no workspaces exist (shouldn't happen with default)
  if (workspacesList.length === 0) {
    return null;
  }

  return (
    <Box sx={{ minWidth: 180, mr: 2 }}> {/* Increased minWidth */}
      <FormControl fullWidth size="small">
        <InputLabel id="workspace-select-label">Workspace</InputLabel>
        <Select
          labelId="workspace-select-label"
          id="workspace-select"
          value={currentWorkspaceId ?? ''} // Handle potential null ID
          label="Workspace"
          onChange={handleChange}
        >
          {workspacesList.map((ws) => (
            <MenuItem key={ws.id} value={ws.id}>
              {ws.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

export default WorkspaceSwitcher; 