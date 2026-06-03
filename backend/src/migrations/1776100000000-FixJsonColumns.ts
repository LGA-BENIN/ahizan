import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to fix empty or invalid JSON values in simple-json columns.
 * TypeORM's simple-json columns fail when they contain empty strings instead of null or valid JSON.
 */
export class FixJsonColumns1776100000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Fix vendor.dynamicDetails - replace empty strings with null
        await queryRunner.query(`
            UPDATE vendor 
            SET "dynamicDetails" = NULL 
            WHERE "dynamicDetails" = '' OR "dynamicDetails" = 'null'::text
        `, undefined);

        // Fix platform_settings.vendorContactFields - replace empty strings with null
        await queryRunner.query(`
            UPDATE platform_settings 
            SET "vendorContactFields" = NULL 
            WHERE "vendorContactFields" = '' OR "vendorContactFields" = 'null'::text
        `, undefined);

        // Fix brevo_settings.channelsConfig - replace empty strings with null
        await queryRunner.query(`
            UPDATE brevo_settings 
            SET "channelsConfig" = NULL 
            WHERE "channelsConfig" = '' OR "channelsConfig" = 'null'::text
        `, undefined);

        // Fix registration_field.options - replace empty strings with null
        await queryRunner.query(`
            UPDATE registration_field 
            SET "options" = NULL 
            WHERE "options" = '' OR "options" = 'null'::text
        `, undefined);

        // Fix registration_field.config - replace empty strings with null
        await queryRunner.query(`
            UPDATE registration_field 
            SET "config" = NULL 
            WHERE "config" = '' OR "config" = 'null'::text
        `, undefined);

        // Fix collection_custom_fields.allowedFacetIds - replace empty strings with null
        await queryRunner.query(`
            UPDATE collection_custom_fields 
            SET "allowedFacetIds" = NULL 
            WHERE "allowedFacetIds" = '' 
               OR "allowedFacetIds" = 'null'::text 
               OR "allowedFacetIds" = '[]'::text
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // No down migration needed - this is a data fix
    }

}
