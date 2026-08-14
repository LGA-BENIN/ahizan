import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

export enum GeoZoneType {
    COUNTRY = 'COUNTRY',
    DEPARTMENT = 'DEPARTMENT',
    COMMUNE = 'COMMUNE',
    ARRONDISSEMENT = 'ARRONDISSEMENT',
    NEIGHBORHOOD = 'NEIGHBORHOOD',
}

export enum GeoZoneStatus {
    ACTIVE = 'ACTIVE',
    DRAFT = 'DRAFT',
    ARCHIVED = 'ARCHIVED',
}

@Entity()
export class GeoZone extends VendureEntity {
    constructor(input?: DeepPartial<GeoZone>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Index({ unique: true })
    @Column({ unique: true })
    slug: string;

    @Index({ unique: true })
    @Column({ unique: true, nullable: true })
    geoId: string;

    @Column({ nullable: true })
    hierarchicalCode: string;

    @Column({ type: 'varchar', nullable: true })
    code: string;

    @Column({ type: 'varchar' })
    type: GeoZoneType;

    @Column({ type: 'varchar', default: GeoZoneStatus.ACTIVE })
    status: GeoZoneStatus;

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
    boundary: any;

    @ManyToOne(() => GeoZone, (parent) => parent.children, { nullable: true, onDelete: 'SET NULL' })
    parent: GeoZone | null;

    @OneToMany(() => GeoZone, (child) => child.parent)
    children: GeoZone[];

    @Column({ type: 'varchar', nullable: true })
    seoTitle: string;

    @Column({ type: 'text', nullable: true })
    seoDescription: string;

    @Column({ type: 'varchar', nullable: true })
    seoUrl: string;

    @Column({ type: 'varchar', nullable: true })
    image: string;

    @Column({ type: 'varchar', nullable: true })
    banner: string;

    @Column({ type: 'varchar', nullable: true })
    icon: string;

    @Column({ type: 'simple-json', nullable: true })
    stats: any;
}
