const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Function to convert OCR text to HTML
function textToHtml(text) {
  return text.split('\n').map(line => `<p>${line}</p>`).join('');
}

// Function to perform OCR and convert to HTML
async function processImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    console.log('OCR Text:', text);

    const html = textToHtml(text);
    console.log('HTML Output:', html);

    return html;
  } catch (err) {
    console.error('Error during OCR processing:', err);
  }
}

// Test the OCR processing
const testFilePath = path.join(__dirname, './uploads/Comme logo.png');
processImage(testFilePath).then(html => {
  // Save the HTML to a file for inspection
  fs.writeFileSync('output.html', html);
  console.log('HTML saved to output.html');
});
