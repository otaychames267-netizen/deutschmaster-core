import "dotenv/config";
import { classifyPageRole, terminateOcr } from "../src/lib/import/ocr-extract.js";
const t = Date.now();
classifyPageRole("C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 2 (2).pdf", 2)
  .then((r) => { console.log(`OK ${((Date.now() - t) / 1000).toFixed(1)}s role=${r.role} signals=[${r.signals.join(", ")}]`); return terminateOcr(); })
  .catch((e) => { console.log("ERR", String(e).slice(0, 150)); process.exit(1); });
