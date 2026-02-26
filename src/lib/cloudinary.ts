/**
 * @fileOverview Utilidad para subir imágenes a Cloudinary utilizando firmas del servidor.
 */

export async function uploadToCloudinary(file: File): Promise<string> {
  // Usamos el identificador proporcionado por el usuario como nombre de la nube por defecto
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'a91b9a96-b7dc-46b3-a758-090d9afb4e51';
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

  // 1. Obtener la firma del servidor
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign = {
    timestamp: timestamp,
  };

  const signResponse = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    body: JSON.stringify({ paramsToSign }),
  });

  if (!signResponse.ok) {
    throw new Error('Error al obtener la firma de Cloudinary');
  }

  const { signature } = await signResponse.json();

  // 2. Subir el archivo a Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey || '');

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    throw new Error(uploadData.error.message);
  }

  return uploadData.secure_url;
}
