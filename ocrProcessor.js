const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class OCRProcessor {
    constructor(lang = 'eng') {
        this.lang = lang;
    }

    async preprocessImage(imagePath) {
        try {
            const preprocessedImagePath = path.join(
                path.dirname(imagePath),
                'preprocessed-' + path.basename(imagePath)
            );
            await sharp(imagePath)
                .greyscale() // Convert to grayscale
                .sharpen() // Sharpen the image
                .normalize() // Enhance contrast
                .toFile(preprocessedImagePath);
            return preprocessedImagePath;
        } catch (error) {
            console.error('Error during image preprocessing:', error);
            throw error;
        }
    }

    async extractText(imagePath) {
        try {
            const preprocessedImagePath = await this.preprocessImage(imagePath);
            const result = await Tesseract.recognize(preprocessedImagePath, this.lang, {
                logger: m => console.log(m) // Add logger here for better debugging
            });
            return result.data.text;
        } catch (error) {
            console.error('Error during OCR processing:', error);
            throw error;
        }
    }

    async extractImagesFromPDF(pdfPath) {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const imagePaths = [];

        for (const page of pdfDoc.getPages()) {
            const { width, height } = page.getSize();
            const pngImage = await page.toPng({ width, height });
            const imagePath = path.join(
                path.dirname(pdfPath),
                `page-${page.index}.png`
            );
            fs.writeFileSync(imagePath, pngImage);
            imagePaths.push(imagePath);
        }
        return imagePaths;
    }

    async handlePDF(pdfPath) {
        const imagePaths = await this.extractImagesFromPDF(pdfPath);
        let combinedText = '';
        for (const imagePath of imagePaths) {
            const text = await this.extractText(imagePath);
            combinedText += text + '\n';
        }
        return combinedText;
    }

    // async handleInvoice(imagePath) {
    //     const text = await this.extractText(imagePath);
    //     // Additional parsing logic for invoices
    //     return text;
    // }

    // async handleClaim(imagePath) {
    //     const text = await this.extractText(imagePath);
    //     // Additional parsing logic for claims
    //     return text;
    // }

    // async handleForm(imagePath) {
    //     const text = await this.extractText(imagePath);
    //     // Additional parsing logic for forms
    //     return text;
    // }
}

module.exports = OCRProcessor;
