# Billing App Backend

This is the backend server for the Billing App. It handles product management, invoice generation (with logo), and saves customer and product data.

## Features

- Add, edit, delete products
- Save product and customer information
- Generate professional invoice PDFs
- Convert total price into words (Dirhams and Fils)

## Technologies Used

- Node.js
- Express.js
- Puppeteer (for PDF generation)
- dotenv (for environment variables)

## Installation

Clone the repository:

```bash
git clone https://github.com/shubrobarua007/billing_app.git
cd billing_app
npm install


How to Run
Make sure you have a .env file with the following content:

PORT=3002
Then start the server:

node test.js

Folder Structure

serverside/
├── shoplogo/       # Store shop logo image
├── invoices/       # Generated invoice PDFs
├── .env            # Environment variables
├── server.js       # Main backend server file
├── package.json    # Project dependencies

