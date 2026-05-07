import {MigrationInterface, QueryRunner} from "typeorm";

export class HabillageSystem1776000000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Check if columns exist before adding them (idempotent migration)
        const columns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'page_preset' 
            AND column_name IN ('isBackup', 'changeHistory', 'historyPointer')
        `);
        const existingCols = columns.map((c: any) => c.column_name);

        if (!existingCols.includes('isBackup')) {
            await queryRunner.query(`ALTER TABLE "page_preset" ADD "isBackup" boolean NOT NULL DEFAULT false`, undefined);
        }
        if (!existingCols.includes('changeHistory')) {
            await queryRunner.query(`ALTER TABLE "page_preset" ADD "changeHistory" text`, undefined);
        }
        if (!existingCols.includes('historyPointer')) {
            await queryRunner.query(`ALTER TABLE "page_preset" ADD "historyPointer" integer NOT NULL DEFAULT -1`, undefined);
        }
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "page_preset" DROP COLUMN IF EXISTS "historyPointer"`, undefined);
        await queryRunner.query(`ALTER TABLE "page_preset" DROP COLUMN IF EXISTS "changeHistory"`, undefined);
        await queryRunner.query(`ALTER TABLE "page_preset" DROP COLUMN IF EXISTS "isBackup"`, undefined);
   }

}
