const pool = require("../db");
const galleryTemplate = require("../emails/galleryTemp");
const { sendGalleryPublishedEmail } = require("../services/emailService");

exports.publishGallery = async (req, res) => {
  try {
    const { userEmail, userName, galleryName } = req.body;

    if (!userEmail || !userName) {
      return res.status(400).json({ message: "Missing user information" });
    }

    console.log(`📧 Sending email to: ${userEmail}`);
    console.log(`👤 User: ${userName}`);
    console.log(`🖼️ Gallery: ${galleryName}`);

    await sendGalleryPublishedEmail(
      userEmail,
      userName,
      galleryName || "Test Gallery",
      galleryTemplate
    );

    console.log("✅ Email sent successfully!");

    return res.json({ 
      message: "Gallery published and email sent",
      sentTo: userEmail,
      galleryName: galleryName
    });
  } catch (err) {
    console.error("❌ Publish error:", err);
    res.status(500).json({ 
      message: "Failed to send email", 
      error: err.message 
    });
  }
};