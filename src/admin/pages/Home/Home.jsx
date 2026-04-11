import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";
import YTDBarChart from "../../components/shared/YTDBarChart/YTDBarChart";
import MetricsGrid from "../../components/shared/MetricsGrid/MetricsGrid";
import SessionCalendar from "../../components/shared/SessionCalendar/SessionCalendar";
import { useAuth } from "../../../context/AuthContext";

// main component
function AdminHome() {
  const { profile } = useAuth();
  const username = profile
    ? `${profile.first_name} ${profile.last_name}`
    : null;

  if (!username) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading your account...
      </div>
    );
  }

  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      {/* Sidebar */}
      <div className="flex w-1/5 min-w-50 h-full overflow-y-auto">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex w-full h-full rounded-lg">
        <Frame>
          <div className="flex flex-col w-full h-full shadow-inner bg-[#fcfcfc]">
            {/* Page header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {username}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Here's what's happening within Your Roots Photography.
              </p>
            </div>

            <MetricsGrid />

            {/* Two-column body */}
            <div className="grid grid-cols-2 gap-4 px-3 md:px-6 flex-1 h-full">
              {/* LEFT COLUMN: YTD Chart*/}
              <div className="h-full" style={{ minWidth: 0 }} >
                <YTDBarChart />
              </div>

              {/* RIGHT COLUMN: Calendar with CONFIRMED SESSIONS*/}
              <div className="h-full pb-1.5" style={{ minWidth: 0 }}>
                <SessionCalendar />
              </div>
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}
export default AdminHome;
