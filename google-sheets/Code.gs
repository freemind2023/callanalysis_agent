/**
 * PES Call Quality Reviewer — Google Apps Script
 *
 * SETUP (one-time):
 * 1. Create a new Google Sheet
 * 2. Extensions → Apps Script → paste this code
 * 3. Run setupHeaders() once (Run → Run function → setupHeaders)
 * 4. Deploy → New Deployment → Web App
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the Web App URL
 * 6. Add it to your .env.local:  GOOGLE_SHEETS_WEBHOOK_URL=<paste url>
 * 7. Redeploy after any code changes (Deploy → Manage deployments → edit)
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Call Records') || ss.getActiveSheet();

    const now = new Date();

    sheet.appendRow([
      now,                                                          // A: Timestamp
      Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),    // B: Date (IST)
      Utilities.formatDate(now, 'Asia/Kolkata', 'HH:mm'),          // C: Time (IST)
      data.salesCaller  || '',                                      // D: Sales Caller
      data.callerName   || '',                                      // E: Student Name
      data.course       || '',                                      // F: Course / Call Type
      data.total        || 0,                                       // G: Total Score (/80)
      data.grade        || '',                                      // H: Grade
      data.scores?.greeting?.score          || 0,                   // I: Greeting
      data.scores?.needs_discovery?.score   || 0,                   // J: Needs Discovery
      data.scores?.course_pitch?.score      || 0,                   // K: Course Pitch
      data.scores?.objection_handling?.score || 0,                  // L: Objection Handling
      data.scores?.call_to_action?.score    || 0,                   // M: Call to Action
      data.scores?.language_clarity?.score  || 0,                   // N: Language & Clarity
      data.scores?.enthusiasm?.score        || 0,                   // O: Enthusiasm & Energy
      data.scores?.closing?.score           || 0,                   // P: Closing
      data.summary || '',                                           // Q: Summary
      (data.top_strengths     || []).join(' | '),                   // R: Top Strengths
      (data.areas_to_improve  || []).join(' | '),                   // S: Areas to Improve
      data.marathi_flag ? 'Yes' : 'No',                            // T: Marathi Call
      data.durationMins ? Number(data.durationMins).toFixed(1) : '',// U: Duration (min)
    ]);

    // Auto-colour Grade cell based on value
    const lastRow = sheet.getLastRow();
    const gradeCell = sheet.getRange(lastRow, 8); // column H
    const grade = data.grade || '';
    if      (grade === 'A') gradeCell.setBackground('#d1fae5').setFontColor('#065f46');
    else if (grade === 'B') gradeCell.setBackground('#dbeafe').setFontColor('#1e3a8a');
    else if (grade === 'C') gradeCell.setBackground('#fef9c3').setFontColor('#854d0e');
    else                    gradeCell.setBackground('#fee2e2').setFontColor('#991b1b');

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Run this ONCE manually to create the header row */
function setupHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  sheet.setName('Call Records');

  const headers = [
    'Timestamp', 'Date (IST)', 'Time (IST)', 'Sales Caller', 'Student Name',
    'Course / Call Type', 'Total (/80)', 'Grade',
    'Greeting', 'Needs Discovery', 'Course Pitch', 'Objection Handling',
    'Call to Action', 'Language & Clarity', 'Enthusiasm & Energy', 'Closing',
    'Summary', 'Top Strengths', 'Areas to Improve', 'Marathi Call', 'Duration (min)',
  ];

  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  range.setBackground('#1e3a8a');
  range.setFontColor('#ffffff');
  range.setFontSize(10);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);   // Timestamp
  sheet.setColumnWidth(17, 320);  // Summary
  sheet.setColumnWidth(18, 260);  // Top Strengths
  sheet.setColumnWidth(19, 260);  // Areas to Improve

  SpreadsheetApp.flush();
  Logger.log('✅ Headers set up on sheet: ' + sheet.getName());
}
