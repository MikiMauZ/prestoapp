import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'prestoapp',
  publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
};

// Inicialización del cliente S3 para Cloudflare R2
const getS3Client = () => {
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error('Faltan credenciales de Cloudflare R2 en las variables de entorno.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
  });
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    const s3 = getS3Client();
    const key = `docs/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3.send(command);

    const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Error en el proxy de subida R2:', error);
    return NextResponse.json({ error: error.message || 'Error interno en la subida' }, { status: 500 });
  }
}
