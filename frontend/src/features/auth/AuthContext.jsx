import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../../services/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      // Fetch user profile from backend
      apiClient
        .get("/users/me")
        .then((response) => {
          setUser(response.data);
        })
        .catch((error) => {
          console.error("Session token validation failed:", error.message);
          // Token expired or invalid, clear localStorage
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (jwtToken, userData) => {
    localStorage.setItem("token", jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
