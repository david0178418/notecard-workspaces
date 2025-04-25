import { createTheme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    // Customize the light theme background
    background: {
      default: grey[300], // Very light gray background for workspace
      paper: '#ffffff', // Explicit white for cards/surfaces
    }
    // Other customizations if needed
  },
});

export default lightTheme; 