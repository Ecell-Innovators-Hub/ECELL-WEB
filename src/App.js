// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav"; // Import your Navigator
import Home from "./screens/Home"; // Your Home component
import Events from "./screens/Events"; // Your Events component

const App = () => {
  return (
    <Router>
      <Nav /> {/* Add the Navigator component here */}
      <div style={{ paddingTop: "60px" }}> {/* Padding to prevent content overlap with fixed header */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
        </Routes> {/* Corrected closing tag */}
      </div>
    </Router>
  );
};

export default App;
