import sqlite3
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

import subprocess, hmac, hashlib, os

GITHUB_SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET')
DEPLOY_SCRIPT_PATH = "/home/maxnificent/mysite/deepfake-ethics/deploy.sh"

app = Flask('Deepfake Detective')
CORS(app)
DATABASE = 'scores.db'


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    with app.app_context():
        cursor = db.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_interactions'")
        table_exists = cursor.fetchone()
        if table_exists:
            cursor.execute("PRAGMA table_info(user_interactions)")
            columns = [info['name'] for info in cursor.fetchall()]

        #create table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                design_theme TEXT NOT NULL,
                exhibit_id INTEGER NOT NULL,     -- ID of exhibit, -999 for initial, 999 for final
                user_guess TEXT,               -- Guess for exhibit (NULL for initial/final)
                initial_ethical_score INTEGER, -- opinion before considerations, NULL for initial/final
                ethical_score INTEGER NOT NULL   -- opinion after considerations, includes initial/final value
            )
        ''')

        db.commit()
        db.close()

init_db()

#webpages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index.html')
def home():
    return render_template('index.html')

@app.route('/game.html')
def game():
    return render_template('game.html')

@app.route('/about.html')
def about():
    return render_template('about.html')


@app.route('/submit_score', methods=['POST', 'OPTIONS'])
def submit_score():
    if request.method == 'OPTIONS':
        return app.make_default_options_response()
    if request.method == 'POST':
        if not request.is_json:
             return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()

        session_id = data.get('session_id')
        design_theme = data.get('design_theme')
        exhibit_id = data.get('exhibit_id')
        ethical_score = data.get('ethical_score')
        user_guess = data.get('user_guess')
        initial_ethical_score = data.get('initial_ethical_score')

        exhibit_id = int(exhibit_id)
        ethical_score = int(ethical_score)
        if initial_ethical_score is not None:
            initial_ethical_score = int(initial_ethical_score)

        db = get_db()
        cursor = db.cursor()

        try:
            # Updated INSERT query with initial_ethical_score
            cursor.execute(
                '''INSERT INTO user_interactions
                   (session_id, design_theme, exhibit_id, user_guess, initial_ethical_score, ethical_score)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                # Tuple includes the new value
                (session_id, design_theme, exhibit_id, user_guess, initial_ethical_score, ethical_score)
            )
            db.commit()
            return jsonify({"message": "Score submitted successfully"}), 200

        except Exception as e:
             db.rollback()
             message = f"Insertio error: {e}"
             return jsonify({"error": message}), 500
        finally:
            db.close()

    return jsonify({"error": "Method Not Allowed"}), 405

#get user statistics
@app.route('/get_stats/<int:exhibit_id>', methods=['GET'])
def get_stats(exhibit_id):
    db = get_db()
    cursor = db.cursor()
    stats = {'real': 0, 'fake': 0, 'uncertain': 0, 'total': 0}
    percentages = {'real': 0, 'fake': 0, 'uncertain': 0}

    try:
        cursor.execute(
            "SELECT user_guess, COUNT(*) FROM user_interactions WHERE exhibit_id = ? AND user_guess IS NOT NULL GROUP BY user_guess",
            (exhibit_id,))

        rows = cursor.fetchall()
        for row in rows:
            guess = row['user_guess']
            count = row['COUNT(*)']
            if guess in stats:
                stats[guess] = count
            stats['total'] += count

        if stats['total'] > 0:
            percentages['real'] = round((stats.get('real', 0) / stats['total']) * 100)
            percentages['fake'] = round((stats.get('fake', 0) / stats['total']) * 100)
            percentages['uncertain'] = round((stats.get('uncertain', 0) / stats['total']) * 100)

        return jsonify(percentages), 200

    except Exception as e:
        print(f"Unexpected error getting stats for exhibit {exhibit_id}: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    finally:
        db.close()

#verify webhook signature
def is_valid_signature(x_hub_signature, data, private_key):
    hash_algorithm, signature = x_hub_signature.split("=", 1)
    algorithm = getattr(hashlib, hash_algorithm)
    expected_signature = hmac.new(private_key.encode(), data, algorithm).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    x_hub_signature = request.headers.get('X-Hub-Signature')
    if GITHUB_SECRET:
        if x_hub_signature is None:
            print("Missing X-Hub-Signature header")
            return 'Error: Missing X-Hub-Signature header', 400
        if not is_valid_signature(x_hub_signature, request.data, GITHUB_SECRET):
            print("Invalid X-Hub-Signature")
            return 'Error: Invalid X-Hub-Signature', 400

    if request.headers.get('X-GitHub-Event') == 'push':
        print('Push event received from GitHub')
        try:
            # Execute the deployment script
            subprocess.Popen(['bash', DEPLOY_SCRIPT_PATH])
            print('Deployment script executed')
            return 'Success: Deployment script executed', 200
        except Exception as e:
            print(f'Error executing deployment script: {e}')
            return f'Error: {e}', 500
    else:
        print(f"Received event: {request.headers.get('X-GitHub-Event')}")
        return 'Not a push event', 200


if __name__=='__main__':
    app.run(port=5000)