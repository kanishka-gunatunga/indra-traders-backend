import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

export const EmailService = {
    sendOtpEmail: async (to: string, otp: string, customerName: string) => {
        const mailOptions = {
            from: `"Indra Traders Support" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: "Your Verification Code - Indra Traders",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Hello ${customerName},</h2>
                    <p>You requested to chat with our registered support.</p>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="color: #DB2727; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 5 minutes.</p>
                    <hr/>
                    <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP Email sent to ${to}`);
            return true;
        } catch (error) {
            console.error("Email Send Error:", error);
            return false;
        }
    },
};