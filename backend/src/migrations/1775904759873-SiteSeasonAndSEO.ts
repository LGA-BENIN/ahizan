import {MigrationInterface, QueryRunner} from "typeorm";

export class SiteSeasonAndSEO1775904759873 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "site_season" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "startDate" TIMESTAMP, "endDate" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT false, "configJson" text, "id" SERIAL NOT NULL, "presetId" integer, CONSTRAINT "PK_54c31f5beb297340e1f8e564d7c" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ADD "metaDescription" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ADD "metaTitle" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ADD "metaKeywords" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "page" ADD "ogImage" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "site_season" ADD CONSTRAINT "FK_e6c10ff025f33da1ca33f1625f4" FOREIGN KEY ("presetId") REFERENCES "page_preset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "site_season" DROP CONSTRAINT "FK_e6c10ff025f33da1ca33f1625f4"`, undefined);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "ogImage"`, undefined);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "metaKeywords"`, undefined);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "metaTitle"`, undefined);
        await queryRunner.query(`ALTER TABLE "page" DROP COLUMN "metaDescription"`, undefined);
        await queryRunner.query(`DROP TABLE "site_season"`, undefined);
   }

}
