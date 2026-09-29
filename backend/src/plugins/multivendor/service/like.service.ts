import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Customer, Product, ID, TranslatorService } from '@vendure/core';
import { VendorLike } from '../entities/vendor-like.entity';
import { ProductLike } from '../entities/product-like.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class LikeService {
    constructor(
        private connection: TransactionalConnection,
        private translator: TranslatorService
    ) {}

    /**
     * Toggle like state on a Product for a specific Customer
     */
    async toggleProductLike(ctx: RequestContext, customerId: ID, productId: ID): Promise<boolean> {
        const numericCustomerId = Number(customerId);
        const numericProductId = Number(productId);

        const existingLike = await this.connection.getRepository(ctx, ProductLike).findOne({
            where: {
                customer: { id: numericCustomerId },
                product: { id: numericProductId },
            },
        });

        if (existingLike) {
            // Unlike: delete relationship
            await this.connection.getRepository(ctx, ProductLike).remove(existingLike);
            return false;
        } else {
            // Like: create relationship
            const customer = await this.connection.getRepository(ctx, Customer).findOne({ where: { id: numericCustomerId } });
            const product = await this.connection.getRepository(ctx, Product).findOne({ where: { id: numericProductId } });

            if (!customer || !product || product.deletedAt || product.enabled === false) {
                throw new Error(`Customer or active Product not found to create like`);
            }

            const newLike = new ProductLike({
                customer,
                product,
            });

            await this.connection.getRepository(ctx, ProductLike).save(newLike);
            return true;
        }
    }

    /**
     * Toggle like state on a Vendor for a specific Customer
     */
    async toggleVendorLike(ctx: RequestContext, customerId: ID, vendorId: ID): Promise<boolean> {
        const numericCustomerId = Number(customerId);
        const numericVendorId = Number(vendorId);

        const existingLike = await this.connection.getRepository(ctx, VendorLike).findOne({
            where: {
                customer: { id: numericCustomerId },
                vendor: { id: numericVendorId },
            },
        });

        if (existingLike) {
            // Unlike
            await this.connection.getRepository(ctx, VendorLike).remove(existingLike);
            return false;
        } else {
            // Like
            const customer = await this.connection.getRepository(ctx, Customer).findOne({ where: { id: numericCustomerId } });
            const vendor = await this.connection.getRepository(ctx, Vendor).findOne({ where: { id: numericVendorId } });

            if (!customer || !vendor) {
                throw new Error(`Customer or Vendor not found to create like`);
            }

            const newLike = new VendorLike({
                customer,
                vendor,
            });

            await this.connection.getRepository(ctx, VendorLike).save(newLike);
            return true;
        }
    }

    /**
     * Check if a product is liked by a customer
     */
    async isProductLikedByUser(ctx: RequestContext, customerId: ID, productId: ID): Promise<boolean> {
        const numericCustomerId = Number(customerId);
        const numericProductId = Number(productId);

        const count = await this.connection.getRepository(ctx, ProductLike)
            .createQueryBuilder('like')
            .innerJoin('like.product', 'product')
            .where('like.customerId = :customerId', { customerId: numericCustomerId })
            .andWhere('like.productId = :productId', { productId: numericProductId })
            .andWhere('product.deletedAt IS NULL')
            .andWhere('product.enabled = :enabled', { enabled: true })
            .getCount();

        return count > 0;
    }

    /**
     * Check if a vendor is liked by a customer
     */
    async isVendorLikedByUser(ctx: RequestContext, customerId: ID, vendorId: ID): Promise<boolean> {
        const numericCustomerId = Number(customerId);
        const numericVendorId = Number(vendorId);

        const count = await this.connection.getRepository(ctx, VendorLike).count({
            where: {
                customer: { id: numericCustomerId },
                vendor: { id: numericVendorId },
            },
        });
        return count > 0;
    }

    /**
     * Get total number of likes for a Product
     */
    async getProductLikesCount(ctx: RequestContext, productId: ID): Promise<number> {
        const numericProductId = Number(productId);
        return this.connection.getRepository(ctx, ProductLike)
            .createQueryBuilder('like')
            .innerJoin('like.product', 'product')
            .where('like.productId = :productId', { productId: numericProductId })
            .andWhere('product.deletedAt IS NULL')
            .andWhere('product.enabled = :enabled', { enabled: true })
            .getCount();
    }

    /**
     * Get total number of likes for a Vendor
     */
    async getVendorLikesCount(ctx: RequestContext, vendorId: ID): Promise<number> {
        const numericVendorId = Number(vendorId);
        return this.connection.getRepository(ctx, VendorLike).count({
            where: {
                vendor: { id: numericVendorId },
            },
        });
    }

    /**
     * Get list of customers who liked a specific Vendor (Subscribers)
     */
    async getVendorLikers(ctx: RequestContext, vendorId: ID, options?: any): Promise<{ items: Customer[]; totalItems: number }> {
        const numericVendorId = Number(vendorId);
        const skip = options?.skip || 0;
        const take = options?.take || 10;

        const [likes, totalItems] = await this.connection.getRepository(ctx, VendorLike).findAndCount({
            where: { vendor: { id: numericVendorId } },
            relations: ['customer'],
            skip,
            take,
            order: { createdAt: 'DESC' },
        });

        return {
            items: likes.map((l: VendorLike) => l.customer).filter(Boolean),
            totalItems,
        };
    }

    /**
     * Get list of vendors liked by a specific Customer
     */
    async getLikedVendorsForCustomer(ctx: RequestContext, customerId: ID, options?: any): Promise<{ items: Vendor[]; totalItems: number }> {
        const numericCustomerId = Number(customerId);
        const skip = options?.skip || 0;
        const take = options?.take || 10;

        const [likes, totalItems] = await this.connection.getRepository(ctx, VendorLike).findAndCount({
            where: { customer: { id: numericCustomerId } },
            relations: ['vendor', 'vendor.logo', 'vendor.coverImage'],
            skip,
            take,
            order: { createdAt: 'DESC' },
        });

        return {
            items: likes.map((l: VendorLike) => l.vendor).filter(Boolean),
            totalItems,
        };
    }

    /**
     * Get list of products liked by a specific Customer (excluding soft-deleted & disabled products)
     */
    async getLikedProductsForCustomer(ctx: RequestContext, customerId: ID, options?: any): Promise<{ items: Product[]; totalItems: number }> {
        const numericCustomerId = Number(customerId);
        const skip = options?.skip || 0;
        const take = options?.take || 10;

        const [likes, totalItems] = await this.connection.getRepository(ctx, ProductLike)
            .createQueryBuilder('like')
            .innerJoinAndSelect('like.product', 'product')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('product.translations', 'translations')
            .where('like.customerId = :customerId', { customerId: numericCustomerId })
            .andWhere('product.deletedAt IS NULL')
            .andWhere('product.enabled = :enabled', { enabled: true })
            .orderBy('like.createdAt', 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        const validProducts: Product[] = likes
            .map((l: ProductLike) => l.product)
            .filter((product: Product): product is Product => Boolean(product && !product.deletedAt && product.enabled !== false));
            
        const translatedProducts = validProducts.map((product: Product) => this.translator.translate(product, ctx));

        return {
            items: translatedProducts,
            totalItems,
        };
    }

    /**
     * Get statistics of product likes for a specific Vendor
     */
    async getVendorProductsLikes(ctx: RequestContext, vendorId: ID): Promise<Array<{ product: Product; likesCount: number }>> {
        const numericVendorId = Number(vendorId);

        const likes = await this.connection.getRepository(ctx, ProductLike).find({
            where: {
                product: {
                    customFields: {
                        vendor: { id: numericVendorId }
                    }
                }
            },
            relations: ['product', 'product.featuredAsset', 'product.variants', 'product.translations']
        });

        const productMap = new Map<string, { product: Product; likesCount: number }>();
        for (const like of likes) {
            if (!like.product) continue;
            const translatedProduct = this.translator.translate(like.product, ctx);
            const productId = String(translatedProduct.id);
            const existing = productMap.get(productId);
            if (existing) {
                existing.likesCount += 1;
            } else {
                productMap.set(productId, {
                    product: translatedProduct,
                    likesCount: 1
                });
            }
        }

        return Array.from(productMap.values()).sort((a, b) => b.likesCount - a.likesCount);
    }
}
