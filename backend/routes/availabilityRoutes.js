import express from "express";

function getUserId(user) {
  return user?.id || user?.user_id || user?.sub || null;
}

export default function availabilityRoutes(supabaseClient) {
  const router = express.Router();

  router.get("", async (_req, res) => {
    try {
      const { data: settingsRows, error: settingsError } = await supabaseClient
        .from("AvailabilitySettings")
        .select("*")
        .order("updated_at", { ascending: false });

      const { data: blocks, error: blocksError } = await supabaseClient
        .from("AvailabilityBlocks")
        .select("*");

      if (settingsError) console.error("Settings Error:", settingsError);
      if (blocksError) console.error("Blocks Error:", blocksError);

      res.json({
        settings: settingsRows?.[0] || null,
        blocks: blocks || [],
      });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/settings", async (req, res) => {
    if (req?.user?.role?.name !== "Admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const { start, end, timezone } = req.body;

      if (!start || !end) {
        return res.status(400).json({
          error: "Start and end time are required.",
        });
      }

      const safeTimezone =
        timezone && typeof timezone === "string"
          ? timezone
          : "America/Los_Angeles";

      const adminUserId = getUserId(req.user);
      const nowIso = new Date().toISOString();

      const { data: existingRows, error: fetchError } = await supabaseClient
        .from("AvailabilitySettings")
        .select("id")
        .order("updated_at", { ascending: false });

      if (fetchError) {
        console.error("Settings lookup error:", fetchError);
        return res.status(500).json({ error: fetchError.message });
      }

      let savedRow = null;

      if (existingRows && existingRows.length > 0) {
        const primaryRowId = existingRows[0].id;

        const { data, error: updateError } = await supabaseClient
          .from("AvailabilitySettings")
          .update({
            admin_user_id: adminUserId,
            work_start_time: start,
            work_end_time: end,
            timezone: safeTimezone,
            updated_at: nowIso,
          })
          .eq("id", primaryRowId)
          .select()
          .single();

        if (updateError) {
          console.error("Settings update error:", updateError);
          return res.status(400).json(updateError);
        }

        savedRow = data;

        if (existingRows.length > 1) {
          const duplicateIds = existingRows.slice(1).map((row) => row.id);

          if (duplicateIds.length > 0) {
            const { error: deleteDupesError } = await supabaseClient
              .from("AvailabilitySettings")
              .delete()
              .in("id", duplicateIds);

            if (deleteDupesError) {
              console.error("Duplicate settings cleanup error:", deleteDupesError);
            }
          }
        }
      } else {
        const { data, error: insertError } = await supabaseClient
          .from("AvailabilitySettings")
          .insert({
            admin_user_id: adminUserId,
            work_start_time: start,
            work_end_time: end,
            timezone: safeTimezone,
            updated_at: nowIso,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Settings insert error:", insertError);
          return res.status(400).json(insertError);
        }

        savedRow = data;
      }

      res.json(savedRow);
    } catch (error) {
      console.error("Settings Save Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/blocks", async (req, res) => {
    if (req?.user?.role?.name !== "Admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

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
        const { error: insertError } = await supabaseClient
          .from("AvailabilityBlocks")
          .insert(blocks);

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