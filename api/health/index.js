export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    message: "API is live – beast mode activated",
    time: new Date().toISOString()
  });
}