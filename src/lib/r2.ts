/**
 * @fileOverview Utilidad para subir archivos a Cloudflare R2 mediante URLs firmadas.
 */

export async function uploadToR2(file: File): Promise<string> {
  try {
    // 1. Obtener la URL pre-firmada del servidor
    const res = await fetch('/api/r2-presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'No se pudo obtener la URL de carga de Cloudflare R2');
    }

    const { signedUrl, publicUrl } = await res.json();

    // 2. Subir el archivo directamente a R2 usando la URL firmada (PUT)
    // CRITICAL: El Content-Type debe coincidir exactamente con el firmado en el backend
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      mode: 'cors',
      credentials: 'omit'
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('R2 Upload Error Details:', errorText);
      throw new Error('Fallo al subir a Cloudflare R2. Verifica la política CORS en el panel de Cloudflare.');
    }

    return publicUrl;
  } catch (error: any) {
    console.error('Error en uploadToR2:', error);
    throw error;
  }
}
