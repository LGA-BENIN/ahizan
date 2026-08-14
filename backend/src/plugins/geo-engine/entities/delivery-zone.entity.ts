import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';
import { GeoZone } from './geo-zone.entity';

export enum DeliveryZoneType {
    RADIUS = 'RADIUS',
    POLYGON = 'POLYGON',
}

@Entity()
export class DeliveryZone extends VendureEntity {
    constructor(input?: DeepPartial<DeliveryZone>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
    ownerId?: string; // Separated from Vendor table directly for decoupling

    @Column({ nullable: true })
    name: string;

    @Column({ type: 'int', default: 0 })
    price: number;

    @Column({ type: 'int', nullable: true })
    maxPrice?: number | null;

    @Column({ type: 'varchar', default: DeliveryZoneType.RADIUS })
    type: DeliveryZoneType;

    @Column({ type: 'float', nullable: true })
    centerLatitude: number;

    @Column({ type: 'float', nullable: true })
    centerLongitude: number;

    @Column({ type: 'int', nullable: true })
    radiusMeters: number;

    @Column({
        type: 'geometry',
        nullable: true,
        spatialFeatureType: 'Geometry',
        srid: 4326,
    })
    @Index({ spatial: true })
    polygonGeometry: any;

    @ManyToOne(() => GeoZone, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    geoZone: GeoZone | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
