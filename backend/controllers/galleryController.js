import {supabase} from "../supabaseClient.js";


export const uploadGallery = async (req, res) => {
    try {
        const {galleryId } = req.params;
        const { expires_at} = req.body;
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

        // const client = gallery.Session.User;
        const published_link = `${process.env.CLIENT_BASE_URL}/dashboard`;
        // const sessionDate = new Date(gallery.Session.start_at).toLocaleDateString('en-US', {
        //     month: 'long',
        //     day: 'numeric',
        //     year: 'numeric'
        // });

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

        // DATABSE TRIGGER WILL INVOKE THIS EDGE FUNCTION TO SEND THE EMAIL WHEN THE GALLERY IS PUBLISHED, SO NO NEED TO CALL IT DIRECTLY HERE. 
        // COMMENTED OUT FOR NOW. MIGHT CHANGE BACK LATER AFTER MORE RESEARCH HAPPENS */
        // // invokes the edge function with real client data
        // const {error: emailError} = await supabase.functions.invoke('send-gallery-upload-email', {
        //     body: {
        //         email: client.email,
        //         name: `${client.first_name} ${client.last_name}`,
        //         URL: published_link,
        //         sessionDate,
        //         coverPhotoUrl: gallery.cover_photo_url ?? null,
        //         personalizedMessage: gallery.personalized_message ?? null,
        //     },
        // });

        // log the email attempt even if success or failure to the user_email_log table in supabase.
        // converts error message object to a string for readability in the database
        // const { error: logError } = await supabase.from('user_email_log')
        // .insert({
        //     email_type: 'gallery_upload_email',
        //     email_address: client.email,
        //     status: emailError ? 'failed' : 'sent',
        //     error_message: emailError ? JSON.stringify(emailError) : null,
        //     sent_at: new Date().toISOString(),
        // });
        
        // if (logError) {
        //     console.error("Failed to log email attempt:", logError);
        // }

        // if (emailError) {
        //     console.error("Failed to send email for gallery upload:", emailError);
        //     return res.status(200).json ({
        //     message: 'Gallery Published and client notified via email',
        //     galleryId,
        //     published_link,
        //     emailError: JSON.stringify(emailError),
        // });
    

        return res.status(200).json ({
            message: 'Gallery Published and client notified via email',
            galleryId,
            published_link,
        });

    } catch (err) {
        console.error("publishGallery error:", err);
        return res.status(500).json({ error: err.message });
    }
};