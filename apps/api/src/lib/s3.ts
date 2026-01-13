import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "ux-testing-api-screenshots";

/**
 * Upload a screenshot to S3
 * @param key - S3 object key (e.g., "screenshots/run-id/step-1.png")
 * @param data - Base64 encoded image data or Buffer
 * @param contentType - MIME type (default: image/png)
 * @returns S3 URL
 */
export async function uploadScreenshot(
    key: string,
    data: string | Buffer,
    contentType: string = "image/png"
): Promise<{ s3Key: string; s3Url: string }> {
    // Convert base64 to Buffer if needed
    const buffer = typeof data === "string"
        ? Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), "base64")
        : data;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3Client.send(command);

    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return { s3Key: key, s3Url };
}

/**
 * Generate a presigned URL for viewing a screenshot
 * @param key - S3 object key
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 */
export async function getPresignedUrl(
    key: string,
    expiresIn: number = 3600
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate S3 key for a screenshot
 */
export function generateScreenshotKey(
    runId: string,
    stepNumber: number,
    extension: string = "png"
): string {
    return `screenshots/${runId}/step-${stepNumber}.${extension}`;
}
