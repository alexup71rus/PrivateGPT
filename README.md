**PrivateGPT** is a local AI client replicating the functionality of ChatGPT, Groq, and Yandex Alice — but fully private and self-hosted.

<img src="./src/assets/logo.svg" alt="Logo" width="100" />

### 💡 Why PrivateGPT?

> A full-featured local AI client with private memory, fast search, flexible prompts, and a clean codebase you can extend freely.

<img src="./src/assets/img.png" alt="Screenshot" width="100%" />

### 🚀 Features

* 💬 Works with local LLMs via **Ollama**
* 🧠 Persistent memory (summarization-based), like GPT
* 🖼️ Image generation _**(in development)**_
* 📁 Chat folders for organizing by project _**(in development)**_
* 🔍 Internet search
* 📄 Upload and analyze documents (RAG in development, supports only text files)
* 🖼️ Upload and view images
* ⚡ Quick system prompt snippets
* ⚙️ Minimal, easily adaptable codebase

### ⚙️ Required Models

Download and configure via Ollama:

1. **Summarization model** (used for persistent memory and generating titles)
2. **RAG model** (used for document-based retrieval and persistent memory)
3. **Image generation model**

### 🌐 Optional: SearXNG Search Engine

To enable internet search, you can run SearXNG:

```bash
docker run --restart=always -d -p 8888:8080 \
  -v "./searxng:/etc/searxng:rw" \
  -e "BASE_URL=http://localhost:9090/" \
  -e "INSTANCE_NAME=SearXNG" \
  --name SearXNG searxng/searxng
```

Or:

```bash
docker run -d \
  --name searxng \
  -p 8888:8888 \
  -v ~/searxng-config:/etc/searxng \
  searxng/searxng
```

### 📦 Installation

This is a **monorepo** containing both frontend and backend parts.

First, install dependencies for both root and backend:

```bash
pnpm install
pnpm --prefix backend install
```

Then, to run the app in development mode:

```bash
pnpm dev
```

Or to launch the Electron app:

```bash
pnpm dev:electron
```

### 📄 License

[Apache License](https://github.com/alexup71rus/PrivateGPT/blob/master/LICENSE)

### 📧 Contact
TG: [@alexup71rus](https://t.me/alexup71rus)
