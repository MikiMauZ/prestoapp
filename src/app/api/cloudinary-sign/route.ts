import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { paramsToSign } = await request.json();
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiSecret) {
      return NextResponse.json({ error: 'Missing Cloudinary Secret' }, { status: 500 });
    }

    // Sort parameters alphabetically
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');

    const stringToSign = `${sortedParams}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    return NextResponse.json({ signature });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sign' }, { status: 500 });
  }
}