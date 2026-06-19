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
        const numericVendorId = Number(vendorId);
        return this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.translations', 'translations')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.assets', 'assets')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.translations', 'variantTranslations')
            .leftJoinAndSelect('variants.options', 'options')
            .leftJoinAndSelect('options.group', 'group')
            .where('product."customFieldsVendorid" = :vendorId', { vendorId: numericVendorId })
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
        logo?: any; // Upload
        coverImageId?: string;
        coverImage?: any; // Upload
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
        if (input.logo) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.logo.mimetype === 'image/gif' || input.logo.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.logo.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.logo.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.logo.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(adminCtx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    vendor.logo = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(adminCtx, { file: input.logo, tags: ['vendor-logo'] });
                if (!(asset as any).errorCode) {
                    vendor.logo = asset as Asset;
                }
            }
        }
        if (input.coverImage) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.coverImage.mimetype === 'image/gif' || input.coverImage.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.coverImage.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.coverImage.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.coverImage.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(adminCtx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    vendor.coverImage = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(adminCtx, { file: input.coverImage, tags: ['vendor-cover'] });
                if (!(asset as any).errorCode) {
                    vendor.coverImage = asset as Asset;
                }
            }
        }
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

    async update(ctx: RequestContext, id: string, input: Partial<Vendor> & { logoId?: string; logo?: any; coverImageId?: string; coverImage?: any; rejectionReason?: string; dynamicDetails?: any }): Promise<Vendor> {
        const vendor = await this.findOne(ctx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }

        const oldStatus = vendor.status;

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
        if (input.logo) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.logo.mimetype === 'image/gif' || input.logo.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.logo.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.logo.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.logo.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    updated.logo = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(ctx, { file: input.logo, tags: ['vendor-logo'] });
                if (!(asset as any).errorCode) {
                    updated.logo = asset as Asset;
                }
            }
        }
        if (input.coverImageId) {
            updated.coverImage = await this.connection.getEntityOrThrow(ctx, Asset, input.coverImageId);
        }
        if (input.coverImage) {
            // Check if file is a GIF - if so, skip Sharp processing to preserve animation
            const isGif = input.coverImage.mimetype === 'image/gif' || input.coverImage.filename?.toLowerCase().endsWith('.gif');

            if (isGif) {
                // For GIFs, we need to save the file directly without processing
                const fs = require('fs');
                const path = require('path');
                const assetsDir = path.join(__dirname, '../../../static/assets');
                const uniqueName = `${Date.now()}-${input.coverImage.filename}`;
                const filePath = path.join(assetsDir, uniqueName);

                // Ensure directory exists
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                // Write file directly
                const buffer = await input.coverImage.buffer;
                fs.writeFileSync(filePath, buffer);

                // Create asset record manually
                const asset = new Asset();
                asset.name = input.coverImage.filename;
                asset.type = 'IMAGE' as any;
                asset.mimeType = 'image/gif';
                asset.source = `/assets/${uniqueName}`;
                asset.preview = `/assets/${uniqueName}`;
                asset.fileSize = buffer.length;
                asset.width = 0;
                asset.height = 0;
                asset.focalPoint = { x: 0.5, y: 0.5 };

                const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
                if (!(savedAsset as any).errorCode) {
                    updated.coverImage = savedAsset as Asset;
                }
            } else {
                const asset = await this.assetService.create(ctx, { file: input.coverImage, tags: ['vendor-cover'] });
                if (!(asset as any).errorCode) {
                    updated.coverImage = asset as Asset;
                }
            }
        }

        const savedVendor = await this.connection.getRepository(ctx, Vendor).save(updated);
        this.eventBus.publish(new VendorEvent(ctx, savedVendor, 'updated', input));

        // Handle status change
        if (input.status && input.status !== oldStatus) {
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

    // -----------------------------------------------
    // WALLET MANAGEMENT
    // -----------------------------------------------

    /**
     * Credit (add funds) to a vendor's wallet.
     * Called by Super-Admin after receiving real payment (Mobile Money, bank transfer, etc.)
     */
    async creditWallet(ctx: RequestContext, vendorId: string, amount: number): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.walletBalance = (vendor.walletBalance || 0) + amount;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Debit (remove funds) from a vendor's wallet.
     * Called internally when a commission is due, or manually by Super-Admin.
     */
    async debitWallet(ctx: RequestContext, vendorId: string, amount: number): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.walletBalance = (vendor.walletBalance || 0) - amount;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Toggle whether a vendor is allowed to have a negative wallet balance (i.e. still accept orders).
     */
    async setAllowNegativeBalance(ctx: RequestContext, vendorId: string, allow: boolean): Promise<Vendor> {
        const vendor = await this.findOne(ctx, vendorId);
        if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
        vendor.allowNegativeBalance = allow;
        return this.connection.getRepository(ctx, Vendor).save(vendor);
    }

    /**
     * Check if a vendor can accept a new order given a commission amount.
     * Returns true if:
     *   - allowNegativeBalance is enabled (no restriction), OR
     *   - walletBalance >= commission amount
     */
    canAcceptOrder(vendor: Vendor, commissionAmount: number): boolean {
        if (vendor.allowNegativeBalance) return true;
        return (vendor.walletBalance || 0) >= commissionAmount;
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
            // NOTE: ReadOrder and UpdateOrder are intentionally excluded here.
            // Including them causes Vendure's shop API auth guard to set
            // authorizedAsOwnerOnly=false for vendor users, which breaks
            // shop mutations like addPaymentToOrder (returns NoActiveOrderError).
            // Vendor order management uses custom resolvers instead.
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
            await this.fixCorruptedJsonColumns();
            const ctx = await this.createBootstrapContext();
            await this.getOrCreateVendorRole(ctx);
            console.log('VendorService: Bootstrapping complete. Vendor role ready.');
        } catch (e) {
            console.error('VendorService: Failed to bootstrap vendor role:', e);
        }
    }

    private async fixCorruptedJsonColumns() {
        try {
            const repo = this.connection.getRepository(Vendor);
            const vendors = await repo.find();
            let fixed = 0;
            
            for (const vendor of vendors) {
                let needsSave = false;
                
                // Fix dynamicDetails if it's an empty string or invalid
                if (typeof vendor.dynamicDetails === 'string' && vendor.dynamicDetails.trim() === '') {
                    vendor.dynamicDetails = null;
                    needsSave = true;
                }
                
                if (needsSave) {
                    await repo.save(vendor);
                    fixed++;
                }
            }
            
            if (fixed > 0) {
                console.log(`[VendorService] Fixed ${fixed} corrupted JSON columns in vendor table`);
            }
        } catch (err) {
            console.error('[VendorService] Error fixing JSON columns:', err);
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

    async deleteVendor(ctx: RequestContext, id: string, deleteProducts: boolean, deleteOrders: boolean): Promise<boolean> {
        const adminCtx = await this.getSuperAdminContext(ctx);
        const vendor = await this.findOne(adminCtx, id);
        if (!vendor) {
            throw new Error(`Vendor with id ${id} not found`);
        }

        const userId = vendor.user?.id;
        const vendorId = vendor.id;

        // 1. Handle Products
        if (deleteProducts) {
            // Soft delete product variants
            await this.connection.rawConnection.query(
                `UPDATE product_variant SET "deletedAt" = NOW() WHERE "productId" IN (SELECT id FROM product WHERE "customFieldsVendorid" = $1)`,
                [vendorId]
            );
            // Soft delete products
            await this.connection.rawConnection.query(
                `UPDATE product SET "deletedAt" = NOW() WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        } else {
            // Unlink products from this vendor
            await this.connection.rawConnection.query(
                `UPDATE product SET "customFieldsVendorid" = NULL WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        }

        // 2. Handle Orders
        if (deleteOrders) {
            // Delete order lines of vendor's orders
            await this.connection.rawConnection.query(
                `DELETE FROM order_line WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                [vendorId]
            );
            // Delete payment records for vendor's orders
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM payment WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                    [vendorId]
                );
            } catch (e) {
                console.log('Skipping payment delete:', (e as any).message);
            }
            // Delete history entries for vendor's orders
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM history_entry WHERE "orderId" IN (SELECT id FROM "order" WHERE "customFieldsVendorid" = $1)`,
                    [vendorId]
                );
            } catch (e) {
                console.log('Skipping history_entry delete:', (e as any).message);
            }
            // Delete the orders
            await this.connection.rawConnection.query(
                `DELETE FROM "order" WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        } else {
            // Unlink orders from this vendor
            await this.connection.rawConnection.query(
                `UPDATE "order" SET "customFieldsVendorid" = NULL WHERE "customFieldsVendorid" = $1`,
                [vendorId]
            );
        }

        // 3. Delete user account and associated customer, administrator
        if (userId) {
            // Delete customer
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM customer WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete customer:', (e as any).message);
            }

            // Delete administrator
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM administrator WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete administrator:', (e as any).message);
            }

            // Delete authentication method
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM native_authentication_method WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete auth method:', (e as any).message);
            }

            // Delete role mappings
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM user_roles_role WHERE "userId" = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete user_roles_role:', (e as any).message);
            }

            // Delete user
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM "user" WHERE id = $1`,
                    [userId]
                );
            } catch (e) {
                console.log('Failed to delete user:', (e as any).message);
            }
        }

        // 4. Finally delete the Vendor record itself
        await this.connection.rawConnection.query(
            `DELETE FROM vendor WHERE id = $1`,
            [vendorId]
        );

        return true;
    }
}
