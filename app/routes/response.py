import os
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from dotenv import load_dotenv
import app.pydantic_inputVerify.responseModel as response
import traceback

load_dotenv()

router = APIRouter()
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv('GROQ_API_KEY'),
)

MASTER_PROMPT = os.getenv('MASTER_PROMPT')


def build_user_message(analysis: response.EmotionAnalysis, target_emotion: str) -> str:
    probs_formatted = "\n".join(
        f"  - {emotion}: {prob * 100:.2f}%"
        for emotion, prob in sorted(
            analysis.all_probs.items(), key=lambda x: x[1], reverse=True
        )
    )

    return f"""Current expression detected: **{analysis.label}** ({analysis.confidence * 100:.1f}% confidence)

Full probability breakdown:
{probs_formatted}

Target emotion the user wants to express: **{target_emotion}**

Please provide your coaching feedback."""


@router.post("/response")
async def generate_response(body: response.ResponseRequest):
    if body.target_emotion not in [
        "Neutral", "Happy", "Sad", "Surprise", "Fear", "Disgust", "Angry"
    ]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_emotion '{body.target_emotion}'. "
                   "Must be one of: Neutral, Happy, Sad, Surprise, Fear, Disgust, Angry",
        )
 
    user_message = build_user_message(body.analysis, body.target_emotion)
 
    try:
        chat_completion = client.chat.completions.create(
            model="openai/gpt-oss-120b", 
            messages=[
                {"role": "system", "content": MASTER_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=400,
        )
 
        message = chat_completion.choices[0].message.content
        return {"message": message}
 
    except Exception as e:
        traceback.print_exc()
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")