"""Tests for ClaimsGuru Privacy Policy endpoint and compliance."""

import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

# Ensure ingress and repo paths are importable
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "services" / "ingress"))
sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture(scope="module")
def client():
    with patch("app.db.check_db_health", return_value=True):
        from app.main import app
        return TestClient(app)


def test_privacy_policy_html_endpoint(client):
    """Verify single API /privacy&policy returns 200 HTML with all required compliance elements."""
    response = client.get("/privacy&policy")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    html = response.text

    # App and provider identity
    assert "ClaimsGuru" in html
    assert "WaferWire LLC" in html

    # Contact details & links
    assert "info@waferwire.com" in html
    assert "https://www.wct-health.com/" in html
    assert "https://www.wct-health.com/delete-account" in html

    # Key policy elements
    assert "Discharge summaries" in html
    assert "Medical bills and hospital invoices" in html
    assert "account deletion portal" in html.lower() or "delete-account" in html

    # API endpoints must NOT be mentioned in policy text
    assert "/auth/delete-account" not in html


def test_privacy_policy_json_format_query(client):
    """Verify /privacy&policy?format=json returns structured JSON."""
    response = client.get("/privacy&policy?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()

    assert data["product_name"] == "ClaimsGuru"
    assert data["owner"]["name"] == "WaferWire LLC"
    assert data["owner"]["email"] == "info@waferwire.com"
    assert data["owner"]["website"] == "https://www.wct-health.com/"
    assert "sections" in data
    assert len(data["sections"]) >= 13

    # Verify no internal API deletion endpoint mentioned in JSON policy content
    json_text = str(data)
    assert "/auth/delete-account" not in json_text


def test_privacy_policy_json_accept_header(client):
    """Verify /privacy&policy with Accept: application/json returns structured JSON."""
    response = client.get("/privacy&policy", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert data["product_name"] == "ClaimsGuru"
    assert data["owner"]["name"] == "WaferWire LLC"

