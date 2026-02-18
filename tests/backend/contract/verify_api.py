import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "src" / "python_backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


def assert_shape(data: dict, required_keys: list[str], label: str) -> None:
    missing = [key for key in required_keys if key not in data]
    if missing:
        raise AssertionError(f"{label} missing keys: {missing}")


def verify_provider_status(client: TestClient) -> None:
    response = client.get("/api/providers/google/status")
    print(f"GET /api/providers/google/status -> {response.status_code}")
    if response.status_code != 200:
        raise AssertionError(response.text)

    data = response.json()
    assert_shape(
        data,
        ["provider", "ok", "state", "message", "configured", "masked"],
        "status response",
    )
    print(
        f"status.provider={data['provider']} state={data['state']} configured={data['configured']}"
    )


def verify_provider_connect_contract(client: TestClient) -> None:
    response = client.post("/api/providers/google/connect", json={"verify": False})
    print(f"POST /api/providers/google/connect -> {response.status_code}")
    if response.status_code != 200:
        raise AssertionError(response.text)

    data = response.json()
    assert_shape(
        data,
        ["provider", "ok", "state", "message", "configured", "masked"],
        "connect response",
    )
    print(f"connect.state={data['state']} ok={data['ok']} configured={data['configured']}")


def verify_provider_live_test(client: TestClient) -> None:
    if os.environ.get("VERIFY_GOOGLE_LIVE") != "1":
        print("Skip live test: set VERIFY_GOOGLE_LIVE=1 to enable.")
        return

    response = client.post(
        "/api/providers/google/test",
        json={
            "model": "gemini-2.5-flash-lite-latest",
            "message": "Reply with exactly: OK",
        },
    )
    print(f"POST /api/providers/google/test -> {response.status_code}")
    if response.status_code != 200:
        raise AssertionError(response.text)

    data = response.json()
    assert_shape(data, ["provider", "ok", "message"], "test response")
    print(f"test.ok={data['ok']} message={data['message']}")


def main() -> None:
    client = TestClient(app)
    verify_provider_status(client)
    verify_provider_connect_contract(client)
    verify_provider_live_test(client)
    print("Provider API verification passed.")


if __name__ == "__main__":
    main()
