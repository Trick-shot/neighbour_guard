import {createTheme} from "@mui/material";

export const theme = createTheme({
    typography: {
        fontFamily: `'K2D', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'miama'`,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                },
            },
        },
    },
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536
        }
    },
    shape: {
        borderRadius: "10px",
    },

    palette: {
        mode: "light",
        primary: {
            main: "#00BA76",
            dark: "#008252",
            light: "#D0FAE5"
        },
        secondary: {
            main: "#100E25",

        },
        background: {
            default: '#fff',
            paper: '#fff',
        },
        text: {
            primary: "#000",
            secondary: "#fff",
        },
        grey: {
            "50": "#8F959C",
        }
    },
});