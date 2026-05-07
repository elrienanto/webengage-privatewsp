// File: api/send-message.js

import axios from "axios";

export default async function handler(req, res) {

  // =========================================
  // ONLY ALLOW POST
  // =========================================

  if (req.method !== "POST") {
    return res.status(405).json({
      responseCode: "METHOD_NOT_ALLOWED",
      responseMessage: "Method not allowed"
    });
  }

  try {

    // =========================================
    // API KEY AUTH
    // =========================================

    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.API_KEY) {

      return res.status(401).json({
        responseCode: "AUTH_FAILED",
        responseMessage: "Unauthorized"
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
    // EXTRACT REQUIRED FIELDS
    // =========================================

    const toNumber =
      req.body?.whatsAppData?.toNumber;

    const templateName =
      req.body?.whatsAppData?.templateData?.templateName;

    const templateVariables =
      req.body?.whatsAppData?.templateData?.templateVariables || [];

    const messageId =
      req.body?.metadata?.messageId;

    const timestamp =
      req.body?.metadata?.timestamp;

    console.log("Parsed Data:");
    console.log({
      toNumber,
      templateName,
      templateVariables,
      messageId,
      timestamp
    });

    // =========================================
    // TEMPLATE MAPPING
    // =========================================

    const templateMap = {
      "Appointment Reminders":
        "HXb5b62575e6e4ff6129ad7c8efe1f983e"
    };

    const contentSid =
      templateMap[templateName];

    // =========================================
    // HANDLE UNKNOWN TEMPLATE
    // =========================================

    if (!contentSid) {

      return res.status(400).json({
        responseCode: "TEMPLATE_NOT_FOUND",
        responseMessage: "Template mapping not found"
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

    // =========================================
    // LOG TWILIO RESPONSE
    // =========================================

    console.log("TWILIO RESPONSE:");
    console.log(twilioResponse.data);

    // =========================================
    // WEBENGAGE SUCCESS RESPONSE
    // =========================================

    return res.status(200).json({
      responseCode: "SUCCESS",
      responseMessage: "Message accepted successfully",
      metaData: {
        messageId: messageId,
        providerMessageId: twilioResponse.data.sid,
        status: "ACCEPTED",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {

    console.error("ERROR:");
    console.error(
      error.response?.data || error.message
    );

    // =========================================
    // WEBENGAGE FAILURE RESPONSE
    // =========================================

    return res.status(500).json({
      responseCode: "FAILED",
      responseMessage:
        error.response?.data?.message ||
        error.message ||
        "Unknown error",
      metaData: {
        timestamp: new Date().toISOString()
      }
    });
  }
}
