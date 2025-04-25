import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { AppBar, Toolbar as MuiToolbar, Button, Typography, Box } from '@mui/material';
import { useSetAtom } from 'jotai';
import { addCardAtom, createWorkspaceAtom } from '../state/atoms';
import WorkspaceSwitcher from './WorkspaceSwitcher';
// Placeholder for Toolbar component
function Toolbar() {
    const addCard = useSetAtom(addCardAtom);
    const createWorkspace = useSetAtom(createWorkspaceAtom);
    const handleNewCard = useCallback(() => {
        // TODO: Calculate better default position based on current view?
        addCard({ text: 'New Card', position: { x: 100, y: 100 } });
    }, [addCard]);
    const handleNewWorkspace = useCallback(() => {
        // TODO: Prompt user for workspace name?
        const name = prompt('Enter new workspace name:', 'New Workspace');
        if (name) {
            createWorkspace(name);
        }
    }, [createWorkspace]);
    return (_jsx(AppBar, { position: "static", children: _jsxs(MuiToolbar, { variant: "dense", children: [_jsx(Typography, { variant: "h6", component: "div", sx: { mr: 2 }, children: "Note Cards" }), _jsx(WorkspaceSwitcher, {}), _jsx(Box, { sx: { flexGrow: 1 } }), _jsx(Button, { color: "inherit", onClick: handleNewCard, children: "New Card" }), _jsx(Button, { color: "inherit", onClick: handleNewWorkspace, children: "New Workspace" })] }) }));
}
export default Toolbar;
