import Sidebar from "../../components/Sidebar/sidebar";
import Frame from "../../components/Frame/frame";
import { supabase } from "../../../lib/supabaseClient";
import { useState, useEffect } from "react";

function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from("User")
        .select("id, email, first_name, last_name");

      if (error) console.error(error);
      else setUsers(data);
    }
    loadUsers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const email = document.getElementById("userDropdown").value;

    if (email === "OPTION_SELECT") {
      alert("Please select a user.");
      return;
    }

    const selectedUser = users.find((u) => u.email === email);

    if (!selectedUser) {
      alert("User not found.");
      return;
    }

    const TEST_USER_EMAIL = "gauravs.shergill@gmail.com"; 

    if (selectedUser.email !== TEST_USER_EMAIL) {
      alert("❌ No gallery found for this user.");
      return;
    }

    // For the test user, skip database and just send email
    const galleryId = "test-gallery-123";

    try {
      const response = await fetch(`http://localhost:5000/api/galleries/${galleryId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: selectedUser.email,
          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
          galleryName: "Wedding Photos 2024"
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Gallery published and email sent!");
        console.log(data.message);
      } else {
        alert(`❌ Failed: ${data.message || 'Unknown error'}`);
        console.error(data);
      }
    } catch (error) {
      console.error('API call failed:', error);
      alert("❌ Could not connect to server. Make sure your backend is running!");
    }
  }

  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/3">
        <Sidebar />
      </div>

      <div className="flex w-2/3">
        <Frame />

        <div className="relative flex flex-col m-10 gap-2">
          <h2 className="font-bold text-brown text-2xl">Send Notification</h2>

          {/* HARDCODED PHOTO PREVIEW */}
          <div className="my-4 p-4 border rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600 mb-2 font-semibold">Sample Gallery Photo:</p>
            <img 
              src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800" 
              alt="Sample wedding photo"
              className="w-full max-w-md h-64 object-cover rounded shadow-md"
            />
            <p className="text-xs text-gray-500 mt-2">Gallery: Wedding Photos 2024</p>
          </div>

          {users.length === 0 ? (
            <p>No users detected.</p>
          ) : (
            <form className="flex flex-col font-normal" onSubmit={handleSubmit}>
              <label className="text-lg">Select a user:</label>

              <div className="flex flex-row gap-4">
                <select name="userDropdown" id="userDropdown" defaultValue="OPTION_SELECT">
                  <option value="OPTION_SELECT" disabled>
                    Choose an option
                  </option>

                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>

                <button
                  className="px-2 border rounded-xl cursor-pointer hover:bg-neutral-200"
                  type="submit"
                >
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;