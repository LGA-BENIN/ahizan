import { EmailSender, EmailDetails } from '@vendure/email-plugin';
import { Logger } from '@vendure/core';
import nodemailer from 'nodemailer';
import { DataSource } from 'typeorm';

export class DynamicEmailSender implements EmailSender {
    private dataSource: DataSource | null = null;

    setDataSource(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async send(email: EmailDetails, options: any): Promise<void> {
        let method = process.env.BREVO_SMTP_HOST ? 'smtp' : 'api';
        let smtpConfig = {
            host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
            port: +(process.env.BREVO_SMTP_PORT || 587),
            user: process.env.BREVO_SMTP_USER || '',
            pass: process.env.BREVO_SMTP_PASSWORD || ''
        };
        let apiKey = '';
        let fromAddress = process.env.BREVO_FROM_EMAIL || '"Ahizan" <noreply@ahizan.com>';

        // Try to fetch dynamic settings from DB
        try {
            if (this.dataSource && this.dataSource.isInitialized) {
                Logger.info('Fetching Brevo settings from database...', 'DynamicEmailSender');
                const results = await this.dataSource.query('SELECT * FROM "brevo_settings" WHERE id = $1', ['brevo_settings']);
                if (results && results.length > 0) {
                    const settings = results[0];
                    Logger.info(`Found database settings. Method: ${settings.emailMethod}`, 'DynamicEmailSender');
                    if (settings.emailMethod) method = settings.emailMethod;
                    if (settings.smtpHost) smtpConfig.host = settings.smtpHost;
                    if (settings.smtpPort) smtpConfig.port = settings.smtpPort;
                    if (settings.smtpUser) smtpConfig.user = settings.smtpUser;
                    if (settings.smtpPassword) smtpConfig.pass = settings.smtpPassword;
                    if (settings.brevoApiKey) apiKey = settings.brevoApiKey;
                    if (settings.fromEmail) {
                        const name = settings.fromName || 'Ahizan';
                        fromAddress = `"${name}" <${settings.fromEmail}>`;
                    }
                } else {
                    Logger.info('No database settings found. Using defaults/env.', 'DynamicEmailSender');
                }
            } else {
                Logger.info('DataSource not available or not initialized. Using defaults/env.', 'DynamicEmailSender');
            }
        } catch (err: any) {
            Logger.error(`Could not fetch dynamic Brevo settings, falling back to ENV: ${err.message}`, 'DynamicEmailSender');
        }

        if (method === 'api') {
            await this.sendViaApi(email, apiKey, fromAddress);
        } else {
            await this.sendViaSmtp(email, smtpConfig, fromAddress);
        }
    }

    private async sendViaApi(email: EmailDetails, apiKey: string, fromAddress: string) {
        if (!apiKey) {
            Logger.error('Cannot send email via API: API key is missing in BrevoSettings.', 'DynamicEmailSender');
            return;
        }

        const match = fromAddress.match(/"?([^"]*)"?\s*<([^>]+)>/);
        const senderName = match ? match[1] : 'Ahizan';
        const senderEmail = match ? match[2] : 'noreply@ahizan.com';

        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': apiKey.trim(),
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: senderName, email: senderEmail },
                    to: [{ email: email.recipient }],
                    subject: email.subject,
                    htmlContent: email.body, // Default email plugin generates HTML bodies
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                Logger.error(`Failed to send Email to ${email.recipient} via API: ${error}`, 'DynamicEmailSender');
            } else {
                Logger.info(`Email sent successfully to ${email.recipient} via API`, 'DynamicEmailSender');
            }
        } catch (err: any) {
            Logger.error(`Error sending Email to ${email.recipient} via API: ${err.message}`, 'DynamicEmailSender');
        }
    }

    private async sendViaSmtp(email: EmailDetails, config: any, fromAddress: string) {
        if (!config.host || !config.user) {
            Logger.error('Cannot send email via SMTP: Host or User is missing.', 'DynamicEmailSender');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to: email.recipient,
                subject: email.subject,
                html: email.body,
            });
            Logger.info(`Email sent successfully to ${email.recipient} via SMTP: ${info.messageId}`, 'DynamicEmailSender');
        } catch (err: any) {
            Logger.error(`Error sending Email to ${email.recipient} via SMTP: ${err.message}`, 'DynamicEmailSender');
        }
    }
}
