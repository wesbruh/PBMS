import express from "express";

export default function sessionsRoutes(supabaseClient) {
    const router = express.Router();

    // Fetch all active sessions with related data
    router.get("", async (req, res) => {
        try {
            const { data, error } = await supabaseClient
                .from("Session")
                .select("*, User(first_name, last_name), SessionType(name)")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (error) throw error;
            res.status(200).json(data);
        } catch (error) {
            console.error("Error fetching sessions:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // retrieve all active session type details
    router.post("/types", async (_req, res) => {
        try {
            const { data, error } = await supabaseClient
                .from("SessionType")
                .select()
                .eq("active", true);

            if (error) throw error;

            res.status(200).json(data ?? null);
        } catch (error) {
            console.error("Error fetching Session Types:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // retrieve session type details for specified session_type_id
    router.post("/type", async (req, res) => {
        const { session_type_id, session_type_name } = req.body;

        try {
            if (!session_type_id && !session_type_name) throw new Error("session_type_id and session_type_name not specified.")

            let query = supabaseClient
                .from("SessionType")
                .select();

            if (session_type_id)
                query = query.eq("id", session_type_id);
            else if (session_type_name)
                query = query.eq("name", session_type_name);

            const { data, error } = await query.single();
            if (error) throw error;

            res.status(200).json(data);
        } catch (error) {
            console.error("Error fetching Session Type:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // Fetch specific session with related data for specified session_id (id)
    router.get("/:id", async (req, res) => {
        const { id } = req.params;

        try {
            const { data, error } = await supabaseClient
                .from("Session")
                .select("*, User(id, first_name, last_name, email, phone), SessionType(name, description)")
                .eq("id", id)
                .single();

            if (error) throw error;

            res.status(200).json(data);
        } catch (error) {
            console.error("Error fetching session:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // Update session details
    router.patch("/:id", async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        // console.log(updates); DEBUGGING
        try {
            const { data, error } = await supabaseClient
                .from("Session")
                .update(updates)
                .eq("id", id)
                .select();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            console.error("Error updating session:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // New Client Booking Route
    router.post("/book", async (req, res) => {
        const { client_id, session_type_id, date, start_time, end_time, location_text, notes } = req.body;

        const requestStart = new Date(`${date}T${start_time}:00`).toISOString();
        const requestEnd = new Date(`${date}T${end_time}:00`).toISOString();

        try {
            const { data, error } = await supabaseClient
                .from("Session")
                .insert([{
                    client_id: client_id || null,
                    session_type_id: session_type_id || null,
                    start_at: requestStart,
                    end_at: requestEnd,
                    location_text: location_text,
                    status: "Pending",
                    notes: notes || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .maybeSingle();

            if (error) throw error;
            res.status(201).json(data);
        } catch (err) {
            console.error("Booking Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch booking request details for admin view of client questionnaire responses and any session notes
    router.get("/:id/details", async (req, res) => {
        try {
            const { id } = req.params;

            // get booking request notes
            const { data: session, error: sessionError } = await supabaseClient
                .from("Session")
                .select("id, notes")
                .eq("id", id)
                .single();
            if (sessionError) throw sessionError;

            // get questionnaire responses for session
            const { data: responses, error: responsesError } = await supabaseClient
                .from("QuestionnaireResponse")
                .select("id, status, submitted_at, QuestionnaireTemplate:template_id(id, name, schema_json)")
                .eq("session_id", id)
                .maybeSingle();
            if (responsesError) throw responsesError;

            let questionnaire = null;

            if (responses && responses.QuestionnaireTemplate) {
                //get all answers for this response
                const { data: quesAnswers, error: quesAnswersError } = await supabaseClient
                    .from("QuestionnaireAnswer")
                    .select("question_id, answer")
                    .eq("questionnaire_id", responses.id);
                if (quesAnswersError) throw quesAnswersError;

                // build a question-answer map to return in a digestible format for the frontend
                const answerMap = Object.fromEntries(
                    (quesAnswers ?? []).map((a) => [a.question_id, a.answer])
                );

                const schema = responses.QuestionnaireTemplate.schema_json ?? [];
                const items = [...schema]
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((q) => ({
                        question_id: q.id,
                        label: q.label,
                        type: q.type,
                        answer: answerMap[q.id] ?? null,
                    }));

                questionnaire = {
                    template_name: responses.QuestionnaireTemplate.name,
                    status: responses.status,
                    submitted_at: responses.submitted_at,
                    items,
                };
            }

            res.status(200).json({
                notes: session.notes ?? null,
                questionnaire
            });
        } catch (error) {
            console.error("error fetching session details:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
}