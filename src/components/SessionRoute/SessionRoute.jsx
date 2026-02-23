import React from "react";
import SessionPage from "../../pages/inquiry";

export default function SessionRoute() {
  // In the future, this component will handle the logic of 
  // checking your "Availability" table and "User" auth.
  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <SessionPage />
    </div>
  );
}