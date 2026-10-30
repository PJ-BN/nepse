import pytest


@pytest.mark.asyncio
async def test_ai_evaluation_save_and_get(client):
    payload = {
        "symbol": "TESTSYM",
        "verdict": "BUY NOW",
        "score": 90,
        "evaluated_at": "2026-10-28T10:00:00Z",
    }
    # 1. Save evaluation
    save_resp = await client.post(
        "/api/v1/ai/evaluation",
        json={
            "feature": "company",
            "entity_key": "TESTSYM",
            "payload": payload,
            "source": "agy",
            "generated_at": "2026-10-28T10:00:00Z",
        },
    )
    assert save_resp.status_code == 200
    save_data = save_resp.json()
    assert save_data["status"] == "saved"
    assert save_data["entity_key"] == "TESTSYM"

    # 2. Get latest evaluation
    get_resp = await client.get(
        "/api/v1/ai/evaluation",
        params={"feature": "company", "entity_key": "TESTSYM"},
    )
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["symbol"] == "TESTSYM"
    assert get_data["verdict"] == "BUY NOW"
    assert get_data["source"] == "agy"
    assert "generated_at" in get_data

    # 3. Get history
    hist_resp = await client.get(
        "/api/v1/ai/evaluation/history",
        params={"feature": "company", "entity_key": "TESTSYM", "limit": 5},
    )
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["entity_key"] == "TESTSYM"

    # 4. Unknown entity returns 404
    missing_resp = await client.get(
        "/api/v1/ai/evaluation",
        params={"feature": "company", "entity_key": "NONEXISTENT_XYZ"},
    )
    assert missing_resp.status_code == 404
