import JSZip from "jszip";

export interface ZipFile {
  filename: string;
  content: string;
}

export async function buildZip(files: ZipFile[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
