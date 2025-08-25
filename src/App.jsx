//import { useState } from 'react'
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./components/Home"
import Bands from "./components/Bands"
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
 

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bands" element={<Bands />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App    
