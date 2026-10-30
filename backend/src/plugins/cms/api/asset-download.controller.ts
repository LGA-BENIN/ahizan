import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { WatermarkService } from '../service/watermark.service';

@Controller('asset-download')
export class AssetDownloadController {
    constructor(private watermarkService: WatermarkService) {}

    @Get('*')
    async downloadAsset(@Req() req: Request, @Res() res: Response) {
        const rawPath = req.path.replace(/^\/asset-download\/?/, '');
        if (!rawPath) {
            return res.status(HttpStatus.BAD_REQUEST).send('Chemin de fichier manquant');
        }

        let cleanPath = decodeURIComponent(rawPath).replace(/\\/g, '/');
        const assetsIdx = cleanPath.indexOf('/assets/');
        if (assetsIdx !== -1) {
            cleanPath = cleanPath.substring(assetsIdx + 8);
        } else if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            cleanPath = cleanPath.replace(/^https?:\/\/[^\/]+\/(assets\/)?/, '');
        } else {
            cleanPath = cleanPath.replace(/^\/?(assets\/)?/, '');
        }

        try {
            const result = await this.watermarkService.getWatermarkedImage(cleanPath);
            if (!result) {
                return res.status(HttpStatus.NOT_FOUND).send('Image introuvable');
            }

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.status(HttpStatus.OK).send(result.buffer);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Erreur lors du traitement du filigrane');
        }
    }
}
