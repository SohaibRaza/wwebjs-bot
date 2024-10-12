const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { getExceptionMessage } = require("./helper");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "Multi-Techno4" }),
});

client.on("ready", () => {
  console.log("Client is ready!");
  client.sendMessage("923045771644@c.us", "Client is ready!");
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("error", (error) => {
  console.error("Client error:", error);
  throw new Error("Client Error: " + getExceptionMessage(error));
});

client.initialize();

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at:", p, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});
