import os
import re

import mysql.connector
from flask import Flask, jsonify, render_template, request
from mysql.connector import Error

app = Flask(__name__)


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "contacts_db"),
    )


def serialize_contact(row):
    return {
        "id": row[0],
        "name": row[1],
        "mobile": row[2],
        "email": row[3] or "",
        "address": row[4] or "",
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/contacts")
def list_contacts():
    query = request.args.get("q", "").strip()
    pattern = f"%{query}%"
    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            """SELECT id, name, mobile, email, address FROM contacts
               WHERE name LIKE %s OR mobile LIKE %s OR email LIKE %s OR address LIKE %s
               ORDER BY name COLLATE utf8mb4_0900_ai_ci""",
            (pattern, pattern, pattern, pattern),
        )
        return jsonify([serialize_contact(row) for row in cursor.fetchall()])
    except Error:
        app.logger.exception("Could not load contacts")
        return jsonify({"error": "Could not load contacts. Check your database setup."}), 500
    finally:
        if connection is not None and connection.is_connected():
            connection.close()


@app.post("/api/contacts")
def create_contact():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    mobile = str(data.get("mobile", "")).strip()
    email = str(data.get("email", "")).strip()
    address = str(data.get("address", "")).strip()
    if not name or not mobile:
        return jsonify({"error": "Name and mobile number are required."}), 400
    if not re.fullmatch(r"\d{10}", mobile):
        return jsonify({"error": "Mobile number must contain exactly 10 digits."}), 400
    if email and not re.fullmatch(r"[A-Za-z0-9._%+-]+@gmail\.com", email, re.IGNORECASE):
        return jsonify({"error": "Please enter a valid Gmail address ending in @gmail.com."}), 400
    if len(name) > 120 or len(mobile) > 30 or len(email) > 254 or len(address) > 500:
        return jsonify({"error": "One or more fields are too long."}), 400

    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO contacts (name, mobile, email, address) VALUES (%s, %s, %s, %s)",
            (name, mobile, email or None, address or None),
        )
        connection.commit()
        contact_id = cursor.lastrowid
        return jsonify({"id": contact_id, "name": name, "mobile": mobile, "email": email, "address": address}), 201
    except Error:
        if connection is not None and connection.is_connected():
            connection.rollback()
        app.logger.exception("Could not save contact")
        return jsonify({"error": "Could not save contact. Check your database setup."}), 500
    finally:
        if connection is not None and connection.is_connected():
            connection.close()


@app.delete("/api/contacts/<int:contact_id>")
def delete_contact(contact_id):
    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Contact not found."}), 404
        return jsonify({"message": "Contact deleted."})
    except Error:
        if connection is not None and connection.is_connected():
            connection.rollback()
        app.logger.exception("Could not delete contact")
        return jsonify({"error": "Could not delete contact. Check your database setup."}), 500
    finally:
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    app.run(debug=True)
