import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../../lib/supabaseClient.js";
import { useAuth } from "../../../context/AuthContext"

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";

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
      label: "",
      render: (userid) => (
        <button
          onClick={() => navigate(`/admin/contacts/${userid}`)}
          className="text-sm text-gray-500 hover:underline cursor-pointer"
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
          className="text-sm text-red-500 hover:underline cursor-pointer"
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
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex min-w-50 overflow-y-auto">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          {loading ? (
            <div className="w-full py-16 text-center text-brown font-serif">
              Loading your account...
            </div>
          ) : (
            <div className="relative flex flex-col bg-[#fdfbf7] p-5 md:p-6 w-screen rounded-2xl shadow-inner overflow-scroll">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold text-[#7E4C3C] mb-1">
                    Client Contact Information
                  </h1>
                  <p className="text-gray-600">
                    View and manage contact information for all clients.
                  </p>
                </div>
                {/* Right-side header actions */}
                <div className="flex items-center gap-3">
                  {/* Count pill */}
                  <span className="inline-flex items-center rounded-full border border-[#E7DFCF] bg-white px-4 py-1.5 text-sm text-[#5a3e2b] shadow-sm">
                    {contacts?.length ?? 0} Contacts
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Table Card */}
              <div className="rounded-xl border border-[#E7DFCF] bg-white shadow-sm">
                <div className="p-2 md:p-4">
                  {loading ? (
                    <div className="py-10 text-center text-gray-500">
                      Loading contacts...
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
            </div>)}
        </Frame>
      </div>

      {/* Delete Contact Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>

          <div className="absolute inset-0 bg-black/50"></div>

          <div className="relative bg-white w-11/12 max-w-md p-6 border border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-serif mb-4">
              Delete Contact
            </h2>

            <p className="text-center text-sm mb-6">
              Are you sure you want to delete this contact?
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-black rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                className="px-4 py-2 bg-[#a00101] text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

export default Contacts;