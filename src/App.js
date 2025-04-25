import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { currentWorkspaceIdAtom } from './state/atoms';
import Toolbar from './components/Toolbar';
import Workspace from './components/Workspace';
// Import WorkspaceSwitcher if it's not part of the Toolbar
function App() {
    // Get current workspace ID from Jotai
    const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
    return (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }, children: [_jsx(Toolbar, {}), _jsx(Box, { sx: { flexGrow: 1, position: 'relative' /* For positioning Workspace content */ }, children: currentWorkspaceId ? (_jsx(Workspace, {})) : (_jsx(Box, { sx: { p: 3, textAlign: 'center' }, children: "Create or select a workspace to begin." })) })] }));
}
export default App;
