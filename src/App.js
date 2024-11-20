import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./screens/Home";
import Events from "./screens/Events";
import Event from "./screens/Event";
import NewEvent from "./screens/NewEvent";
import RegistrationForm from "./screens/RegistrationForm";
import Registrations from "./screens/Registrations";
import Dashboard from "./screens/Dashboard";
import Login from "./screens/Login";
import Reg from "./screens/Reg";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Manage login state
  const [user, setUser] = useState(null); // Manage user state
  const sessionExpiryTime = 10 * 24 * 60 * 60 * 1000; // 864000000 ms = 10 days

  // Load state from localStorage on initial render
  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedLoginTime = parseInt(localStorage.getItem("loginTime"), 10);

    // Check if session has expired
    if (storedIsLoggedIn && storedUser && storedLoginTime) {
      const currentTime = Date.now();
      const timeElapsed = currentTime - storedLoginTime;

      if (timeElapsed > sessionExpiryTime) {
        // If session has expired, log the user out
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
        localStorage.removeItem("loginTime");
      } else {
        setIsLoggedIn(true);
        setUser(storedUser);
      }
    }
  }, [sessionExpiryTime]);

  // Save state to localStorage whenever it changes (only after successful login)
  useEffect(() => {
    if (isLoggedIn && user) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("loginTime", Date.now().toString()); // Store the current time as login time
    }
  }, [isLoggedIn, user]);

  return (
    <Router>
      <Nav isLoggedIn={isLoggedIn} user={user} /> {/* Pass to Nav */}
      <div style={{ paddingTop: "60px" }}>
        <Routes>
          {/* Public Routes with isLoggedIn and user passed as props */}
          <Route
            path="/"
            element={<Home isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/events"
            element={<Events isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/event"
            element={<Event isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/newevent"
            element={<NewEvent isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/regform"
            element={<RegistrationForm isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/reg"
            element={<Registrations isLoggedIn={isLoggedIn} user={user} />}
          />
          <Route
            path="/reg2"
            element={<Reg isLoggedIn={isLoggedIn} user={user} />}
          />

          {/* Login Route */}
          <Route
            path="/login"
            element={
              <Login
                setIsLoggedIn={setIsLoggedIn}
                setUser={setUser}
                isLoggedIn={isLoggedIn}
                user={user}
              />
            }
          />

          {/* Protected Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <Dashboard isLoggedIn={isLoggedIn} user={user} />
              ) : (
                <Login
                  setIsLoggedIn={setIsLoggedIn}
                  setUser={setUser}
                  isLoggedIn={isLoggedIn}
                  user={user}
                />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
