import express from "express";

const app = express();
app.use(express.json());

app.post("/enrich", async (req, res) => {
  res.json({
    profile_summary: "זה טסט - החיבור עובד 🎉",
    outreach_recommendation: "אפשר לפנות בגישה חמה ואישית"
  });
});

app.listen(3000, () => {
  console.log("Server running");
});
