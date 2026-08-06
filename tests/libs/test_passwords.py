import hashlib

from libs.auth.passwords import hash_password, password_matches


def test_password_matches_supports_hash_transport_values() -> None:
    password = "StrongPassword123!"
    stored_hash = hash_password(password)
    transported_hash = f"sha256${hashlib.sha256(password.encode('utf-8')).hexdigest()}"

    assert password_matches(transported_hash, stored_hash)


def test_password_matches_falls_back_to_plaintext_verification() -> None:
    password = "AnotherPassword!"
    stored_hash = hash_password(password)

    assert password_matches(password, stored_hash)
