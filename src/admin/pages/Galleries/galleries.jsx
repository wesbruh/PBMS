import Sidebar from "../../components/Sidebar/sidebar";
import Frame from "../../components/Frame/frame";
import { supabase } from "../../../lib/supabaseClient";

const { data, error } = await supabase.from("User")
  .select("id, email, first_name, last_name, phone");

function Admin() {
  return (
    <div className='flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg'>
      <div className='flex w-1/3'>
        <Sidebar />
      </div>
      <div className='flex w-2/3'>
        <Frame />
        <div className='relative flex flex-col m-10 gap-2'>
          {/* TEMPORARY: USE TO SEND PRACTICE NOTIFICATIONS TO USER BASED ON EMAIL/ID */}
          <h2 className="font-bold text-brown  text-2xl">Send Notification</h2>
          {(data.length === 0) ?
            <p>No users detected.</p> :
            <form className="flex flex-col font-normal">
              <label claassName="text-lg" for="user">Select a user:</label>

              <div className="flex flex-row gap-4">
                <select
                  name="userDropdown"
                  id="userDropdown">
                  {/* submit user email as value / show user full name -- change to id or other values as needed */}
                  <option value={"OPTION_SELECT"} disabled>Choose an option</option>
                  {data.map((user) => (<option value={user.email}>{user.first_name} {user.last_name}</option>))}
                </select>
                <button className="px-2 border rounded-xl cursor-pointer hover:bg-neutral-200" type="submit">Submit</button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  );
}

export default Admin