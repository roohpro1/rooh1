import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function main() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("firebase-applet-config.json not found");
    return;
  }
  const fbConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  if (getApps().length === 0) {
    initializeApp({
      projectId: fbConfig.projectId
    });
  }
  
  const db = getFirestore();
  const snapshot = await db.collection("apps").get();
  console.log(`Total apps found in Firestore: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.name} | Category: ${data.category}`);
  });
}

main().catch(console.error);
