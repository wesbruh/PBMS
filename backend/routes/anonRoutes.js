import express from "express";

export default function anonRoutes(supabaseClient) {
    const router = express.Router();

    // --- Signup Route ---
    router.post("/signup", async (req, res) => {
        const { signup_payload, profile_payload } = req.body;

        try {
            // default role init
            const { data: defaultRole, error: defaultRoleError } = await supabaseClient
                .from("Role")
                .select("id")
                .eq("name", "User")
                .single();

            if (defaultRoleError) {
                console.error("Role not found or error fetching role: ", defaultRoleError);
                return;
            }

            const { data: signUpData, error: signUpError } = await supabaseClient
                .auth
                .signUp(signup_payload);

            if (signUpError) {
                const raw = signUpError.message?.toLowerCase() || "";
                if (raw.includes("already registered") || raw.includes("already exists")) {
                    throw new Error({ error: { message: "That email is already in use. Please log in instead." } });
                } else {
                    throw new Error({ error: { message: signUpError.message || "Could not create account." } });
                }
            }

            const authUser = signUpData.user;
            const duplicateSignup =
                authUser &&
                Array.isArray(authUser.identities) &&
                authUser.identities.length === 0;

            if (duplicateSignup) throw new Error({ error: { message: "That email is already in use. Please log in instead." } });

            // upsert into "User" and "UserRole" table
            if (authUser?.id) {
                profile_payload.id = authUser.id;
                profile_payload.is_active = !!authUser.email_confirmed_at;

                const rolePayload = {
                    user_id: profile_payload.id,
                    role_id: defaultRole.id,
                };

                if (signUpData?.session) {
                    profile_payload.last_login_at = new Date().toISOString();
                    profile_payload.is_active = true;
                    // NOTE: rolePayload.assigned_at was being set before, but assigned_at isn't defined here.
                    // If your table requires assigned_at, add it explicitly:
                    // rolePayload.assigned_at = new Date().toISOString();
                }

                const { error: userTableErr } = await supabaseClient
                    .from("User")
                    .upsert(profile_payload);
                const { error: userRoleTableErr } = await supabaseClient
                    .from("UserRole")
                    .upsert(rolePayload);

                if (userTableErr) console.error("User upsert error:", userTableErr);
                if (userRoleTableErr) console.error("UserRole upsert error:", userRoleTableErr);
            }

            if (!signUpData.session) {
                res.status(200).json({
                    "info": {
                        "message": "We’ve sent you a confirmation link. Please check your email to finish creating your account."
                    }
                });
            }
        } catch (error) {
            console.error("Failed to signup:", error);
            res.status(500).json(error)
        }
    });

    return router;
}