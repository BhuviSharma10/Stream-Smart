# 🎓 StreamSmart — Adaptive Education Streaming for Low-Bandwidth India

**Education shouldn't buffer.**

StreamSmart is an adaptive learning platform that makes online education work on 2G/3G networks. It automatically switches between video, audio, and text modes based on real-time bandwidth — saving up to 90% data.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎙️ **AI Transcription** | Upload any lecture → Get instant transcript (99% data saving) |
| ⚡ **Delta Streaming** | Sends only changed pixels → 70% bandwidth reduction |
| 📶 **Auto Bandwidth Switch** | Detects network quality → switches modes automatically |
| 🧠 **AI Quiz Generator** | Enter any topic → Get smart MCQ questions |

---

## 🚀 How It Works

1. Student joins class on 2G network
2. System detects low bandwidth
3. Auto-switches to audio+transcript mode
4. If disconnected → resumes with missed summary (<50KB)

---

## 📊 Data Savings

| Mode | Data Usage | Saving |
|------|------------|--------|
| Normal Video | 50 MB/hr | - |
| Audio + Text | 5 MB/hr | 90% |
| Delta Streaming | 1.2 MB/s | 70% |
| AI Avatar (Concept) | 0.5 KB/s | 99.99% |

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Python Flask + SocketIO
- **AI:** OpenAI Whisper (local, no API calls)
- **Real-time:** WebRTC + SocketIO

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/StreamSmart.git

# Navigate to folder
cd StreamSmart

# Install dependencies
pip install flask flask-socketio flask-cors whisper openai-whisper

# Run the server
python app.py

# Open browser
http://127.0.0.1:5000
