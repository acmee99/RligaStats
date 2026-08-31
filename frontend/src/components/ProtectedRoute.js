import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAdmin, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="loading">Loading...</div>;
  }
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};

export default ProtectedRoute;
