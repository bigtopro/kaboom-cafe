import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:timeago/timeago.dart' as timeago;
import '/flutter_flow/custom_functions.dart';
import '/flutter_flow/lat_lng.dart';
import '/flutter_flow/place.dart';
import '/flutter_flow/uploaded_file.dart';
import '/backend/backend.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '/auth/firebase_auth/auth_util.dart';

List<String> generateTimeSlots(
  String? duration,
  String selectedTime,
) {
  /// MODIFY CODE ONLY BELOW THIS LINE
  try {
    // Check for null duration
    if (duration == null) {
      return [];
    }

    // Validate inputs
    if (duration.isEmpty || selectedTime.isEmpty) {
      return [];
    }

    // Parse the duration to get hours
    int hours = int.parse(duration.replaceAll('hr', '').trim());

    // Parse the selected time
    DateTime startTime;
    try {
      startTime = DateFormat('yyyyMMdd_HHmm').parse(selectedTime);
    } catch (e) {
      int year = int.parse(selectedTime.substring(0, 4));
      int month = int.parse(selectedTime.substring(4, 6));
      int day = int.parse(selectedTime.substring(6, 8));
      int hour = int.parse(selectedTime.substring(9, 11));
      int minute = int.parse(selectedTime.substring(11, 13));
      startTime = DateTime(year, month, day, hour, minute);
    }

    // Calculate total minutes
    int totalMinutes = hours * 60;

    // Generate 15-minute slots
    List<String> timeSlots = [];
    for (int i = 0; i < totalMinutes; i += 15) {
      DateTime slotTime = startTime.add(Duration(minutes: i));
      String formattedTime = DateFormat('yyyyMMdd_HHmm').format(slotTime);
      timeSlots.add(formattedTime);
    }

    return timeSlots;
  } catch (e) {
    return [];
  }

  /// MODIFY CODE ONLY ABOVE THIS LINE
}

bool hasTimeSlotOverlap(
  List<String>? timeSlots,
  List<String>? lockedSlots,
  List<String>? bookedSlots,
) {
  /// MODIFY CODE ONLY BELOW THIS LINE
  try {
    // Return false if timeSlots is null
    if (timeSlots == null) {
      return false;
    }

    // Initialize empty lists if null
    List<String> safeLockedSlots = lockedSlots ?? [];
    List<String> safeBookedSlots = bookedSlots ?? [];

    // Combine locked and booked slots
    List<String> unavailableSlots = [...safeLockedSlots, ...safeBookedSlots];

    // Check for any overlap
    for (String slot in timeSlots) {
      if (unavailableSlots.contains(slot)) {
        return true; // Found an overlap
      }
    }

    return false; // No overlaps found
  } catch (e) {
    return true; // Return true on error to be safe
  }

  /// MODIFY CODE ONLY ABOVE THIS LINE
}
