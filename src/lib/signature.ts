const MAX_INPUT_BYTES = 3 * 1024 * 1024;
const MAX_WIDTH = 600;

/** Convierte la imagen de la firma en un PNG optimizado (data URL). */
export const readSignatureFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecciona una imagen PNG o JPG."));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error("La imagen supera los 3 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () =>
        reject(new Error("El archivo no parece una imagen válida."));
      image.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No pudimos procesar la imagen."));
          return;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const MAX_LOGO_BYTES = 8 * 1024 * 1024;

/** Convierte el logo en un PNG optimizado (máx. 600 px, se reduce si pesa). */
export const readLogoFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecciona una imagen PNG o JPG."));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      reject(new Error("El logo supera los 8 MB. Usa una imagen más liviana."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () =>
        reject(new Error("El archivo no parece una imagen válida."));
      image.onload = () => {
        const encode = (maxWidth: number) => {
          const scale = Math.min(1, maxWidth / image.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) return "";
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/png");
        };

        let dataUrl = encode(600);
        if (dataUrl.length > 400_000) dataUrl = encode(350);
        if (!dataUrl) {
          reject(new Error("No pudimos procesar la imagen."));
          return;
        }
        resolve(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
