import 'package:intl/intl.dart';

List<String> generateTimeSlots(String duration, String selectedTime) {
  // Parse the duration to get hours
  int hours = int.parse(duration.replaceAll('hr', '').trim());

  // Parse the selected time
  DateTime startTime = DateFormat('yyyyMMdd_HHmm').parse(selectedTime);

  // Calculate total minutes
  int totalMinutes = hours * 60;

  // List to store time slots
  List<String> timeSlots = [];

  // Generate 15-minute slots
  for (int i = 0; i < totalMinutes; i += 15) {
    DateTime slotTime = startTime.add(Duration(minutes: i));
    String formattedTime = DateFormat('yyyyMMdd_HHmm').format(slotTime);
    timeSlots.add(formattedTime);
  }

  return timeSlots;
}

/// Returns true if the given response map indicates a successful payment.
///
/// This function supports both shapes used in the project:
/// - processRazorpayPayment result: { "status": "success" | "failed" | ... }
/// - createRazorpayOrder result: { "success": true | false } (order creation only)
///
/// Preference order:
/// 1) If a boolean `success` key exists, return that value.
/// 2) Else if a string `status` key exists, return true only when it equals "success" (case-insensitive).
/// 3) Otherwise return false.
bool isPaymentSuccessful(Map<String, dynamic>? response) {
  if (response == null) return false;

  // Case 1: boolean `success`
  final dynamic successValue = response['success'];
  if (successValue is bool) {
    return successValue;
  }

  // Case 2: string `status`
  final dynamic statusValue = response['status'];
  if (statusValue is String) {
    return statusValue.toLowerCase() == 'success';
  }

  // Fallback: not enough info → treat as failure
  return false;
}
