import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../../lib/supabaseClient.js";
import { useAuth } from "../../../context/AuthContext"

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import { LoaderCircle } from "lucide-react";

function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // call useAuth for Supabase session
  const { session } = useAuth();

  // Controls modal visibility
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Holds selected contact for deletion
  const [selectedContact, setSelectedContact] = useState(null);

  const normalizePhone = (phone) => {
    // Count digits only, ignore formatting characters
    const digits = String(phone || "").replace(/\D/g, "")
    return (digits) ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : "";
  };

  const tableContactsColumns = [
    {
      key: "userid",
      label: "Info",
      render: (userid) => (
        <button
          onClick={() => navigate(`/admin/contacts/${userid}`)}
          className="hover:cursor-pointer hover:bg-gray-200 transition-all text-center px-2 py-1 rounded-md text-sm font-semibold border"
        >
          View
        </button>
      ),
    },
    { key: "firstName", label: "First Name", sortable: true },
    { key: "lastName", label: "Last Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "phone", label: "Phone", sortable: false,
      render: (value) => (
        normalizePhone(value)
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => {
            setSelectedContact(row);
            setShowDeleteModal(true);
          }}
          className="hover:cursor-pointer px-3 py-1 rounded text-sm font-semibold border border-red-400 text-red-600 hover:bg-red-500 hover:text-white transition-colors duration-200"
        >
          Delete
        </button>
      ),
    },
  ];

  useEffect(() => {
    if (!session) return;

    const fetchContacts = async () => {
      setLoading(true);
      setErrorMsg("");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        console.error(error);
        setErrorMsg("Failed to load contacts.");
        setContacts([]);
        setLoading(false);
        return;
      }

      const data = await response.json();

      const mapped = (data || []).map((row) => ({
        userid: row.id ?? "",
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
      }));

      setContacts(mapped);
      setLoading(false);
    };

    fetchContacts();
  }, [session]);

  // Deletes a contact from the database and updates the table
  const handleDeleteContact = async () => {
    if (!selectedContact) return;

    try {
      setErrorMsg("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setErrorMsg("Missing admin session token.");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-delete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: selectedContact.userid,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || result.message || "Failed to delete user.");
        return;
      }

      setContacts((prev) =>
        prev.filter((c) => c.userid !== selectedContact.userid)
      );

      setSelectedContact(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Delete user error:", error);
      setErrorMsg("Failed to delete user.");
    }
  };

  return (
    <>
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex w-full rounded-lg overflow-y-auto">
            <div className="flex flex-col bg-[#fcfcfc] p-6 w-full h-full shadow-inner">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    Client Contacts
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    View and manage contact information for all clients.
                  </p>
              </div>
              {errorMsg && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}
                <div className="grow flex flex-col">
                  {loading ? (
                    <div className="grow flex flex-col justify-center items-center text-gray-500">
                      <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
                      <p className="text-md">Loading Sessions...</p>
                    </div>
                  ) : (
                    <Table
                      columns={tableContactsColumns}
                      data={contacts}
                      searchable={true}
                      searchPlaceholder={"Search Contacts..."}
                      rowsPerPage={5}
                    />
                  )}
                </div>
            </div>
          </div>
        </Frame>
        </div>
      </div>

      {/* Delete Contact Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>

          <div className="absolute inset-0 bg-black/50"></div>

          <div className="relative bg-white w-11/12 max-w-md p-6 border border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-sans mb-4">
              Delete Contact
            </h2>

            <p className="text-center text-sm mb-6">
              Are you sure you want to delete this contact?
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-1 border border-black rounded-md cursor-pointer hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                className="px-4 py-1 bg-[#a00101] hover:bg-[#870000] text-white rounded-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </>
  );
}

export default Contacts;