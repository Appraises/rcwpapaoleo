// testLiters.js
const LlmService = require('./server/services/LlmService');

async function run() {
    const input1 = "1. 30\n2. 50\n3. 15L";
    console.log(`\nTesting: "${input1.replace(/\n/g, '\\n')}"`);
    const result1 = await LlmService.checkCompletionIntent(input1);
    console.log(JSON.stringify(result1, null, 2));

    const input2 = "parada 1: 0, parada 2: 12";
    console.log(`\nTesting: "${input2}"`);
    const result2 = await LlmService.checkCompletionIntent(input2);
    console.log(JSON.stringify(result2, null, 2));

    const input3 = "coletei todos";
    console.log(`\nTesting: "${input3}"`);
    const result3 = await LlmService.checkCompletionIntent(input3);
    console.log(JSON.stringify(result3, null, 2));
}

run().catch(console.error);
