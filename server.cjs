var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DESIGNS_FILE = import_path.default.join(DATA_DIR, "saved_designs.json");
var CREDENTIALS_FILE = import_path.default.join(DATA_DIR, "credential_store.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  try {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data dir:", err);
  }
}
function readJsonFile(filePath, fallback) {
  try {
    if (import_fs.default.existsSync(filePath)) {
      const data = import_fs.default.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`Error reading ${filePath}:`, e);
  }
  return fallback;
}
function writeJsonFile(filePath, data) {
  try {
    const serialized = JSON.stringify(data, null, 2);
    if (import_fs.default.existsSync(filePath)) {
      const existing = import_fs.default.readFileSync(filePath, "utf-8");
      if (existing === serialized) return;
    }
    import_fs.default.writeFileSync(filePath, serialized, "utf-8");
  } catch (e) {
    console.error(`Error writing to ${filePath}:`, e);
  }
}
var aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.post("/api/gemini/design-ideas", async (req, res) => {
  try {
    const { category, query } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please check environment settings."
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
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = { raw: text };
    }
    res.json({ success: true, idea: parsedData });
  } catch (error) {
    console.error("Gemini design idea generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate design idea" });
  }
});
var credentialMap = /* @__PURE__ */ new Map();
try {
  const loadedCreds = readJsonFile(CREDENTIALS_FILE, {});
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
    const record = { cardState, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    credentialMap.set(id, record);
    const obj = {};
    credentialMap.forEach((val, key) => {
      obj[key] = val;
    });
    writeJsonFile(CREDENTIALS_FILE, obj);
    res.json({ success: true, id });
  } catch (err) {
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
function getLanIp() {
  try {
    const interfaces = import_os.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
  }
  return "localhost";
}
app.get("/api/server-info", (req, res) => {
  const lanIp = getLanIp();
  res.json({
    port: PORT,
    lanIp,
    origin: lanIp !== "localhost" ? `http://${lanIp}:${PORT}` : `http://localhost:${PORT}`
  });
});
app.get("/api/designs", (req, res) => {
  try {
    const designs = readJsonFile(DESIGNS_FILE, []);
    res.json({ success: true, designs });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load saved designs" });
  }
});
app.post("/api/designs", (req, res) => {
  try {
    const { cardState, customName, existingId, thumbnail, card: providedCard } = req.body;
    const designs = readJsonFile(DESIGNS_FILE, []);
    let newCard;
    if (providedCard && providedCard.id) {
      newCard = providedCard;
    } else {
      if (!cardState) {
        return res.status(400).json({ error: "cardState or card is required" });
      }
      const id = existingId || "card_" + Date.now();
      const cardTitle = customName?.trim() || (cardState.details?.fullName ? `${cardState.details.fullName} (${cardState.details?.uniqueId || "ID"})` : "Untitled ID Card");
      newCard = {
        id,
        savedAt: (/* @__PURE__ */ new Date()).toISOString(),
        name: cardTitle,
        personName: cardState.details?.fullName || "",
        uniqueId: cardState.details?.uniqueId || "",
        templateName: cardState.customTemplateName || cardState.templateId || "Custom",
        thumbnail,
        cardState
      };
    }
    const existingIdx = designs.findIndex((d) => d.id === newCard.id);
    let updatedList;
    if (existingIdx >= 0) {
      updatedList = [...designs];
      updatedList[existingIdx] = newCard;
    } else {
      updatedList = [newCard, ...designs];
    }
    writeJsonFile(DESIGNS_FILE, updatedList);
    res.json({ success: true, card: newCard, designs: updatedList });
  } catch (err) {
    console.error("Save design error:", err);
    res.status(500).json({ error: err.message || "Failed to save design" });
  }
});
app.delete("/api/designs/:id", (req, res) => {
  try {
    const designs = readJsonFile(DESIGNS_FILE, []);
    const filtered = designs.filter((d) => d.id !== req.params.id);
    writeJsonFile(DESIGNS_FILE, filtered);
    res.json({ success: true, designs: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete design" });
  }
});
app.post("/api/designs/duplicate/:id", (req, res) => {
  try {
    const designs = readJsonFile(DESIGNS_FILE, []);
    const original = designs.find((d) => d.id === req.params.id);
    if (!original) {
      return res.status(404).json({ error: "Original design not found" });
    }
    const duplicated = {
      ...original,
      id: "card_" + Date.now(),
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      name: `${original.name} (Copy)`
    };
    const updated = [duplicated, ...designs];
    writeJsonFile(DESIGNS_FILE, updated);
    res.json({ success: true, card: duplicated, designs: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to duplicate design" });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "SmartID API" });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/dist/**",
            "**/.git/**",
            "**/node_modules/**",
            "**/*.json"
          ]
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartID Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
