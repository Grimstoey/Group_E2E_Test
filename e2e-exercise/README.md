# E2E Exercise — ผู้มีสิทธิลงทะเบียนแล้วเห็นรายชื่อผู้สมัคร

## จุดประสงค์ของงาน

งานนี้เป็นการเขียน automated end-to-end test สำหรับ Election Backend API ด้วย Playwright โดยทดสอบระบบผ่าน HTTP แบบ black box ไม่ import โค้ดจาก `app/src` เข้ามาใช้ใน test

สถานการณ์หลักที่ทดสอบคือ ผู้มีสิทธิเลือกตั้งลงทะเบียนในเขต `CM-2` เข้าสู่ระบบ และเห็นรายชื่อผู้สมัครในเขตของตนเอง

ลำดับการทำงานของ test:

```text
POST /auth/register
        ↓
POST /auth/login
        ↓
GET /me/candidates
        ↓
ตรวจรายชื่อผู้สมัครในเขต CM-2
```

## เครื่องมือที่ใช้

- Node.js 24
- Playwright Test
- Docker และ Docker Compose
- PostgreSQL 17
- Liquibase
- Election Backend API ที่เขียนด้วย Express และ TypeScript

การทดสอบนี้เป็น API-level E2E จึงไม่ต้องติดตั้ง browser ของ Playwright

## โครงสร้างไฟล์

```text
e2e-exercise/
├── support/
│   └── electionApi.ts
├── tests/
│   ├── authentication.spec.ts
│   ├── health.spec.ts
│   ├── voter-sees-candidates.spec.ts
│   └── voter-votes.spec.ts
├── tools/
│   └── randomThaiNationalId.mjs
├── .gitignore
├── package.json
├── package-lock.json
└── playwright.config.ts
```

ไฟล์สำคัญมีหน้าที่ดังนี้:

| ไฟล์ | หน้าที่ |
|---|---|
| `playwright.config.ts` | กำหนด test directory, base URL, HTTP headers และรูปแบบรายงาน |
| `support/electionApi.ts` | รวมการเรียก register, login, ดูผู้สมัคร และลงคะแนนผ่าน HTTP |
| `tests/authentication.spec.ts` | ตรวจว่าการขอรายชื่อโดยไม่มี token ถูกปฏิเสธด้วย `401` |
| `tests/health.spec.ts` | ตรวจว่า Election API เปิดและตอบ `GET /health` ได้ |
| `tests/voter-sees-candidates.spec.ts` | ทดสอบ journey ตั้งแต่ลงทะเบียนจนเห็นรายชื่อผู้สมัคร |
| `tests/voter-votes.spec.ts` | ทดสอบการลงคะแนนและสถานะ `selected` ของผู้สมัคร |
| `tools/randomThaiNationalId.mjs` | สร้างเลขบัตรประชาชนทดสอบที่ผ่าน checksum |

## ข้อมูลทดสอบ

ข้อมูลพรรคและผู้สมัครถูกเตรียมด้วย Liquibase changeset `902-e2e-exercise-seed.sql` ภายใต้ context `e2e-exercise`

| เขต | หมายเลข | ผู้สมัคร | พรรค |
|---|---:|---|---|
| `CM-2` | 1 | อนันต์ ศรีสุข | พรรคดอยสุเทพ |
| `CM-2` | 2 | มาลี วงศ์คำ | พรรคแม่ปิง |

ข้อมูล voter ใน test กำหนดให้อยู่เขต `CM-2` และใช้เลขบัตรประชาชนทดสอบแบบคงที่ เพื่อให้ request เหมือนเดิมทุกครั้งและตรวจสอบปัญหาได้ง่าย

## วิธีติดตั้ง

จาก root ของ repository ให้ติดตั้ง dependency ของ Playwright:

```bash
cd e2e-exercise
npm ci
```

## วิธีเตรียมระบบ

ต้องเปิด Docker ก่อนเริ่ม และ port `3000` กับ `5434` ต้องว่าง

รันคำสั่งต่อไปนี้จากโฟลเดอร์ `app/`:

```bash
cd app

# สร้างฐานข้อมูล E2E ใหม่
docker compose up -d --force-recreate --wait db-e2e

# สร้าง schema และเพิ่มข้อมูลสำหรับการทดสอบ
npm run db:migrate:e2e-exercise

# build และเปิด Election API
docker compose up -d --build --force-recreate --wait app
```

ตรวจว่า API พร้อมทำงาน:

```bash
curl http://localhost:3000/health
```

ผลที่ควรได้:

```json
{"status":"ok"}
```

## วิธีรันทดสอบ

เปิดอีก terminal แล้วรันจากโฟลเดอร์ `e2e-exercise/`:

```bash
cd e2e-exercise
npm test
```

ผลที่คาดหวัง:

```text
4 passed
```

ชุดทดสอบประกอบด้วย:

1. `the election API is up`
2. `requesting candidates without a token is rejected`
3. `a voter registers and then sees the candidates of their district`
4. `a voter votes for candidate number 1 and sees only that candidate selected`

สามารถกำหนด API ปลายทางอื่นผ่าน environment variable `BASE_URL` ได้ เช่น:

```bash
BASE_URL=http://localhost:3000 npm test
```

## สิ่งที่ตรวจใน journey หลัก

### 1. ลงทะเบียน voter

ส่ง `POST /auth/register` แล้วตรวจว่า:

- response status เป็น `201`
- ข้อมูลผู้ใช้ตรงกับ request
- role เป็น `VOTER`
- response ไม่มี `passwordHash`

### 2. เข้าสู่ระบบ

ส่ง `POST /auth/login` ด้วยเลขบัตรประชาชนและรหัสผ่านเดิม แล้วตรวจว่าได้ token กลับมา

### 3. ขอรายชื่อผู้สมัคร

ส่ง `GET /me/candidates` พร้อม `Authorization: Bearer <token>` ระบบจะหาเขตจาก token จึงไม่ต้องส่ง `districtId` ใน request นี้

### 4. ตรวจรายชื่อ

ตรวจว่า response มีผู้สมัครสองคนตามลำดับหมายเลข ไม่มีผู้สมัครจากเขตอื่น และ voter ใหม่มี `selected: false` ทั้งสองรายการ

## Exercise เพิ่มเติม

### S3 — voter ลงคะแนนให้ผู้สมัครหมายเลข 1

test ลงทะเบียน voter คนใหม่ เข้าสู่ระบบ และขอรายชื่อผู้สมัครเพื่อหา `candidateId` ของหมายเลข 1 จาก API จากนั้นส่ง `PUT /me/vote` และตรวจว่า:

- การลงคะแนนครั้งแรกได้ status `201`
- response มี `changed: false`
- เมื่อขอรายชื่ออีกครั้ง หมายเลข 1 มี `selected: true`
- หมายเลข 2 ยังคงมี `selected: false`

### S7 — ขอรายชื่อโดยไม่มี token

test ส่ง `GET /me/candidates` โดยไม่มี `Authorization` header แล้วตรวจว่าได้ status `401` และ response ต่อไปนี้:

```json
{"error":"authentication required"}
```

## รายงานผลการทดสอบ

หลังจากรัน `npm test` แล้ว สามารถเปิด HTML report ได้ด้วย:

```bash
npm run report
```

ในรายงาน journey หลักถูกแบ่งเป็น `test.step()` ทำให้เห็นชัดว่าหาก test ล้มเหลว เกิดขึ้นที่ขั้นลงทะเบียน เข้าสู่ระบบ ขอรายชื่อ หรือตรวจผลลัพธ์

## การรันทดสอบซ้ำ

เลขบัตรประชาชนใน test เป็นค่าคงที่ หากรัน `npm test` ซ้ำทันทีโดยไม่รีเซ็ตฐานข้อมูล การลงทะเบียนจะได้ `409 national id already registered`

ก่อนทดสอบรอบใหม่ให้สร้างฐานข้อมูลใหม่ แล้วใส่ seed และเปิด API ตามขั้นตอนเตรียมระบบอีกครั้ง วิธีนี้ทำให้แต่ละรอบเริ่มด้วยข้อมูลชุดเดียวกัน

## กรณีที่ทดลองให้ test ล้มเหลว

ระหว่างตรวจสอบ test ได้ทดลองกรณีต่อไปนี้:

| กรณี | ผลที่พบ |
|---|---|
| เปลี่ยน voter เป็นเขต `CM-1` | ขั้นตรวจรายชื่อล้มเหลว เพราะ API ส่ง array ว่าง |
| migrate ด้วย context `e2e` โดยไม่มี `e2e-exercise` | ขั้นตรวจรายชื่อล้มเหลว เพราะไม่มีข้อมูลผู้สมัครของงานนี้ |
| ใช้รหัสผ่านสั้นกว่า 8 ตัว | ขั้นลงทะเบียนล้มเหลวด้วย status `400` |
| หยุด API ก่อนรัน health test | test ล้มเหลวด้วย `ECONNREFUSED` |

การทดลองเหล่านี้ช่วยแยกได้ว่า test ล้มเหลวจากเงื่อนไขของระบบ ข้อมูลทดสอบ หรือสภาพแวดล้อม

## การปิดระบบ

เมื่อทดสอบเสร็จ ให้รันจากโฟลเดอร์ `app/`:

```bash
docker compose --profile e2e down
```

ฐานข้อมูล E2E ใช้ `tmpfs` ข้อมูลจะถูกลบพร้อม container และพร้อมเริ่มรอบใหม่จากสภาพเดิม

## สรุปผล

ผลการทดสอบรอบสุดท้ายผ่านทั้งหมด 4 tests หลังจากลบและสร้างสภาพแวดล้อมใหม่ จึงยืนยันได้ว่า Election API รองรับ journey การลงทะเบียน เข้าสู่ระบบ แสดงรายชื่อผู้สมัครตามเขต ป้องกันการเข้าถึงโดยไม่มี token และบันทึกการลงคะแนนได้ตามที่กำหนด รวมถึงสามารถรันทดสอบซ้ำจากข้อมูลเริ่มต้นชุดเดิมได้
