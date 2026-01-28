import fs, { existsSync } from "fs";
import path from "path";
import crypto from "crypto";


function ensureDir(dirPath: string){
    if(!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath, { recursive: true });
    }

}

function getStorageDirAbsolute(){
    const storageDir = process.env.STORAGE_DIR || "uploads";
    return path.resolve(__dirname, "../../", storageDir);
}

function safeBaseName(originalName: string): string{
    const base= path.basename(originalName);
    return base.replace(/[^a-zA-Z0-9]/g, "_");
}

export type StoredFile = {
    urlPath: string;
    filename: string;
    absolutePath: string;
    sizeBytes: number;
}



export function saveBufferAsFile(buffer: Buffer, originalName: string): StoredFile {
    const uploadsDir = getStorageDirAbsolute();
    ensureDir(uploadsDir);
  
    const safeName = safeBaseName(originalName || "file");
    const id = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${id}-${safeName}`;
    const absolutePath = path.join(uploadsDir, filename);
  
    fs.writeFileSync(absolutePath, buffer);
  
    const urlPath = `/${path.basename(uploadsDir)}/${filename}`;
    return {
      urlPath,
      filename,
      absolutePath,
      sizeBytes: buffer.length,
    };
  }


  export function saveMulterFile(file: Express.Multer.File): StoredFile {
    return saveBufferAsFile(file.buffer, file.originalname);
  }


export function readFileAsBuffer(urlPath: string): Buffer {
    const uploadsDir = getStorageDirAbsolute();
    const dirName = path.basename(uploadsDir);
  
    // Expect /uploads/<filename>
    const prefix = `/${dirName}/`;
    if (!urlPath.startsWith(prefix)) {
      throw new Error(`Invalid file path. Expected prefix ${prefix}`);
    }
  
    const filename = urlPath.slice(prefix.length);
    const absolutePath = path.join(uploadsDir, filename);
  
    if (!fs.existsSync(absolutePath)) {
      throw new Error("File not found");
    }
  
    return fs.readFileSync(absolutePath);
  }
  
  export function deleteStoredFile(urlPath: string): boolean {
    const uploadsDir = getStorageDirAbsolute();
    const dirName = path.basename(uploadsDir);
  
    const prefix = `/${dirName}/`;
    if (!urlPath.startsWith(prefix)) return false;
  
    const filename = urlPath.slice(prefix.length);
    const absolutePath = path.join(uploadsDir, filename);
  
    if (!fs.existsSync(absolutePath)) return false;
  
    fs.unlinkSync(absolutePath);
    return true;
  }