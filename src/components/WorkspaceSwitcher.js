import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { workspacesAtom, currentWorkspaceIdAtom, switchWorkspaceAtom } from '../state/atoms';
// Placeholder for WorkspaceSwitcher component
function WorkspaceSwitcher() {
    const workspacesRecord = useAtomValue(workspacesAtom);
    const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
    const switchWorkspace = useSetAtom(switchWorkspaceAtom);
    // Convert record to array for mapping
    const workspacesList = Object.values(workspacesRecord);
    const handleChange = useCallback((event) => {
        const newId = event.target.value;
        if (newId) {
            switchWorkspace(newId);
        }
    }, [switchWorkspace]);
    // Render null or some placeholder if no workspaces exist (shouldn't happen with default)
    if (workspacesList.length === 0) {
        return null;
    }
    return (_jsxs(Box, { sx: { minWidth: 180, mr: 2 }, children: [" ", _jsxs(FormControl, { fullWidth: true, size: "small", children: [_jsx(InputLabel, { id: "workspace-select-label", children: "Workspace" }), _jsx(Select, { labelId: "workspace-select-label", id: "workspace-select", value: currentWorkspaceId ?? '', label: "Workspace", onChange: handleChange, children: workspacesList.map((ws) => (_jsx(MenuItem, { value: ws.id, children: ws.name }, ws.id))) })] })] }));
}
export default WorkspaceSwitcher;
