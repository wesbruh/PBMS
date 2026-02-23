import React from "react";
// Import from the pages directory based on your current setup
import SessionPage from "../../pages/inquiry.jsx"; 

export default function SessionRoute() {
  // Hardcoded dummy data for UI testing purposes
  const dummyUser = { id: "test-user-123", name: "Test Customer" };
  const dummyClient = { id: "admin-client-456", name: "Bailey White" };

  // In the future, this is where you'll conditionally return loading states 
  // or errors if the auth check fails. For now, it just renders the page.

  return (
    <div className="session-route-wrapper">
      {/* Passing down the dummy user and client to satisfy the props 
        expected by your SessionPage component.
      */}
      <SessionPage user={dummyUser} client={dummyClient} />
    </div>
  );
}