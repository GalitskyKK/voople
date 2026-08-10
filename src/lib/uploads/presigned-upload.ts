type PresignedUploadInput = {
  url: string;
  file: File;
  contentType: string;
};

type PresignedUploadAdapter = (input: PresignedUploadInput) => Promise<void>;

let desktopUploadAdapter: PresignedUploadAdapter | null = null;

export function setPresignedUploadAdapter(adapter: PresignedUploadAdapter | null) {
  desktopUploadAdapter = adapter;
}

export async function uploadPresignedFile(input: PresignedUploadInput) {
  if (desktopUploadAdapter) {
    await desktopUploadAdapter(input);
    return;
  }

  const response = await fetch(input.url, {
    method: "PUT",
    body: input.file,
    headers: { "Content-Type": input.contentType },
  });
  if (!response.ok) {
    throw new Error("Не удалось загрузить файл");
  }
}
