import express from "express";

export default function questionnaireRoutes(supabaseClient) {
  const router = express.Router();

  router.get("/templates/:template_id", async (req, res) => {
    const { template_id } = req.params;

    try {
      const { data, error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .select("id, name, session_type_id, schema_json, active")
        .eq("id", template_id)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // insert questionnaire template
  router.post("/templates", async (req, res) => {
    const payload = req.body;

    try {
      const { data, error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error("Error inserting questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // update questionnaire template details
  router.patch("/templates/:template_id", async (req, res) => {
    const { template_id: id } = req.params;
    const updates = req.body;

    try {
      const { data, error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error("Error updating questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // update questionnaire template details
  router.patch("/templates/:template_id/set", async (req, res) => {
    const { template_id } = req.params;
    const { session_type_id } = req.body;

    try {
      // Deactivate all other templates for this session type
      const { error: deactErr } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update({ active: false })
        .eq("session_type_id", session_type_id)
        .neq("id", template_id);
      if (deactErr) throw deactErr;

      // Activate this one
      const { error: actErr } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update({ active: true })
        .eq("id", template_id);

      if (actErr) throw actErr;
      res.status(200).json(null);
    } catch (error) {
      console.error("Error setting active questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}