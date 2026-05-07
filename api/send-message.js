export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {

    // ==============================
    // SIMPLE API KEY AUTH
    // ==============================

    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // ==============================
    // LOG FULL WEBENGAGE PAYLOAD
    // ==============================

    console.log("=================================");
    console.log("WEBENGAGE REQUEST RECEIVED");
    console.log("=================================");

    console.log("Headers:");
    console.log(JSON.stringify(req.headers, null, 2));

    console.log("Body:");
    console.log(JSON.stringify(req.body, null, 2));

    // ==============================
    // OPTIONAL PAYLOAD EXTRACTION
    // ==============================

    const phone =
      req.body?.phone ||
      req.body?.toNumber ||
      req.body?.users?.[0]?.phone ||
      null;

    const message =
      req.body?.message ||
      req.body?.content?.text ||
      null;

    console.log("Parsed Data:");
    console.log({
      phone,
      message
    });

    // ==============================
    // RETURN SUCCESS
    // ==============================

    return res.status(200).json({
      success: true,
      message: "Request accepted",
      timestamp: new Date().toISOString()
    });

  } catch (error) {

    console.error("ERROR:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}
