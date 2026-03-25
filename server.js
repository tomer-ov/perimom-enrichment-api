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

// בדיקת בריאות
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

// ה-endpoint של Lovable
app.post("/enrich", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        profile_summary: "חסר OPENAI_API_KEY ב-Render",
        outreach_recommendation: "יש להגדיר את המפתח ב-Environment Variables",
        debug: "missing_openai_key",
      });
    }

    const lead = req.body ?? {};

const prompt = `
תן בריף קצר מאוד על הליד הבא.

חוקים:
- כתוב בעברית
- מקסימום 2-3 שורות
- משפטים קצרים בלבד
- בלי חזרות
- בלי מבנה מורכב
- תכל'ס בלבד

הליד:
${JSON.stringify(lead, null, 2)}

תחזיר JSON בלבד:

{
  "profile_summary": "בריף קצר על מי זה ומה הם עושים",
  "outreach_recommendation": "משפט אחד איך לפנות אליהם"
}
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
    console.log("OPENAI RESPONSE:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(500).json({
        profile_summary: "שגיאה בקריאה ל-OpenAI",
        outreach_recommendation: "בדוק לוגים ב-Render",
        debug: data,
      });
    }

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        profile_summary: text || "לא התקבלה תשובה",
        outreach_recommendation: text || "לא התקבלה תשובה",
      };
    }

    return res.json({
      profile_summary: parsed.profile_summary || "לא התקבלה תשובה",
      outreach_recommendation: parsed.outreach_recommendation || "לא התקבלה תשובה",
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      profile_summary: "שגיאת שרת",
      outreach_recommendation: "בדוק לוגים ב-Render",
      debug: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
