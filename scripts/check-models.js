// scripts/check-models.js
// This script safely checks available Gemini models using your local .env.local file

require('dotenv').config({ path: '.env.local' });

async function checkAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔍 Checking available Gemini models...\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.models || data.models.length === 0) {
      console.log('❌ No models found for your API key');
      return;
    }

    // Filter models that support generateContent
    const supportedModels = data.models.filter(model =>
      model.supportedGenerationMethods?.includes('generateContent')
    );

    console.log(`✅ Found ${supportedModels.length} available models:\n`);

    supportedModels.forEach((model, index) => {
      const modelName = model.name.replace('models/', '');
      console.log(`${index + 1}. ${modelName}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      if (model.description) {
        console.log(`   Description: ${model.description}`);
      }
      console.log('');
    });

    console.log('📋 To use a model, update your agent.ts:');
    console.log('   model: "YOUR_MODEL_NAME_HERE"');
    console.log('\nExample:');
    console.log(`   model: "${supportedModels[0].name.replace('models/', '')}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAvailableModels();