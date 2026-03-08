import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";

import { Outlet } from "react-router-dom";

function Forms() {
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="w-1/5 min-w-50 overflow-y-scroll">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="w-screen flex flex-col gap-5 my-10 mx-2 overflow-scroll">
            <Outlet />
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Forms;