import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Ensure persistent data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
const DESIGNS_FILE = path.join(DATA_DIR, "saved_designs.json");
const CREDENTIALS_FILE = path.join(DATA_DIR, "credential_store.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data dir:", err);
  }
}

// Helpers for read/write
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (e) {
    console.warn(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const serialized = JSON.stringify(data, null, 2);
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8");
      if (existing === serialized) return; // Skip writing if identical to prevent disk and watch churn
    }
    fs.writeFileSync(filePath, serialized, "utf-8");
  } catch (e) {
    console.error(`Error writing to ${filePath}:`, e);
  }
}

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Gemini Design Assistant endpoint for discovering unique ID card design ideas and themes
app.post("/api/gemini/design-ideas", async (req, res) => {
  try {
    const { category, query } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please check environment settings.",
      });
    }

    const prompt = `You are an elite creative graphic designer and ID card typography expert.
The user is designing an ID Card and wants inspiration/ideas for category "${category || "General"}" with request: "${query || "modern and distinctive design"}".

Provide creative design suggestions formatted as valid JSON with:
1. "themeName": a compelling name (e.g. "Emerald Corporate Cyber", "Minimalist Bauhaus Academic")
2. "primaryColor": hex color code
3. "secondaryColor": hex color code
4. "accentColor": hex color code
5. "textColor": hex color code
6. "backgroundColor": hex color code
7. "pattern": one of ["solid", "gradient", "wave", "geometric", "dots", "stripes", "abstract"]
8. "fontFamily": one of ["Plus Jakarta Sans", "Outfit", "Playfair Display", "Space Mono", "Inter"]
9. "headerStyle": short description
10. "footerStyle": short description
11. "layoutStyle": "portrait" or "landscape"
12. "suggestedFields": array of 4-6 field labels suitable for this card type
13. "designTips": 2-3 short bullet point tips on layout and hierarchy

Respond with ONLY the JSON object, without markdown quotes or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      // Fallback
      parsedData = { raw: text };
    }

    res.json({ success: true, idea: parsedData });
  } catch (error: any) {
    console.error("Gemini design idea generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate design idea" });
  }
});

// Persistent credential registry for scanned QR verification and print dispatch
const credentialMap = new Map<string, { cardState: any; updatedAt: string }>();

// Load credentials on startup
try {
  const loadedCreds = readJsonFile<Record<string, { cardState: any; updatedAt: string }>>(CREDENTIALS_FILE, {});
  for (const [k, v] of Object.entries(loadedCreds)) {
    credentialMap.set(k, v);
  }
} catch (e) {
  console.warn("Could not load initial credentials:", e);
}

app.post("/api/credentials/publish", (req, res) => {
  try {
    const { id, cardState } = req.body;
    if (!id || !cardState) {
      return res.status(400).json({ error: "id and cardState are required" });
    }
    const record = { cardState, updatedAt: new Date().toISOString() };
    credentialMap.set(id, record);

    // Save to disk
    const obj: Record<string, any> = {};
    credentialMap.forEach((val, key) => {
      obj[key] = val;
    });
    writeJsonFile(CREDENTIALS_FILE, obj);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to publish credential" });
  }
});

app.get("/api/credentials/:id", (req, res) => {
  const reqId = (req.params.id || "").trim();
  let record = credentialMap.get(reqId);
  if (!record) {
    const lower = reqId.toLowerCase();
    for (const [k, v] of credentialMap.entries()) {
      if (k.trim().toLowerCase() === lower) {
        record = v;
        break;
      }
    }
  }
  if (!record) {
    return res.status(404).json({ error: "Credential not found" });
  }
  res.json({ success: true, ...record });
});

function getLanIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return "localhost";
}

app.get("/api/server-info", (req, res) => {
  const lanIp = getLanIp();
  res.json({
    port: PORT,
    lanIp,
    origin: lanIp !== "localhost" ? `http://${lanIp}:${PORT}` : `http://localhost:${PORT}`,
  });
});

// =========================================================================
// SAVED DESIGNS PERSISTENCE API
// =========================================================================

app.get("/api/designs", (req, res) => {
  try {
    const designs = readJsonFile<any[]>(DESIGNS_FILE, []);
    res.json({ success: true, designs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load saved designs" });
  }
});

app.post("/api/designs", (req, res) => {
  try {
    const { cardState, customName, existingId, thumbnail, card: providedCard } = req.body;
    const designs = readJsonFile<any[]>(DESIGNS_FILE, []);

    let newCard: any;
    if (providedCard && providedCard.id) {
      newCard = providedCard;
    } else {
      if (!cardState) {
        return res.status(400).json({ error: "cardState or card is required" });
      }
      const id = existingId || "card_" + Date.now();
      const cardTitle = customName?.trim() || 
        (cardState.details?.fullName ? `${cardState.details.fullName} (${cardState.details?.uniqueId || 'ID'})` : 'Untitled ID Card');

      newCard = {
        id,
        savedAt: new Date().toISOString(),
        name: cardTitle,
        personName: cardState.details?.fullName || "",
        uniqueId: cardState.details?.uniqueId || "",
        templateName: cardState.customTemplateName || cardState.templateId || "Custom",
        thumbnail,
        cardState,
      };
    }

    const existingIdx = designs.findIndex((d) => d.id === newCard.id);
    let updatedList: any[];
    if (existingIdx >= 0) {
      updatedList = [...designs];
      updatedList[existingIdx] = newCard;
    } else {
      updatedList = [newCard, ...designs];
    }

    writeJsonFile(DESIGNS_FILE, updatedList);
    res.json({ success: true, card: newCard, designs: updatedList });
  } catch (err: any) {
    console.error("Save design error:", err);
    res.status(500).json({ error: err.message || "Failed to save design" });
  }
});

app.delete("/api/designs/:id", (req, res) => {
  try {
    const designs = readJsonFile<any[]>(DESIGNS_FILE, []);
    const filtered = designs.filter((d) => d.id !== req.params.id);
    writeJsonFile(DESIGNS_FILE, filtered);
    res.json({ success: true, designs: filtered });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete design" });
  }
});

app.post("/api/designs/duplicate/:id", (req, res) => {
  try {
    const designs = readJsonFile<any[]>(DESIGNS_FILE, []);
    const original = designs.find((d) => d.id === req.params.id);
    if (!original) {
      return res.status(404).json({ error: "Original design not found" });
    }

    const duplicated = {
      ...original,
      id: "card_" + Date.now(),
      savedAt: new Date().toISOString(),
      name: `${original.name} (Copy)`,
    };

    const updated = [duplicated, ...designs];
    writeJsonFile(DESIGNS_FILE, updated);
    res.json({ success: true, card: duplicated, designs: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to duplicate design" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "SmartID API" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/dist/**",
            "**/.git/**",
            "**/node_modules/**",
            "**/*.json",
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartID Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
