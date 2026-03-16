
/**
 * @fileOverview Utilidad para subir archivos a Cloudflare R2 mediante el servidor (Proxy).
 * Nota: Se recomienda usar Cloudinary si las credenciales de R2 no están configuradas correctamente.
 */

export async function uploadToR2(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/r2-presigned', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      // Si falla por credenciales, lanzamos un error descriptivo
      throw new Error(errorData.error || 'Error en la subida a R2. Verifica la longitud de las claves en .env');
    }

    const { url } = await res.json();
    return url;
  } catch (error: any) {
    console.error('Error en uploadToR2:', error);
    // Sugerencia: El error "Credential access key has length 18" indica llaves mal configuradas.
    throw error;
  }
}
