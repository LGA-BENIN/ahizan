import { VendureEntity, DeepPartial, ID } from '@vendure/core';
import { Entity, Column } from 'typeorm';

@Entity()
export class UserProfile extends VendureEntity {
    constructor(input?: DeepPartial<UserProfile>) {
        super(input);
    }

    @Column({ type: 'varchar', unique: true })
    userId: ID;

    @Column({ type: 'simple-array', nullable: true })
    favoriteCategoryIds: string[];

    @Column({ type: 'simple-array', nullable: true })
    frequentedGeoZoneIds: string[];

    @Column({ type: 'int', default: 0 })
    averageBudgetFcfa: number;

    @Column({ type: 'int', default: 0 })
    totalOrders: number;

    @Column({ type: 'timestamp', nullable: true })
    lastActiveAt: Date;
}
