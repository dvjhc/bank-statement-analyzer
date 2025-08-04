// api/server.js - Temporary for debugging

module.exports = (req, res) => {
  console.log("--- DEBUG SERVER IS RUNNING ---");
  console.log("Request received for path:", req.url);

  // Send a simple success response
  res.status(200).json({ message: "Debug server is active." });
};