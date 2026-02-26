import httpx
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import get_settings

router = APIRouter()


@router.get("/config", summary="Get ElevenLabs agent ID")
async def get_config():
    """Return the agent ID for the ElevenLabs widget embed."""
    settings = get_settings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
        )
    return {"agent_id": settings.elevenlabs_agent_id}


@router.get("/token", summary="Get ElevenLabs conversation token")
async def get_conversation_token():
    """Generate a signed URL for ElevenLabs Conversational AI WebSocket connection.

    Keeps the API key server-side -- the frontend never sees it.
    """
    settings = get_settings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
        )

    url = (
        f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
        f"?agent_id={settings.elevenlabs_agent_id}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                url,
                headers={"xi-api-key": settings.elevenlabs_api_key},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("ElevenLabs signed URL generated for agent {}", settings.elevenlabs_agent_id)
            return {"signed_url": data["signed_url"]}
    except httpx.HTTPStatusError as e:
        logger.error("ElevenLabs API error: {} {}", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Failed to get ElevenLabs token")
    except Exception as e:
        logger.error("ElevenLabs token error: {}", str(e))
        raise HTTPException(status_code=502, detail="Failed to get ElevenLabs token")
