// ใน netlify/functions/soap-mock.js:
const express = require('express');
const serverless = require('serverless-http');
const app = require('../../server'); // 💡 สำคัญ: Path ต้องถูกต้อง (ออกจาก netlify/functions ไปหา server.js)

// ตรวจสอบว่ามีการเรียกใช้ serverless() ถูกต้อง
module.exports.handler = serverless(app);