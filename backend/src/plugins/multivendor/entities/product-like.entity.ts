import { Entity, ManyToOne, Index } from 'typeorm';
import { VendureEntity, DeepPartial, Customer, Product } from '@vendure/core';

@Entity()
@Index(['customer', 'product'], { unique: true })
export class ProductLike extends VendureEntity {
    constructor(input?: DeepPartial<ProductLike>) {
        super(input);
    }

    @ManyToOne(type => Customer, { onDelete: 'CASCADE' })
    customer: Customer;

    @ManyToOne(type => Product, { onDelete: 'CASCADE' })
    product: Product;
}
