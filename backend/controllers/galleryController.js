import {createClient} from "@supabase/supabase-js";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config();


const supabase = createClient(
  process.env.URL,
  process.env.SERVICE_ROLE_KEY
);

async function uploadGallery (req, res) {
    const {galleryId } = req.params;
    const { expires_at} = req.body;

    try {
         // fetch the gallery with proper joins to get the client info. joins between galleries, sessions, clients
        const { data: gallery, error } = await supabase
            .from('Gallery')
            .select(`
                id,
                title, 
                session_id,
                Session (
                start_at, 
                client_id,
                User (
                first_name,
                last_name,
                email
                )
                )
            `)
            .eq('id', galleryId)
            .single();

        if (error || !gallery) {
            return res.status(404).json({ error: "Gallery not found" });
        }

        const client = gallery.Session.User;
        const published_link = `${process.env.CLIENT_BASE_URL}/client/galleries/${galleryId}`;
        const sessionDate = new Date(gallery.Session.start_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        // update the gallery as published in the database
        const {error: updateError} = await supabase
        .from('Gallery')
        .update({
            published_link,
            expires_at: expires_at ?? null,
            published_at: new Date().toISOString(),
        })
        .eq('id', galleryId);

        if (updateError) {
            return res.status(500).json({ error: "Failed to update gallery" });
        }

        // invokes the edge function with real client data
        const {error: emailError} = await supabase.functions.invoke('send-gallery-upload-email', {
            body: {
                email: client.email,
                name: `${client.first_name} ${client.last_name}`,
                URL: published_link,
                sessionDate,
            },
        });

        // log the email attempt even if success or failure to the user_email_log table in supabase.
        // converts error message object to a string for readability in the database
        const { error: logError } = await supabase.from('user_email_log')
        .insert({
            user_id: gallery.Session.client_id,
            email_type: 'gallery_upload_email',
            email_address: client.email,
            status: emailError ? 'failed' : 'sent',
            error_message: emailError ? JSON.stringify(emailError) : null
        });
        
        if (logError) {
            console.error("Failed to log email attempt:", logError);
        }

        if (emailError) {
            console.error("Failed to send email for gallery upload:", emailError);
        }

        return res.status(200).json ({
            message: 'Gallery Published and client notified via email',
            galleryId,
            published_link
        });


    } catch (err) {
        console.error("publishGallery error:", err);
        return res.status(500).json({ error: err.message });
    }
}

export { uploadGallery };