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
אתה מומחה לשיתופי פעולה בתחום הריון, לידה, דולות וקליניקות.

המטרה שלך:
לעזור לצוות outreach להבין מהר איך לפנות לליד ולהפוך אותו לשיתוף פעולה.

חוקים:
- כתוב בעברית
- תהיה חד, פרקטי ולא כללי
- אל תמציא מידע שלא קיים
- אם חסר מידע – ציין זאת
- תחשוב כמו איש מכירות מנוסה

הליד:
${JSON.stringify(lead, null, 2)}

תחזיר JSON בלבד בפורמט:

{
  "profile_summary": "2-3 משפטים שמסבירים מי זה ומה מיוחד בהם",
  "business_angle": "מה הערך העסקי שלהם עבורנו (למה לעבוד איתם)",
  "best_approach": "איך הכי נכון לפנות אליהם (ערוץ + סגנון)",
  "outreach_message": "הודעה קצרה מוכנה לשליחה (וואטסאפ/מייל)"
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
