import {Route, Routes} from "react-router";
import './App.css'
import EmailActivation from "./pages/EmailActivation.tsx";
import Home from "./pages/Home.tsx";

function App() {
    return (
        <Routes>
            <Route path="/" index element={<Home/>}/>
            <Route path="/activate/:uid/:token" element={<EmailActivation/>}/>
        </Routes>
    )
}

export default App
