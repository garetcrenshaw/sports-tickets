import QRCode from 'qrcode';

export default async function handler(req, res) {
  console.log('=== QR CODE GENERATION TEST ===');
  
  try {
    const testData = `ticket:test_${Date.now()}`;
    console.log('Generating QR code for:', testData);
    
    const qrDataUrl = await QRCode.toDataURL(testData);
    
    console.log('✅ QR code generated successfully');
    console.log('Data URL length:', qrDataUrl.length);
    
    return res.json({ 
      success: true, 
      message: 'QR code generated successfully',
      qr: qrDataUrl,
      dataLength: qrDataUrl.length,
      testData: testData
    });
  } catch (err) {
    console.error('❌ QR generation error:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}

