Add-Type -AssemblyName System.Drawing;

# Chemins sources
$storeSrc = 'c:\Project\ahizan\Storefront\recom\03.png';
$sellerSrc = 'c:\Project\ahizan\seller\recom\03.png';

# Dossiers destination
$storeDest = 'c:\Project\ahizan\Storefront\public\icons';
$sellerDest = 'c:\Project\ahizan\seller\public\icons';

# Dimensions PWA requises
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512);

function Resize-Image($srcPath, $destDir, $prefix, $sizes) {
    $srcImage = [System.Drawing.Image]::FromFile($srcPath);
    foreach ($size in $sizes) {
        $filename = $prefix + 'icon-' + $size + 'x' + $size + '.png';
        $dest = Join-Path $destDir $filename;
        $bmp = New-Object System.Drawing.Bitmap($size, $size);
        $g = [System.Drawing.Graphics]::FromImage($bmp);
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality;
        $g.DrawImage($srcImage, 0, 0, $size, $size);
        $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png);
        $g.Dispose();
        $bmp.Dispose();
        Write-Host ('Created: ' + $dest);
    }
    $srcImage.Dispose();
}

Resize-Image $storeSrc $storeDest '' $sizes;
Resize-Image $sellerSrc $sellerDest 'seller-' $sizes;

Write-Host 'Done!';
