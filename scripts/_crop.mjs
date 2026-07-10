import sharp from "sharp";
const [,, inPath, outPath, left, top, width, height] = process.argv;
await sharp(inPath).extract({ left: +left, top: +top, width: +width, height: +height }).toFile(outPath);
console.log("done:", outPath);
