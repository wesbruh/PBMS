import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";
import UploadGalleryModal from "./UploadGalleryModal.jsx";
import { Upload, Eye } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";


function AdminGalleries() {
  const [galleries, setGalleries] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch gallery data from Supabase to map to table rows
  const fetchGalleries = async () => {
    setLoading(true);
    setError(null);

    try {
      /**
       * This query returns Sessions plus:
       * - client info from User (first/last/email)
       * - session type info from SessionType (name/label)
       * - associated Gallery if one exists (left join)
       * MAY NEED TO BE ADJUSTED LATER
       */
      const { data, error: fetchError } = await supabase
        .from("Session")
        .select(
          `
          id,
          start_at,
          end_at,
          location_text,
          status,
          User:client_id (
            first_name,
            last_name,
            email
          ),
          SessionType:session_type_id (
            name
          ),
          Gallery (
            id,
            published_at,
            created_at,
            published_email,
            published_link
          )
        `,
        )
        // Pick the statuses that mean “completed/pending”
        .in("status", ["Completed", "Pending"])
        .order("start_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Map Supabase rows to the structure of the table
      const mapped = (data || []).map((s) => {
        const clientFirst = s?.User?.first_name ?? "";
        const clientLast = s?.User?.last_name ?? "";
        const clientName = `${clientFirst} ${clientLast}`.trim() || "Unknown Client";

        const start = s.start_at ? new Date(s.start_at) : null;

        const dateStr = start ? start.toLocaleDateString() : "—";
        const timeStr = start
          ? start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "—";

        // if a Gallery row exisit then consider it to be uploaded already
        const hasGallery = Array.isArray(s.Gallery) ? s.Gallery.length > 0 : !!s.Gallery;
        const galleryRow = Array.isArray(s.Gallery) ? s.Gallery[0] : s.Gallery;

        const uploadDate = galleryRow?.published_at || galleryRow?.created_at || null;

        return {
          id: s.id,
          // table columns
          clientName,
          type: s?.SessionType?.name ?? "—",
          date: dateStr,
          time: timeStr,
          location: s.location_text ?? "—",
          status: hasGallery ? "Gallery Uploaded" : "Awaiting Gallery",
          uploadDate,
        };
      });

      setGalleries(mapped);
    } catch (err) {
      console.error("fetchGalleries function error:", err);
      setError(err.message || "Failed to load galleries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  // handle opening the upload modal
  const handleUploadClick = (sessionRow) => {
    setSelectedSession(sessionRow);
    setIsUploadModalOpen(true);
  };

  // handle a successful upload and update gallery status in the table
  const handleUploadSuccess = (uploadData) => {
    setGalleries((prev) =>
      prev.map((row) =>
        row.id === selectedSession.id
          ? {
              ...row,
              status: "Gallery Uploaded",
              uploadDate: new Date().toISOString(),
              photoCount: uploadData.photoCount,
            }
          : row,
      ),
    );

    alert(
      `Gallery uploaded successfully! Uploaded ${uploadData.photoCount} photos. Email sent to: ${uploadData.clientEmail}`,
    );

    // refresh from DB so UI matches source truthfully. will see how this works later when more galleries are in the DB to test
    // fetchGalleries();
  };

  const tableGalleryColumns =[
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'time', label: 'Time', sortable: false },
    { key: 'location', label: 'Location', sortable: false },
    // Session Status is sortable and has custom rendering for different statuses
    { 
      key: 'status', label: 'Status', sortable: true,
      render: (value) => (
        <span 
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            value === 'Awaiting Gallery' 
              ? 'bg-orange-100 text-orange-800' 
              : value === 'Gallery Uploaded'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value}
        </span>
      )
    },
    // actions column with custom rendering for upload/view buttons based on session status
    {
      key: 'actions', label: 'Actions', sortable: false, 
            render: (_, row) => (
        <div className="flex gap-2 items-center">
          {row.status === 'Awaiting Gallery' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUploadClick(row);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
              title="Upload gallery for this session"
            >
              <Upload size={16} />
              Upload Gallery
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to view gallery
                  window.location.href = `/admin/galleries/view/${row.id}`;
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
                title="View uploaded gallery"
              >
                <Eye size={16} />
                View Gallery
              </button>
              <span className="text-xs text-green-600">
                Notified on {new Date(row.uploadDate || Date.now()).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )
    }
  ];

  // OVERALL ADMIN PAGE
  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
        <div className="relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner">
          <div className="mb-6 ">
            {/* Page Header */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Galleries</h1>
            <p className="text-gray-600">
              View, upload, and manage all photography galleries.
            </p>
          </div>
          {/* loading/error UI */}
            {loading && <p className="text-sm text-gray-500 mb-2">Loading…</p>}
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {/* Table Container */}
          <div>
            <Table 
            columns={tableGalleryColumns} 
            data={galleries}
            searchable={true}
            searchPlaceholder={"Search Galleries by Client Name..."}
            rowsPerPage={5}
            />
          </div>
        </div>
        </Frame>
      </div>
      {/* Upload Gallery modal */}
      <UploadGalleryModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        session={selectedSession}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}

export default AdminGalleries;


// OLD GALLERY STUFF THAT MIGHT NEED LATER ON
// const { data, error } = await supabase.from("User")
//   .select("id, email, first_name, last_name, phone");

// function Admin() {

//   return (
//     <div className='flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg'>
//       <div className='flex w-1/3'>
//         <Sidebar />
//       </div>
//       <div className='flex w-2/3'>
//         <Frame />
//         <div className='relative flex flex-col m-10 gap-2'>
//           {/* TEMPORARY: USE TO SEND PRACTICE NOTIFICATIONS TO USER BASED ON EMAIL/ID */}
//           <h2 className="font-bold text-brown  text-2xl">Send Notification</h2>
//           {(data.length === 0) ?
//             <p>No users detected.</p> :
//             <form className="flex flex-col font-normal">
//               <label claassName="text-lg" for="user">Select a user:</label>

//               <div className="flex flex-row gap-4">
//                 <select
//                   name="userDropdown"
//                   id="userDropdown">
//                   {/* submit user email as value / show user full name -- change to id or other values as needed */}
//                   <option value={"OPTION_SELECT"} disabled>Choose an option</option>
//                   {data.map((user) => (<option value={user.email}>{user.first_name} {user.last_name}</option>))}
//                 </select>
//                 <button className="px-2 border rounded-xl cursor-pointer hover:bg-neutral-200" type="submit">Submit</button>
//               </div>
//             </form>
//           }
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Admin