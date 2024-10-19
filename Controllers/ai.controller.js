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
const { ParkedUpload, Upload } = require('../Models/upload.model');

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
      1. potentialClaimNumbers: Any sequence of numbers and letters that could represent a claim number.
      2. potentialClaimantNames: Names that appear to be the primary subject of the claim.
      3. potentialEmployerNames: Names of companies or organizations that could be employers.
      4. potentialInsurerNames: Names of insurance companies.
      5. potentialMedicalProviderNames: Names of hospitals, clinics, or medical facilities.
      6. potentialPhysicianNames: Names of doctors or medical professionals.
      7. potentialDatesOfBirth: Any date that could represent a birth date.
      8. potentialDatesOfInjury: Any date that could represent when an injury occurred.
      9. potentialInjuryDescriptions: Any text that could describe an injury or medical condition.

      Format the output as JSON with these categories. If a category has no matches, return an empty array. Here's the text:

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

exports.saveUpdatedEntities = async (req, res) => {
  const { OcrId, updatedEntities } = req.body;
  console.log('Received OcrId:', OcrId);
  console.log('Received entities:', updatedEntities);

  if (!OcrId || !updatedEntities) {
    return res.status(400).json({ error: 'OcrId and updatedEntities are required' });
  }

  // No need for transformation, as keys are already in the correct format
  const transformedEntities = {
    potentialClaimNumbers: updatedEntities.potentialClaimNumbers || [],
    potentialClaimantNames: updatedEntities.potentialClaimantNames || [],
    potentialEmployerNames: updatedEntities.potentialEmployerNames || [],
    potentialInsurerNames: updatedEntities.potentialInsurerNames || [],
    potentialMedicalProviderNames: updatedEntities.potentialMedicalProviderNames || [],
    potentialPhysicianNames: updatedEntities.potentialPhysicianNames || [],
    potentialDatesOfBirth: updatedEntities.potentialDatesOfBirth || [],
    potentialDatesOfInjury: updatedEntities.potentialDatesOfInjury || [],
    potentialInjuryDescriptions: updatedEntities.potentialInjuryDescriptions || []
  };

  console.log('Transformed entities:', transformedEntities);

  try {
    // Try to update ParkedUpload first
    let document = await ParkedUpload.findOneAndUpdate(
      { OcrId: OcrId },
      { $set: { entities: transformedEntities } },
      { new: true }
    );

    // If not found in ParkedUpload, try Upload
    if (!document) {
      document = await Upload.findOneAndUpdate(
        { OcrId: OcrId },
        { $set: { entities: transformedEntities } },
        { new: true }
      );
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Entities updated successfully', document });
  } catch (error) {
    console.error('Error saving updated entities:', error);
    res.status(500).json({ error: 'Failed to save updated entities' });
  }
};
