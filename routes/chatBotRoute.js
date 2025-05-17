// chatBotRoute.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

require('dotenv').config();

const openai = new OpenAI({
  apiKey : process.env.OPENAI_API_KEY,
});

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or gpt-4
      messages: [{ role: "user", content: message }],
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("ChatBot Error:", error);

    if (error.response) {
      console.error("OpenAI API Error Response:", error.response.data);
      console.error("OpenAI API Error Status:", error.response.status);
      console.error("OpenAI API Error Headers:", error.response.headers);
    } else {
      console.error("General Error:", error.message);
    }
    
    res.status(500).json({ error: "Something went wrong with AI response" });
  }
});

module.exports = router;
