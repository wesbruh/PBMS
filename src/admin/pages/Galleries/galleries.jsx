import Sidebar from "../../components/Sidebar/sidebar";
import Frame from "../../components/Frame/frame";
import { supabase } from "../../../lib/supabaseClient";
import { useState, useEffect } from "react";

function Admin() {
  const [users, setUsers] = useState([]);

  // Load users on page load
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

  // Handle notification sending
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

    // Insert notification into custom table
    const { error } = await supabase.from("user_notifications").insert({
      user_id: selectedUser.id,
      message: "Admin sent you a notification.",
    });

    if (error) {
      console.error(error);
      alert("❌ Failed to save notification.");
    } else {
      alert("✅ Notification saved!");
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