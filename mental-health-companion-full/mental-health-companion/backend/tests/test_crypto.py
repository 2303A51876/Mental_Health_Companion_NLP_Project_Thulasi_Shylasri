import base64
import os

import pytest

from app.core.crypto import CryptoError, FieldCipher


@pytest.fixture()
def cipher():
    return FieldCipher(base64.b64encode(os.urandom(32)).decode())


def test_roundtrip_unicode(cipher):
    assert cipher.decrypt(cipher.encrypt("I can't sleep 😔", aad="u1"), aad="u1") == "I can't sleep 😔"


def test_nonce_is_random(cipher):
    assert cipher.encrypt("same") != cipher.encrypt("same")


def test_wrong_aad_rejected(cipher):
    with pytest.raises(CryptoError):
        cipher.decrypt(cipher.encrypt("secret", aad="u1"), aad="u2")


def test_tamper_rejected(cipher):
    tok = cipher.encrypt("secret")
    raw = bytearray(base64.b64decode(tok))
    raw[-1] ^= 1
    with pytest.raises(CryptoError):
        cipher.decrypt(base64.b64encode(bytes(raw)).decode())


def test_key_length_enforced():
    with pytest.raises(CryptoError):
        FieldCipher(base64.b64encode(b"too-short").decode())
