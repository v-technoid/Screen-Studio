# 🎥 Screen Studio

> **Capture, edit, transcribe, and convert videos and images directly in your browser — with 100% client-side privacy.**

Screen Studio is a lightweight, all-in-one web-based screen recorder and media editing suite built using pure HTML5, CSS3, and modern Web APIs. Every single operation — from video recording and webcam overlays to audio mixing, image conversion, and AI-powered text extraction (OCR) — runs entirely on your local machine.

---

## 🔒 The Power of Client-Only Privacy

In an era of cloud-based SaaS tools, Screen Studio takes a radically different approach: **zero server uploads, zero tracking, and zero data collection**.

### Key Benefits of 100% Client-Side Processing:

* **🛡️ Absolute Privacy & Data Sovereignty:** Your recordings, internal company demos, confidential meetings, and personal screenshots never leave your browser memory. No third-party servers ever touch or store your files.
* **⚡ Instant Processing:** Because there are no upload or download queues over remote servers, exporting media is bounded only by your device's GPU/CPU power.
* **🌐 True Offline Capability:** Once the web application loads into your browser cache, every single tool (recording, trimming, editing, converting, and OCR) continues to function seamlessly with **no internet connection**.
* **🆓 Zero Cost & No Accounts Required:** No paywalls, subscription tiers, watermarks, or sign-up forms.
* **💼 Enterprise-Safe Compliance:** Ideal for developers, medical professionals, legal teams, and corporate employees working under strict NDA or privacy compliance rules (e.g., GDPR, HIPAA, SOC 2) where uploading screen captures to external servers is strictly prohibited.

---

## ✨ Features At A Glance

### 📹 1. Screen, Webcam & Dual-Audio Recorder
* **Flexible Capture:** Record entire screens, specific application windows, or browser tabs.
* **Webcam Overlay (Picture-in-Picture):** Embed a circular camera bubble in the bottom corner of your recording for tutorials and presentations.
* **Dual-Channel Audio Mixer:** Simultaneously record and mix both **System Audio** (what other meeting attendees say) and **Microphone Audio** (external USB mics or headsets) into a single synchronized soundtrack — perfect for Microsoft Teams, Zoom, or Google Meet calls.
* **Live Voice Teleprompter & Transcriber:** Live speech-to-text captions roll across the screen in real time as you speak, powered by the native Web Speech API.
* **Device Capabilities Detection:** Automatically detects mobile devices or insecure (`file://`) contexts and provides guided fallbacks.

### ✂️ 2. Trim, Mark & Blur Video Editor
* **Timeline Trimming:** Set precise start and end points for video clips.
* **Timed Mark & Blur Annotations:** Highlight regions or redact/blur sensitive passkeys, credit card numbers, or personal info. Each annotation includes independent **Start and End timecodes** so blurs only appear when needed.
* **Subtitle & Captions Studio:**
  * Auto-generates captions from live speech recordings.
  * Import and edit standard `.srt` or `.vtt` subtitle files.
  * Export clean `.srt` transcript files.
  * **Burn Captions into Video:** Permanently render styled, word-wrapped caption pills onto video frames upon export.
* **Pro Export Controls:** Adjust playback speed from `0.5x` slow-motion to `4.0x` time-lapse.
* **Custom Watermarking:** Upload a custom logo/watermark and anchor it to any corner of the video.
* **Mute/Remove Audio:** One-click option to strip all background audio and export silent WebM videos.
* **Project Persistence:** Save and reload complete workspace configurations as `.json` project files.
* **Pro Keyboard Shortcuts:** Frame-by-frame scrubbing and quick tool toggles.
* **Memory Management:** Dedicated "Remove Video" button purges browser RAM without requiring a page refresh.

### 🖼️ 3. Screenshot & Format Converter Studio
* **Clipboard Paste Support:** Press `Ctrl+V` / `Cmd+V` anywhere on the site to instantly load image data copied from your system clipboard.
* **Screen Area Capture:** Snip full screens or drag custom rectangular bounds.
* **Image Format Converter:** Convert between **PNG, JPG/JPEG, WEBP, and BMP** formats with a customizable quality compression slider (`10%` to `100%`).
* **Annotation Suite:** Draw arrows, shapes, text callouts, crop bounds, and blur blocks over images with multi-color swatches.
* **Offline OCR Text Extractor:** Powered by `Tesseract.js`, extract text, code snippets, or logs directly from an entire image or a specific drawn box region.
* **Clipboard Copy:** One-click copy for both original and edited/converted images directly to the system clipboard (ready to paste into Slack, Teams, Jira, or emails).

### 🔊 4. Audio Trimmer
* Load any audio format (`.mp3`, `.wav`, `.aac`, etc.).
* Inspect waveform duration and trim with decimal-second accuracy.
* Export clean, uncompressed `.wav` files.

### 🎞️ 5. Combine Media Studio
* **Video Joiner:** Add multiple video clips, reorder them with simple arrow controls, and merge them into a single continuous video.
* **Image Merger & Slideshow Creator:** Merge multiple photos side-by-side into a composite image, or generate a video slideshow with configurable per-slide display durations.
* **List Management:** Individual removal buttons (`×`) and full workspace "Clear All" purges.

---

## ⌨️ Pro Keyboard Shortcuts (Video Editor)

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause Preview |
| <kbd>&larr;</kbd> | Step back 1 frame (1/30th sec) |
| <kbd>&rarr;</kbd> | Step forward 1 frame (1/30th sec) |
| <kbd>M</kbd> | Toggle **Mark Box** tool |
| <kbd>B</kbd> | Toggle **Blur Box** tool |
| <kbd>Z</kbd> | Undo last annotation box |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste image from clipboard |

---

## 🛠️ Built With

* **Markup & Styling:** HTML5, CSS Variables, Flexbox, CSS Grid.
* **Core APIs:**
  * `MediaDevices.getDisplayMedia()` & `getUserMedia()`
  * `MediaRecorder` API
  * `HTML5 Canvas` (2D Context Rendering & Image Manipulation)
  * `Web Audio API` (`AudioContext`, `MediaStreamAudioSourceNode`, `MediaStreamDestination`)
  * `ClipboardItem` API
  * `SpeechRecognition` / `webkitSpeechRecognition`
* **External Libraries:**
  * [Tesseract.js](https://github.com/naptha/tesseract.js) (Offline client-side Optical Character Recognition)

---

## 🚀 Getting Started

Since Screen Studio is a static web application, no build tools, Node.js runtime, or npm installs are required!

### Local Quickstart

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/your-username/screen-studio.git](https://github.com/your-username/screen-studio.git)
   cd screen-studio
## Option 1: Python 3

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

---

## Option 2: Node.js (npx)

```bash
npx serve .
```

Then open the URL shown in the terminal.

---

## Option 3: VS Code Live Server

1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

---

## 🌐 Deployment

Deploying **Screen Studio** takes less than 30 seconds on any static hosting platform.

### Deploy to Vercel

#### Option A — Vercel Dashboard

1. Sign in to **Vercel**.
2. Click **Add New → Project**.
3. Drag and drop the `screen-studio` project folder into the **Deploy without Git** area.
4. Wait for deployment to complete.

#### Option B — Vercel CLI

Install the CLI:

```bash
npm install -g vercel
```

Deploy:

```bash
vercel
```

Vercel automatically provides:

- HTTPS/SSL
- Global CDN
- Automatic deployments
- Browser-compatible secure context for recording APIs

---

## 📁 Project Structure

```
screen-studio/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## 🌍 Browser Compatibility

| Browser | Supported |
|----------|-----------|
| Chrome | ✅ |
| Edge | ✅ |
| Brave | ✅ |
| Opera | ✅ |
| Firefox | ⚠️ Partial |
| Safari | ⚠️ Limited |

> **Note:** Some browsers may not support system audio recording due to browser limitations.

---

## 🔒 Permissions

When recording starts, your browser will request permission to access:

- Screen or Window
- Microphone
- System Audio (optional, browser-dependent)

No data is uploaded or stored unless you choose to do so.

---

## 📄 License

This project is distributed under the **MIT License**.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/my-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push to your branch.

```bash
git push origin feature/my-feature
```

5. Open a Pull Request.

---

## ⭐ Support

If you find this project helpful, consider giving it a ⭐ on GitHub.
  
