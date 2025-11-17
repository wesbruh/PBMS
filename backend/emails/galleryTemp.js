module.exports = function galleryPublishedTemplate(clientName, galleryName) {
  return `
    <div style="font-family: Arial; padding: 20px;">
      <h2>Your Gallery Is Now Available</h2>
      <p>Hello ${clientName},</p>
      <p>Your gallery <strong>${galleryName}</strong> has been published.</p>
      <p>Please log in to your dashboard to view and download your photos.</p>
      <a href="${process.env.FRONTEND_URL}/Login" 
         style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;margin-top:10px;">
        Log In
      </a>
      <p style="margin-top:20px;">Thank you for choosing our services.</p>
    </div>
  `;
};