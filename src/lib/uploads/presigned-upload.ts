type PresignedUploadInput = {
  url: string;
  file: File;
  contentType: string;
  onProgress?: (percent: number) => void;
};

type PresignedUploadAdapter = (input: PresignedUploadInput) => Promise<void>;

let desktopUploadAdapter: PresignedUploadAdapter | null = null;

export function setPresignedUploadAdapter(adapter: PresignedUploadAdapter | null) {
  desktopUploadAdapter = adapter;
}

export async function uploadPresignedFile(input: PresignedUploadInput) {
  if (desktopUploadAdapter) {
    await desktopUploadAdapter(input);
    input.onProgress?.(100);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", input.url);
    request.setRequestHeader("Content-Type", input.contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error("Не удалось загрузить файл"));
    request.onerror = () => reject(new Error("Не удалось загрузить файл"));
    request.onabort = () => reject(new Error("Загрузка отменена"));
    request.send(input.file);
  });
}
