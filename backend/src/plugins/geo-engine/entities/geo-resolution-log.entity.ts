import { Column, Entity, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

@Entity()
export class GeoResolutionLog extends VendureEntity {
    constructor(input?: DeepPartial<GeoResolutionLog>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    latitude: number;

    @Column({ type: 'float' })
    longitude: number;

    @Column({ type: 'varchar', nullable: true })
    geoId: string;

    @Column({ type: 'int', nullable: true })
    geoZoneId: number;

    @Column({ type: 'int', nullable: true })
    marketId: number;

    @Column({ type: 'varchar', default: 'POSTGIS' })
    provider: string; // 'POSTGIS', 'NOMINATIM', 'GOOGLE_MAPS', 'FALLBACK'

    @Column({ type: 'float', default: 1.0 })
    confidence: number;

    @Column({ type: 'varchar', nullable: true })
    rawAddress: string;

    @CreateDateColumn()
    createdAt: Date;
}
