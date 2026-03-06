import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '6c500887051c29369b7b7a543cb4bdee',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'prestoapp',
  publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
};

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId || '',
    secretAccessKey: R2_CONFIG.secretAccessKey || '',
  },
  forcePathStyle: true,
});

export async function POST(request: Request) {
  try {
    const { fileName, contentType } = await request.json();
    
    if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.accountId) {
      return NextResponse.json({ error: 'R2 Credentials not configured in .env.local' }, { status: 500 });
    }

    const key = `docs/${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
