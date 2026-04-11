import express from "express";

export default function availabilityRoutes(supabaseClient) {
  const router = express.Router();

  router.get("", async (_req, res) => {
    try {
      let { data: settings, error: settingsError } = await supabaseClient
        .from("AvailabilitySettings")
        .select("*")
        .maybeSingle();

      const { data: blocks, error: blocksError } = await supabaseClient
        .from("AvailabilityBlocks")
        .select("*");

      if (settingsError) console.error("Settings Error:", settingsError);
      if (blocksError) console.error("Blocks Error:", blocksError);

      res.json({ settings: settings || null, blocks: blocks || [] });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/settings", async (req, res) => {
    if (req?.user?.role?.name !== "Admin") return;

    const { start, end } = req.body;
    const { data, error } = await supabaseClient
      .from("AvailabilitySettings")
      .upsert({ work_start_time: start, work_end_time: end }, { onConflict: 'id' })
      .select();

    if (error) return res.status(400).json(error);
    res.json(data);
  });

  router.post("/blocks", async (req, res) => {
    if (req?.user?.role?.name !== "Admin") return;

    const { blocks, rangeStart, rangeEnd } = req.body;
    try {
      const now = new Date().toISOString();
      
      await supabaseClient
        .from("AvailabilityBlocks")
        .delete()
        .lte("start_time", now);

      await supabaseClient
        .from("AvailabilityBlocks")
        .delete()
        .gte("start_time", rangeStart)
        .lte("start_time", rangeEnd);
      
      if (blocks && blocks.length > 0) {
        const { error: insertError } = await supabaseClient.from("AvailabilityBlocks").insert(blocks);
        if (insertError) throw insertError;
      }
      
      res.json({ message: "Schedule synced successfully" });
    } catch (error) {
      console.error("Error syncing schedule:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}