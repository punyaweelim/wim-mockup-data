const express = require('express');
const { js2xml } = require('xml-js');
const { randomUUID } = require('crypto');
// ลบ require('random-seed')
const { DateTime } = require('luxon');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware เพื่ออ่าน Body เป็นข้อความ (SOAP XML)
app.use(express.text({ type: '*/*' }));

// Helper function สำหรับสร้างจำนวนเต็มสุ่ม
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function สำหรับสร้างทศนิยมสุ่ม (ใช้แทน random(0.1))
const randomFloat = () => {
    return Math.random();
};

// --- Mock Data Generator Functions ---

const generateLicensePlate = () => {
    const chars = 'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';
    const regions = ['กรุงเทพมหานคร', 'ชลบุรี', 'นครราชสีมา', 'เชียงใหม่', 'ขอนแก่น'];

    // รูปแบบป้ายทะเบียนทั่วไป (เช่น 1กข 1234)
    const prefix1 = randomInt(1, 9);
    const char1 = chars[randomInt(0, chars.length - 1)];
    const char2 = chars[randomInt(0, chars.length - 1)];
    const number = randomInt(1000, 9999);

    // สุ่มเลือกรูปแบบ: 1 (ตัวเลข 1 หลักนำหน้า) หรือ 2 (ตัวอักษร 2 ตัวนำหน้า)
    if (randomFloat() < 0.7) {
        // รูปแบบใหม่/รถทั่วไป (เช่น 1กข 1234)
        return `${prefix1}${char1}${char2} ${number} ${regions[randomInt(0, regions.length - 1)]}`;
    } else {
        // รูปแบบเก่า/ป้ายเฉพาะกิจ (เช่น กข 1234)
        return `${char1}${char2} ${number} ${regions[randomInt(0, regions.length - 1)]}`;
    }
};

const generateAxleData = (n, baseWeight) => {
    // ใช้ randomInt(min, max)
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
            WT_QUALIT_: String(randomInt(1, 2)), // 1-2
            DT: String(randomInt(100, 600)), // Distance to previous axle (cm)
            WTL_: String(wtl),
            WTR_: String(wtr),
            WTLR_BOOL_MEAS_: randomFloat() < 0.1 ? "True" : "False",
            WD: String(randomInt(190, 230)),
            SH: String(randomInt(-50, -20)),
        }
    };
};

const generateSingleVehicleRecord = (index) => {
    // Sequential but slightly random time
    const baseTime = DateTime.local().minus({ minutes: index });
    const startTime = baseTime.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const endTime = baseTime.plus({ milliseconds: randomInt(500, 1500) }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const firstAxleTime = baseTime.plus({ milliseconds: randomInt(50, 200) }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const remote1Time = baseTime.plus({ minutes: 1 }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
    const remote2Time = baseTime.plus({ minutes: 2 }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");

    // Random Axle Count
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
    // ... (Logic for other groups simplified/removed for brevity, but same principle: use randomInt)
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

    // --- จุดที่แก้ไข: สุ่มป้ายทะเบียน ---
    const plateNumber = generateLicensePlate();
    const boolCeAnpr = randomFloat() < 0.8 ? "True" : "False"; // 80% chance of successful ANPR

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
            // 💡 ใช้ค่าที่สุ่มแล้ว
            PLATE_NUM_FRONT_ANPR_: boolCeAnpr === "True" ? plateNumber : "-",
            COUNTRY_CODE_FRONT_ANPR_: "TH",
            DATE_PLATE_FRONT_ANPR_: boolCeAnpr === "True" ? startTime : "",
            DATE_SH_FIRST_AXLE_: firstAxleTime,
            PLATE_NUM_REAR_ANPR_: "-",
            COUNTRY_CODE_REAR_ANPR_: "",
            DATE_PLATE_REAR_ANPR_: "",
            // ... (other attributes omitted for brevity)
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
                    TOWT_VALID_: towWeightExcess > 0 ? "OV" : "V", // Overweight or Valid
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
 * สร้าง SOAP Response XML จาก Vehicle Records โดยใช้ JON Format ที่ถูกต้อง
 * @param {Array<object>} vehicleRecords
 * @returns {string} SOAP XML String
 */
const createSoapResponse = (vehicleRecords) => {
    // โครงสร้าง XML ต้องถูกกำหนดโดยใช้ JON Format { type: 'element', name: '...', elements: [...] }
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
                                                // ส่วนนี้คือจุดที่ถูกแก้ไข: สร้าง array ของ <Detection> elements
                                                elements: vehicleRecords.map(v => ({
                                                    type: 'element',
                                                    name: 'Detection',
                                                    elements: [v] // v คือ JON object ของ <Vehicle> ที่สร้างไว้แล้ว
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

    // ใช้ js2xml แปลง JON Structure เป็น XML String
    const xmlString = js2xml(xmlData, { compact: false, spaces: 2, attributesFn: (val) => val });
    return xmlString;
};

// --- API Endpoint ---

app.post('/VehicleDetectionService', (req, res) => {
    console.log('✅ Request received!');
    console.log('Request Body Type:', typeof req.body);
    console.log('Request Body Snippet:', req.body.substring(0, 50)); // Log first 50 chars of XML
    // 1. สุ่มจำนวน Record ที่จะคืน
    const numRecords = randomInt(2, 10); // 2 ถึง 10

    // 2. Generate Data
    const vehicleRecords = [];
    for (let i = 0; i < numRecords; i++) {
        vehicleRecords.push(generateSingleVehicleRecord(i));
    }
    // console.log(vehicleRecords);

    // 3. สร้าง SOAP Response XML
    const soapResponseXml = createSoapResponse(vehicleRecords);
    // console.log(soapResponseXml);

    // 4. ตั้งค่า Header และส่ง Response
    console.log('Response sent successfully!🚀');
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(soapResponseXml);
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`SOAP Mock Server is running on http://localhost:${PORT}/VehicleDetectionService`);
});