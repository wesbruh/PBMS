import express from "express";

export default function profileRoutes(supabaseClient) {
    const router = express.Router();

    // get information related to all users
    router.get("", async (_req, res) => {
        try {
            const { data, error } = await supabaseClient
                .from("User")
                .select("id, email, first_name, last_name, phone");

            if (error || !data) throw new Error("Could not fetch users.");

            res.status(200).json(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // get information related to a specified user
    router.get("/:user_id", async (req, res) => {
        const { user_id } = req.params;

        try {
            const { data, error } = await supabaseClient
                .from("User")
                .select("id, email, first_name, last_name, phone, UserRole(Role(name))")
                .eq("id", user_id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                res.status(200).json(null);
            }

            const { UserRole, ...rest } = data || {};
            const roleName = (data) ? UserRole?.Role.name : null;

            res.status(200).json({ ...rest, role_name: roleName });
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // update information related to a specified user
    router.patch("/:user_id", async (req, res) => {
        const { user_id } = req.params;
        const updates = req.body;

        try {
            const { error } = await supabaseClient
                .from("User")
                .update(updates)
                .eq("id", user_id)

            if (error) throw error;

            res.status(200).json(null);
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
}