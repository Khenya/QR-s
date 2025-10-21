const QRCode = require("qrcode");
const fs = require("fs");

const sessionId = "asistencia";

QRCode.toFile(
  "./qr_asistencia.png",
  sessionId,
  {
    color: {
      dark: "#14518f", 
      light: "#FFF" // blanco
    },
    width: 300
  },
  function (err) {
    if (err) throw err;
    console.log("✅ QR generado: qr_asistencia.png");
  }
);
