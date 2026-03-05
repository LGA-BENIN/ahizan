import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { BrevoSettings } from './entities/brevo-settings.entity';

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
}
