from flask import Flask, request, jsonify, render_template
import sqlite3
from pathlib import Path

app = Flask(__name__)
DB_PATH = Path(__file__).parent / "students.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            roll_no TEXT NOT NULL UNIQUE,
            student_class TEXT NOT NULL,
            marks REAL NOT NULL,
            contact TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

@app.route("/")
def home():
    return render_template("index.html")

@app.get("/api/students")
def get_students():
    conn = get_db()
    rows = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.get("/api/students/search")
def search_students():
    q = request.args.get("q", "").strip()
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM students
        WHERE name LIKE ? OR roll_no LIKE ?
        ORDER BY id DESC
    """, (f"%{q}%", f"%{q}%")).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.post("/api/students")
def add_student():
    data = request.get_json(silent=True) or {}
    required = ["name", "roll_no", "student_class", "marks", "contact"]

    if any(str(data.get(field, "")).strip() == "" for field in required):
        return jsonify({"error": "All fields are required."}), 400

    try:
        marks = float(data["marks"])
    except (ValueError, TypeError):
        return jsonify({"error": "Marks must be a number."}), 400

    if marks < 0 or marks > 100:
        return jsonify({"error": "Marks must be between 0 and 100."}), 400

    contact = str(data["contact"]).strip()
    if not contact.isdigit() or len(contact) != 10:
        return jsonify({"error": "Contact number must contain exactly 10 digits."}), 400

    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO students (name, roll_no, student_class, marks, contact)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data["name"].strip(),
            data["roll_no"].strip(),
            data["student_class"].strip(),
            marks,
            contact
        ))
        conn.commit()
        return jsonify({"message": "Student added successfully."}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Roll number already exists."}), 409
    finally:
        conn.close()

@app.put("/api/students/<int:student_id>")
def update_student(student_id):
    data = request.get_json(silent=True) or {}
    required = ["name", "roll_no", "student_class", "marks", "contact"]

    if any(str(data.get(field, "")).strip() == "" for field in required):
        return jsonify({"error": "All fields are required."}), 400

    try:
        marks = float(data["marks"])
    except (ValueError, TypeError):
        return jsonify({"error": "Marks must be a number."}), 400

    if marks < 0 or marks > 100:
        return jsonify({"error": "Marks must be between 0 and 100."}), 400

    contact = str(data["contact"]).strip()
    if not contact.isdigit() or len(contact) != 10:
        return jsonify({"error": "Contact number must contain exactly 10 digits."}), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            UPDATE students
            SET name = ?, roll_no = ?, student_class = ?, marks = ?, contact = ?
            WHERE id = ?
        """, (
            data["name"].strip(),
            data["roll_no"].strip(),
            data["student_class"].strip(),
            marks,
            contact,
            student_id
        ))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Student not found."}), 404

        return jsonify({"message": "Student updated successfully."})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Roll number already exists."}), 409
    finally:
        conn.close()

@app.delete("/api/students/<int:student_id>")
def delete_student(student_id):
    conn = get_db()
    cursor = conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"message": "Student deleted successfully."})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
