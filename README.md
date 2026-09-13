<center>
  <h1 align="center">📓 jrnl — Journal Scanner Suite</h1>
  <p align="center">A unified, zero-prompt CLI suite for scanning, OCR transcribing, organizing, and archiving physical handwritten journals into cryptographically verified .jrnl packages.</p>
</center>

## 🤔 The Problem

Archiving physical handwritten journals into digital formats usually involves fragmented workflows: manual scanner software on remote devices, disconnected OCR scripts, tedious folder organization, and unencrypted file storage without long-term bit rot verification or disaster recovery guarantees.

## 💡 The Solution

`jrnl` provides a consolidated, low-maintenance CLI suite tailored for seamless physical journal preservation:

- **Remote Hardware Scanning (`jrnl scan`)**: Scans pages over SSH via `scanimage`, auto-increments page filenames (`JRNL-0001.png`), and auto-rotates images with ImageMagick.
- **AI OCR Transcription (`jrnl ocr`)**: Batch transcribes handwritten pages using Gemini (`gemini-3.5-flash-lite`) with automatic skip logic for existing transcriptions.
- **Automated Organization (`jrnl group`)**: Sorts raw scans and transcriptions cleanly into `images/` and `texts/` folders.
- **Volume Statistics (`jrnl stats`)**: Calculates per-page word counts, character totals, and aggregate volume metrics.
- **Hardware-Keyed Encryption (`jrnl pack`)**: Scans 2D Data Matrix codes printed on the physical book spine via native Mac webcam and Apple Vision, generates lean manifests, and encrypts archives with **AES-256-GCM**.
- **Cold Storage Integrity Verification (`jrnl verify`)**: Validates SHA-256 checksums and reads metadata without needing decryption keys or webcam hardware.
- **Zero-Dependency Emergency Recovery**: Ships with standalone, offline disaster recovery tools in Python ([`recover.py`](./src/recovery/recover.py)) and browser HTML5 WebCrypto ([`recover.html`](./src/recovery/recover.html)).

## 🖥 Screenshots

<div align="center">
  <img width="49%" alt="CLI Interface" src="https://via.placeholder.com/600x400?text=jrnl+CLI+Interface" />
  <img width="49%" alt="Recovery Tool" src="https://via.placeholder.com/600x400?text=Emergency+Web+Recovery" />
</div>

## 🔬 Technologies Used

![TypeScript](https://img.shields.io/badge/-TYPESCRIPT-FF0000?style=for-the-badge&logo=typescript&logoColor=white&color=3178C6)
![Bun](https://img.shields.io/badge/-BUN-FF0000?style=for-the-badge&logo=bun&logoColor=white&color=FBF0DF&logoColor=black)
![Google Gemini](https://img.shields.io/badge/-GOOGLE_GEMINI-FF0000?style=for-the-badge&logo=googlegemini&logoColor=white&color=8E75B2)
![Swift](https://img.shields.io/badge/-SWIFT-FF0000?style=for-the-badge&logo=swift&logoColor=white&color=F05138)
![OpenSSL](https://img.shields.io/badge/-AES_256_GCM-FF0000?style=for-the-badge&logo=lock&logoColor=white&color=09090B)

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

