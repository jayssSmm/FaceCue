from pydantic import BaseModel

class EmotionAnalysis(BaseModel):
    label: str
    confidence: float
    all_probs: dict[str, float]


class ResponseRequest(BaseModel):
    analysis: EmotionAnalysis
    target_emotion: str