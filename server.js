import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/enrich", async (req, res) => {
  try {
    const lead = req.body ?? {};

    const systemPrompt = `
You analyze clinics and professionals in pregnancy, birth, postpartum, lactation, wellness, and related care.

Goal:
Help a partnerships/outreach team understand:
1. Who this person/business is
2. How they seem to operate
3. How to approach them

Rules:
- Write in Hebrew
- Do not invent facts
- You may make careful business inferences, but only when clearly framed as likely/estimated
- If information is missing, say so clearly
- Keep the tone practical, human, and useful for outreach
- The output must be valid JSON that matches the schema
`;

    const userPrompt = `
Analyze this lead:

${JSON.stringify(lead, null, 2)}

Return:
- profile_summary: 1 short Hebrew paragraph, human and insightful
- business_insights:
  - business_size_estimate
  - activity_level_estimate
  - digital_presence
  - communication_style
  - specialization
- outreach_recommendation: short practical Hebrew guidance for how to approach them
- missing_information: array of missing items
- confidence_score: number between 0 and 1
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
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
        text: {
          format: {
            type: "json_schema",
            name: "lead_enrichment",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                profile_summary: {
                  type: "string",
                },
                business_insights: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    business_size_estimate: { type: "string" },
                    activity_level_estimate: { type: "string" },
                    digital_presence: { type: "string" },
                    communication_style: { type: "string" },
                    specialization: { type: "string" },
                  },
                  required: [
                    "business_size_estimate",
                    "activity_level_estimate",
                    "digital_presence",
                    "communication_style",
                    "specialization",
                  ],
                },
                outreach_recommendation: {
                  type: "string",
                },
                missing_information: {
                  type: "array",
                  items: { type: "string" },
                },
                confidence_score: {
                  type: "number",
                },
              },
              required: [
                "profile_summary",
                "business_insights",
                "outreach_recommendation",
                "missing_information",
                "confidence_score",
              ],
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return res.status(500).json({
        error: "openai_error",
        details: errorText,
      });
    }

    const data = await response.json();

    const rawText =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      null;

    if (!rawText) {
      console.error("Unexpected OpenAI response:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: "invalid_openai_response",
      });
    }

    const parsed = JSON.parse(rawText);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "server_error",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
