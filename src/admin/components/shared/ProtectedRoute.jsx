// src/admin/components/shared/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

async function GetId(roleName) {
  const { data, error } = await supabase.from("Role").select("id").eq("name", `${roleName}`);

  if (error) {
    console.error(`Error retrieving or finding role "${roleName}"`);
    return null;
  }

  const roleId =  data[0]?.id;

  return roleId;
}

export default function ProtectedRoute({ children }) {
  const { user, roleId, loading } = useAuth();
  const location = useLocation();

  const [adminRoleId, setAdminId] = useState(null);

  useEffect(() => {
    const loadAdminRole = async () => {
      const id = await GetId("Admin");
      setAdminId(id);
    };

    loadAdminRole();
  }, []);

  // while we're checking Supabase, don't flash
  if (loading || !adminRoleId) {
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

  if (roleId !== adminRoleId) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return children;
}