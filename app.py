from io import BytesIO
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import fitz
import os
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from google import genai

app = Flask(__name__)
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config.from_object(Config)
import os

print("Database URI:", app.config["SQLALCHEMY_DATABASE_URI"])
print("Database Path:", os.path.abspath("database.db"))
import os

print("Database URI:", app.config["SQLALCHEMY_DATABASE_URI"])
print("Database File:", os.path.abspath("database.db"))

db = SQLAlchemy(app)
print("Database:", app.config["SQLALCHEMY_DATABASE_URI"])

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"



# Gemini AI

client = genai.Client(api_key=app.config["GEMINI_API_KEY"])



# Database Model

class User(UserMixin, db.Model):

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(300))


class ChatHistory(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer)

    question = db.Column(db.Text)

    answer = db.Column(db.Text)
@app.route("/upload_pdf", methods=["POST"])
@login_required
def upload_pdf():

    if "pdf" not in request.files:
        return jsonify({"answer": "No PDF uploaded"})

    pdf = request.files["pdf"]

    filename = secure_filename(pdf.filename)

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    pdf.save(filepath)

    doc = fitz.open(filepath)

    text = ""

    for page in doc:
        text += page.get_text()

    response = client.models.generate_content(
       model="gemini-2.5-flash",
        contents="Summarize these notes:\n\n" + text[:12000]
    )

    return jsonify({
        "summary": response.text
    })
@app.route("/generate_quiz", methods=["POST"])
@login_required
def generate_quiz():

    topic = request.json.get("topic")

    prompt = f"""
    Generate 10 multiple choice questions on {topic}.

    Format:

    Question:
    A.
    B.
    C.
    D.

    Correct Answer:
    """

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return jsonify({
            "quiz": response.text
        })

    except Exception as e:

        return jsonify({
            "quiz": str(e)
        })


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        username = request.form["username"]
        email = request.form["email"]
        password = request.form["password"]

        if User.query.filter_by(email=email).first():

            flash("Email already exists!")

            return redirect(url_for("signup"))

        hashed_password = generate_password_hash(password)

        user = User(
            username=username,
            email=email,
            password=hashed_password
        )

        db.session.add(user)
        db.session.commit()
        
        

        flash("Account Created Successfully")

        return redirect(url_for("login"))

    return render_template("signup.html")
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):

            login_user(user)

            return redirect(url_for("dashboard"))

        flash("Invalid Email or Password")

    return render_template("login.html")
# ===========================
# Dashboard
# ===========================

@app.route("/dashboard")
@login_required
def dashboard():
    return render_template(
        "chat.html",
        user=current_user
    )

# ===========================
# Logout
# ===========================

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


# ===========================
# Home
# ===========================

@app.route("/")
def home():
    return redirect(url_for("login"))


# ===========================
# Ask Gemini AI
# ===========================
@app.route("/ask", methods=["POST"])
@login_required
def ask():

    question = request.json.get("question")

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=question
        )

        answer = response.text

        print("Question:", question)
        print("Current User:", current_user.id)

        chat = ChatHistory(
            user_id=current_user.id,
            question=question,
            answer=answer
        )

        db.session.add(chat)
        db.session.commit()

        print("Chat Saved Successfully")

        return jsonify({
            "answer": answer
        })

    except Exception as e:

        print("ERROR:", e)

        return jsonify({
            "answer": str(e)
        })
@app.route("/history")
@login_required
def history():

    chats = ChatHistory.query.filter_by(
        user_id=current_user.id
    ).all()

    data = []

    for chat in chats:

        data.append({
            "question": chat.question,
            "answer": chat.answer
        })

    return jsonify(data)
@app.route("/delete_history", methods=["POST"])
@login_required
def delete_history():

    ChatHistory.query.filter_by(
        user_id=current_user.id
    ).delete()

    db.session.commit()

    return jsonify({
        "message": "History Deleted"
    })
@app.route("/download_pdf", methods=["POST"])
@login_required
def download_pdf():

    data = request.json

    answer = data.get("answer", "")

    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer)

    styles = getSampleStyleSheet()

    story = []

    story.append(Paragraph("<b>Edu Genie AI Answer</b>", styles["Heading1"]))

    story.append(Paragraph(answer.replace("\n", "<br/>"), styles["BodyText"]))

    doc.build(story)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="EduGenie_Answer.pdf",
        mimetype="application/pdf"
    )
# ===========================
# Study Planner
# ===========================

@app.route("/study_plan", methods=["POST"])
@login_required
def study_plan():

    subject = request.json.get("subject")
    days = request.json.get("days")

    prompt = f"""
    Create a {days}-day study plan for {subject}.

    Format:

    Day 1:
    Topics

    Day 2:
    Topics

    Continue until Day {days}.

    Give practical daily targets.
    """

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return jsonify({
            "plan": response.text
        })

    except Exception as e:

        return jsonify({
            "plan": str(e)
        })
# ===========================
# Run App
# ===========================

if __name__ == "__main__":

    with app.app_context():
        db.create_all()

    app.run(debug=True)