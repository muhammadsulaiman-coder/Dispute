/***************************************************
 * GOOGLE APPS SCRIPT — DISPUTE PORTAL API (CORS-ENABLED)
 * FIXED VERSION - Includes missing withCors helper function
 ***************************************************/

const SPREADSHEET_ID = "1csZNK8CzgUsLicR4_BeHHPImJ74rmQ-j3pQbpO121dE";
const SUPPLIER_SHEET = "Supplierview";
const ADMIN_SHEET = "Adminportal";
const NEW_FORM = "Newform";
const LOGIN_CREDENTIALS = "LoginCredentials";
const LOGIN_ACTIVITY = "LoginActivity";

/***************************************************
 * ✅ Helper: Return JSON response
 * CORS is handled by deployment settings (set "Who has access" to "Anyone")
 ***************************************************/
function withCors(jsonData) {
  return ContentService.createTextOutput(JSON.stringify(jsonData))
    .setMimeType(ContentService.MimeType.JSON);
}

/***************************************************
 * ✅ Handle GET Request
 ***************************************************/
function doGet(e) {
  try {
    const sheetName =
      (e && e.parameter && e.parameter.tab) ? e.parameter.tab : SUPPLIER_SHEET;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' not found");

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const jsonData = data.map(row => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });

    return withCors({ success: true, data: jsonData });

  } catch (err) {
    return withCors({ success: false, message: err.message });
  }
}

/***************************************************
 * ✅ Handle POST Request (Submit Dispute & Login)
 * Standard solution: parse JSON from e.postData.contents
 ***************************************************/
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("Missing POST body");
    }

    // Parse JSON from request body (works with text/plain content type)
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Handle different actions
    if (body.action === 'loginSupplier') {
      return handleLoginRequest(body, ss);
    } else if (body.action === 'createDispute') {
      return handleCreateDisputeRequest(body, ss);
    } else {
      // Backward compatibility for older dispute submission
      return handleCreateDisputeRequest(body, ss);
    }

  } catch (err) {
    return withCors({ success: false, message: err.message });
  }
}

/***************************************************
 * ✅ Handle Supplier Login
 ***************************************************/
function handleLoginRequest(body, ss) {
  try {
    const { email, password } = body;
    
    Logger.log("=== LOGIN ATTEMPT ===");
    Logger.log("Email received: " + email);
    Logger.log("Password received: " + password);
    
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    
    // Get login credentials sheet
    const credentialsSheet = ss.getSheetByName(LOGIN_CREDENTIALS);
    if (!credentialsSheet) throw new Error("Login credentials sheet not found");
    
    Logger.log("Sheet found: " + LOGIN_CREDENTIALS);
    
    const credData = credentialsSheet.getDataRange().getValues();
    const credHeaders = credData.shift();
    
    Logger.log("Headers found: " + JSON.stringify(credHeaders));
    Logger.log("Total rows (excluding header): " + credData.length);
    
    // Find email and password index (case-insensitive, trim whitespace)
    const emailIdx = credHeaders.findIndex(h => String(h).toLowerCase().trim() === 'email');
    const passwordIdx = credHeaders.findIndex(h => String(h).toLowerCase().trim() === 'password');
    const supplierIdIdx = credHeaders.findIndex(h => String(h).toLowerCase().trim() === 'supplierid');
    const supplierNameIdx = credHeaders.findIndex(h => String(h).toLowerCase().trim() === 'suppliername');
    const roleIdx = credHeaders.findIndex(h => String(h).toLowerCase().trim() === 'role');
    
    Logger.log("Email column index: " + emailIdx);
    Logger.log("Password column index: " + passwordIdx);
    
    if (emailIdx === -1 || passwordIdx === -1) {
      Logger.log("ERROR: Missing required columns");
      throw new Error("Login credentials sheet is missing required columns (email, password)");
    }
    
    // Find the user (trim whitespace, case-insensitive email)
    const searchEmail = email.toLowerCase().trim();
    const searchPassword = password.trim();
    
    Logger.log("Searching for email: " + searchEmail);
    Logger.log("Searching for password: " + searchPassword);
    
    const user = credData.find((row, index) => {
      const rowEmail = String(row[emailIdx] || '').trim().toLowerCase();
      const rowPassword = String(row[passwordIdx] || '').trim();
      
      Logger.log("Row " + index + " - Email: '" + rowEmail + "', Password: '" + rowPassword + "'");
      Logger.log("Email match: " + (rowEmail === searchEmail));
      Logger.log("Password match: " + (rowPassword === searchPassword));
      
      return rowEmail === searchEmail && rowPassword === searchPassword;
    });
    
    Logger.log("User found: " + (user ? "YES" : "NO"));
    
    if (!user) {
      // Log failed login attempt
      try {
        logLoginActivity(ss, {
          email: email,
          loginTime: new Date(),
          status: 'failed',
          errorMessage: 'Invalid email or password'
        });
      } catch (logErr) {
        console.error("Failed to log login activity:", logErr);
      }
      
      return withCors({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }
    
    // Log login activity
    logLoginActivity(ss, {
      email: email,
      supplierId: user[supplierIdIdx] || '',
      supplierName: user[supplierNameIdx] || '',
      loginTime: new Date(),
      status: 'success'
    });
    
    // Return user information
    return withCors({ 
      success: true, 
      user: {
        supplierId: user[supplierIdIdx] || '',
        supplierName: user[supplierNameIdx] || '',
        email: user[emailIdx],
        role: user[roleIdx] || 'supplier'
      },
      message: "Login successful"
    });
    
  } catch (err) {
    // Log failed login attempt if email is provided
    if (body.email) {
      try {
        logLoginActivity(ss, {
          email: body.email,
          loginTime: new Date(),
          status: 'failed',
          errorMessage: err.message
        });
      } catch (logErr) {
        console.error("Failed to log login activity:", logErr);
      }
    }
    
    return withCors({ 
      success: false, 
      message: err.message 
    });
  }
}

/***************************************************
 * ✅ Log Login Activity
 ***************************************************/
function logLoginActivity(ss, activityData) {
  try {
    let activitySheet = ss.getSheetByName(LOGIN_ACTIVITY);
    if (!activitySheet) {
      // Create the sheet if it doesn't exist
      activitySheet = ss.insertSheet(LOGIN_ACTIVITY);
      activitySheet.appendRow([
        'Timestamp', 
        'Email', 
        'SupplierId', 
        'SupplierName', 
        'IPAddress', 
        'Status', 
        'ErrorMessage'
      ]);
    }
    
    activitySheet.appendRow([
      new Date(),
      activityData.email || '',
      activityData.supplierId || '',
      activityData.supplierName || '',
      activityData.ipAddress || '',
      activityData.status || 'unknown',
      activityData.errorMessage || ''
    ]);
    
  } catch (err) {
    console.error("Failed to log login activity:", err);
  }
}

/***************************************************
 * ✅ Handle Create Dispute Request
 ***************************************************/
function handleCreateDisputeRequest(body, ss) {
  try {
    const timestamp = new Date();
    
    // Required fields validation
    const requiredFields = ['orderItemId', 'trackingId', 'supplierName', 'supplierEmail'];
    for (const field of requiredFields) {
      if (!body[field] || !body[field].toString().trim()) {
        throw new Error(`${field} is required`);
      }
    }
    
    const disputeData = {
      timestamp: timestamp,
      orderItemId: body.orderItemId || '',
      trackingId: body.trackingId || '',
      supplierCity: body.supplierCity || '',
      deliveryPartner: body.deliveryPartner || '',
      supplierName: body.supplierName || '',
      supplierEmail: body.supplierEmail || '',
      supplierId: body.supplierId || '',
      disputeType: body.disputeType || '',
      disputeDescription: body.disputeDescription || body.reasonForDispute || '',
      reasonForDispute: body.reasonForDispute || body.disputeDescription || '',
      attachments: body.attachments || '',
      priority: body.priority || 'Medium',
      status: body.status || 'Pending',
    };
    
    // Append to supplier view sheet
    const supplierSheet = ss.getSheetByName(SUPPLIER_SHEET);
    if (supplierSheet) {
      const supplierHeaders = supplierSheet.getRange(1, 1, 1, supplierSheet.getLastColumn()).getValues()[0];
      const supplierRow = supplierHeaders.map(header => getValueForHeader(disputeData, header));
      supplierSheet.appendRow(supplierRow);
    }
    
    // Append to new form sheet
    const newFormSheet = ss.getSheetByName(NEW_FORM);
    if (newFormSheet) {
      const newFormHeaders = newFormSheet.getRange(1, 1, 1, newFormSheet.getLastColumn()).getValues()[0];
      const newFormRow = newFormHeaders.map(header => getValueForHeader(disputeData, header));
      newFormSheet.appendRow(newFormRow);
    }
    
    // Append to admin portal sheet
    const adminSheet = ss.getSheetByName(ADMIN_SHEET);
    if (adminSheet) {
      const adminHeaders = adminSheet.getRange(1, 1, 1, adminSheet.getLastColumn()).getValues()[0];
      const adminRow = adminHeaders.map(header => getValueForHeader(disputeData, header));
      adminSheet.appendRow(adminRow);
    }

    return withCors({ success: true, message: "Dispute submitted successfully" });

  } catch (err) {
    return withCors({ success: false, message: err.message });
  }
}

/***************************************************
 * ✅ Helper: Map data to header columns
 ***************************************************/
function getValueForHeader(data, header) {
  // Map common field variations
  const fieldMappings = {
    'Timestamp': ['timestamp', 'Timestamp', 'submissionDate'],
    'OrderItemID': ['orderItemId', 'OrderItemID', 'orderNumber'],
    'TrackingID': ['trackingId', 'TrackingID'],
    'SupplierCity': ['supplierCity', 'SupplierCity'],
    'DeliveryPartner': ['deliveryPartner', 'DeliveryPartner'],
    'Supplier': ['supplierName', 'Supplier'],
    'SupplierEmail': ['supplierEmail', 'SupplierEmail'],
    'SupplierID': ['supplierId', 'SupplierID'],
    'DisputeType': ['disputeType', 'DisputeType'],
    'ReasonforDispute': ['reasonForDispute', 'disputeDescription', 'ReasonforDispute'],
    'Attachments': ['attachments', 'Attachments'],
    'Priority': ['priority', 'Priority'],
    'Status': ['status', 'Status'],
  };
  
  // Check for field mappings
  if (fieldMappings[header]) {
    for (const field of fieldMappings[header]) {
      if (data[field] !== undefined) {
        return data[field];
      }
    }
  }
  
  // Direct match
  if (data[header] !== undefined) {
    return data[header];
  }
  
  // Case-insensitive match as fallback
  const lowerHeader = header.toLowerCase();
  for (const key in data) {
    if (key.toLowerCase() === lowerHeader) {
      return data[key];
    }
  }
  
  // Return empty string if no match found
  return '';
}

/***************************************************
 * ✅ Handle OPTIONS Request (CORS Preflight)
 * Standard solution: return CORS headers
 ***************************************************/
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
}

