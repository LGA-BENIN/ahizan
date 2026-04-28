import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, ListQueryBuilder, ID, Logger } from '@vendure/core';
import { RegistrationField } from '../entities/registration-field.entity';
import { RegistrationResponse } from '../entities/registration-response.entity';
import { Vendor } from '../../multivendor/entities/vendor.entity';

import { OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class RegistrationFieldService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder
    ) { }

    async onApplicationBootstrap() {
        // Check if we need to seed
        // We use a safe check: if 'rccmNumber' is missing, likely we have old data or no data
        const repo = this.connection.rawConnection.getRepository(RegistrationField);
        try {
            const rccm = await repo.findOne({ where: { name: 'rccmNumber' } });
            if (!rccm) {
                console.log('Seeding Registration Fields...');
                await this.resetAndSeed();
                console.log('Registration Fields Seeded.');
            }
        } catch (e) {
            console.error('Error seeding registration fields:', e);
        }
    }

    async findAll(ctx: RequestContext) {
        const fields = await this.connection.getRepository(ctx, RegistrationField).find({
            where: {
                enabled: true,
            },
            order: {
                order: 'ASC',
            }
        });
        Logger.info(`[RegistrationFieldService] findAll found ${fields.length} enabled fields: ${fields.map(f => f.name).join(', ')}`, 'PageInscriptionPlugin');
        return fields;
    }

    async findAllAdmin(ctx: RequestContext) {
        return this.connection.getRepository(ctx, RegistrationField).find({
            order: {
                order: 'ASC',
            },
        });
    }

    async findOne(ctx: RequestContext, id: ID) {
        return this.connection.getEntityOrThrow(ctx, RegistrationField, id);
    }

    async create(ctx: RequestContext, input: any) {
        const newField = new RegistrationField(input);
        return this.connection.getRepository(ctx, RegistrationField).save(newField);
    }

    async update(ctx: RequestContext, id: ID, input: any) {
        const field = await this.findOne(ctx, id);
        const updated = { ...field, ...input };
        return this.connection.getRepository(ctx, RegistrationField).save(updated);
    }

    async delete(ctx: RequestContext, id: ID) {
        const field = await this.findOne(ctx, id);
        await this.connection.getRepository(ctx, RegistrationField).remove(field);
        return {
            result: 'DELETED',
            message: 'Field deleted successfully',
        };
    }

    async submitResponses(ctx: RequestContext, input: any[]) {
        const userId = ctx.activeUserId;
        if (!userId) {
            throw new Error('You must be logged in to submit registration details');
        }

        // Find the vendor linked to this user
        // Note: We are using the custom Vendor entity from MultivendorPlugin
        const vendorRepo = this.connection.getRepository(ctx, Vendor);
        const vendor = await vendorRepo.findOne({
            where: {
                user: { id: userId }
            }
        });

        if (!vendor) {
            // It might be that the vendor is not yet created, or the user is just a generic user.
            // For now, we require a vendor record.
            // If the flow is User -> Submit -> Vendor, we might need to pass VendorID or create Vendor here.
            // Assuming "Page Inscription" is for *existing* vendors (or pending ones).
            throw new Error('No vendor profile found for this user');
        }

        const responseRepo = this.connection.getRepository(ctx, RegistrationResponse);

        for (const item of input) {
            // Check if response exists
            const existing = await responseRepo.findOne({
                where: {
                    vendor: { id: vendor.id },
                    registrationField: { id: item.registrationFieldId }
                }
            });

            if (existing) {
                existing.value = item.value;
                await responseRepo.save(existing);
            } else {
                await responseRepo.save(new RegistrationResponse({
                    vendor,
                    registrationField: { id: item.registrationFieldId } as any,
                    value: item.value
                }));
            }
        }

        return true;
    }

    async getMyResponses(ctx: RequestContext) {
        const userId = ctx.activeUserId;
        if (!userId) return [];

        const vendorRepo = this.connection.getRepository(ctx, Vendor);
        const vendor = await vendorRepo.findOne({
            where: {
                user: { id: userId }
            }
        });

        if (!vendor) return [];

        return this.connection.getRepository(ctx, RegistrationResponse).find({
            where: {
                vendor: { id: vendor.id }
            },
            relations: ['registrationField']
        });
    }

    async getVendorResponses(ctx: RequestContext, vendorId: ID) {
        return this.connection.getRepository(ctx, RegistrationResponse).find({
            where: {
                vendor: { id: vendorId }
            },
            relations: ['registrationField']
        });
    }
    async resetAndSeed() {
        const repo = this.connection.rawConnection.getRepository(RegistrationField);

        // 1. Delete all existing fields
        // We might need to handle constraints if there are responses, but for now we assume we can wipe or cascade
        const existing = await repo.find();
        if (existing.length > 0) {
            await repo.remove(existing);
        }

        // 2. Define new fields
        const fields = [
            // Identity
            { name: 'name', label: 'Nom de la boutique', type: 'text', required: true, order: 0, enabled: true },
            { name: 'email', label: 'Email', type: 'text', required: true, order: 1, enabled: true },
            { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true, order: 2, enabled: true },
            { name: 'address', label: 'Adresse géographique', type: 'text', required: false, order: 3, enabled: true },
            { name: 'zone', label: 'Zone / Quartier', type: 'text', required: false, order: 4, enabled: true },

            // Business
            { name: 'description', label: 'Description', type: 'text', required: false, order: 5, enabled: true },
            {
                name: 'type',
                label: 'Type de Vendeur',
                type: 'select',
                required: true,
                order: 6,
                enabled: true,
                options: [
                    { label: 'Individu', value: 'INDIVIDUAL' },
                    { label: 'En Ligne', value: 'ONLINE' },
                    { label: 'Boutique Physique', value: 'SHOP' },
                    { label: 'Entreprise', value: 'ENTERPRISE' }
                ]
            },
            { name: 'deliveryInfo', label: 'Infos Livraison', type: 'text', required: false, order: 7, enabled: true },
            { name: 'returnPolicy', label: 'Politique Retour', type: 'text', required: false, order: 8, enabled: true },

            // Legal & Identity
            { name: 'rccmNumber', label: 'N° RCCM', type: 'text', required: false, order: 9, enabled: true },
            { name: 'rccmFile', label: 'Fichier RCCM', type: 'file', required: false, order: 10, enabled: true },
            { name: 'ifuNumber', label: 'N° IFU', type: 'text', required: false, order: 11, enabled: true },
            { name: 'ifuFile', label: 'Fichier IFU', type: 'file', required: false, order: 12, enabled: true },
            { name: 'idCardNumber', label: 'N° Carte d\'identité / CIP', type: 'text', required: false, order: 13, enabled: true },
            { name: 'idCardFile', label: 'Fichier Pièce d\'identité', type: 'file', required: false, order: 14, enabled: true },

            // Socials
            { name: 'website', label: 'Site Web', type: 'text', required: false, order: 15, enabled: true },
            { name: 'facebook', label: 'Facebook', type: 'text', required: false, order: 16, enabled: true },
            { name: 'instagram', label: 'Instagram', type: 'text', required: false, order: 17, enabled: true },

            // Visuals
            { name: 'logo', label: 'Logo', type: 'file', required: false, order: 18, enabled: true },
            { name: 'coverImage', label: 'Image de couverture', type: 'file', required: false, order: 19, enabled: true },
        ];

        // 3. Create fields
        for (const f of fields) {
            await repo.save(new RegistrationField(f));
        }

        return { success: true, count: fields.length };
    }
}
