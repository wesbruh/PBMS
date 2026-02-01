import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";

function Admin() {
  return (
    <div className='flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg'>
      <div className='flex w-1/3'>
        <Sidebar />
      </div>
      <div className='flex w-2/3'>
        <Frame />
      </div>
    </div>
  );
}

export default Admin