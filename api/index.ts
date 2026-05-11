import express from "express";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as getClientDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

// Firebase Configuration from Environment Variables (Recommended for Vercel)
const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "aplikasisekolah-dc8af",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:605295073330:web:a30f4edc3798d9cd61c42b",
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDrmL_1YSu-V3PkAsr0vo4WFAnpibFEoR0",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "aplikasisekolah-dc8af.firebaseapp.com",
  firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DB_ID || "ai-studio-02a00c5f-8594-4e10-90c0-f57cfc1a673b",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "aplikasisekolah-dc8af.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "605295073330",
};

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

// 2. Initialize Firebase Client SDK (as fallback)
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

let settingsDb: any = null;
try {
  const dbId = firebaseConfig.firestoreDatabaseId;
  const adminApp = admin.app();
  settingsDb = (adminApp as any).firestore(dbId);
} catch (e) {
  console.error("[Firebase Admin Init Error]", e);
}

const app = express();
app.use(express.json());

// API Route for WhatsApp Notification
app.post("/api/send-wa", async (req, res) => {
  const { phone, message, name } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required" });
  }

  const normalizePhone = (p: string) => {
    let cleaned = p.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const targetPhone = normalizePhone(phone);
  let fonnteToken = process.env.FONNTE_TOKEN;
  let tokenSource = "environment variable";
  const HARDCODED_FALLBACK_TOKEN = "LERePrkyhLvamJwR3yem";

  try {
    let tokenFound = false;
    if (settingsDb) {
      try {
        const settingsDoc = await settingsDb.collection("settings").doc("secrets").get();
        if (settingsDoc.exists) {
          const dbToken = settingsDoc.data()?.fonnteToken;
          if (dbToken && dbToken.trim() !== "") {
            fonnteToken = dbToken;
            tokenSource = "Firestore secrets (Admin SDK)";
            tokenFound = true;
          }
        }
      } catch (adminErr) {
        console.warn("[WA DB Admin Fallback] Access issue");
      }
    }

    if (!tokenFound) {
      try {
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
      } catch (clientErr) {
        console.error("[WA DB Client Error]");
      }
    }
  } catch (generalErr) {
    console.error("[WA DB Final Fallback Error]");
  }

  if (!fonnteToken || fonnteToken.trim() === "") {
      fonnteToken = HARDCODED_FALLBACK_TOKEN;
      tokenSource = "hardcoded fallback";
  }
  
  if (fonnteToken && fonnteToken.trim() !== "") {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Authorization": fonnteToken },
        body: new URLSearchParams({
          target: targetPhone,
          message: message,
          token: fonnteToken
        })
      });

      const data: any = await response.json();
      const isSuccess = data && (data.status === true || data.status === "true");
      
      if (isSuccess) {
        return res.json({ success: true, message: `Sent for ${name}`, providerResponse: data });
      } else {
        return res.status(500).json({ success: false, error: data?.reason || "Fonnte rejected", detail: data });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to connect to Fonnte" });
    }
  }

  res.json({ success: true, isSimulated: true, message: "Simulation mode" });
});

// API Route for Face Identification (Gemini)
app.post("/api/identify-face", async (req, res) => {
  const { scanImage, people } = req.body;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return res.status(500).json({ error: "Gemini API Key missing" });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey });

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
      } catch (e) { return null; }
    }));

    const validEntries = profileParts.filter(e => e !== null);
    if (validEntries.length === 0) return res.status(400).json({ error: "No profile images" });

    const prompt = `Identifikasi orang dalam foto "Scan" dengan mencocokkannya ke database "Profil". Output HANYA ID personil. Jika tidak ada, "NOT_FOUND".`;

    const parts = [
      { text: "Scan: " },
      { inlineData: { mimeType: "image/jpeg", data: scanImage } },
    ];

    validEntries.forEach((entry: any) => {
      parts.push({ text: `\nID: ${entry.person.id} (${entry.person.name}):` });
      parts.push(entry.part);
    });

    parts.push({ text: `\n\n${prompt}` });

    const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent({ contents: [{ role: "user", parts }] });
    const matchedId = response.response.text().trim();

    res.json({ matchedId });
  } catch (error: any) {
    res.status(500).json({ error: "Face identification failed", detail: error.message });
  }
});

// Proxy route
app.get("/api/proxy-image", async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) return res.status(400).send("URL is required");

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send("Error proxying image");
  }
});

export default app;
