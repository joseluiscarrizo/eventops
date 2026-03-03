import nodemailer from 'nodemailer';
import * as validator from 'validator';
import * as sanitizeHtml from 'sanitize-html';

const MAX_RETRIES = 3;

interface User {
    email: string;
    role: string;
}

function validateEmail(email: string): boolean {
    return validator.isEmail(email);
}

function checkRBAC(user: User, requiredRole: string): boolean {
    return user.role === requiredRole;
}

async function sendEmail(to: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html,
    });
}

async function enviarHojaAsistenciaGmail(user: User, subject: string, rawHtml: string) {
    if (!validateEmail(user.email)) {
        throw new Error('Invalid email address');
    }

    if (!checkRBAC(user, 'admin')) {
        throw new Error('Permission denied: insufficient role');
    }

    const sanitizedHtml = sanitizeHtml(rawHtml);

    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            await sendEmail(user.email, subject, sanitizedHtml);
            console.log('Email sent successfully');
            return;
        } catch (error) {
            console.error('Error sending email:', error);
            retries++;
            if (retries >= MAX_RETRIES) {
                throw new Error('Failed to send email after multiple attempts');
            }
        }
    }
}

export default enviarHojaAsistenciaGmail;
