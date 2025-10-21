// นำเข้า Express App เดิม
const express = require('express');
const serverless = require('serverless-http');

// ไฟล์ server.js เดิมที่มี logic ของ Express App ทั้งหมด
const app = require('./server'); 

// แปลง Express App ให้เป็น Handler ที่ Serverless เข้าใจ
// โดยใช้ไฟล์ server.js เป็นตัวหลัก
module.exports.handler = serverless(app);

// **หมายเหตุ:** คุณอาจต้องย้ายโค้ด Express ทั้งหมดจาก server.js 
// มาไว้ในไฟล์นี้ หรือ export 'app' object จาก server.js แทนการรัน listen()