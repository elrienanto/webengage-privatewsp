// File: api/send-message.js

import axios from "axios";

// =========================================
// TEMPLATE MAPPING
// =========================================

const templateMap = {
  "Appointment Reminders":
    "HXb5b62575e6e4ff6129ad7c8efe1f983e"
};

// =========================================
// SIMPLE IN-MEMORY STORE
// POC ONLY
// webengageMessageId ↔ twilioSid
// =========================================

const messageStore = {};

// =========================================
// SEND MESSAGE HANDLER
// =========================================

export async function sendMessage(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "whatsapp_rejected",
      statusCode: 9988,
      message: "Method not allowed"
    });
  }

  try {

    // =========================================
    // AUTH VALIDATION
    // =========================================

    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        status: "whatsapp_rejected",
        statusCode: 2005,
        message: "Authorization failure"
      });
    }

    console.log("WEBENGAGE REQUEST:");
    console.log(JSON.stringify(req.body, null, 2));

    // =========================================
    // EXTRACT PAYLOAD
    // =========================================

    const toNumber =
      req.body?.whatsAppData?.toNumber;

    const templateName =
      req.body?.whatsAppData?.templateData?.templateName;

    const templateVariables =
      req.body?.whatsAppData?.templateData?.templateVariables || [];

    const webengageMessageId =
      req.body?.metadata?.messageId;

    // =========================================
    // TEMPLATE MAPPING
    // =========================================

    const contentSid =
      templateMap[templateName];

    if (!contentSid) {

      return res.status(400).json({
        status: "whatsapp_rejected",
        statusCode: 2021,
        message: "Template Missing"
      });
    }

    // =========================================
    // DYNAMIC VARIABLE MAPPING
    // =========================================

    const contentVariables = {};

    templateVariables.forEach((value, index) => {
      contentVariables[(index + 1).toString()] = value;
    });

    console.log("Mapped Variables:");
    console.log(contentVariables);

    // =========================================
    // SEND TO TWILIO
    // =========================================

    const twilioResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        To: `whatsapp:${toNumber}`,
        From: "whatsapp:+14155238886",
        ContentSid: contentSid,
        ContentVariables: JSON.stringify(contentVariables)
      }),
      {
        auth: {
          username: process.env.ACCOUNT_SID,
          password: process.env.AUTH_TOKEN
        }
      }
    );

    console.log("TWILIO RESPONSE:");
    console.log(twilioResponse.data);

    // =========================================
    // STORE MESSAGE MAPPING
    // =========================================

    messageStore[twilioResponse.data.sid] =
      webengageMessageId;

    console.log("MESSAGE STORE:");
    console.log(messageStore);

    // =========================================
    // WEBENGAGE SUCCESS RESPONSE
    // =========================================

    return res.status(200).json({
      status: "whatsapp_accepted",
      statusCode: 0
    });

  } catch (error) {

    console.error("ERROR:");
    console.error(
      error.response?.data || error.message
    );

    return res.status(200).json({
      status: "whatsapp_rejected",
      statusCode: 9988,
      message:
        error.response?.data?.message ||
        error.message
    });
  }
}

// =========================================
// TWILIO STATUS CALLBACK HANDLER
// =========================================

export async function statusCallback(req, res) {

  try {

    console.log("TWILIO CALLBACK:");
    console.log(req.body);

    const twilioSid =
      req.body?.MessageSid;

    const twilioStatus =
      req.body?.MessageStatus;

    const webengageMessageId =
      messageStore[twilioSid];

    console.log({
      twilioSid,
      twilioStatus,
      webengageMessageId
    });

    // =========================================
    // MAP TWILIO STATUS
    // =========================================

    let status = "whatsapp_accepted";
    let statusCode = 0;

    if (
      twilioStatus === "failed" ||
      twilioStatus === "undelivered"
    ) {
      status = "whatsapp_rejected";
      statusCode = 2009;
    }

    // =========================================
    // SEND DSN TO WEBENGAGE
    // =========================================

    const dsnPayload = {
      messageId: webengageMessageId,
      status,
      statusCode,
      timestamp: new Date().toISOString()
    };

    console.log("WEBENGAGE DSN:");
    console.log(dsnPayload);

    await axios.post(
      "http://wt.webengage.com/tracking/events",
      dsnPayload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("DSN SENT SUCCESSFULLY");

    return res.status(200).send("OK");

  } catch (error) {

    console.error("CALLBACK ERROR:");
    console.error(
      error.response?.data || error.message
    );

    return res.status(500).send("ERROR");
  }
}

// =========================================
// ROUTER
// =========================================

export default async function handler(req, res) {

  if (
    req.url.includes("status-callback")
  ) {
    return statusCallback(req, res);
  }

  return sendMessage(req, res);
}
