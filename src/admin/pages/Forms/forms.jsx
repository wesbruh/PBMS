import Sidebar from "../../components/shared/Sidebar/sidebar";
import { Outlet } from "react-router-dom";

function Forms() {
  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/3">
        <Sidebar />
      </div>
      <div className="flex w-2/3 p-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default Forms;