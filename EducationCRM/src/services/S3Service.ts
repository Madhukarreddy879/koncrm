import ReactNativeBlobUtil from 'react-native-blob-util';

class S3Service {
    /**
     * Uploads a file to S3 (or local server) using a presigned URL
     * @param filePath - Local path to the file
     * @param presignedUrl - Presigned URL for PUT request
     * @param contentType - MIME type of the file
     * @param onProgress - Callback for upload progress (0-100)
     */
    async uploadFile(
        filePath: string,
        presignedUrl: string,
        contentType: string = 'audio/aac',
        onProgress?: (progress: number) => void
    ): Promise<void> {
        try {
            // Remove 'file://' prefix if present for ReactNativeBlobUtil
            const cleanPath = filePath.replace('file://', '');

            console.log('[S3Service] Uploading file:', cleanPath);
            console.log('[S3Service] Target URL:', presignedUrl);

            const task = ReactNativeBlobUtil.fetch(
                'PUT',
                presignedUrl,
                {
                    'Content-Type': contentType,
                },
                ReactNativeBlobUtil.wrap(cleanPath)
            );

            if (onProgress) {
                task.uploadProgress((written, total) => {
                    const progress = (written / total) * 100;
                    onProgress(progress);
                });
            }

            const response = await task;

            if (response.info().status >= 200 && response.info().status < 300) {
                console.log('[S3Service] Upload successful');
            } else {
                throw new Error(`Upload failed with status ${response.info().status}`);
            }
        } catch (error) {
            console.error('[S3Service] Upload error:', error);
            throw error;
        }
    }
}

export default new S3Service();
