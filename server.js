import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ✅ CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ✅ Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/enrich", async (req, res) => {
  try {
    const lead = req.body ?? {};

    const systemPrompt = `
You analyze clinics and professionals in pregnancy, birth, postpartum, lactation, wellness, and related care.
Write in Hebrew. Do not invent facts.
`;

    const userPrompt = `
Analyze this lead:

${JSON.stringify(lead, null, 2)}

Return JSON with:
- profile_summary
- outreach_recommendation
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        // 🔴🔴🔴 גם כאן משתמשים במפתח 🔴🔴🔴
        Authorization: `Bearer $
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // 🔥 החלפתי למודל יציב
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }],
          },
        ],
      }),
    });

    const data = await response.json();

    // 🔥 פישוט — לא צריך parsing מסובך
    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    return res.json({
      profile_summary: text,
      outreach_recommendation: text,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
