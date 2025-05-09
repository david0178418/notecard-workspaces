import React from 'react';
import ReactDOM from 'react-dom/client';
import { useAtomValue } from 'jotai';
import App from './App'; // Assuming App.tsx will be created later
import './index.css'; // Assuming global styles might be added later

// Material UI Setup
import { CssBaseline, ThemeProvider } from '@mui/material';
import { themeModeAtom } from './state/atoms'; // Import theme state atom
import lightTheme from './theme/light'; // Import light theme
import darkTheme from './theme/dark'; // Import dark theme

// Custom Toast Component
import Toast from './components/Toast';

// Main component to conditionally apply the theme
function ThemedApp() {
  const mode = useAtomValue(themeModeAtom);
  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstarts an elegant, consistent baseline to build upon. */}
      <CssBaseline />
      <App />
      <Toast />
    </ThemeProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to!");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
