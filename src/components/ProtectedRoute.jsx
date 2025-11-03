// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // while we're checking Supabase, don't flash
  if (loading) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading your account...
      </div>
    );
  }

  if (!user) {
    // save where the user was going so we can redirect back after login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
