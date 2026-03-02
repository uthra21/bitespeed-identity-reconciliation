# Bitespeed Backend Task - Identity Reconciliation

## Tech Stack
- Node.js
- Express.js
- MySQL

## Endpoint
POST /identify

Request Body (JSON):
{
  "email": string?,
  "phoneNumber": string?
}

## Features
- Primary contact creation
- Secondary contact creation
- Automatic merging of primary contacts
- Consolidated contact response
- Oldest contact precedence logic

## Running Locally

1. Install dependencies:
   npm install

2. Setup MySQL database and Contact table

3. Add .env file with DB credentials

4. Run:
   npx nodemon server.js

## Live Endpoint
POST https://bitespeed-identity-reconciliation-wyvu.onrender.com/identify