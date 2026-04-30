import express from "express";
import process from "node:process"
import dotenv from "dotenv"
dotenv.config("../.env");

const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL;

export default function checkoutRoutes(stripeClient) {
  const router = express.Router();

  // create and retrieve Stripe Checkout Session information for deposit
  router.post("/deposit", async (req, res) => {
    const { from_url, product_data, price, apply_tax, tax_rate } = req.body;

    // compute final price based on values passed in
    // if no price is passed in, default to 150
    let final_price = ((price) ? price : 150);

    // calculate tax as needed, default to 7.25% if tax_rate not passed
    if (apply_tax)
      final_price *= (100 + ((tax_rate) ? tax_rate : 7.25));
    else
      final_price *= 100;

    final_price = Math.round(final_price);

    try {
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: product_data || {
                name: 'Default Package - Deposit',
                description: 'Default Package Description'
              },
              unit_amount: final_price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        payment_intent_data: {
          capture_method: 'manual',
        },
        success_url: `${CLIENT_BASE_URL}/dashboard/inquiry?checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: from_url
      });

      res.status(200).json({
        id: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating deposit checkout session:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/rest", async (req, res) => {
    const { from_url, product_data, price, apply_tax, tax_rate } = req.body;

    // compute final price based on values passed in
    // if no price is passed in, default to 150
    let final_price = ((price) ? price : 150);

    // calculate tax as needed, default to 7.25% if tax_rate not passed
    if (apply_tax)
      final_price *= (100 + ((tax_rate) ? tax_rate : 7.25));
    else
      final_price *= 100;

    final_price = Math.round(final_price);

    try {
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: product_data || {
                name: 'Default Package - Rest',
                description: 'Default Package Description'
              },
              unit_amount: final_price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${CLIENT_BASE_URL}/dashboard?checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: from_url || `${CLIENT_BASE_URL}/dashboard`
      });

      res.status(200).json({
        id: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating rest checkout session:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Retrieve Checkout Session along with associated Stripe Payment Intent information
  router.get("/:checkout_session_id", async (req, res) => {
    const { checkout_session_id } = req.params;

    try {
      const checkoutSession = await stripeClient.checkout.sessions.retrieve(checkout_session_id);

      if (!checkoutSession)
        throw new Error("Checkout session could not be found");

      checkoutSession.payment_intent = await stripeClient.paymentIntents.retrieve(checkoutSession.payment_intent);

      res.status(200).json(checkoutSession);
    } catch (error) {
      console.error('Error getting checkout session:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}