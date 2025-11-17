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
        .select("id, email, first_name, last_name, phone");

      if (!error) setUsers(data);
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

    try {
      const response = await fetch(
        "https://zccwrooyhkpkslgqdkvq.supabase.co/functions/v1/hyper-worker",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(result);
        alert("❌ Failed to send email.");
        return;
      }

      alert("✅ Email sent!");
    } catch (err) {
      console.error(err);
      alert("❌ Error sending email.");
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
                <select name="userDropdown" id="userDropdown">
                  <option value="OPTION_SELECT" disabled selected>
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