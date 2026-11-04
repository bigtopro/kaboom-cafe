// Automatic FlutterFlow imports
import '/backend/backend.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/custom_code/actions/index.dart'; // Imports other custom actions
import '/flutter_flow/custom_functions.dart'; // Imports custom functions
import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
// Begin custom action code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

Future<List<String>?> getDiscountAmount(
  List<String> slots,
  String duration,
  String cafeID,
  String userID,
  String gameType,
  String controllers,
  double amount,
  String offerID,
) async {
  List<String> debugInfo = [];
  debugInfo.add('Starting getDiscountAmount with parameters:');
  debugInfo.add('slots: $slots');
  debugInfo.add('duration: $duration');
  debugInfo.add('cafeID: $cafeID');
  debugInfo.add('userID: $userID');
  debugInfo.add('gameType: $gameType');
  debugInfo.add('controllers: $controllers');
  debugInfo.add('amount: $amount');
  debugInfo.add('offerID: $offerID');

  try {
    // Parse the duration to get hours
    debugInfo.add('Parsing duration: $duration');
    int hours = int.parse(duration.replaceAll('hr', '').trim());
    debugInfo.add('Parsed hours: $hours');

    // Parse controllers to integer
    debugInfo.add('Parsing controllers: $controllers');
    int controllersInt = int.parse(controllers);
    debugInfo.add('Parsed controllers: $controllersInt');

    debugInfo.add('Initializing Firebase Functions');
    try {
      final functions = FirebaseFunctions.instance;
      debugInfo.add('Firebase Functions instance created');

      // Remove emulator settings as they might be causing issues
      // functions.useFunctionsEmulator('localhost', 5001);

      debugInfo.add('Getting callable function');
      final callable = functions.httpsCallable('getDiscountAmount');
      debugInfo.add('Callable function created');

      final requestData = {
        'slots': slots,
        'duration': hours,
        'cafeID': cafeID,
        'userID': userID,
        'gameType': gameType,
        'controllers': controllersInt,
        'Amount': amount,
        'offerID': offerID,
      };
      debugInfo.add('Calling cloud function with data: $requestData');

      try {
        final result = await callable.call(requestData);
        debugInfo.add('Received result from cloud function: ${result.data}');

        // If the discount amount equals the original amount, return null
        if (result.data['discount_amount'] == amount) {
          debugInfo.add('No discount applied - returning null');
          return debugInfo;
        }

        // Return a list with discount amount and offer ID
        debugInfo.add('Returning response with discount');
        debugInfo.add(result.data['discount_amount'].toString());
        debugInfo.add(result.data['offerID']);
        return debugInfo;
      } catch (callError) {
        debugInfo.add('Error during function call:');
        debugInfo.add('Error type: ${callError.runtimeType}');
        debugInfo.add('Error message: $callError');
        if (callError is FirebaseFunctionsException) {
          debugInfo.add('Firebase Functions Error Code: ${callError.code}');
          debugInfo
              .add('Firebase Functions Error Details: ${callError.details}');
        }
        return debugInfo;
      }
    } catch (firebaseError) {
      debugInfo.add('Firebase Functions Error:');
      debugInfo.add('Error type: ${firebaseError.runtimeType}');
      debugInfo.add('Error message: $firebaseError');
      return debugInfo;
    }
  } catch (e, stackTrace) {
    debugInfo.add('Error in getDiscountAmount:');
    debugInfo.add('Error type: ${e.runtimeType}');
    debugInfo.add('Error message: $e');
    debugInfo.add('Stack trace: $stackTrace');
    return debugInfo;
  }
}
