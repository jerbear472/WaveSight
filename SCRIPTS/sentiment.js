import os
from datetime import datetime
from dotenv import load_dotenv
import openai
import praw
from supabase import create_client, Client

# Load credentials from .env
load_dotenv()

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize clients
openai.api_key = OPENAI_API_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent="WaveSightSentimentBot"
)

def classify_sentiment(comment: str) -> str:
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Classify this comment as 'Yes', 'No', or 'Unclear' based on whether the user believes the event will happen."},
                {"role": "user", "content": comment}
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error classifying sentiment: {e}")
        return "Unclear"

def ingest_topic_sentiment(topic: str, limit_posts=20, limit_comments=10):
    yes, no, unclear = 0, 0, 0

    print(f"Fetching Reddit data for topic: {topic}")
    for submission in reddit.subreddit("all").search(topic, limit=limit_posts):
        submission.comments.replace_more(limit=0)
        for comment in submission.comments[:limit_comments]:
            label = classify_sentiment(comment.body)
            if "yes" in label.lower():
                yes += 1
            elif "no" in label.lower():
                no += 1
            else:
                unclear += 1

    total = max(yes + no + unclear, 1)
    confidence = round((yes / total) * 100, 2)

    print(f"Results — Yes: {yes}, No: {no}, Unclear: {unclear}, Confidence: {confidence}%")

    # Push to Supabase
    data = {
        "topic": topic,
        "platform": "Reddit",
        "date": datetime.now().date().isoformat(),
        "sentiment_yes": yes,
        "sentiment_no": no,
        "sentiment_unclear": unclear,
        "confidence": confidence
    }
    try:
        supabase.table("sentiment_forecasts").insert(data).execute()
        print("✅ Data inserted into Supabase.")
    except Exception as e:
        print(f"❌ Failed to insert into Supabase: {e}")

if __name__ == "__main__":
    topic_input = input("Enter a topic to ingest sentiment for: ")
    ingest_topic_sentiment(topic_input)
