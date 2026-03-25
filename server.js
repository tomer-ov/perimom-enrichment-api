import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Main endpoint
app.post("/enrich", async (req, res) => {
  try {
    // 🔴 אם אין API KEY → תחזיר שגיאה ברורה
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "missing_openai_key"
      });
    }

    const lead = req.body ?? {};

    const prompt = `
נתח את הליד הבא בצורה פשוטה וברורה:

${JSON.stringify(lead, null, 2)}

תחזיר:
1. תיאור קצר מי זה
2. איך כדאי לפנות אליו
כתוב בעברית.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "לא התקבלה תשובה";

    return res.json({
      profile_summary: text,
      outreach_recommendation: text
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
