import hashlib


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def password_matches(password_or_hash: str, stored_hash: str) -> bool:
    if not password_or_hash or not stored_hash or not isinstance(password_or_hash, str) or not isinstance(stored_hash, str):
        return False

    normalized_input = password_or_hash.strip()
    normalized_stored = stored_hash.strip()

    if normalized_input.startswith("sha256$") or normalized_input.startswith("pbkdf2_sha256$"):
        return normalized_input == normalized_stored

    return verify_password(normalized_input, normalized_stored)


def verify_password(password: str, hashed_password: str) -> bool:
    if not hashed_password or not isinstance(hashed_password, str):
        return False

    if hashed_password.startswith("sha256$"):
        expected = hashed_password.split("$", 1)[1]
        return hashlib.sha256(password.encode("utf-8")).hexdigest() == expected

    if hashed_password.startswith("pbkdf2_sha256$"):
        parts = hashed_password.split("$")
        if len(parts) != 4:
            return False

        _, iterations_str, salt, expected_hex = parts
        try:
            iterations = int(iterations_str)
        except ValueError:
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return digest.hex() == expected_hex

    return hashed_password == password
