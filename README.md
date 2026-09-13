<center>
  <h1 align="center">📓 jrnl — Journal Scanner Suite</h1>
  <p align="center">A unified, zero-prompt CLI suite for scanning, OCR transcribing, organizing, and archiving physical handwritten journals into cryptographically verified .jrnl packages.</p>
</center>

## 🤔 The Problem

> Note: The following problem statement is written by a human, a.k.a. the author himself.

I started writing journals in physical notebooks, and I need a way to preserve them safely in a digital format. I have a printer, but it can only be accessed on some devices, not the current MacBook Air that I'm using, which doesn't support the printer's outdated driver. So I can only use my Raspberry Pi to connect to the printer and access the scanner via SSH on my laptop. This is a repetitive and tedious task, so I need a way to streamline the entire process.

## 💡 The Solution

This is when the nerdy parts of a programmer come into play.

`jrnl` provides a consolidated, low-maintenance CLI suite tailored for seamless physical journal preservation:

| Command | Action | Description |
| :--- | :--- | :--- |
| `jrnl scan` | **Remote Hardware Scanning** | Scans pages over SSH via `scanimage`, auto-increments page filenames (`JRNL-0001.png`), and auto-rotates images with ImageMagick. |
| `jrnl ocr` | **AI OCR Transcription** | Batch transcribes handwritten pages using Gemini (`gemini-3.5-flash-lite`) with automatic skip logic for existing transcriptions. |
| `jrnl group` | **Automated Organization** | Sorts raw scans and transcriptions cleanly into `images/` and `texts/` folders. |
| `jrnl stats` | **Volume Statistics** | Calculates per-page word counts, character totals, and aggregate volume metrics. |
| `jrnl pack` | **Hardware-Keyed Encryption** | Scans 2D Data Matrix codes on the physical spine via webcam and Apple Vision, generates lean manifests, and encrypts archives with **AES-256-GCM**. |
| `jrnl verify` | **Integrity Verification** | Validates SHA-256 checksums and reads metadata without needing decryption keys or webcam hardware. |
| `jrnl unpack` | **Decryption & Extraction** | Decrypts and extracts `.jrnl` packages back to their original folder hierarchy. |
| `recover.py` / `recover.html` | **Disaster Recovery** | Standalone, zero-dependency offline recovery tools in Python and browser HTML5 WebCrypto. |

## 🖥 Screenshots

<div align="center">
  <img width="49%" alt="image" src="https://github.com/user-attachments/assets/f1ebdacb-9e6a-4201-aaba-be9768cdd724" />
  <img width="49%" alt="image" src="https://github.com/user-attachments/assets/7baba574-fe57-4cb7-828b-bcd712f65c6e" />
</div>

## 🔬 Technologies Used

![TypeScript](https://img.shields.io/badge/-TYPESCRIPT-FF0000?style=for-the-badge&logo=typescript&logoColor=white&color=3178C6)
![Google Gemini](https://img.shields.io/badge/-GOOGLE_GEMINI-FF0000?style=for-the-badge&logo=googlegemini&logoColor=white&color=8E75B2)
![Swift](https://img.shields.io/badge/-SWIFT-FF0000?style=for-the-badge&logo=swift&logoColor=white&color=F05138)

## ⌨️ Setup

If you want to run this project on your local machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/melvinchia3636/journal-scanner.git
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. (Optional) Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SSH_HOST=raspi@raspi.local
   SSH_PASS=your_ssh_password
   JOURNAL_DIR=~/Desktop/journal
   ```

4. Run CLI commands or tests:
   ```bash
   # Execute CLI
   bun run jrnl <command> /path/to/journal

   # Run automated test suite
   bun test
   ```

### Spine Data Matrix Specification
Printed on physical journal spines:
```text
<volume>,<startDate>,<endDate>,<encryptionKey>
```
*Example:* `3,2026-08-14,2026-09-05,XSLCGOMI041IQNUY`

## 📈 Status

This project is completed. If you encounter any bugs or edge cases, please feel free to open an issue or pull request.

## 💡 Inspirations

Inspired by analog paper journaling systems and the need for zero-fuss, tamper-proof digital archiving with physical key provenance.

## 📄 License

Copyright © 2026 Melvin Chia<br/>
Licensed under the [MIT License](LICENSE).

