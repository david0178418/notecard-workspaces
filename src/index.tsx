import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming App.tsx will be created later
import './index.css'; // Assuming global styles might be added later

// Material UI Setup
import { CssBaseline } from '@mui/material';
// If using ThemeProvider, import and wrap App here
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// const theme = createTheme({ /* custom theme options */ });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to!");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <CssBaseline />
    {/* <ThemeProvider theme={theme}> */}
      <App />
    {/* </ThemeProvider> */}
  </React.StrictMode>
);
