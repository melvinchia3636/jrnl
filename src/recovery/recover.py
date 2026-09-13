#!/usr/bin/env python3
"""
JRNL Emergency Recovery Tool (Standalone & Zero External Dependencies)
Usage:
    python3 recover.py <file.jrnl> [KEY]
"""

import sys
import os
import struct
import hashlib
import base64
import tarfile
import io
from subprocess import run, PIPE

MAGIC = b"JRNL\x00\x01\x00\x01"

def decrypt_aes_gcm(encrypted_body, key_str):
    aes_key = hashlib.sha256(key_str.encode("utf-8")).digest()
    iv = encrypted_body[:12]
    auth_tag = encrypted_body[12:28]
    ciphertext = encrypted_body[28:]

    # Method 1: Try python's cryptography module if available
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        return AESGCM(aes_key).decrypt(iv, ciphertext + auth_tag, None)
    except ImportError:
        pass

    # Method 2: Standard OpenSSL CLI (pre-installed on macOS, Linux, and BSD)
    cmd = [
        "openssl", "enc", "-d", "-aes-256-gcm",
        "-K", aes_key.hex(),
        "-iv", iv.hex(),
        "-tag", auth_tag.hex()
    ]
    res = run(cmd, input=ciphertext, stdout=PIPE, stderr=PIPE)
    if res.returncode != 0:
        raise ValueError("Decryption failed. Invalid key or corrupted payload.")
    return res.stdout

def recover(jrnl_path, key_str=None, out_dir=None):
    if not os.path.exists(jrnl_path):
        print(f"Error: File not found: {jrnl_path}", file=sys.stderr)
        sys.exit(1)

    with open(jrnl_path, "rb") as f:
        data = f.read()

    if len(data) < 48:
        print("Error: Invalid .jrnl file (file is too small).", file=sys.stderr)
        sys.exit(1)

    magic = data[:8]
    if magic != MAGIC:
        print("Error: Invalid .jrnl magic header.", file=sys.stderr)
        sys.exit(1)

    print("=========================================")
    print(f" JRNL Recovery: {os.path.basename(jrnl_path)}")
    print("=========================================")
    print("  - Magic Header     : Valid")

    # 1. Manifest
    manifest_hash = data[8:40]
    b64len = struct.unpack(">I", data[40:44])[0]
    manifest_b64 = data[44 : 44 + b64len]
    manifest_bytes = base64.b64decode(manifest_b64)

    actual_manifest_hash = hashlib.sha256(manifest_bytes).digest()
    manifest_valid = actual_manifest_hash == manifest_hash
    print(f"  - Manifest SHA-256 : {'✓ VALID' if manifest_valid else '✗ CORRUPTED'}")

    try:
        manifest_text = manifest_bytes.decode("utf-8")
        print(f"\nManifest Metadata:\n{manifest_text}\n")
    except Exception:
        print("\nCould not decode manifest as UTF-8.\n")

    # 2. Payload
    off = 44 + b64len
    tar_hash = data[off : off + 32]
    off += 32
    body_len = struct.unpack(">Q", data[off : off + 8])[0]
    body = data[off + 8 : off + 8 + body_len]

    actual_tar_hash = hashlib.sha256(body).digest()
    body_valid = actual_tar_hash == tar_hash
    print(f"  - Payload SHA-256  : {'✓ VALID' if body_valid else '✗ CORRUPTED'}")

    if not manifest_valid or not body_valid:
        print("\nError: Container integrity check failed. Archive is corrupt.", file=sys.stderr)
        sys.exit(1)

    # 3. Decrypt
    if not key_str:
        key_str = input("\n[?] Enter encryption key from book spine: ").strip()

    try:
        tar_gz_bytes = decrypt_aes_gcm(body, key_str)
        print("  - Decryption       : ✓ AES-256-GCM Key Verified & Decrypted")
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)

    # 4. Extract tar.gz
    if not out_dir:
        out_dir = jrnl_path[:-5] if jrnl_path.endswith(".jrnl") else f"{jrnl_path}_extracted"

    os.makedirs(out_dir, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(tar_gz_bytes), mode="r:gz") as tar:
        tar.extractall(out_dir)

    print(f"\n✓ Successfully extracted all journal files to:\n  {os.path.abspath(out_dir)}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("JRNL Emergency Recovery Script")
        print("Usage: python3 recover.py <file.jrnl> [KEY] [DEST_DIR]")
        sys.exit(0)

    jrnl_file = sys.argv[1]
    key_arg = sys.argv[2] if len(sys.argv) > 2 else None
    dest_dir = sys.argv[3] if len(sys.argv) > 3 else None
    recover(jrnl_file, key_arg, dest_dir)
