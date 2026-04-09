import express from "express";
import { supabase } from "../supabaseClient.js";
import { stripe } from "../stripeClient.js";

const router = express.Router();

//CANCEL SESSION + HANDLE STRIPE PAYMENT
router.patch("/:id/cancel", async (req, res) => {
  const { id } = req.params;

  try {
    //Get Payment from DB
    const { data: payment, error: paymentError } = await supabase
      .from("Payment")
      .select(`id, provider_payment_id, status, invoice_id,
        Invoice(id, session_id)
        `)
      .eq("Invoice.session_id", id)
      .limit(1).single();

    if (paymentError || !payment) {
      console.error("Payment error:", paymentError);
      return res.status(404).json({ error: "Payment not found" });
    }

    const checkoutSessionId = payment.provider_payment_id;

    if (!checkoutSessionId) {
      throw new Error("No provider_payment_id (checkout session ID)");
    }

    //Retrieve Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    const paymentIntentId = session.payment_intent;

    if (!paymentIntentId) {
      if (!paymentIntentId) {
  console.log("No payment intent");

  
  await supabase
    .from("Payment")
    .update({ status: "Cancelled" })
    .eq("id", payment.id);

  await supabase
    .from("Session")
    .update({ status: "Cancelled" })
    .eq("id", id);

  return res.json({
    success: true,
    message: "Session cancelled (no payment made)"
  });
}
    }

    // Retrieve Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log("Stripe status:", paymentIntent.status);

    //Cancel OR Refund
    if (paymentIntent.status === "requires_capture") {
      
      await stripe.paymentIntents.cancel(paymentIntentId);
      console.log("Payment cancelled before capture");
    } 
    else if (paymentIntent.status === "succeeded") {
      // refund
      try{
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
      console.log("Refund issued");
    } catch (err) {
        if(err.code == "charge_already_refunded"){
            console.log("Already refunded");
        } else {
            throw err;
        }
        }
    }
    else {
      console.log("No action needed for status:", paymentIntent.status);
    }

    //Update Payment table
    await supabase
      .from("Payment")
      .update({ status: "Cancelled" })
      .eq("id", payment.id);

    //Update Session table
    await supabase
      .from("Session")
      .update({ status: "Cancelled" })
      .eq("id", id);

    console.log("Session & Payment cancelled:", id);

    res.json({ success: true });

  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;