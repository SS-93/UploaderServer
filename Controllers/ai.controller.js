// const OpenAI = require('openai');

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// exports.performNER = async (req, res) => {
//   const { text } = req.body;

//   if (!text) {
//     return res.status(400).json({ error: 'Text is required' });
//   }

//   try {
//     const prompt = `Perform Named Entity Recognition on the following text. Identify and list entities such as PERSON, ORGANIZATION, LOCATION, DATE, and any other relevant categories. Format the output as JSON. Here's the text:\n\n${text}`;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.3,
//     });

//     const entities = JSON.parse(response.choices[0].message.content);
//     res.json(entities);
//   } catch (error) {
//     console.error('Error performing NER:', error);
//     res.status(500).json({ error: 'Failed to perform NER' });
//   }
// };


const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.performNER = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const prompt = `
      Analyze the following text and extract these entities:
      1. Potential claim numbers: Any sequence of numbers and letters that could represent a claim number.
      2. Potential names: Sequences of capitalized words that could be names.
      3. Potential dates: Any date-like patterns.
      4. Potential injury descriptions: Any remaining text that could describe an injury.

      Format the output as JSON with these categories. Here's the text:

      ${text}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const entities = JSON.parse(response.choices[0].message.content);
    res.json(entities);
  } catch (error) {
    console.error('Error performing NER:', error);
    res.status(500).json({ error: 'Failed to perform NER' });
  }
};