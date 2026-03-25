import express from "express";

const app = express();

app.use(express.json());

// CORS (חשוב ל-Lovable)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// בדיקה שהשרת עובד
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ה-endpoint ש-Lovable קורא לו
app.post("/enrich", async (req, res) => {
  console.log("🔥 REQUEST RECEIVED");
  console.log(req.body);

  return res.status(200).json({
    profile_summary: "זה טסט - החיבור עובד 🎉",
    outreach_recommendation: "אפשר לפנות בגישה חמה ואישית"
  });
});

// חשוב ל-Render (פורט דינמי)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
