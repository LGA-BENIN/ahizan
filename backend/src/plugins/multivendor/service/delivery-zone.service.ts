import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext } from '@vendure/core';
import { DeliveryZone } from '../entities/delivery-zone.entity';

@Injectable()
export class DeliveryZoneService {
    constructor(private connection: TransactionalConnection) { }

    async findAll(ctx: RequestContext): Promise<DeliveryZone[]> {
        return this.connection.getRepository(ctx, DeliveryZone).find({
            where: { enabled: true },
            order: { order: 'ASC' },
        });
    }

    async findAllAdmin(ctx: RequestContext): Promise<DeliveryZone[]> {
        return this.connection.getRepository(ctx, DeliveryZone).find({
            order: { order: 'ASC' },
        });
    }

    async findByCode(ctx: RequestContext, code: string): Promise<DeliveryZone | null> {
        return this.connection.getRepository(ctx, DeliveryZone).findOne({ where: { code } });
    }

    async create(ctx: RequestContext, input: Partial<DeliveryZone>): Promise<DeliveryZone> {
        const zone = this.connection.getRepository(ctx, DeliveryZone).create(input);
        return this.connection.getRepository(ctx, DeliveryZone).save(zone);
    }

    async update(ctx: RequestContext, id: string, input: Partial<DeliveryZone>): Promise<DeliveryZone> {
        const zone = await this.connection.getRepository(ctx, DeliveryZone).findOne({ where: { id } });
        if (!zone) throw new Error(`DeliveryZone with id ${id} not found`);
        Object.assign(zone, input);
        return this.connection.getRepository(ctx, DeliveryZone).save(zone);
    }

    async delete(ctx: RequestContext, id: string): Promise<boolean> {
        const result = await this.connection.getRepository(ctx, DeliveryZone).delete(id);
        return (result.affected || 0) > 0;
    }
}
