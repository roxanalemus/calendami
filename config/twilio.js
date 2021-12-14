if (!process.env.CI) {
    require('dotenv').config();
  }
  
  const cfg = {};
  //   cfg.port = process.env.PORT || 3000;
  
  // A random string that will help generate secure one-time passwords and
  // HTTP sessions
  cfg.secret = process.env.APP_SECRET || 'keyboard cat';
  
  cfg.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxx';
  cfg.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '1234567890abc';
  
  // A Twilio number you control - choose one from:
  // Specify in E.164 format, e.g. "+16519998877"
  cfg.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  // Export configuration object
  module.exports = cfg;