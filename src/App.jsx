// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Bands from "./components/Bands";
import Bracelets from "./components/bracelets";
import JewelryDetails from "./components/jewelry-details-page/JewelryDetails";
import { AuthProvider } from "./auth.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bands" element={<Bands />} />
          <Route path="/bracelets" element={<Bracelets />} />
          <Route path="/details/jewelry/:sku" element={<JewelryDetails />} />
          <Route path="/details/jewelry/:sku/:productid" element={<JewelryDetails />} />
          <Route path="/details" element={<JewelryDetails />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
