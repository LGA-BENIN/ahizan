/**
 * Client-side high performance image compressor using native browser Canvas.
 * Compresses raw smartphone photos (often 5MB - 15MB) down to ~150KB - 250KB
 * in milliseconds before network upload, preserving readability of ID cards/documents.
 */

export interface CompressOptions {
    maxDimension?: number;
    quality?: number;
    maxSizeKB?: number;
}

export async function compressImageClient(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const {
        maxDimension = 1600,
        quality = 0.8,
        maxSizeKB = 350
    } = options;

    // Do not touch PDF files
    if (file.type === 'application/pdf') {
        return file;
    }

    // Do not touch non-image files or SVG
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }

    // If file is already smaller than maxSizeKB, no compression needed
    if (file.size <= maxSizeKB * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let { width, height } = img;

                // Scale down while maintaining aspect ratio
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Fallback to original file if canvas context is unavailable
                    resolve(file);
                    return;
                }

                // Draw image on canvas
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }

                        const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                        const compressedFile = new File([blob], compressedFileName, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        console.log(
                            `[compressImageClient] ${file.name} compressed from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`
                        );

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                // If image fails to load, fallback to original
                resolve(file);
            };
        };

        reader.onerror = () => {
            resolve(file);
        };
    });
}
