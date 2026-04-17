import express from "express";

export default function intentRoutes(stripeClient) {
  const router = express.Router();

  // Capture Payment Intent
  router.post("/capture", async (req, res) => {
    const { payment_intent_id } = req.body;

    try {
      const paymentIntent = await stripeClient.paymentIntents.capture(payment_intent_id);
      res.status(200).json(paymentIntent);
    } catch (error) {
      console.error('Error capturing payment intent:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Cancel Payment Intent
  router.post("/cancel", async (req, res) => {
    const { payment_intent_id } = req.body;

    try {
      // Retrieve Payment Intent
      const paymentIntent = await stripeClient.paymentIntents.retrieve(payment_intent_id);

      // Cancel OR Refund
      if (paymentIntent.status === "succeeded") {
        // Refund
        try {
          await stripeClient.refunds.create({
            payment_intent: payment_intent_id,
          });
        } catch (err) {
          if (err.code == "charge_already_refunded")
            throw new Error("Payment Intent already refunded");
          else
            throw err;
        }
      } else {
        throw new Error("Payment intent has not suceeded.")
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error cancelling payment intent:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Uncapture hold on Payment Intent
  router.post("/uncapture", async (req, res) => {
    const { payment_intent_id } = req.body;

    try {
      // Retrieve Payment Intent
      const paymentIntent = await stripeClient.paymentIntents.retrieve(payment_intent_id);

      // Cancel hold on payment
      if (paymentIntent.status === "requires_capture") {
        await stripeClient.paymentIntents.cancel(payment_intent_id);
      } else {
        throw Error("Payment intent does not require capture");
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error uncapturing payment intent:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}