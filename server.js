// server.js

const express = require('express');
const { js2xml } = require('xml-js');
const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');
// ไม่ต้อง require('random-seed') อีกต่อไป

const app = express();
// ไม่ต้องใช้ PORT ตรงนี้ เพราะ Serverless Function จะจัดการเอง

// Helper function สำหรับสร้างจำนวนเต็มสุ่ม (ใช้แทน randomInt)
const randomInt = (min, max) => {
    // Math.random() generates [0, 1), so max + 1 is exclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function สำหรับสร้างทศนิยมสุ่ม (ใช้แทน random(0.1))
const randomFloat = () => {
    return Math.random();
};

/**
 * ฟังก์ชันสำหรับสุ่มสร้างป้ายทะเบียนรถบรรทุก/รถยนต์ไทย
 */
const generateLicensePlate = () => {
    const chars = 'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';
    
    const prefix1 = randomInt(1, 9);
    const char1 = chars[randomInt(0, chars.length - 1)];
    const char2 = chars[randomInt(0, chars.length - 1)];
    const number = randomInt(1000, 9999);
    
    // 70% รูปแบบใหม่/รถทั่วไป (เช่น 1กข 1234), 30% รูปแบบเก่า (เช่น กข 1234)
    if (randomFloat() < 0.7) {
        return `${prefix1}${char1}${char2} ${number}`;
    } else {
        return `${char1}${char2} ${number}`;
    }
};


// --- Mock Data Generator Functions (ใช้ Logic จากคำตอบก่อนหน้า) ---

const generateAxleData = (n, baseWeight) => {
    const wt = baseWeight + randomInt(0, 5000); // 5000-10000 kg
    const wtExcess = randomFloat() < 0.2 ? randomInt(500, 2000) : 0; // 20% chance of excess
    const totalWt = wt + wtExcess;
    const wtl = Math.floor(totalWt / 2);
    const wtr = totalWt - wtl;

    return {
        _attributes: {
            n: String(n),
            WT_: String(totalWt),
            WT_EXCESS_: String(wtExcess),
            WT_QUALIT_: String(randomInt(1, 2)),
            DT: String(randomInt(100, 600)),
            WTL_: String(wtl),
            WTR_: String(wtr),
            WTLR_BOOL_MEAS_: randomFloat() < 0.1 ? "True" : "False",
            WD: String(randomInt(190, 230)),
            SH: String(randomInt(-50, -20)),
        }
    };
};

const generateSingleVehicleRecord = (index) => {
    const baseTime = DateTime.local().minus({ minutes: index });
    const startTime = baseTime.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const endTime = baseTime.plus({ milliseconds: randomInt(500, 1500) }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const firstAxleTime = baseTime.plus({ milliseconds: randomInt(50, 200) }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const remote1Time = baseTime.plus({ minutes: 1 }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const remote2Time = baseTime.plus({ minutes: 2 }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");

    const an = randomInt(2, 6);
    const axleData = [];
    let totalWeight = 0;
    for (let i = 1; i <= an; i++) {
        const axle = generateAxleData(i, 5000);
        axleData.push(axle);
        totalWeight += parseInt(axle._attributes.WT_);
    }

    // Axle Group Data (Simplified Logic)
    const axleGroups = [];
    if (an >= 1) {
        axleGroups.push({ // Front Axle Group (Always Single)
            _attributes: {
                n: '1',
                AG_TYPE_: '1',
                AG_TOWT_: axleData[0]._attributes.WT_,
                AG_TOWT_EXCESS_: axleData[0]._attributes.WT_EXCESS_,
                AG_WT_AXLE_1_: axleData[0]._attributes.WT_,
            }
        });
    }
    if (an >= 3) {
        // Last 2 Axles as a Tandem Group
        const wt1 = parseInt(axleData[an - 2]._attributes.WT_);
        const wt2 = parseInt(axleData[an - 1]._attributes.WT_);
        axleGroups.push({
            _attributes: {
                n: String(an - 1),
                AG_TYPE_: '2', // Tandem
                AG_TOWT_: String(wt1 + wt2),
                AG_TOWT_EXCESS_: '0',
                AG_WT_AXLE_1_: String(wt1),
                AG_WT_AXLE_2_: String(wt2),
            }
        });
    }

    // Vehicle Main Attributes
    const speed = randomInt(70, 150);
    const towWeightExcess = randomFloat() < 0.3 ? randomInt(500, 5000) : 0;
    const totalTowWeight = totalWeight + towWeightExcess;
    const infraction = (speed > 120 || totalTowWeight > 50000) ? '1' : '0';
    
    const plateNumber = generateLicensePlate();
    const boolCeAnpr = randomFloat() < 0.8 ? "True" : "False";

    return {
        type: 'element',
        name: 'Vehicle',
        attributes: {
            ID_: String(303000 + index),
            LN: String(randomInt(1, 3)),
            SN: String(randomInt(70, 80)),
            DATE_VEH_: startTime,
            DATE_VEH_END_: endTime,
            BOOL_CE_ANPR_: boolCeAnpr,
            PLATE_NUM_FRONT_ANPR_: boolCeAnpr === "True" ? plateNumber : "-", 
            COUNTRY_CODE_FRONT_ANPR_: "TH",
            DATE_PLATE_FRONT_ANPR_: boolCeAnpr === "True" ? startTime : "",
            DATE_SH_FIRST_AXLE_: firstAxleTime,
            PLATE_NUM_REAR_ANPR_: "-",
            COUNTRY_CODE_REAR_ANPR_: "",
            DATE_PLATE_REAR_ANPR_: "",
            PLATE_TMD_1_: "",
            PLATE_TMD_2_: "",
            PLATE_TMD_3_: "",
            PLATE_TMD_4_: "",
            PLATE_TMD_5_: "",
            BOOL_TMD_ANPR_: "False",
            DATE_REMOTE_1_: remote1Time,
            DATE_REMOTE_2_: remote2Time,
            REQUEST_ID_: randomUUID(),
            PIC_ROOT_ALIAS_: "PhotosRoot"
        },
        elements: [
            {
                type: 'element',
                name: 'Category',
                attributes: {
                    CA: String(randomInt(10, 30)),
                    SBCA: String(randomInt(15, 40)),
                    SC: String(randomInt(5, 15)),
                    MW_: String(randomInt(10000, 20000)),
                    AN: String(an)
                }
            },
            {
                type: 'element',
                name: 'Measure',
                attributes: {
                    SPEE: String(speed),
                    SPEE_EXCESS_: String(Math.max(0, speed - 90)),
                    LENG: String(randomInt(1500, 2500)),
                    LENG_EXCESS_: '0',
                    VVTM_: String(randomInt(100, 300)),
                    VVDT: String(randomInt(2000, 4000)),
                    DTB1: String(randomInt(100, 200)),
                    DTLB: String(randomInt(300, 500)),
                    TOWT_KG_: String(totalTowWeight),
                    TOWT_EXCESS_: String(towWeightExcess),
                    TOWT_VALID_: towWeightExcess > 0 ? "OV" : "V", 
                    TOWL_KG_: String(Math.floor(totalWeight / 2)),
                    TOWR_KG_: String(Math.ceil(totalWeight / 2)),
                    PICTURE_: "010",
                    INFRACTION_1_: infraction,
                    INFRACTION_2_: "0",
                    INFRACTION_3_: "0",
                    OVERLAP_: randomFloat() < 0.05 ? "True" : "False",
                    AVOIDANCE_: randomFloat() < 0.05 ? "True" : "False",
                    UNCENTERED_: randomFloat() < 0.15 ? "True" : "False"
                }
            },
            ...axleData,
            ...axleGroups
        ]
    };
};

/**
 * สร้าง SOAP Response XML จาก Vehicle Records (ใช้ JON Format ที่แก้ไขแล้ว)
 */
const createSoapResponse = (vehicleRecords) => {
    const xmlData = {
        _declaration: { _attributes: { version: '1.0', encoding: 'utf-8' } },
        elements: [
            {
                type: 'element',
                name: 'soap:Envelope',
                attributes: {
                    'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
                    'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                },
                elements: [
                    {
                        type: 'element',
                        name: 'soap:Body',
                        elements: [
                            {
                                type: 'element',
                                name: 'tns:ProcessVehicleDetectionResponse',
                                attributes: { 'xmlns:tns': 'http://tempuri.org/VehicleDetectionService' },
                                elements: [
                                    {
                                        type: 'element',
                                        name: 'tns:ProcessVehicleDetectionResult',
                                        elements: [
                                            {
                                                type: 'element',
                                                name: 'VehicleDetectionCollection',
                                                attributes: { 'Count': String(vehicleRecords.length) },
                                                elements: vehicleRecords.map(v => ({
                                                    type: 'element',
                                                    name: 'Detection',
                                                    elements: [v] // v คือ JON object ของ <Vehicle>
                                                }))
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };

    const xmlString = js2xml(xmlData, { compact: false, spaces: 2, attributesFn: (val) => val });
    return xmlString;
};

// --- Middleware และ Route ---

// Middleware เพื่ออ่าน Body เป็นข้อความ (SOAP XML)
app.use(express.text({ type: '*/*' }));

app.post('/VehicleDetectionService', (req, res) => {
    // 1. สุ่มจำนวน Record
    const numRecords = randomInt(2, 10); 

    // 2. Generate Data
    const vehicleRecords = [];
    for (let i = 0; i < numRecords; i++) {
        vehicleRecords.push(generateSingleVehicleRecord(i));
    }

    // 3. สร้าง SOAP Response XML
    const soapResponseXml = createSoapResponse(vehicleRecords);

    // 4. ตั้งค่า Header และส่ง Response
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(soapResponseXml);
});

// --- Server Export (สำคัญสำหรับ Netlify Functions) ---
// แทนที่ app.listen() ด้วยการ export ตัว app object
module.exports = app;