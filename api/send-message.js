// File: api/send-message.js

import axios from "axios";

export default async function handler(req, res) {

  // =========================================
  // ONLY ALLOW POST
  // =========================================

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {

    // =========================================
    // API KEY AUTH
    // =========================================

    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // =========================================
    // LOG FULL REQUEST
    // =========================================

    console.log("=================================");
    console.log("WEBENGAGE REQUEST RECEIVED");
    console.log("=================================");

    console.log(JSON.stringify(req.body, null, 2));

    // =========================================
    // EXTRACT REQUIRED FIELDS ONLY
    // =========================================

    const toNumber =
      req.body?.whatsAppData?.toNumber;

    const templateName =
      req.body?.whatsAppData?.templateData?.templateName;

    const messageId =
      req.body?.metadata?.messageId;

    const timestamp =
      req.body?.metadata?.timestamp;

    console.log("Parsed Data:");
    console.log({
      toNumber,
      templateName,
      messageId,
      timestamp
    });

    // =========================================
    // TEMPLATE MAPPING
    // =========================================

    // Hardcoded mapping for POC
    const templateMap = {
      appointment_reminder:
        "HXb5b62575e6e4ff6129ad7c8efe1f983e"
    };

    const contentSid =
      templateMap[templateName];

    // =========================================
    // HANDLE UNKNOWN TEMPLATE
    // =========================================

    if (!contentSid) {

      console.log("Template not mapped");

      return res.status(400).json({
        success: false,
        message: "Template not mapped"
      });
    }

    // =========================================
    // HARDCODED VARIABLES FOR POC
    // =========================================

    const contentVariables = {
      "1": "12/1",
      "2": "3pm"
    };

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

    // =========================================
    // LOG TWILIO RESPONSE
    // =========================================

    console.log("TWILIO RESPONSE:");
    console.log(twilioResponse.data);

    // =========================================
    // SUCCESS RESPONSE
    // =========================================

    return res.status(200).json({
      success: true,
      messageId,
      twilioSid: twilioResponse.data.sid
    });

  } catch (error) {

    console.error("ERROR:");
    console.error(
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.response?.data || error.message
    });
  }
}
