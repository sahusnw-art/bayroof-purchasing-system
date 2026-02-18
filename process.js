import { google } from "googleapis";
import fs from "fs";

const FOLDER_ID = "1negFSx_87qiOo8LEX7iNFIiFaLMhYUAf";

async function main() {
  console.log("Connecting to Google Drive...");

  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  const files = res.data.files;

  if (!files || files.length === 0) {
    console.log("No files found.");
    return;
  }

  console.log("Files found:");
  files.forEach((file) => {
    console.log(`${file.name} (${file.id})`);
  });
}

main().catch(console.error);
