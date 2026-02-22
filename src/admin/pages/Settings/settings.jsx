import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";


function Admin() {
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>

        </Frame>
      </div>
    </div>
  );
}

export default Admin