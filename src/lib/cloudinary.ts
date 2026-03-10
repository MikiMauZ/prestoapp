
/**
 * @fileOverview Utilidad para subir archivos a Cloudinary.
 * Soporta tanto subidas firmadas (seguras) como no firmadas (más simples para prototipos).
 */

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

  if (!cloudName) {
    throw new Error('Configuración incompleta: Falta NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME. Verifica tus variables de entorno.');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    // Si el usuario ha configurado un Preset "Unsigned", usamos el método sencillo
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset);
    } else {
      // Si no hay preset, intentamos subida firmada (requiere API KEY y firma del servidor)
      if (!apiKey) {
        throw new Error('Para subir fotos necesitas o bien un NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (No firmado) o una NEXT_PUBLIC_CLOUDINARY_API_KEY (Firmado).');
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = { timestamp };

      const signResponse = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });

      if (!signResponse.ok) {
        const errorData = await signResponse.json();
        throw new Error(errorData.error || 'Fallo al obtener firma del servidor. ¿Está configurado el API_SECRET?');
      }

      const { signature } = await signResponse.json();

      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
    }

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      console.error('Cloudinary Error Detail:', uploadData.error);
      throw new Error(uploadData.error.message || 'Error en la respuesta de Cloudinary. Revisa el nombre del Cloud y el Preset.');
    }

    return uploadData.secure_url;
  } catch (error: any) {
    console.error('Error en uploadToCloudinary:', error);
    throw error;
  }
}
