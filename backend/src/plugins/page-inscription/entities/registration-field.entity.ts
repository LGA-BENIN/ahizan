import { DeepPartial, VendureEntity } from '@vendure/core';
import { Entity, Column } from 'typeorm';

export class FieldOption {
    label: string;
    value: string;
}

@Entity()
export class RegistrationField extends VendureEntity {
    constructor(input?: DeepPartial<RegistrationField>) {
        super(input);
    }

    @Column()
    name: string; // Internal name (key in JSON)

    @Column()
    label: string; // Display label

    @Column()
    type: string; // 'text' | 'number' | 'select' | 'boolean' | 'file' | 'date'

    @Column({ type: 'simple-json', nullable: true })
    options: FieldOption[] | null; // For select fields

    @Column({ default: false })
    required: boolean;

    @Column({ default: 0 })
    order: number;

    @Column({ default: true })
    enabled: boolean;

    @Column({ nullable: true })
    description: string; // Helper text

    @Column({ nullable: true })
    placeholder: string;

    @Column({ type: 'simple-json', nullable: true })
    config: any; // validation rules: { maxFileSize, allowedMimeTypes, minLength, maxLength }
}
