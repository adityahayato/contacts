# Contactly

A small contacts app with a Flask backend, a plain HTML/CSS/JavaScript interface, and MySQL storage.

## Requirements

- Python 3.10+
- MySQL 8.0+

## Setup

1. Create and activate a virtual environment, then install dependencies:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Create the database and contacts table. From a MySQL client, run:

   ```sql
   SOURCE C:/Users/ASUS/Desktop/simple contacts/schema.sql;
   ```

   Or open `schema.sql` in MySQL Workbench and execute it.

3. Set the database connection values in your terminal. For example:

   ```powershell
   $env:DB_HOST = "localhost"
   $env:DB_USER = "root"
   $env:DB_PASSWORD = "your_mysql_password"
   $env:DB_NAME = "contacts_db"
   ```

4. Start the app:

   ```powershell
   py app.py
   ```

5. Open <http://127.0.0.1:5000>.

The app supports searching by name, mobile number, email, or address. Name and mobile number are required when saving a contact. `.env.example` documents the supported settings; Flask does not load it automatically, so set environment variables in your shell or use a local dotenv setup.
