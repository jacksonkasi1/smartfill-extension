// Test RAG flow simulation
console.log('🧪 Testing SmartFill RAG Integration Flow\n');

// Mock form fields from test-form.html
const mockFormFields = [
  { label: 'Full Name', name: 'fullName', type: 'text' },
  { label: 'Email Address', name: 'email', type: 'email' },
  { label: 'Phone Number', name: 'phone', type: 'tel' },
  { label: 'Company', name: 'company', type: 'text' },
  { label: 'Job Title', name: 'jobTitle', type: 'text' },
  { label: 'Address', name: 'address', type: 'textarea' }
];

// Mock RAG settings
const mockRagSettings = {
  ragEnabled: true,
  autoRag: true,
  selectedTags: []
};

// Mock auth token (same as our test token)
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwidXNlcklkIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTUxNjIzOTAyMn0.bW9jay1zaWduYXR1cmU=';

// Test the RAG query generation logic
function generateSearchQuery(fields) {
  const fieldPatterns = fields
    .filter(field => field.label || field.name)
    .map(field => (field.label || field.name || '').toLowerCase());
  
  const hasPersonalFields = fieldPatterns.some(pattern => 
    pattern.includes('name') || pattern.includes('email') || pattern.includes('phone')
  );
  const hasWorkFields = fieldPatterns.some(pattern => 
    pattern.includes('company') || pattern.includes('job') || pattern.includes('work')
  );
  
  let searchQuery = 'personal information profile contact details';
  
  if (hasWorkFields) {
    searchQuery = 'work employment company job title';
  } else if (hasPersonalFields) {
    searchQuery = 'personal information contact details';
  }
  
  console.log('🔍 Generated search query:', searchQuery);
  console.log('🔍 Detected patterns - Personal:', hasPersonalFields, 'Work:', hasWorkFields);
  
  return searchQuery;
}

// Test RAG API call
async function testRAGQuery(query) {
  try {
    console.log('\n🌐 Making RAG API call...');
    
    const response = await fetch('http://localhost:3001/api/v1/knowledge/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify({
        query: query,
        limit: 3,
        minScore: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ RAG API Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ RAG API Error:', error.message);
    return null;
  }
}

// Test the complete flow
async function testCompleteFlow() {
  console.log('📋 Mock form fields:', mockFormFields.map(f => f.label).join(', '));
  console.log('⚙️ RAG settings:', mockRagSettings);
  
  if (mockRagSettings.ragEnabled) {
    const searchQuery = generateSearchQuery(mockFormFields);
    const ragResponse = await testRAGQuery(searchQuery);
    
    if (ragResponse && ragResponse.success && ragResponse.data.length > 0) {
      console.log('\n✅ RAG Integration Test Results:');
      console.log(`- Found ${ragResponse.data.length} relevant knowledge items`);
      console.log('- Knowledge items:');
      
      ragResponse.data.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.metadata.title} (score: ${item.score.toFixed(2)})`);
        console.log(`     Content: ${item.content.substring(0, 100)}...`);
      });
      
      console.log('\n🤖 Next step would be: Send enhanced prompt to Gemini AI');
      console.log('📝 Final step would be: Fill form fields with AI response');
      
      return true;
    } else {
      console.log('\n⚠️ No relevant knowledge found');
      return false;
    }
  } else {
    console.log('\n⏭️ RAG disabled, would skip to AI processing');
    return false;
  }
}

// Run the test
testCompleteFlow().then(success => {
  console.log('\n🎯 Test Summary:');
  if (success) {
    console.log('✅ RAG integration is working correctly!');
    console.log('✅ Extension should successfully call RAG API before AI');
  } else {
    console.log('❌ RAG integration has issues');
  }
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});