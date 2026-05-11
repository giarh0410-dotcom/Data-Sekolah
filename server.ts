import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as getClientDoc } from "firebase/firestore";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config for server-side use
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// 1. Initialize Firebase Admin (Server-side privileged access)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

// 2. Initialize Firebase Client SDK (Server-side secondary access using API KEY)
// This is used as a fallback because it bypasses service account permission issues
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// Get the correct Admin Firestore instance
let settingsDb: any = null;
try {
  const dbId = firebaseConfig.firestoreDatabaseId;
  const adminApp = admin.app();
  if (dbId) {
    settingsDb = (adminApp as any).firestore(dbId);
    console.log(`[Firebase Admin] Ready for DB: ${dbId}`);
  } else {
    settingsDb = admin.firestore();
    console.log("[Firebase Admin] Ready for default DB");
  }
} catch (e) {
  console.error("[Firebase Admin Init Error]", e);
}

async function startServer() {
  const app = express();
  const PORT = 4000;

  app.use(express.json());

  // API Route for WhatsApp Notification
  app.post("/api/send-wa", async (req, res) => {
    const { phone, message, name } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required" });
    }

    // Normalisasi nomor telepon ke format internasional (62 untuk Indonesia)
    const normalizePhone = (p: string) => {
      let cleaned = p.replace(/\D/g, ''); // Hapus semua karakter non-digit
      // Handle format 08...
      if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
      }
      // Handle format 8... (tanpa 0)
      else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
      }
      return cleaned;
    };

    const targetPhone = normalizePhone(phone);
    console.log(`[WA] Normalizing ${phone} -> ${targetPhone}`);
    
    // Get Fonnte Token - Priority: Firestore Secrets > Environment Var > Hardcoded
    let fonnteToken = process.env.FONNTE_TOKEN;
    let tokenSource = "environment variable";
    const HARDCODED_FALLBACK_TOKEN = "LERePrkyhLvamJwR3yem";

    try {
      // PHASE 1: Try Admin SDK (Privileged)
      let tokenFound = false;
      try {
        if (settingsDb) {
          const settingsDoc = await settingsDb.collection("settings").doc("secrets").get();
          if (settingsDoc.exists) {
            const dbToken = settingsDoc.data()?.fonnteToken;
            if (dbToken && dbToken.trim() !== "") {
              fonnteToken = dbToken;
              tokenSource = "Firestore secrets (Admin SDK)";
              tokenFound = true;
            }
          }
        }
      } catch (adminErr: any) {
        console.warn(`[WA DB Admin Fallback] Access issue: ${adminErr.message || adminErr}`);
      }

      // PHASE 2: Try Client SDK (Bypass Service Account using API Key)
      if (!tokenFound) {
        try {
          console.log("[WA DB Client Fallback] Attempting fetch via Client SDK...");
          const docRef = clientDoc(clientDb, "settings", "secrets");
          const settingsSnap = await getClientDoc(docRef);
          if (settingsSnap.exists()) {
            const dbToken = settingsSnap.data()?.fonnteToken;
            if (dbToken && dbToken.trim() !== "") {
              fonnteToken = dbToken;
              tokenSource = "Firestore secrets (Client SDK)";
              tokenFound = true;
            }
          }
        } catch (clientErr: any) {
          console.error("[WA DB Client Error] Failed to fetch secrets:", clientErr.message || clientErr);
        }
      }
    } catch (generalErr: any) {
      console.error("[WA DB Final Fallback Error]", generalErr);
    }

    // PHASE 3: Hardcoded Fallback
    if (!fonnteToken || fonnteToken.trim() === "") {
        fonnteToken = HARDCODED_FALLBACK_TOKEN;
        tokenSource = "hardcoded fallback (requested by user)";
    }

    console.log(`[WA] Dispatching for ${targetPhone} using ${tokenSource}. Token length: ${fonnteToken?.length || 0}`);
    
    if (fonnteToken && fonnteToken.trim() !== "") {
      try {
        console.log("[WA] Sending via Fonnte...");
        const response = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { "Authorization": fonnteToken },
          body: new URLSearchParams({
            target: targetPhone,
            message: message,
            token: fonnteToken
          })
        });

        const text = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("[WA Fonnte] Raw Response (Non-JSON):", text);
          return res.status(500).json({ success: false, error: "Invalid provider response", detail: text });
        }
        
        const isSuccess = data && (data.status === true || data.status === "true");
        
        if (isSuccess) {
          console.log(`[WA] Success -> ${targetPhone}`);
          return res.json({ success: true, message: `Sent for ${name}`, providerResponse: data });
        } else {
          console.error("[WA Fonnte Rejection]", {
            status: data?.status,
            reason: data?.reason,
            source: tokenSource,
            details: data
          });
          return res.status(500).json({ 
            success: false, 
            error: data?.reason || "Fonnte rejected the message",
            detail: data
          });
        }
      } catch (err) {
        console.error("[WA Network Error]", err);
        return res.status(500).json({ success: false, error: "Failed to connect to Fonnte" });
      }
    }

    // Fallback: Simulation mode
    console.log(`[WA Mock] Simulation for ${phone}: ${message}`);
    res.json({ 
      success: true, 
      isSimulated: true,
      message: `Notification simulated for ${name} (Add FONNTE_TOKEN to settings for real delivery)`,
      phone: phone,
      timestamp: new Date().toISOString()
    });
  });

  // API Route for Face Identification (Gemini)
  app.post("/api/identify-face", async (req, res) => {
    const { scanImage, people } = req.body;

    if (!scanImage || !people || !Array.isArray(people)) {
      return res.status(400).json({ error: "Scan image and people list are required" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("[Gemini] API Key missing in environment");
      return res.status(500).json({ error: "Gemini API Key is not configured on server" });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      // Fetch images and convert to base64 parts for prompt
      const profileParts = await Promise.all(people.map(async (p: any) => {
        try {
          if (!p.photoUrl) return null;
          const resp = await fetch(p.photoUrl);
          if (!resp.ok) return null;
          const arrayBuffer = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return {
            part: { inlineData: { mimeType: "image/jpeg", data: base64 } },
            person: p
          };
        } catch (e) {
          console.warn(`[Gemini Proxy] Failed to fetch image for ${p.name}:`, e);
          return null;
        }
      }));

      const validEntries = profileParts.filter(e => e !== null);
      
      if (validEntries.length === 0) {
        return res.status(400).json({ error: "No profile images available for comparison" });
      }

      const prompt = `
        Tugas: Identifikasi orang dalam foto "Scan" dengan mencocokkannya ke database "Profil" yang disertakan.
        Berikan output HANYA ID personil yang paling mirip. Jika tidak ada yang mirip, berikan output "NOT_FOUND".
        Jangan berikan penjelasan apapun, cukup ID saja.
      `;

      const parts = [
        { text: "Berikut adalah foto wajah hasil Scan: " },
        { inlineData: { mimeType: "image/jpeg", data: scanImage } },
      ];

      validEntries.forEach((entry: any) => {
        parts.push({ text: `\nProfil Personil ID: ${entry.person.id} (${entry.person.name}):` });
        parts.push(entry.part.inlineData ? entry.part : { inlineData: entry.part });
      });

      parts.push({ text: `\n\n${prompt}` });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts }
      });

      const matchedId = response.text?.trim();
      console.log(`[Gemini] Match Result: ${matchedId}`);

      res.json({ matchedId });
    } catch (error: any) {
      console.error("[Gemini Error]", error);
      res.status(500).json({ error: "Face identification failed", detail: error.message });
    }
  });

  // Proxy route for images to bypass CORS
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error proxying image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
