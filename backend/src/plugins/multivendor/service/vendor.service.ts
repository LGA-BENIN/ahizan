import { Injectable } from '@nestjs/common';
import { TransactionalConnection, ListQueryBuilder, RequestContext, ListQueryOptions, PaginatedList, Product, Order, EventBus, Asset, User, RoleService, PasswordCipher, Permission, NativeAuthenticationMethod } from '@vendure/core';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { VendorEvent } from '../events/vendor-event';

@Injectable()
export class VendorService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private eventBus: EventBus,
        private roleService: RoleService,
        private passwordCipher: PasswordCipher,
    ) { }

    findAll(ctx: RequestContext, options?: ListQueryOptions<Vendor>): Promise<PaginatedList<Vendor>> {
        return this.listQueryBuilder
            .build(Vendor, options, { ctx })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    findOne(ctx: RequestContext, id: string): Promise<Vendor | null> {
        return this.connection.getRepository(ctx, Vendor).findOne({
            where: { id },
            relations: ['logo', 'coverImage', 'user']
        });
    }

    async findByUserId(ctx: RequestContext, userId: string): Promise<Vendor | null> {
        return this.connection.getRepository(ctx, Vendor).findOne({
            where: { user: { id: userId } },
            relations: ['logo', 'coverImage', 'user']
        });
    }

    async findOrdersForVendor(ctx: RequestContext, vendorId: string, options?: any): Promise<PaginatedList<Order>> {
        const skip = options?.skip || 0;
        const take = options?.take || 10;

        const [orders, totalItems] = await this.connection.getRepository(ctx, Order).findAndCount({
            where: {
                customFields: {
                    vendor: { id: vendorId }
                }
            },
            skip,
            take,
            relations: ['lines', 'customer']
        });

        return {
            items: orders,
            totalItems
        };
    }

    async findAllProductsForVendor(ctx: RequestContext, vendorId: string): Promise<Product[]> {
        return this.connection.getRepository(ctx, Product).find({
            where: {
                customFields: {
                    vendor: { id: vendorId }
                }
            },
            relations: ['featuredAsset', 'assets', 'variants', 'variants.options', 'variants.options.group'],
        });
    }

    async create(ctx: RequestContext, input: {
        name: string;
        email: string;
        phoneNumber?: string;
        address?: string;
        description?: string;
        logoId?: string;
        coverImageId?: string;
        zone?: string;
        deliveryInfo?: string;
        returnPolicy?: string;
        rating?: number;
        ratingCount?: number;
        type?: string;
        userId?: string;
        password?: string;
    }): Promise<Vendor> {
        const vendor = new Vendor({
            name: input.name,
            email: input.email,
            phoneNumber: input.phoneNumber,
            address: input.address,
            description: input.description,
            zone: input.zone,
            deliveryInfo: input.deliveryInfo,
            returnPolicy: input.returnPolicy,
            rating: input.rating || 0,
            ratingCount: input.ratingCount || 0,
            type: input.type as any || 'INDIVIDUAL',
            status: VendorStatus.PENDING,
        });

        if (input.logoId) {
            vendor.logo = await this.connection.getEntityOrThrow(ctx, Asset, input.logoId);
        }
        if (input.coverImageId) {
            vendor.coverImage = await this.connection.getEntityOrThrow(ctx, Asset, input.coverImageId);
        }

        // Link to user if userId provided (for authenticated users)
        if (input.userId) {
            vendor.user = await this.connection.getEntityOrThrow(ctx, User, input.userId);
        } else if (input.password) {
            // Create a new user account for the vendor
            const passwordHash = await this.passwordCipher.hash(input.password);
            const newUser = await this.connection.getRepository(ctx, User).save(
                new User({
                    identifier: input.email,
                    verified: false,
                })
            );

            await this.connection.getRepository(ctx, NativeAuthenticationMethod).save(
                new NativeAuthenticationMethod({
                    identifier: input.email,
                    passwordHash,
                    user: newUser
                })
            );

            vendor.user = newUser;
        }

        const newVendor = await this.connection.getRepository(ctx, Vendor).save(vendor);
        this.eventBus.publish(new VendorEvent(ctx, newVendor, 'created', input));
        return newVendor;
    }

    async update(ctx: RequestContext, id: string, input: Partial<Vendor> & { logoId?: string; coverImageId?: string; rejectionReason?: string }): Promise<Vendor> {
        const vendor = await this.findOne(ctx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }

        // Logic for Rejection Reason
        if (input.status === VendorStatus.REJECTED && input.rejectionReason) {
            vendor.rejectionReason = input.rejectionReason;
        } else if (input.status === VendorStatus.APPROVED) {
            vendor.rejectionReason = ''; // Clear reason on approval
        }

        // Logic for Re-submission (if REJECTED and updating details)
        if (vendor.status === VendorStatus.REJECTED && !input.status && Object.keys(input).length > 0) {
            // Vendor is updating profile, reset to PENDING
            vendor.status = VendorStatus.PENDING;
            vendor.rejectionReason = '';
        }

        const updated = Object.assign(vendor, input);

        if (input.logoId) {
            updated.logo = await this.connection.getEntityOrThrow(ctx, Asset, input.logoId);
        }
        if (input.coverImageId) {
            updated.coverImage = await this.connection.getEntityOrThrow(ctx, Asset, input.coverImageId);
        }

        const savedVendor = await this.connection.getRepository(ctx, Vendor).save(updated);
        this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'updated', input));

        // Handle status change
        if (input.status && input.status !== vendor.status) {
            this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'statusChanged', input));

            // Automatically assign Vendor role when approved
            if (input.status === VendorStatus.APPROVED && savedVendor.user) {
                await this.assignVendorRole(ctx, savedVendor.user.id.toString());
            }
        }

        return savedVendor;
    }

    async getVendorByProductId(ctx: RequestContext, productId: string): Promise<Vendor | undefined> {
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId, {
            relations: ['customFields.vendor'],
        });
        return (product.customFields as any).vendor;
    }

    async validateOrderForVendor(ctx: RequestContext, orderId: string, newVendorId: string): Promise<boolean> {
        const order = await this.connection.getEntityOrThrow(ctx, Order, orderId, {
            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor'],
        });

        if (order.lines.length === 0) {
            return true;
        }

        const existingVendorId = (order.customFields as any).vendor?.id;

        if (existingVendorId && existingVendorId.toString() !== newVendorId) {
            return false;
        }

        for (const line of order.lines) {
            const lineVendor = (line.productVariant.product.customFields as any).vendor;
            if (lineVendor && lineVendor.id.toString() !== newVendorId) {
                return false;
            }
        }

        return true;
    }

    async setOrderVendor(ctx: RequestContext, orderId: string, vendorId: string) {
        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: {
                vendor: { id: vendorId }
            }
        });
    }

    async setOrderCommission(ctx: RequestContext, orderId: string, commission: number) {
        await this.connection.getRepository(ctx, Order).update(orderId, {
            customFields: {
                commissionAmount: commission
            }
        });
    }

    /**
     * Get or create the Vendor role with appropriate permissions
     */
    private async getOrCreateVendorRole(ctx: RequestContext) {
        const existingRole = await this.connection.getRepository(ctx, 'Role').findOne({
            where: { code: 'vendor' }
        });

        if (existingRole) {
            return existingRole;
        }

        // Create new Vendor role with basic permissions
        const role = await this.roleService.create(ctx, {
            code: 'vendor',
            description: 'Vendor role for managing own products and orders',
            permissions: [
                Permission.Authenticated,
                Permission.ReadCatalog,
                Permission.ReadOrder,
                Permission.UpdateOrder,
            ]
        });

        return role;
    }

    /**
     * Assign Vendor role to a user
     */
    async assignVendorRole(ctx: RequestContext, userId: string) {
        const user = await this.connection.getEntityOrThrow(ctx, User, userId, {
            relations: ['roles']
        });

        const vendorRole = await this.getOrCreateVendorRole(ctx);

        // Check if user already has the role
        const hasRole = user.roles.some(role => role.id === vendorRole.id);
        if (!hasRole) {
            user.roles.push(vendorRole as any);
            await this.connection.getRepository(ctx, User).save(user);
        }
    }
}
