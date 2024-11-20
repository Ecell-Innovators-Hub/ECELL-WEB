import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, signInWithEmailAndPassword, signOut } from "../firebase";
import "./Login.css";

function Login({ setIsLoggedIn, setUser }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Loading state
  const [isLoggedIn, setLocalIsLoggedIn] = useState(false); // Local state for login status
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUser = localStorage.getItem("user");

    if (loggedIn && storedUser) {
      setLocalIsLoggedIn(true);
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUser));
    }
  }, [setIsLoggedIn, setUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleLogin = async () => {
    const { email, password } = formData;

    if (!email || !password) {
      setError("Email and Password are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true); // Start loading
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update state in App.js
      setIsLoggedIn(true);
      setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      // Save to localStorage
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(user));

      setLocalIsLoggedIn(true);
      navigate("/"); // Redirect to home
    } catch (err) {
      setError("Login failed. Please check your credentials.");
      console.error("Error during login:", err);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        setIsLoggedIn(false);
        setUser(null);

        // Clear localStorage
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");

        setLocalIsLoggedIn(false);
        navigate("/login"); // Redirect to login page
      })
      .catch((err) => {
        setError("Failed to log out. Please try again.");
        console.error("Error during logout:", err);
      });
  };

  return (
    <div className="login-container">
      {isLoggedIn ? (
        <>
          <h1 className="login-heading">Welcome Back!</h1>
          <button className="login-button" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <h1 className="login-heading">Login</h1>

          {error && <p className="error-message">{error}</p>}

          <label htmlFor="email" className="input-label">
            Email
          </label>
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
          />

          <label htmlFor="password" className="input-label">
            Password
          </label>
          <input
            type="password"
            placeholder="Password"
            className="input-field"
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
          />

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading} // Disable button when loading
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="footer-text">
            By logging in, you agree to our <b>Terms & Conditions</b>.
          </p>
        </>
      )}
    </div>
  );
}

export default Login;
