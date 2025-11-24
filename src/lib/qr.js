const QRCode = require('qrcode');

async function generateTicketQr(data) {
  try {
    // Generate QR code as data URL for now
    // TODO: Upload to Supabase storage for better email compatibility
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // For better email compatibility, you could upload to Supabase storage here
    // and return a public URL instead of a data URL

    return qrDataUrl;
  } catch (error) {
    console.error('QR generation error:', error);
    // Return a fallback QR code URL or placeholder
    return 'https://via.placeholder.com/256x256?text=QR+Code+Error';
  }
}

module.exports = {
  generateTicketQr,
};
