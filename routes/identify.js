const express = require('express');
const router = express.Router();
const db = require('../db');

/*
  Helper function to build final response
*/
function buildResponse(res, primaryId, contacts) { 

  const primary = contacts.find(c => c.id === primaryId);

  const emails = [
    primary.email,
    ...contacts
      .filter(c => c.id !== primaryId)
      .map(c => c.email)
  ].filter(Boolean);

  const phones = [
    primary.phoneNumber,
    ...contacts
      .filter(c => c.id !== primaryId)
      .map(c => c.phoneNumber)
  ].filter(Boolean);

  const secondaryIds = contacts
    .filter(c => c.linkPrecedence === 'secondary')
    .map(c => c.id);

  return res.status(200).json({
    contact: {
      primaryContatctId: primaryId,
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phones)],
      secondaryContactIds: secondaryIds
    }
  });
}

router.post('/', async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required" });
  }

  try {

    const [existingContacts] = await db.query(
      `SELECT * FROM Contact 
       WHERE email = ? OR phoneNumber = ?`,
      [email || null, phoneNumber || null]
    );

    if (existingContacts.length === 0) {

      const [result] = await db.query(
        `INSERT INTO Contact 
         (email, phoneNumber, linkPrecedence)
         VALUES (?, ?, 'primary')`,
        [email || null, phoneNumber || null]
      );

      return res.status(200).json({
        contact: {
          primaryContatctId: result.insertId,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      });
    }

    let primaryIds = new Set();

    existingContacts.forEach(contact => {
      if (contact.linkPrecedence === 'primary') {
        primaryIds.add(contact.id);
      } else {
        primaryIds.add(contact.linkedId);
      }
    });

    const primaryArray = Array.from(primaryIds);

    const [primaries] = await db.query(
      `SELECT * FROM Contact 
       WHERE id IN (?) 
       ORDER BY createdAt ASC`,
      [primaryArray]
    );

    const mainPrimary = primaries[0];
    // 🔥 Merge other primaries if more than one
    if (primaries.length > 1) {

        for (let i = 1; i < primaries.length; i++) {

            const secondaryPrimary = primaries[i];

            // Convert this primary to secondary
            await db.query(
            `UPDATE Contact
            SET linkPrecedence = 'secondary',
                linkedId = ?
            WHERE id = ?`,
            [mainPrimary.id, secondaryPrimary.id]
            );

            // Update its children to point to main primary
            await db.query(
            `UPDATE Contact
            SET linkedId = ?
            WHERE linkedId = ?`,
            [mainPrimary.id, secondaryPrimary.id]
            );
        }
    }

    const [allContacts] = await db.query(
      `SELECT * FROM Contact 
       WHERE id = ? OR linkedId = ?`,
      [mainPrimary.id, mainPrimary.id]
    );
    // Check if incoming data already exists
    const existingEmails = new Set(allContacts.map(c => c.email).filter(Boolean));
    const existingPhones = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean));

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

    // If new information exists → create secondary
    if (isNewEmail || isNewPhone) {

    await db.query(
        `INSERT INTO Contact 
        (email, phoneNumber, linkedId, linkPrecedence)
        VALUES (?, ?, ?, 'secondary')`,
        [email || null, phoneNumber || null, mainPrimary.id]
    );

    // Refetch updated contacts
    const [updatedContacts] = await db.query(
        `SELECT * FROM Contact 
        WHERE id = ? OR linkedId = ?`,
        [mainPrimary.id, mainPrimary.id]
    );

  return buildResponse(res, mainPrimary.id, updatedContacts);
}

    return buildResponse(res, mainPrimary.id, allContacts);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;