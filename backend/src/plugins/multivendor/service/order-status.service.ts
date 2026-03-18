import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Channel } from '@vendure/core';
import { OrderStatus } from '../entities/order-status.entity';

@Injectable()
export class OrderStatusService implements OnApplicationBootstrap {
    constructor(private connection: TransactionalConnection) { }

    async findAll(ctx: RequestContext): Promise<OrderStatus[]> {
        return this.connection.getRepository(ctx, OrderStatus).find({
            where: { enabled: true },
            order: { order: 'ASC' },
        });
    }

    async findVendorStatuses(ctx: RequestContext): Promise<OrderStatus[]> {
        return this.connection.getRepository(ctx, OrderStatus).find({
            where: { enabled: true, vendorCanSet: true },
            order: { order: 'ASC' },
        });
    }

    async findByCode(ctx: RequestContext, code: string): Promise<OrderStatus | null> {
        return this.connection.getRepository(ctx, OrderStatus).findOne({ where: { code } });
    }

    async create(ctx: RequestContext, input: Partial<OrderStatus>): Promise<OrderStatus> {
        const status = this.connection.getRepository(ctx, OrderStatus).create(input);
        return this.connection.getRepository(ctx, OrderStatus).save(status);
    }

    async update(ctx: RequestContext, id: string, input: Partial<OrderStatus>): Promise<OrderStatus> {
        const status = await this.connection.getRepository(ctx, OrderStatus).findOne({ where: { id } });
        if (!status) throw new Error(`OrderStatus with id ${id} not found`);
        Object.assign(status, input);
        return this.connection.getRepository(ctx, OrderStatus).save(status);
    }

    async delete(ctx: RequestContext, id: string): Promise<boolean> {
        const result = await this.connection.getRepository(ctx, OrderStatus).delete(id);
        return (result.affected || 0) > 0;
    }

    async onApplicationBootstrap() {
        try {
            const repo = this.connection.rawConnection.getRepository(OrderStatus);
            const count = await repo.count();
            if (count === 0) {
                console.log('OrderStatusService: Seeding default order statuses...');
                const defaults = [
                    { code: 'pending', label: 'En attente', color: '#F59E0B', order: 1, vendorCanSet: false, isFinal: false, enabled: true },
                    { code: 'confirmed', label: 'Confirmée', color: '#3B82F6', order: 2, vendorCanSet: true, isFinal: false, enabled: true },
                    { code: 'preparing', label: 'En préparation', color: '#8B5CF6', order: 3, vendorCanSet: true, isFinal: false, enabled: true },
                    { code: 'shipped', label: 'Expédiée', color: '#6366F1', order: 4, vendorCanSet: true, isFinal: false, enabled: true },
                    { code: 'in_transit', label: 'En cours de livraison', color: '#0EA5E9', order: 5, vendorCanSet: true, isFinal: false, enabled: true },
                    { code: 'delivered', label: 'Livrée', color: '#10B981', order: 6, vendorCanSet: true, isFinal: true, enabled: true },
                    { code: 'cancelled', label: 'Annulée', color: '#EF4444', order: 7, vendorCanSet: false, isFinal: true, enabled: true },
                ];
                for (const d of defaults) {
                    await repo.save(repo.create(d));
                }
                console.log('OrderStatusService: Default statuses seeded.');
            }
        } catch (e) {
            console.error('OrderStatusService: Failed to seed defaults:', e);
        }
    }
}
