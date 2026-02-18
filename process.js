import { google } from "googleapis";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const FOLDER_ID = "1negFSx_87qiOo8LEX7iNFIiFaLMhYUAf";

async function main() {
  console.log("Connecting to Google Drive...");

  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  const db = await open({
    filename: "./purchasing.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS processed_files (
      id TEXT PRIMARY KEY,
      name TEXT,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  const files = res.data.files;

  if (!files || files.length === 0) {
    console.log("No files found.");
    return;
  }

  for (const file of files) {
    const exists = await db.get(
      "SELECT id FROM processed_files WHERE id = ?",
      file.id
    );

    if (exists) {
      console.log(`Skipping already processed: ${file.name}`);
      continue;
    }

    console.log(`Downloading: ${file.name}`);

    const dest = fs.createWriteStream(file.name);

    const response = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" }
    );

    await new Promise((resolve, reject) => {
      response.data
        .on("end", resolve)
        .on("error", reject)
        .pipe(dest);
    });

    await db.run(
      "INSERT INTO processed_files (id, name) VALUES (?, ?)",
      file.id,
      file.name
    );

    console.log(`Processed and saved: ${file.name}`);
  }

  console.log("Done.");
}

main().catch(console.error);
