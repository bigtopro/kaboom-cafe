const { initializeApp } = require('firebase/app');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

// Initialize Firebase
const app = initializeApp({
  projectId: "kaboomapp-32688",
  apiKey: "YOUR_GOOGLE_API_KEY",
  authDomain: "localhost"
});

// Initialize Functions
const functions = getFunctions(app);
connectFunctionsEmulator(functions, '127.0.0.1', 5001);

// Test data for newuser offer
const testData = {
  slots: [
    "20250605_1500", // 3:00 PM
    "20250605_1515", // 3:15 PM
    "20250605_1530", // 3:30 PM
    "20250605_1545"  // 3:45 PM
  ],
  duration: 2,
  cafeID: "gw6dfcOuBUENz3a6PDyW",
  userID: "test-user",
  gameType: "PS5 - 2",
  controllers: 2,
  Amount: 230,
  offerID: "newuser"  // Testing the new user offer
};

// Call the function
console.log('Calling function with data:', testData);
httpsCallable(functions, 'getDiscountAmount')(testData)
  .then((result) => {
    console.log('Success! Result:', result.data);
  })
  .catch((error) => {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });
  });
