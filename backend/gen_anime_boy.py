import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

PROMPT = (
    "A cool, aesthetic anime boy character illustration, portrait, standing confidently. "
    "Short messy dark hair with a hot-pink neon highlight streak, sharp stylish eyes, "
    "wearing a modern techwear jacket with subtle neon-pink and cyan accents. "
    "Cinematic Neo-Tokyo cyberpunk night background with soft bokeh neon lights, "
    "moody dark atmosphere, high-contrast rim lighting in pink and cyan, "
    "detailed modern anime style, dramatic composition, 4k, vertical framing, "
    "subject positioned toward the right side of the frame with negative space on the left."
)


async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="anime-boy-hero", system_message="You are an image generator")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    print("text:", (text or "")[:60])
    if images:
        image_bytes = base64.b64decode(images[0]["data"])
        out = str(Path(__file__).resolve().parent.parent / "frontend" / "public" / "anime-boy.png")
        with open(out, "wb") as f:
            f.write(image_bytes)
        print("SAVED", out, len(image_bytes), "bytes")
    else:
        print("NO IMAGES RETURNED")


asyncio.run(main())
