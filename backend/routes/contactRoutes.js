import express from "express";

export default function contactRoutes(supabaseClient) {
  const router = express.Router();

  // insert new contact
  router.post("/add", async (req, res) => {
    const contactPayload = req.body;

    try {
      const { data, error } = await supabaseClient
        .from("Contact")
        .insert(contactPayload)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error("Error adding contact:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // delete from contact table by email
  router.delete("/:email", async (req, res) => {
    const { email } = req.params;

    try {
      const { error } = await supabaseClient
        .from("Contact")
        .delete()
        .eq("email", email);

      if (error) throw error;
      res.status(200);
    } catch (error) {
      console.error("Error deleting contact:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}