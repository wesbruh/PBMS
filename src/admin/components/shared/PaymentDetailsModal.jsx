import { useEffect, useState } from "react";
import { X, LoaderCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import Table from "../../components/shared/Table/Table.jsx";

const getLocalFormattedDate = (date) => {
  const dateObj = new Date(date);
  return dateObj.getFullYear() + "-" +
    (dateObj.getMonth() + 1).toString().padStart(2, '0') + "-" +
    (dateObj.getDate().toString().padStart(2, '0')) + "T" +
    (dateObj.getHours().toString().padStart(2, '0')) + ":" +
    (dateObj.getMinutes().toString().padStart(2, '0'));
}

export default function PaymentDetailsModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tablePaymentsColumns = [
    {
      key: 'type',
      label: 'Type',
    },
    {
      key: 'provider',
      label: 'Provider'
    },
    {
      key: 'currency',
      label: 'Currency',
    },
    {
      key: 'amount',
      label: 'Amount',
    },
    {
      key: 'paid_at',
      label: 'Paid At',
      render: (val, row) => (
        <input
          disabled
          type="datetime-local"
          className="border rounded px-2 py-1 w-full text-sm"
          value={val ? getLocalFormattedDate(val) : ""}
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
    }
  ];

  // Fetch details when the modal opens
  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    supabase.from("Payment").select().eq("invoice_id", invoiceId)
      .then((res) => {
        return res.data;
      }).then((data) => {
        if (!cancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load session details.");
          setLoading(false);
        }
      });

    // Prevent setting state if the modal closes mid-fetch
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-500 px-6 py-4">
          <h2 className="text-xl font-semibold">Payments</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 hover:cursor-pointer"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col text-center items-center text-gray-500">
              <LoaderCircle className="text-brown animate-spin" size={32} />
              <p className="text-md">Loading details...</p>
            </div>
          )}
          {/* Error message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && data && (
            <>
              {/* Payments section */}
              <section className="mb-4 border-b border-gray-300 pb-4">
                {data.length > 0 ? (
                    <Table
                      columns={tablePaymentsColumns}
                      data={data}
                      rowsPerPage={4}
                    />
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No payments associated with invoice.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
