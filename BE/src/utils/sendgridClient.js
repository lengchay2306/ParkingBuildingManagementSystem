import sgMail from '@sendgrid/mail';
import { configDotenv } from 'dotenv';

configDotenv();

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;
const fromName = process.env.SENDGRID_FROM_NAME || 'PARKOS';

if (!apiKey || !fromEmail) {
    throw new Error('Missing SendGrid credentials in environment file');
}

sgMail.setApiKey(apiKey);

const sendgridClient = {
    sendPasswordResetEmail: async ({ toEmail, fullName, resetUrl }) => {
        const msg = {
            to: toEmail,
            from: { email: fromEmail, name: fromName },
            subject: 'Reset Your Password',
            html: `
            <p>Hello ${fullName || 'User'},</p>
            <p>Click the link below to reset your password (valid for 15 minutes):</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request this, ignore this email.</p>
            <p>Thank you,</p>
            <p>${fromName}</p>
            `,
        };
        await sgMail.send(msg);
    },
};

export default sendgridClient;
