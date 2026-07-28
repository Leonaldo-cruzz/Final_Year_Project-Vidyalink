import React, { createContext, useContext, useState } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Placeholder authentication state
  const [user, setUser] = useState({
    id: 'user-123',
    fullName: 'Alex Johnson',
    email: 'alex@vidyalink.edu',
    role: 'student',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading] = useState(false);

  // Placeholder login handler (no API connection)
  const login = (userData) => {
    setUser(userData || {
      id: 'user-123',
      fullName: 'Alex Johnson',
      email: 'alex@vidyalink.edu',
      role: 'student',
    });
    setIsAuthenticated(true);
  };

  // Placeholder logout handler
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    setIsAuthenticated, // Exposed for easy dev testing
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
