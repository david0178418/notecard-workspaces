import { createTheme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    // Example customization for dark theme
    background: {
      // Slightly lighter dark background for workspace differentiation
      default: grey[900], // Standard dark background
      paper: grey[800], // Surface color for cards etc.
    },
    // text: {
    //   primary: '#ffffff',
    //   secondary: grey[500],
    // },
  },
});

export default darkTheme; 