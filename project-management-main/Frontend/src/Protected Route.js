import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const authToken = localStorage.getItem('authToken');
  const sessionExpiryTime = parseInt(localStorage.getItem('sessionExpiryTime'), 10);

  useEffect(() => {
    const checkSession = () => {
      const currentTime = Date.now();
      if (sessionExpiryTime && currentTime > sessionExpiryTime) {
        // Clear session and redirect
        localStorage.clear();
        localStorage.setItem('sessionExpiredMessage', 'Your session has expired. Please log in again.');
        window.location.href = '/login'; // Immediate redirect
      }
    };

    // Initial check and interval
    checkSession();
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [sessionExpiryTime]);

  return authToken ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
