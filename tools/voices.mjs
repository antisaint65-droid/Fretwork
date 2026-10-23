// Records a short sample of each teacher voice (Kokoro, Apache-2.0) so the app can play them before the download.
import { KokoroTTS } from "kokoro-js";
import fs from "fs";
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
const text = "Hey, I'm your Fretwork teacher. Nice and slow first, then we'll bring it up to speed. You've got this.";
fs.mkdirSync("voices", { recursive: true });
for (const v of ["am_michael", "am_adam", "am_eric", "am_liam", "am_onyx", "am_puck"]) {
  const audio = await tts.generate(text, { voice: v });
  audio.save(`voices/${v}.wav`);
  console.log("made", v);
}
