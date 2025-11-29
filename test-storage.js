// Test Supabase Storage bucket creation and permissions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testStorage() {
  console.log('🔍 Testing Supabase Storage...');

  try {
    // Check if qr-codes bucket exists
    console.log('📦 Checking qr-codes bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log('📋 Available buckets:', buckets.map(b => b.name));

    const qrBucket = buckets.find(b => b.name === 'qr-codes');

    if (!qrBucket) {
      console.log('🚀 Creating qr-codes bucket...');
      const { data, error } = await supabase.storage.createBucket('qr-codes', {
        public: true,
        allowedMimeTypes: ['image/png'],
        fileSizeLimit: 2097152 // 2MB
      });

      if (error) {
        console.error('❌ Error creating bucket:', error);
        return;
      }

      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ qr-codes bucket exists');

      // Update bucket to be public if it's not
      console.log('🔧 Making bucket public...');
      const { error: updateError } = await supabase.storage.updateBucket('qr-codes', {
        public: true
      });

      if (updateError) {
        console.error('❌ Error updating bucket:', updateError);
      } else {
        console.log('✅ Bucket is now public');
      }
    }

    // Test upload
    console.log('🧪 Testing QR upload...');
    const testQrData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testQrData.split(',')[1], 'base64');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-codes')
      .upload('test-qr.png', testBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful');

      // Test public URL
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/qr-codes/test-qr.png`;
      console.log('🌐 Public URL:', publicUrl);

      // List files in bucket
      const { data: files, error: listError } = await supabase.storage
        .from('qr-codes')
        .list();

      if (listError) {
        console.error('❌ Error listing files:', listError);
      } else {
        console.log('📁 Files in bucket:', files.map(f => f.name));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testStorage();
