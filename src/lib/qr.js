const QRCode = require('qrcode');

async function generateTicketQr(data) {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

module.exports = {
  generateTicketQr,
};
