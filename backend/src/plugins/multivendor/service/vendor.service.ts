import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    TransactionalConnection,
    ListQueryBuilder,
    RequestContext,
    ListQueryOptions,
    PaginatedList,
    Product,
    Order,
    EventBus,
    Asset,
    User,
    RoleService,
    PasswordCipher,
    Permission,
    NativeAuthenticationMethod,
    AssetService,
    Role,
    Channel,
    Administrator,
    Customer,
    UserInputError
} from '@vendure/core';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { VendorEvent } from '../events/vendor-event';
import { RegistrationField } from '../../page-inscription/entities/registration-field.entity';
import { IsNull } from 'typeorm';

@Injectable()
export class VendorService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private eventBus: EventBus,
        private roleService: RoleService,
        private passwordCipher: PasswordCipher,
        private assetService: AssetService,
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
        return this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.assets', 'assets')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.options', 'options')
            .leftJoinAndSelect('options.group', 'group')
            .where('product."customFieldsVendorid" = :vendorId', { vendorId })
            .andWhere('product.deletedAt IS NULL')
            .getMany();
    }

    async create(ctx: RequestContext, input: {
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
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

        rccmNumber?: string;
        rccmFile?: any; // Upload
        ifuNumber?: string;
        ifuFile?: any; // Upload
        idCardNumber?: string;
        idCardFile?: any; // Upload
        website?: string;
        facebook?: string;
        instagram?: string;

        dynamicDetails?: any;

        userId?: string;
        password?: string;
    }): Promise<Vendor> {
        // Generate defaults if missing
        const timestamp = new Date().getTime();
        const finalName = input.name || `Vendor ${timestamp}`;
        const finalEmail = input.email || `no-email-${timestamp}@ahizan.com`; // Placeholder email

        // Create SuperAdmin Context for the entire operation
        const adminCtx = await this.getSuperAdminContext(ctx);
        console.log('VendorService.create: Starting with SuperAdmin context');

        // Ensure dynamicDetails is initialized
        if (!input.dynamicDetails) {
            input.dynamicDetails = {};
        }

        // Map firstName and lastName to dynamicDetails if present (so they are saved)
        if (input.firstName) input.dynamicDetails['firstName'] = input.firstName;
        if (input.lastName) input.dynamicDetails['lastName'] = input.lastName;
        // Also map implicitly if they are passed as top-level args but validation expects them
        // (This step handles the mapping before validation loop)

        // --- VALIDATION OF DYNAMIC FIELDS (Server-Side) ---
        const registrationFields = await this.connection.getRepository(ctx, RegistrationField).find({
            where: { enabled: true }
        });

        for (const field of registrationFields) {
            if (field.required) {
                let isPresent = false;
                const fieldName = field.name;

                // Check standard fields mapped in input
                if (fieldName === 'name') isPresent = !!input.name;
                else if (fieldName === 'firstName') isPresent = !!input.firstName || !!input.dynamicDetails['firstName'];
                else if (fieldName === 'lastName') isPresent = !!input.lastName || !!input.dynamicDetails['lastName'];
                else if (fieldName === 'email') isPresent = !!input.email;
                else if (fieldName === 'phoneNumber') isPresent = !!input.phoneNumber;
                else if (fieldName === 'address') isPresent = !!input.address;
                else if (fieldName === 'description') isPresent = !!input.description;
                else if (fieldName === 'zone') isPresent = !!input.zone;
                else if (fieldName === 'deliveryInfo') isPresent = !!input.deliveryInfo;
                else if (fieldName === 'returnPolicy') isPresent = !!input.returnPolicy;
                else if (fieldName === 'type') isPresent = !!input.type;
                else if (fieldName === 'website') isPresent = !!input.website;
                else if (fieldName === 'facebook') isPresent = !!input.facebook;
                else if (fieldName === 'instagram') isPresent = !!input.instagram;
                else if (fieldName === 'rccmNumber') isPresent = !!input.rccmNumber;
                else if (fieldName === 'ifuNumber') isPresent = !!input.ifuNumber;
                else if (fieldName === 'idCardNumber') isPresent = !!input.idCardNumber;

                // Check file fields
                else if (fieldName === 'rccmFile') isPresent = !!input.rccmFile && input.rccmFile.size > 0;
                else if (fieldName === 'ifuFile') isPresent = !!input.ifuFile && input.ifuFile.size > 0;
                else if (fieldName === 'idCardFile') isPresent = !!input.idCardFile && input.idCardFile.size > 0;
                else if (fieldName === 'logo') isPresent = !!input.logoId; // Or check input.logo if handled differently
                else if (fieldName === 'coverImage') isPresent = !!input.coverImageId;

                // Check dynamicDetails for other fields
                else {
                    isPresent = input.dynamicDetails && input.dynamicDetails[fieldName] !== undefined && input.dynamicDetails[fieldName] !== null && input.dynamicDetails[fieldName] !== '';
                }

                if (!isPresent) {
                    throw new UserInputError(`Le champ "${field.label}" est obligatoire.`);
                }
            }
        }
        // --------------------------------------------------

        const vendor = new Vendor({
            name: finalName,
            email: finalEmail,
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

            rccmNumber: input.rccmNumber,
            ifuNumber: input.ifuNumber,
            idCardNumber: input.idCardNumber,
            website: input.website,
            facebook: input.facebook,
            instagram: input.instagram,

            dynamicDetails: input.dynamicDetails,
        });

        if (input.logoId) {
            vendor.logo = await this.connection.getEntityOrThrow(adminCtx, Asset, input.logoId);
        }

        if (input.coverImageId) {
            vendor.coverImage = await this.connection.getEntityOrThrow(adminCtx, Asset, input.coverImageId);
        }

        // Handle File Uploads
        if (input.rccmFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.rccmFile, tags: ['vendor-doc', 'rccm'] });
            if (!(asset as any).errorCode) {
                vendor.rccmFile = asset as Asset;
            }
        }
        if (input.ifuFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.ifuFile, tags: ['vendor-doc', 'ifu'] });
            if (!(asset as any).errorCode) {
                vendor.ifuFile = asset as Asset;
            }
        }
        if (input.idCardFile) {
            const asset = await this.assetService.create(adminCtx, { file: input.idCardFile, tags: ['vendor-doc', 'id-card'] });
            if (!(asset as any).errorCode) {
                vendor.idCardFile = asset as Asset;
            }
        }

        // Link to user if userId provided (for authenticated users)
        if (input.userId) {
            vendor.user = await this.connection.getEntityOrThrow(adminCtx, User, input.userId);
        } else if (input.password) {
            // Create a new user account for the vendor
            const passwordHash = await this.passwordCipher.hash(input.password);

            const newUser = await this.connection.getRepository(adminCtx, User).save(
                new User({
                    identifier: finalEmail,
                    verified: true,
                })
            );

            await this.connection.getRepository(adminCtx, NativeAuthenticationMethod).save(
                new NativeAuthenticationMethod({
                    identifier: finalEmail,
                    passwordHash,
                    user: newUser
                })
            );

            // Assign Vendor Role
            await this.assignVendorRole(adminCtx, newUser.id.toString());

            // Create Administrator for Dashboard Access
            console.log('VendorService.create: Creating Administrator entity for user...');
            const administrator = new Administrator({
                emailAddress: finalEmail,
                firstName: finalName.split(' ')[0] || 'Vendor',
                lastName: finalName.split(' ')[1] || 'Admin',
                user: newUser,
            });
            await this.connection.getRepository(adminCtx, Administrator).save(administrator);
            console.log('VendorService.create: Administrator entity created.');

            // Create Customer for Shop Access (Login via Shop API)
            console.log('VendorService.create: Creating Customer entity for user...');
            const customer = await this.connection.getRepository(adminCtx, Customer).save(
                new Customer({
                    emailAddress: finalEmail,
                    firstName: finalName.split(' ')[0] || 'Vendor',
                    lastName: finalName.split(' ')[1] || 'Customer',
                    user: newUser,
                })
            );
            console.log('VendorService.create: Customer entity created.');


            vendor.user = newUser;
        }

        const newVendor = await this.connection.getRepository(adminCtx, Vendor).save(vendor);
        this.eventBus.publish(new VendorEvent(adminCtx, newVendor, 'created', input));
        console.log('VendorService.create: Registration completed successfully');
        return newVendor;
    }

    async update(ctx: RequestContext, id: string, input: Partial<Vendor> & { logoId?: string; coverImageId?: string; rejectionReason?: string; dynamicDetails?: any }): Promise<Vendor> {
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
    /**
     * Get or create the Vendor role with appropriate permissions
     */
    private async getOrCreateVendorRole(ctx: RequestContext) {
        console.log('getOrCreateVendorRole: Checking for existing role...');
        let role = await this.connection.getRepository(ctx, Role).findOne({
            where: { code: 'vendor' }
        });

        const permissions = [
            Permission.Authenticated,
            Permission.ReadCatalog,
            Permission.CreateCatalog,
            Permission.UpdateCatalog,
            Permission.DeleteCatalog,
            Permission.ReadOrder,
            Permission.UpdateOrder,
            Permission.ReadAsset,
            Permission.CreateAsset,
            Permission.ReadCountry,
            Permission.ReadZone,
            Permission.ReadTaxCategory,
            Permission.ReadTaxRate,
            Permission.ReadPaymentMethod,
            Permission.ReadShippingMethod,
            Permission.ReadCustomer,
            Permission.ReadFacet,
            Permission.ReadAdministrator,
            Permission.ReadChannel,

            'Vendor' as Permission, // Custom permission defined in MultivendorPlugin
        ];

        if (role) {
            console.log('getOrCreateVendorRole: Role found. Updating permissions to ensure correctness...');
            role.permissions = permissions;
            role.description = 'Vendor role for managing own products and orders';
            role = await this.connection.getRepository(ctx, Role).save(role);
            console.log('getOrCreateVendorRole: Role permissions updated.');
            return role;
        }

        console.log('getOrCreateVendorRole: Role not found, creating new one...');
        role = await this.roleService.create(ctx, {
            code: 'vendor',
            description: 'Vendor role for managing own products and orders',
            permissions: permissions,
        });
        console.log('getOrCreateVendorRole: Role created.');
        return role;
    }

    /**
     * Assign Vendor role to a user
     */
    async assignVendorRole(ctx: RequestContext, userId: string) {
        console.log(`assignVendorRole: Assigning role to user ${userId}`);
        const user = await this.connection.getEntityOrThrow(ctx, User, userId, {
            relations: ['roles']
        });

        const vendorRole = await this.getOrCreateVendorRole(ctx);

        // Check if user already has the role
        const hasRole = user.roles.some(role => role.id === vendorRole.id);
        if (!hasRole) {
            console.log('assignVendorRole: User does not have role, adding it now.');
            user.roles.push(vendorRole as any);
            await this.connection.getRepository(ctx, User).save(user);
            console.log('assignVendorRole: Role assigned successfully.');
        } else {
            console.log('assignVendorRole: User already has role.');
        }
    }

    private async getSuperAdminContext(ctx: RequestContext): Promise<RequestContext> {
        const superAdminUser = await this.connection.getRepository(ctx, User).findOne({
            where: {
                identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
            },
            relations: ['roles', 'roles.channels']
        });

        if (!superAdminUser) {
            console.error('getSuperAdminContext: SUPER ADMIN USER NOT FOUND! Permissions will likely fail.');
        } else {
            console.log('getSuperAdminContext: Found SuperAdmin user:', superAdminUser.identifier);
        }

        // Mock a session with the superadmin user
        const session = {
            id: 'superadmin-session',
            expires: new Date(Date.now() + 1000 * 60 * 60),
            activeOrder: null,
            activeChannelId: ctx.channel.id,
            user: superAdminUser,
            isAuthenticated: true,
        } as any;

        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: ctx.channel,
            languageCode: ctx.languageCode,
            session: session,
        });
    }

    async onApplicationBootstrap() {
        console.log('VendorService: Bootstrapping... Checking for Vendor role to ensure it exists.');
        try {
            const ctx = await this.createBootstrapContext();
            await this.getOrCreateVendorRole(ctx);
            console.log('VendorService: Bootstrapping complete. Vendor role ready.');
        } catch (e) {
            console.error('VendorService: Failed to bootstrap vendor role:', e);
        }
    }

    private async createBootstrapContext(): Promise<RequestContext> {
        const channel = await this.connection.rawConnection.getRepository(Channel).findOne({
            where: { code: '__default_channel__' },
            relations: ['defaultTaxZone', 'defaultShippingZone']
        });

        if (!channel) {
            throw new Error('Default channel not found during bootstrap');
        }

        const superAdminUser = await this.connection.rawConnection.getRepository(User).findOne({
            where: {
                identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
            },
            relations: ['roles', 'roles.channels']
        });

        if (!superAdminUser) {
            console.error('createBootstrapContext: SuperAdmin user not found');
        }

        // Mock a session
        const session = {
            id: 'bootstrap-session',
            expires: new Date(Date.now() + 1000 * 60 * 60),
            activeOrder: null,
            activeChannelId: channel.id,
            user: superAdminUser,
            isAuthenticated: true,
        } as any;

        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel,
            languageCode: channel.defaultLanguageCode,
            session,
        });
    }
}
