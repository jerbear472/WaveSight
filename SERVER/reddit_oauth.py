
import praw
from flask import Flask, request, redirect, session
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    redirect_uri="https://YOUR_REPL_URL.replit.dev/reddit/callback",
    user_agent="WaveSightSentimentBot"
)

@app.route('/reddit/login')
def reddit_login():
    # Generate authorization URL
    auth_url = reddit.auth.url(["read"], "unique_state_string", "permanent")
    return redirect(auth_url)

@app.route('/reddit/callback')
def reddit_callback():
    code = request.args.get('code')
    if code:
        # Exchange code for access token
        reddit.auth.authorize(code)
        # Now you can access user data
        user = reddit.user.me()
        session['reddit_user'] = user.name
        return f"Authenticated as {user.name}"
    return "Authentication failed"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
