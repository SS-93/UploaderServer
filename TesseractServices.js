// const Tesseract = require ('tesseract.js');

// async function performOCR(fileUrl) {
//    try { 
//     const {data: {text}} = await Tesseract.recognize(fileUrl, 'eng',
//     {
//         logger: (m) = console.log(m) 
//      }.then(({ data: {text}})=> {
//         console.log(text);
//      })
    
//    )} catch (error) {
//     console.error('Error during OCR processing', error);
//     throw new Error ('OCR processing failed')
    
//    }
//    module.exports ={
//     performOCR,
//    }

// }