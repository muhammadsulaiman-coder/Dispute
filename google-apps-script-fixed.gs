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
 * ✅ Helper: Add proper CORS headers to responses
 ***************************************************/
function withCors(response) {
  return response
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
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

    return withCors(ContentService.createTextOutput(
      JSON.stringify({ success: true, data: jsonData })
    ));

  } catch (err) {
    return withCors(ContentService.createTextOutput(
      JSON.stringify({ success: false, message: err.message })
    ));
  }
}

/***************************************************
 * ✅ Handle POST Request (Submit Dispute & Login)
 ***************************************************/
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents)
      throw new Error("Missing POST body");

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
    return withCors(ContentService.createTextOutput(
      JSON.stringify({ success: false, message: err.message })
    ));
  }
}

/***************************************************
 * ✅ Handle Supplier Login
 ***************************************************/
function handleLoginRequest(body, ss) {
  try {
    const { email, password } = body;
    
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    
    // Get login credentials sheet
    const credentialsSheet = ss.getSheetByName(LOGIN_CREDENTIALS);
    if (!credentialsSheet) throw new Error("Login credentials sheet not found");
    
    const credData = credentialsSheet.getDataRange().getValues();
    const credHeaders = credData.shift();
    
    // Find email and password index
    const emailIdx = credHeaders.indexOf('email');
    const passwordIdx = credHeaders.indexOf('password');
    const supplierIdIdx = credHeaders.indexOf('supplierId');
    const supplierNameIdx = credHeaders.indexOf('supplierName');
    const roleIdx = credHeaders.indexOf('role');
    
    if (emailIdx === -1 || passwordIdx === -1) {
      throw new Error("Login credentials sheet is missing required columns");
    }
    
    // Find the user
    const user = credData.find(row => row[emailIdx] === email && row[passwordIdx] === password);
    
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
      
      return withCors(ContentService.createTextOutput(
        JSON.stringify({ 
          success: false, 
          message: "Invalid email or password" 
        })
      ));
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
    return withCors(ContentService.createTextOutput(
      JSON.stringify({ 
        success: true, 
        user: {
          supplierId: user[supplierIdIdx] || '',
          supplierName: user[supplierNameIdx] || '',
          email: user[emailIdx],
          role: user[roleIdx] || 'supplier'
        },
        message: "Login successful"
      })
    ));
    
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
    
    return withCors(ContentService.createTextOutput(
      JSON.stringify({ 
        success: false, 
        message: err.message 
      })
    ));
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

    return withCors(ContentService.createTextOutput(
      JSON.stringify({ success: true, message: "Dispute submitted successfully" })
    ));

  } catch (err) {
    return withCors(ContentService.createTextOutput(
      JSON.stringify({ success: false, message: err.message })
    ));
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
 ***************************************************/
function doOptions(e) {
  return withCors(ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ));
}

