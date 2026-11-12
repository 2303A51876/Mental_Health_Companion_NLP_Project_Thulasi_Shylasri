"""AES-256-GCM field encryption for journal text, chat text, messages and clinical notes.

Format (base64 of):  version(1B) | nonce(12B) | ciphertext+tag
The version byte lets us rotate keys later without a data migration flag day.
Never log plaintext or ciphertext produced here.
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_VERSION = b"\x01"
_NONCE_LEN = 12


class CryptoError(Exception):
    pass


def _load_key(b64_key: str) -> bytes:
    try:
        key = base64.b64decode(b64_key, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise CryptoError("DATA_ENCRYPTION_KEY is not valid base64") from exc
    if len(key) != 32:
        raise CryptoError("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)")
    return key


class FieldCipher:
    def __init__(self, b64_key: str):
        self._aes = AESGCM(_load_key(b64_key))

    def encrypt(self, plaintext: str, aad: str | None = None) -> str:
        nonce = os.urandom(_NONCE_LEN)
        ct = self._aes.encrypt(nonce, plaintext.encode("utf-8"), aad.encode() if aad else None)
        return base64.b64encode(_VERSION + nonce + ct).decode("ascii")

    def decrypt(self, token: str, aad: str | None = None) -> str:
        raw = base64.b64decode(token)
        if raw[:1] != _VERSION:
            raise CryptoError("Unknown ciphertext version")
        nonce, ct = raw[1:1 + _NONCE_LEN], raw[1 + _NONCE_LEN:]
        try:
            return self._aes.decrypt(nonce, ct, aad.encode() if aad else None).decode("utf-8")
        except Exception as exc:  # noqa: BLE001
            raise CryptoError("Decryption failed (wrong key, wrong AAD or tampered data)") from exc


_cipher: FieldCipher | None = None


def get_cipher() -> FieldCipher:
    global _cipher
    if _cipher is None:
        from app.core.config import get_settings
        _cipher = FieldCipher(get_settings().DATA_ENCRYPTION_KEY)
    return _cipher
