import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";

import { supabase } from "../../../lib/supabaseClient";

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const tableContactsColumns = [
    { key: "firstName", label: "First Name", sortable: true },
    { key: "lastName", label: "Last Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone", sortable: false },
  ];

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("User")
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

  return (
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
                <h1 className="text-3xl font-semibold text-[#5a3e2b] mb-1">
                  Client Contact Information
                </h1>
                <p className="text-gray-600">
                  View and manage contact information for all clients.
                </p>
              </div>

              {/* Count pill */}
              <span className="inline-flex items-center rounded-full border border-[#E7DFCF] bg-white px-3 py-1 text-sm text-[#5a3e2b] shadow-sm">
                {contacts?.length ?? 0} Contacts
              </span>
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
  );
}

export default Contacts;