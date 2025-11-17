const pool = require("../db");
const galleryTemplate = require("../emails/galleryTemp");
const { sendGalleryPublishedEmail } = require("../services/emailService");

exports.publishGallery = async (req, res) => {
  try {
    const galleryId = req.params.id;

    const galleryQuery = `
      SELECT g.*, u.email AS client_email, u.fullname AS client_name
      FROM "Gallery" g
      JOIN "User" u ON u.id = g.client_id
      WHERE g.id = $1
    `;
    const galleryResult = await pool.query(galleryQuery, [galleryId]);

    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ message: "Gallery not found" });
    }

    const gallery = galleryResult.rows[0];

    const updateQuery = `
      UPDATE "Gallery"
      SET is_published = TRUE,
          published_at = NOW()
      WHERE id = $1
    `;
    await pool.query(updateQuery, [galleryId]);

    const notificationQuery = `
      INSERT INTO "Notification" (user_id, message, created_at)
      VALUES ($1, $2, NOW())
    `;
    await pool.query(notificationQuery, [
      gallery.client_id,
      `Your gallery "${gallery.gallery_name}" has been published.`,
    ]);

    await sendGalleryPublishedEmail(
      gallery.client_email,
      gallery.client_name,
      gallery.gallery_name,
      galleryTemplate
    );

    return res.json({ message: "Gallery published and email sent" });
  } catch (err) {
    console.error("Publish error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};