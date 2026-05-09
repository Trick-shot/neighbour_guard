import {CssBaseline, ThemeProvider} from "@mui/material";
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from "react-router";
import {theme} from "./theme.ts"

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider theme={theme} defaultMode='light'>
            <CssBaseline/>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>,
)
