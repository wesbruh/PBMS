import supabase from "../supabase/supabaseClient.js";

export const createInvoice = async(req, res) => {
    try {
        const { sessionId } = req.params;
        const { data: session, error } = await supabase
            .from("Session")
            .select(`id, price, status `)
            .eq("id", sessionId)
            .single();

        if (error || !session){
            return res.status(404).json({ message: "Session not found" });
        }
        if (session.status !== "Confirmed") {
            return res.status(400).json({
                message: "invoice can only be created for confirmed sessions"});
            }
        
            const invoiceNumber = `INV-${Date.now()}`;
            const { data: invoice, error: insertError } = await supabase
                .from("Invoice")
                .insert({
                    session_id: session.id,
                    invoice_number: invoiceNumber,
                    amount: session.price,
                    status: "Unpaid"
                })
                .select()
                .single();

            if(insertError){
                throw insertError;
            }

            res.json(invoice);

        } catch (err) {
            console.error("invoice creation error:", err);

            res.status(500).json({
                message: "failed to create invoice"

            });
        }
};