const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const crypto = require("crypto");
const moment = require("moment-timezone");
const slotTimeouts = {};

// Initialize Firebase Admin SDK with database URL
admin.initializeApp({
  databaseURL: "https://kaboomapp-32688-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

// Load environment variables from .env file
dotenv.config({path: ".env.main"});

const origin = process.env.ORIGIN; // Define ORIGIN as part of your deployment
if (origin === "admin") {
  dotenv.config({path: ".env.admin"});
} else {
  dotenv.config({path: ".env.main"});
}

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ["https://kaboomgaming.fun", "https://admin-kaboom-gaming.web.app", "http://localhost:5500"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Convert the create-order endpoint to a Firebase Cloud Function
exports.createOrder = functions.https.onCall(async (data, context) => {
  console.log("Received createOrder request with data:", data);

  const {amount, receipt, notes} = data;

  // Validate required fields
  if (!amount || !receipt || !notes) {
    console.error("Missing required fields:", {amount, receipt, notes});
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: amount, receipt, or notes",
    );
  }

  // Validate Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Missing Razorpay credentials");
    throw new functions.https.HttpsError(
        "internal",
        "Razorpay configuration is missing",
    );
  }

  try {
    console.log("Creating Razorpay order with:", {
      amount: amount * 100,
      currency: "INR",
      receipt,
      notes,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paisa
      currency: "INR",
      receipt: receipt,
      payment_capture: 1, // auto capture
      notes: notes,
    });

    console.log("Razorpay order created successfully:", order);

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new functions.https.HttpsError(
        "internal",
        `Failed to create order: ${error.message}`,
        error,
    );
  }
});

// Razorpay Webhook function to handle payment events
exports.razorpayWebhook1 = functions.https.onRequest(async (req, res) => {
  console.log("Received a request at Razorpay Webhook");

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSignature = req.headers["x-razorpay-signature"];
  const payload = JSON.stringify(req.body);

  // Verify the Razorpay webhook signature
  const verifyWebhookSignature = (payload, signature, secret) => {
    const expectedSignature = crypto.createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    return expectedSignature === signature;
  };

  if (!verifyWebhookSignature(payload, receivedSignature, secret)) {
    console.error("Invalid signature detected");
    return res.status(400).send("Invalid signature.");
  }

  const {event, payload: eventData} = req.body;
  const notes = eventData.payment.entity.notes || {};
  const userId = notes.userId;
  let slotIds = notes.slotIds;
  if (typeof slotIds === "string") {
    slotIds = slotIds.split(",");
  } else if (!Array.isArray(slotIds)) {
    slotIds = [];
  }
  const controllers = notes.controllers;
  const bookingPrice = eventData.payment.entity.amount / 100;
  const userName = notes.username;
  const startTime = notes.startTime;
  const endTime = notes.endTime;
  const cafeId = notes.cafeId;
  const gameType = notes.gameType;

  try {
    if (event === "payment.captured") {
      console.log("Processing payment.captured event");

      const db = admin.firestore();
      await db.collection("webhookQueue").add({
        data: eventData,
      });

      console.log("userId:", userId);
      console.log("slotIds:", slotIds);
      console.log("controllers:", controllers);
      console.log("bookingPrice:", bookingPrice);
      console.log("userName:", userName);
      console.log("startTime:", startTime);
      console.log("endTime:", endTime);
      console.log("cafeId:", cafeId);
      console.log("gameType:", gameType);

      // Defensive check for required fields
      if (!cafeId || !gameType) {
        console.error("Missing cafeId or gameType in notes", notes);
        return res.status(400).send("Missing cafeId or gameType in notes");
      }

      await exports.handleCallbackBooking.run({
        userId,
        slotIds,
        controllers,
        bookingPrice,
        userName,
        startTime,
        endTime,
        cafeId,
        gameType,
      });

      console.log("handleCallbackBooking triggered successfully.");
    } else if (event === "payment.failed") {
      console.log("Processing payment.failed event");

      // Defensive check for required fields
      if (!cafeId || !gameType) {
        console.error("Missing cafeId or gameType in notes", notes);
        return res.status(400).send("Missing cafeId or gameType in notes");
      }

      // Call the releaseLockedSlots function to release booked slots
      await exports.releaseLockedSlots.run({
        selectedSlots: slotIds,
        cafeId,
        gameType,
      });
      console.log("releaseLockedSlots function called successfully.");
    }

    res.status(200).send("Webhook handled successfully.");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Error handling webhook.");
  }
});



exports.handleCallbackBooking =functions.https.onCall(async (data, context) => {
  try {
    // Extract relevant information from the incoming data
    const {
      userId,
      slotIds,
      controllers,
      bookingPrice,
      userName,
      startTime,
      endTime,
      cafeId,
      gameType,
    } = data;

    if (!slotIds || !Array.isArray(slotIds)) {
      throw new Error("slotIds is undefined or not an array");
    }
    if (!cafeId || !gameType) {
      throw new Error("cafeId and gameType are required");
    }

    const format = "YYYYMMDD_HHmm";
    const startTimeParsed = moment
        .tz(startTime, format, "Asia/Kolkata").toDate();
    const endTimeParsed = moment
        .tz(endTime, format, "Asia/Kolkata").toDate();
    const successTime = new Date();

    // Firebase references
    const db = admin.database();
    const firestore = admin.firestore();

    // Update slots in Realtime Database with cafe ID and game type
    const updates = {};
    slotIds.forEach((slotId, index) => {
      const slotNumber = index === slotIds.length - 1 ? 0 : index + 1;
      updates[`public/slots/${cafeId}/${gameType}/${slotId}`] = {
        userId,
        controllers,
        userName,
        slotnumber: slotNumber,
      };
    });

    await db.ref().update(updates);
    console.log("Slots successfully updated");

    // Release the locked slots with cafe ID and game type
    await exports.releaseLockedSlots.run({
      selectedSlots: slotIds,
      cafeId,
      gameType,
    });
    console.log("Locks released after successful booking");

    // Save booking details to Firestore
    const bookingDetails = {
      start_time: startTimeParsed,
      end_time: endTimeParsed,
      controllers: controllers,
      price: `₹${bookingPrice}`,
      success_booking_time: successTime,
    };

    // Store booking details under user's transactions
    const userTransactionsRef = firestore
        .collection("transactions").doc(userId);
    const dashboardDetailsRef = userTransactionsRef
        .collection("dashboardDetails");

    // Get the next document ID for Firestore
    const querySnapshot = await dashboardDetailsRef.get();
    let newId = 1;
    querySnapshot.forEach((doc) => {
      const docId = parseInt(doc.id);
      if (docId >= newId) newId = docId + 1;
    });
    const paddedId = newId.toString().padStart(2, "0");

    await dashboardDetailsRef.doc(paddedId).set(bookingDetails);
    console.log("Dashboard details successfully written with ID:", paddedId);

    if (bookingPrice === 20) {
      try {
      // Check if the "special offers" field exists
        const userTransactionData = await userTransactionsRef.get();
        if (userTransactionData.exists && userTransactionData
            .data()["special offers"] !== undefined) {
          // Increment the "special offers" field if it exists
          await userTransactionsRef.update({
            "special offers": admin.firestore.FieldValue.increment(1),
          });
          console.log("Special offers incremented for user:", userId);
        } else {
          // Add the "special offers" field if it doesn't exist
          await userTransactionsRef.set(
              {
                "special offers": 1,
              },
              {merge: true},
          );
          console.log("Special offers created and incremented:", userId);
        }
      } catch (error) {
        console.error("Error updating special offers field:", error);
      }
    }

    return {success: true, message: "Booking successfully completed."};
  } catch (error) {
    console.error("Error processing booking:", error);
    return {success: false, message: "Error processing booking."};
  }
});


// Cloud Function to check if phone number exists
exports.checkPhoneExists = functions.https.onCall(async (data, context) => {
  const phoneNumber = data.phoneNumber;

  try {
    await admin.auth().getUserByPhoneNumber(phoneNumber);
    return {exists: true};
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return {exists: false};
    }
    throw new functions.https.HttpsError("unknown", error.message, error);
  }
});


exports.AccountDeletion = functions.https.onCall(async (data, context) => {
  const {uid} = data;

  const timerDuration = 4 * 60 * 1000;

  const deleteTaskRef = admin.firestore().collection("deleteTasks").doc(uid);
  await deleteTaskRef.set({
    uid: uid,
    timerSetAt: admin.firestore.FieldValue.serverTimestamp(),
    deleteTime: admin.firestore.Timestamp.fromMillis(Date.now()+timerDuration),
    timerCancelled: false,
  });


  setTimeout(async () => {
    const taskSnapshot = await deleteTaskRef.get();
    if (taskSnapshot.exists && !taskSnapshot.data().timerCancelled) {
      try {
        await admin.auth().deleteUser(uid);
        await deleteTaskRef.delete();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  }, timerDuration);

  return {success: true};
});

exports.cancelAccountDelete = functions.https.onCall(async (data, context) => {
  const {uid} = data;

  const deleteTaskRef = admin.firestore().collection("deleteTasks").doc(uid);
  const taskSnapshot = await deleteTaskRef.get();

  if (taskSnapshot.exists) {
    await deleteTaskRef.update({timerCancelled: true});
  }

  return {success: true};
});

exports.lockSlotsTemporarily = functions.https.onCall(async (data, context) => {
  const {selectedSlots, userId, cafeId, gameType} = data;

  if (!cafeId || !gameType) {
    throw new Error("cafeId and gameType are required");
  }

  try {
    const updates = {};
    const timestamp = Date.now();

    selectedSlots.forEach((slotId) => {
      updates[`public/locks/${cafeId}/${gameType}/${slotId}`] = {
        userId,
        timestamp: timestamp + 3 * 60 * 1000,
      };
    });

    await admin.database().ref().update(updates);

    selectedSlots.forEach((slotId) => {
      slotTimeouts[slotId] = setTimeout(async () => {
        await admin.database().ref().update({
          [`public/locks/${cafeId}/${gameType}/${slotId}`]: null,
        });
        console.log(`Slot ${slotId} released after 3-minute timeout`);
      }, 3 * 60 * 1000);
    });

    return {success: true, message: "Slots locked successfully"};
  } catch (error) {
    console.error("Error locking slots:", error);
    return {success: false, error: "Failed to lock slots"};
  }
});

exports.releaseLockedSlots = functions.https.onCall(async (data, context) => {
  const {selectedSlots, cafeId, gameType} = data;

  if (!cafeId || !gameType) {
    throw new Error("cafeId and gameType are required");
  }

  try {
    const updates = {};
    selectedSlots.forEach((slotId) => {
      if (slotTimeouts[slotId]) {
        clearTimeout(slotTimeouts[slotId]);
        delete slotTimeouts[slotId];
      }
      updates[`public/locks/${cafeId}/${gameType}/${slotId}`] = null;
    });

    await admin.database().ref().update(updates);
    console.log("Successfully released locked slots:", selectedSlots);

    return {success: true, message: "Slots released successfully"};
  } catch (error) {
    console.error("Error releasing slots:", error);
    return {success: false, error: "Failed to release slots"};
  }
});

exports.getDiscountAmount = functions.https.onCall(async (data, context) => {
  console.log('=== Function Started ===');
  console.log('Input data:', JSON.stringify(data, null, 2));

  try {
    const {
      slots = [],
      duration,
      cafeID,
      userID,
      gameType,
      controllers,
      Amount,
      offerID
    } = data;

    console.log('Parsed parameters:', {
      slots,
      cafeID,
      Amount,
      offerID,
      userID
    });

    // Helper to parse slot string to Date object
    function parseSlot(slotStr) {
      console.log('Parsing slot:', slotStr);
      const [date, time] = slotStr.split('_');
      const year = parseInt(date.slice(0, 4));
      const month = parseInt(date.slice(4, 6)) - 1;
      const day = parseInt(date.slice(6, 8));
      const hour = parseInt(time.slice(0, 2));
      const minute = parseInt(time.slice(2, 4));
      const result = new Date(year, month, day, hour, minute);
      console.log('Parsed date:', result);
      return result;
    }

    // Check if slots are between 9 AM and 2 PM
    function isBetween9AMAnd2PM(date) {
      const hour = date.getHours();
      const result = hour >= 9 && hour < 14;
      console.log('Time check:', { hour, isBetween: result });
      return result;
    }

    // Helper function to apply discount
    function applyDiscount(originalAmount) {
      const discountAmount = originalAmount * 0.5;
      const finalAmount = originalAmount - discountAmount;
      console.log('Applying discount:', {
        original: originalAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount
      });
      return {
        bool: true,
        discount_amount: discountAmount,
        final_amount: finalAmount
      };
    }

    // Helper function to apply fixed price
    function applyFixedPrice(originalAmount, fixedPrice) {
      const discountAmount = originalAmount - fixedPrice;
      console.log('Applying fixed price:', {
        original: originalAmount,
        fixedPrice: fixedPrice,
        discountAmount: discountAmount
      });
      return {
        bool: true,
        discount_amount: discountAmount,
        final_amount: fixedPrice
      };
    }

    // Helper function to get booking count
    async function getBookingCount() {
      const db = admin.firestore();
      const dashboardDetailsRef = db
        .collection('transactions')
        .doc(userID)
        .collection('dashboardDetails');

      const snapshot = await dashboardDetailsRef.count().get();
      return snapshot.data().count;
    }

    // Check if cafe ID matches
    if (cafeID === "gw6dfcOuBUENz3a6PDyW") {
      console.log('Cafe ID matches');

      if (offerID === "happyhour") {
        console.log('Processing happy hour offer');

        // Check if all slots are between 9 AM and 2 PM
        const allSlotsInTimeRange = slots.every(slot => {
          const slotTime = parseSlot(slot);
          return isBetween9AMAnd2PM(slotTime);
        });

        console.log('All slots in time range:', allSlotsInTimeRange);

        if (allSlotsInTimeRange) {
          return applyDiscount(Amount);
        }
      } else if (offerID === "every5th") {
        console.log('Processing every 5th booking offer');

        try {
          const bookingCount = await getBookingCount();
          console.log('User booking count:', bookingCount);

          // Check if the count is a multiple of 5
          if (bookingCount > 0 && bookingCount % 5 === 0) {
            console.log('Eligible for every 5th booking discount');
            return applyDiscount(Amount);
          } else {
            console.log('Not eligible for every 5th booking discount');
          }
        } catch (error) {
          console.error('Error checking booking count:', error);
          throw new functions.https.HttpsError('internal', 'Error checking booking count');
        }
      } else if (offerID === "newuser") {
        console.log('Processing new user offer');

        try {
          const bookingCount = await getBookingCount();
          console.log('User booking count:', bookingCount);

          // Check if user has less than 4 bookings
          if (bookingCount < 4) {
            console.log('Eligible for new user offer');
            return applyFixedPrice(Amount, 18); // Fixed price of ₹18
          } else {
            console.log('Not eligible for new user offer - exceeded 4 bookings');
          }
        } catch (error) {
          console.error('Error checking booking count:', error);
          throw new functions.https.HttpsError('internal', 'Error checking booking count');
        }
      }
    } else {
      console.log('Cafe ID does not match');
    }

    // If any condition fails, return false with original amount
    console.log('Conditions not met, returning original amount');
    return {
      bool: false,
      discount_amount: 0,
      final_amount: Amount
    };

  } catch (error) {
    console.error('Error in getDiscountAmount:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', 'Error processing discount');
  } finally {
    console.log('=== Function Ended ===');
  }
});


