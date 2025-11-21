const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

async function sendGalleryPublishedEmail(to, clientName, galleryName, template) {
  return sendEmail(
    to,
    "Your Gallery Is Published",
    template(clientName, galleryName)
  );
}

module.exports = {
  sendEmail,
  sendGalleryPublishedEmail,
};