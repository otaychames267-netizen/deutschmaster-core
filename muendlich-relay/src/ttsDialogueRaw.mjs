// raw debug of the text-to-dialogue WebSocket: prints every server message for a few seconds
import WebSocket from "ws";
const [voice, model] = [process.argv[2], process.argv[3]]; const key = process.env.ELEVENLABS_API_KEY;
const ws = new WebSocket(`wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=${model}&output_format=pcm_24000`);
let n = 0; const t0 = Date.now();
ws.on("open", () => { console.log("open"); ws.send(JSON.stringify({ voices: [voice], xi_api_key: key })); setTimeout(() => { ws.send(JSON.stringify({ inputs: [{ text: "Guten Tag, willkommen zu Ihrer Übung.", voice_id: voice, new_turn: true }] })); ws.send(JSON.stringify({ flush: true })); }, 300); });
ws.on("message", (raw) => { const s = raw.toString(); n++; let o; try { o = JSON.parse(s); } catch { o = { raw: s.slice(0, 100) }; } console.log(`+${Date.now() - t0}ms`, Object.keys(o).join(","), o.audio ? `audio(${o.audio.length})` : JSON.stringify(o).slice(0, 220)); });
ws.on("error", (e) => console.log("error", e.message));
ws.on("close", (c, r) => console.log("close", c, r.toString()));
setTimeout(() => { console.log("messages:", n); process.exit(0); }, 9000);
