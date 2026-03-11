import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { BrevoSettings } from './entities/brevo-settings.entity';
import nodemailer from 'nodemailer';

@Injectable()
export class BrevoSmsService {
    private readonly logger = new Logger('BrevoSmsService');

    constructor(
        private readonly connection: TransactionalConnection,
    ) { }

    private get repo() {
        return this.connection.rawConnection.getRepository(BrevoSettings);
    }

    /**
     * Load Brevo settings from the database (single record with id='brevo_settings').
     * Returns null if no settings have been configured yet.
     */
    async getSettings(): Promise<BrevoSettings | null> {
        return this.repo.findOne({ where: { id: 'brevo_settings' } });
    }

    /**
     * Saves or updates the Brevo settings.
     */
    async saveSettings(input: Partial<BrevoSettings>): Promise<BrevoSettings> {
        const existing = await this.getSettings();
        if (existing) {
            Object.assign(existing, input);
            return this.repo.save(existing);
        }
        const newSettings = this.repo.create({ id: 'brevo_settings', ...input });
        return this.repo.save(newSettings);
    }

    /**
     * Formats a phone number to E.164 format using the default prefix stored in settings.
     * @param rawNumber - Raw phone number (may or may not have country code)
     * @param prefix - Country prefix like '+229', fallback to settings default
     */
    formatPhoneNumber(rawNumber: string, prefix: string): string {
        if (!rawNumber) return '';
        const cleaned = rawNumber.replace(/\s+/g, '').replace(/-/g, '');
        if (cleaned.startsWith('+')) return cleaned;
        return `${prefix}${cleaned}`;
    }

    /**
     * Interpolates a template string (e.g. "Commande {{ orderCode }} confirmée")
     * with the provided variables object.
     */
    interpolate(template: string, vars: Record<string, string | number>): string {
        return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
            return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
        });
    }

    /**
     * Send a transactional SMS via the Brevo API.
     * @param recipient - Phone number in E.164 format (or raw, will be auto-formatted)
     * @param content - The text message content
     * @param settings - Pre-loaded BrevoSettings (to avoid multiple DB calls per event)
     */
    async sendSms(recipient: string, content: string, settings: BrevoSettings): Promise<void> {
        if (!settings?.brevoApiKey) {
            this.logger.warn('Brevo API key not configured. Skipping SMS send.');
            return;
        }

        const formattedRecipient = this.formatPhoneNumber(recipient, settings.defaultPhonePrefix || '+229');

        try {
            const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': settings.brevoApiKey,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'transactional',
                    unicodeEnabled: false,
                    sender: 'AHIZAN',
                    recipient: formattedRecipient,
                    content,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`Failed to send SMS to ${formattedRecipient}: ${error}`);
            } else {
                this.logger.log(`SMS sent successfully to ${formattedRecipient}`);
            }
        } catch (err: any) {
            this.logger.error(`Error sending SMS to ${formattedRecipient}: ${err.message}`);
        }
    }

    /**
     * Send a transactional Email via the Brevo API.
     * @param recipientEmail - Email address of the recipient
     * @param subject - Email subject
     * @param htmlContent - Email HTML/Text content
     * @param settings - Pre-loaded BrevoSettings
     */
    async sendTransactionalEmail(recipientEmail: string, subject: string, htmlContent: string, settings: BrevoSettings): Promise<void> {
        const method = settings.emailMethod || 'smtp';
        this.logger.log(`Sending transactional email to ${recipientEmail} using ${method} method (Subject: ${subject})`);

        let fromName = settings.fromName || 'AHIZAN';
        let fromEmail = settings.fromEmail || 'noreply@ahizan.com';

        // Fallback to ENV if not set in DB
        if (!settings.fromEmail && process.env.BREVO_FROM_EMAIL) {
            const match = process.env.BREVO_FROM_EMAIL.match(/"?([^"]*)"?\s*<([^>]+)>/);
            if (match) {
                fromName = match[1] || fromName;
                fromEmail = match[2] || fromEmail;
            }
        }

        const fromAddress = `"${fromName}" <${fromEmail}>`;

        if (method === 'api') {
            await this.sendEmailViaApi(recipientEmail, subject, htmlContent, settings, fromName, fromEmail);
        } else {
            await this.sendEmailViaSmtp(recipientEmail, subject, htmlContent, settings, fromAddress);
        }
    }

    private async sendEmailViaApi(recipientEmail: string, subject: string, htmlContent: string, settings: BrevoSettings, fromName: string, fromEmail: string) {
        if (!settings?.brevoApiKey) {
            this.logger.warn('Brevo API key not configured. Skipping API Email send.');
            return;
        }

        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': settings.brevoApiKey.trim(),
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: fromName, email: fromEmail },
                    to: [{ email: recipientEmail }],
                    subject,
                    htmlContent: `<div style="font-family: sans-serif; white-space: pre-wrap;">${htmlContent}</div>`,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`Failed to send Email to ${recipientEmail} via API: ${error}`);
            } else {
                this.logger.log(`Email sent successfully to ${recipientEmail} via API`);
            }
        } catch (err: any) {
            this.logger.error(`Error sending Email to ${recipientEmail} via API: ${err.message}`);
        }
    }

    private async sendEmailViaSmtp(recipientEmail: string, subject: string, htmlContent: string, settings: BrevoSettings, fromAddress: string) {
        const host = settings.smtpHost || process.env.BREVO_SMTP_HOST;
        const port = settings.smtpPort || +(process.env.BREVO_SMTP_PORT || 587);
        const user = settings.smtpUser || process.env.BREVO_SMTP_USER;
        const pass = settings.smtpPassword || process.env.BREVO_SMTP_PASSWORD;

        if (!host || !user) {
            this.logger.warn('SMTP settings not configured. Skipping SMTP Email send.');
            return;
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            auth: { user, pass },
        });

        try {
            await transporter.sendMail({
                from: fromAddress,
                to: recipientEmail,
                subject,
                html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${htmlContent}</div>`,
            });
            this.logger.log(`Email sent successfully to ${recipientEmail} via SMTP`);
        } catch (err: any) {
            this.logger.error(`Error sending Email to ${recipientEmail} via SMTP: ${err.message}`);
        }
    }
}
