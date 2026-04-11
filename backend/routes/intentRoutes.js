import express from "express";

export default function intentRoutes(stripeClient) {
  const router = express.Router();

  // Capture Payment Intent
  router.post("/capture", async (req, res) => {
    const { payment_intent_id } = req.body;

    try {
      const { data, error } = await stripeClient.paymentIntents.capture(payment_intent_id);

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error('Error capturing payment intent:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}