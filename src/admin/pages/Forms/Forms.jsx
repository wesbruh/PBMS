import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";

import { Outlet } from "react-router-dom";

function Forms() {
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex min-w-50 overflow-y-auto">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner bg-[#fcfcfc] rounded-lg overflow-hidden">
        <Frame>
          <div className="w-screen flex flex-col p-4">
            <Outlet />
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Forms;