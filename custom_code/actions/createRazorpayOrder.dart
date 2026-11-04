// Automatic FlutterFlow imports
import '/backend/backend.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/custom_code/actions/index.dart'; // Imports other custom actions
import '/flutter_flow/custom_functions.dart'; // Imports custom functions
import 'package:flutter/material.dart';
// Begin custom action code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

import '/custom_code/actions/index.dart';
import '/flutter_flow/custom_functions.dart';
import 'package:cloud_functions/cloud_functions.dart';

Future<dynamic> createRazorpayOrder(
  double amount,
  String receipt,
  String userId,
  List<String> slotIds,
  int controllers,
  String username,
  String startTime,
  String endTime,
  String cafeId,
  String gameType,
) async {
  try {
    // Get the Firebase Functions instance
    final functions = FirebaseFunctions.instance;

    // Create notes map from individual parameters
    final notes = {
      'userId': userId,
      'slotIds': slotIds,
      'controllers': controllers,
      'username': username,
      'startTime': startTime,
      'endTime': endTime,
      'cafeId': cafeId,
      'gameType': gameType,
    };

    // Call the cloud function with the new name
    final result = await functions.httpsCallable('createOrder').call({
      'amount': amount,
      'receipt': receipt,
      'notes': notes,
    });

    // Return the result as JSON
    return {
      'success': true,
      'orderId': result.data['id'],
      'amount': result.data['amount'],
      'currency': result.data['currency'],
      'receipt': result.data['receipt'],
      'status': result.data['status'],
      'timestamp': DateTime.now().toIso8601String(),
    };
  } catch (e) {
    // Return error as JSON
    return {
      'success': false,
      'error': e.toString(),
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}
