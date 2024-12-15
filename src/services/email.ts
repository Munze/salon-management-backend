import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

// Initialize SendGrid if API key is available
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
let isEmailConfigured = false;

if (SENDGRID_API_KEY?.startsWith('SG.')) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  isEmailConfigured = true;
} else {
  logger.warn('SendGrid API key not configured or invalid. Email notifications will be disabled.');
}

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions): Promise<boolean> => {
  if (!isEmailConfigured) {
    logger.info('Email notifications disabled. Would have sent email to:', to);
    return false;
  }

  try {
    const msg = {
      to,
      from: FROM_EMAIL!,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    logger.info(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    logger.error('Error sending email:', error);
    return false;
  }
};

export const sendAppointmentConfirmation = async (
  clientEmail: string,
  appointmentDetails: {
    clientName: string;
    therapistName: string;
    serviceName: string;
    startTime: Date | string;
    endTime: Date | string;
  }
) => {
  const { clientName, therapistName, serviceName } = appointmentDetails;
  const startTime = new Date(appointmentDetails.startTime);
  const endTime = new Date(appointmentDetails.endTime);
  
  const subject = 'Potvrda termina - Salon Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Potvrda termina</h2>
      <p>Poštovani/a ${clientName},</p>
      <p>Vaš termin je potvrđen sa sledećim detaljima:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Usluga:</strong> ${serviceName}</p>
        <p><strong>Terapeut:</strong> ${therapistName}</p>
        <p><strong>Datum:</strong> ${startTime.toLocaleDateString('sr-RS')}</p>
        <p><strong>Vreme:</strong> ${startTime.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <p>Ako je potrebno da promenite ili otkažete termin, molimo vas da nas obavestite najmanje 24 sata unapred.</p>
      <p>Radujemo se vašoj poseti!</p>
      <p>Srdačan pozdrav,<br>Salon Management Tim</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};

export const sendAppointmentReminder = async (
  clientEmail: string,
  appointmentDetails: {
    clientName: string;
    therapistName: string;
    serviceName: string;
    startTime: Date;
    endTime: Date;
  }
) => {
  const { clientName, therapistName, serviceName, startTime } = appointmentDetails;
  
  const subject = 'Appointment Reminder - Salon Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Appointment Reminder</h2>
      <p>Dear ${clientName},</p>
      <p>This is a friendly reminder of your upcoming appointment:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Therapist:</strong> ${therapistName}</p>
        <p><strong>Date:</strong> ${startTime.toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${startTime.toLocaleTimeString()}</p>
      </div>
      <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>Salon Management Team</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};
