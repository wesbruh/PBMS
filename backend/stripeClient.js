import Stripe from "stripe";
import dotenv from "dotenv";
import process from "node:process";
dotenv.config();

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);