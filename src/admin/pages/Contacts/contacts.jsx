import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";

import { supabase } from "../../../lib/supabaseClient";

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Controls modal visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Holds selected contact for deletion
  const [selectedContact, setSelectedContact] = useState(null);

  // Add form validation errors (separate from fetch/delete errors if you want)
  const [addErrorMsg, setAddErrorMsg] = useState("");

  // Basic validators
  const isValidEmail = (email) => {
  // Simple and reliable email format check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  };

  const normalizePhone = (phone) => {
  // Count digits only, ignore formatting characters
  return String(phone || "").replace(/\D/g, "");
  };

  // Form state for adding a contact
  const [newContact, setNewContact] = useState({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
});

  const tableContactsColumns = [
    { key: "firstName", label: "First Name", sortable: true },
    { key: "lastName", label: "Last Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone", sortable: false },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => {
            setSelectedContact(row);
            setShowDeleteModal(true);
          }}
          className="text-sm text-red-700 hover:underline"
        >
          Delete
        </button>
      ),
    },
  ];

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("Contacts")
        .select("first_name, last_name, email, phone");

      if (error) {
        console.error(error);
        setErrorMsg(error.message || "Failed to load contacts.");
        setContacts([]);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((row) => ({
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
      }));

      setContacts(mapped);
      setLoading(false);
    };

    fetchContacts();
  }, []);

  // Inserts a new contact into the database and updates the table
const handleAddContact = async () => {

  setAddErrorMsg("");
  setErrorMsg("");

    // Trim inputs (prevents spaces-only entries)
  const firstName = (newContact.first_name || "").trim();
  const lastName = (newContact.last_name || "").trim();
  const email = (newContact.email || "").trim();
  const phoneRaw = (newContact.phone || "").trim();

  // Required fields check
  if (!firstName || !lastName || !email || !phoneRaw) {
    setAddErrorMsg("Please fill out all fields before saving.");
    return;
  }

  // Email format check
  if (!isValidEmail(email)) {
    setAddErrorMsg("Please enter a valid email address.");
    return;
  }

  // Phone length check (at least 10 digits)
  const phoneDigits = normalizePhone(phoneRaw);
  if (phoneDigits.length < 10) {
    setAddErrorMsg("Phone number must be at least 10 digits.");
    return;
  }

  // Prevent duplicate emails 
  const emailLower = email.toLowerCase();
  const alreadyExists = contacts.some(
    (c) => String(c.email || "").toLowerCase() === emailLower
  );
  if (alreadyExists) {
    setAddErrorMsg("A contact with this email already exists.");
    return;
  }

  const { data, error } = await supabase
    .from("Contacts")
    .insert([{
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phoneRaw,
    }])
    .select();

  if (error) {
    setAddErrorMsg(error.message || "Failed to add contact.");
    return;
  }

  // Add new contact to table without reloading
  setContacts((prev) => [
    ...prev,
    {
      firstName: data[0].first_name,
      lastName: data[0].last_name,
      email: data[0].email,
      phone: data[0].phone,
    },
  ]);

  // Reset and close modal
  setNewContact({ first_name: "", last_name: "", email: "", phone: "" });
  setShowAddModal(false);
};

// Deletes a contact from the database and updates the table
const handleDeleteContact = async () => {
  if (!selectedContact) return;

  const { error } = await supabase
    .from("Contacts")
    .delete()
    .eq("email", selectedContact.email);

  if (error) {
    setErrorMsg(error.message);
    return;
  }

  // Remove contact from UI
  setContacts((prev) =>
    prev.filter((c) => c.email !== selectedContact.email)
  );

  setSelectedContact(null);
  setShowDeleteModal(false);
};

  return (
    <>
    <div className="flex my-10 md:my-14 min-h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
          <div className="relative flex flex-col bg-[#fdfbf7] p-5 md:p-6 w-full rounded-2xl shadow-inner">
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

              {/* Add Contact button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="ml-8 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-sm leading-tight hover:bg-[#AB8C4B] transition border border-black rounded-lg"
              >
                Add Contact
              </button>
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
                    rowsPerPage={7}
                  />
                )}
              </div>
            </div>
          </div>
        </Frame>
      </div>
    </div>
 {/* Add Contact Modal */}
{showAddModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    onClick={(e) => {
      if (e.target === e.currentTarget) setShowAddModal(false);
    }}
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50"></div>

    {/* Dialog */}
    <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border border-black rounded-md shadow-lg">
      <h2 className="text-center text-2xl font-serif font-extralight mb-4">
        Add New Contact
      </h2>

      {/* Render error message*/}
      {addErrorMsg && (
        <p className="text-center text-xs text-red-600 mb-2">{addErrorMsg}</p>
      )}

      {/* Modal Content */}
      <div className="flex flex-col font-mono text-xs">
        <label className="mb-4">
          <p className="text-center text-brown py-3">FIRST NAME *</p>
          <input
            type="text"
            value={newContact.first_name}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, first_name: e.target.value }))
            }
            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
          />
        </label>

        <label className="mb-4">
          <p className="text-center text-brown py-3">LAST NAME *</p>
          <input
            type="text"
            value={newContact.last_name}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, last_name: e.target.value }))
            }
            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
          />
        </label>

        <label className="mb-4">
          <p className="text-center text-brown py-3">EMAIL *</p>
          <input
            type="email"
            value={newContact.email}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
          />
        </label>

        <label className="mb-4">
          <p className="text-center text-brown py-3">PHONE NUMBER *</p>
          <input
            type="text"
            value={newContact.phone}
            onChange={(e) =>
              setNewContact((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
          />
        </label>
      </div>

      <div className="flex justify-center gap-3 mt-6">
        <button
          onClick={() => setShowAddModal(false)}
          className="px-4 py-2 border border-black rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleAddContact}
          className="px-4 py-2 bg-[#5e8738] text-white rounded-md"
        >
          Save Contact
        </button>
      </div>
    </div>
  </div>
)}
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
</>
);
}

export default Contacts;