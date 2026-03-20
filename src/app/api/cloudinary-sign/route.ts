
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Endpoint para firmar peticiones de Cloudinary en el servidor.
 * Esto evita exponer el API_SECRET en el cliente.
 */
export async function POST(request: Request) {
  try {
    const { paramsToSign } = await request.json();
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Configuración de servidor incompleta: Falta CLOUDINARY_API_SECRET en el entorno del servidor.' },
        { status: 500 }
      );
    }

    // El protocolo de firma de Cloudinary requiere ordenar los parámetros alfabéticamente
    // y unirlos con '=' y '&'. Finalmente se concatena el API_SECRET (sin &).
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');

    const stringToSign = `${sortedParams}${apiSecret}`;
    
    // Generar hash SHA-1 hexadecimal
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error al generar firma de Cloudinary:', error);
    return NextResponse.json({ error: 'Fallo interno al generar la firma digital.' }, { status: 500 });
  }
}
