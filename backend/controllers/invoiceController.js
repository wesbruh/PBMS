import supabase from "../supabase/supabaseClient.js";

export const createInvoice = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { remaining, due_date } = req.body;
    
    const { data: sessionData, error } = await supabase
      .from("Session")
      .select("SessionType(base_price)")
      .eq("id", sessionId)
      .single();

    if (error) return res.status(404).json({ message: "Session not found" });

    const invoiceNumber = `INV-${Date.now()}`;
    const now = new Date();
    const issueDate = `${now.getFullYear().toString()}` + "-" +
                     `${(now.getMonth() + 1).toString().padStart(2, '0')}` + "-" +
                     `${now.getDate().toString().padStart(2, '0')}`;

    const { data: invoiceData, error: insertError } = await supabase
      .from("Invoice")
      .insert({
        session_id: sessionId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: due_date || null,
        remaining: remaining || (sessionData?.SessionType.base_price ?? 0),
        status: "Unpaid",
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json(invoiceData);

  } catch (err) {
    console.error("Invoice creation error:", err);

    res.status(500).json({
      message: "Failed to create invoice"
    });
  }
};