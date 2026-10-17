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
├── assets/
│   └── group-members.jpg
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
├── playwright.config.ts
└── run-e2e.sh
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
| `run-e2e.sh` | เตรียมฐานข้อมูล เปิด API รัน test และปิดระบบแบบอัตโนมัติ |

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

## รันครบวงจรด้วยคำสั่งเดียว

หลังจากติดตั้ง dependency แล้ว สามารถเตรียมระบบ รันทดสอบ และปิดระบบด้วยคำสั่งเดียว:

```bash
npm run test:full
```

คำสั่งนี้ทำงานตามลำดับดังนี้:

```text
สร้างฐานข้อมูล E2E ใหม่
→ สร้าง schema และใส่ seed
→ build และเปิด Election API
→ รัน Playwright tests
→ ปิด API และฐานข้อมูล
```

script ใช้ exit trap เพื่อปิด container ทั้งเมื่อ test ผ่านและเมื่อเกิดข้อผิดพลาด จึงเหมาะสำหรับใช้ใน CI และช่วยป้องกัน container ค้างหลังจบงาน

## การทดสอบบน GitHub Actions

ไฟล์ `.github/workflows/ci.yml` กำหนด job `e2e-exercise` สำหรับตรวจงานนี้อัตโนมัติเมื่อมีการ push หรือเปิด Pull Request โดย CI จะติดตั้ง dependency ในโฟลเดอร์ `e2e-exercise/` และเรียก `npm run test:full` เหมือนกับที่ใช้ทดสอบบนเครื่อง หาก test ไม่ผ่าน ระบบจะเก็บ Playwright HTML report เป็น artifact เพื่อใช้ตรวจสอบขั้นตอนที่ล้มเหลว

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

### การแยก `register` และ `login` เป็น helper class

สร้าง class `ElectionApi` ไว้ใน `support/electionApi.ts` เพื่อรวมการเรียก Election API ที่ใช้ซ้ำในหลาย test โดยรับ `APIRequestContext` จาก Playwright ผ่าน constructor ภายใน class มี method `register`, `login`, `myCandidates` และ `vote` ทำให้ test แสดงลำดับการใช้งานของ voter ได้ชัดเจน และไม่ต้องเขียน URL หรือ Authorization header ซ้ำทุกไฟล์

เมื่อนำไปเทียบกับ [`app/e2e/support/electionApi.ts` ของตัวอย่าง](https://github.com/boyone/camt-software-testing/blob/jest/lab/e2e-exercise-test/app/e2e/support/electionApi.ts) พบว่าวิธีจัดโครงสร้างเหมือนกันในส่วนต่อไปนี้:

- ใช้ class ครอบ `APIRequestContext` และติดต่อระบบผ่าน HTTP เท่านั้น
- แยกการ login และการสร้าง Authorization header ออกจาก test case
- ตรวจ status และ token ภายในขั้นตอน login เพื่อให้ test หยุดตรงสาเหตุเมื่อเข้าสู่ระบบไม่สำเร็จ
- มี method สำหรับลงคะแนนและอ่านรายชื่อผู้สมัคร ทำให้หลาย test ใช้ code ร่วมกันได้

ส่วนที่แตกต่างคือ helper ของตัวอย่างรองรับ journey มากกว่า เช่น การสร้างพรรค เพิ่มผู้สมัคร และอ่านผลการเลือกตั้ง รวมทั้งมี `newVoterIn()` ที่ลงทะเบียนและ login ต่อกันใน method เดียว ส่วน helper ของงานนี้มีเฉพาะ endpoint ที่ใช้ใน S1, S3 และ S7 และแยก `register()` ออกจาก `login()` เพื่อให้ test หลักตรวจ response ของการลงทะเบียนได้ครบทั้ง status, role และการไม่มี `passwordHash`

ตัวอย่างสร้างเลขบัตรประชาชนใหม่ระหว่างการรันด้วย `uniqueNationalId()` เพื่อให้สร้าง voter หลายคนได้สะดวก งานนี้ใช้เลขที่ผ่าน checksum และกำหนดค่าคงที่แยกกันในแต่ละ test เพื่อให้ request เหมือนเดิมทุกรอบ หาก test ล้มเหลวจะสามารถใช้เลขเดิมตรวจข้อมูลใน database และ log ได้โดยตรง โดย `npm run test:full` จะสร้างฐานข้อมูลใหม่ก่อนรัน จึงไม่เกิดข้อมูลซ้ำระหว่างรอบ

## รายงานผลการทดสอบ

บันทึกการรันครบวงจรล่าสุดอยู่ที่ [`e2e-exercise/test-logs/e2e-full-2026-10-17.log`](e2e-exercise/test-logs/e2e-full-2026-10-17.log) ภายใน log มีขั้นตอนสร้างฐานข้อมูล migrate, build API, ผล Playwright `4 passed` และการ cleanup container หลังจบงาน

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

## คำถามปิด lab

### ถ้า test fail ที่ขั้นตรวจรายชื่อ จะรู้ได้อย่างไรว่า bug อยู่ที่ route, service, repository หรือ test data?

ผลจาก E2E test บอกได้ว่าพฤติกรรมที่ผู้ใช้ได้รับไม่ตรงตามที่ต้องการ แต่ยังระบุชั้นของโค้ดที่ผิดไม่ได้ทันที จึงต้องไล่ตรวจจากขอบเขตภายนอกเข้าไปด้านในตามลำดับ:

1. อ่าน status, response body และ `test.step()` ที่ล้มเหลว เพื่อแยกก่อนว่าปัญหาเกิดระหว่างลงทะเบียน login หรือขอรายชื่อ
2. ตรวจสภาพแวดล้อมและข้อมูลตั้งต้น เช่น Liquibase history, context ที่ใช้ migrate และข้อมูลผู้สมัครในเขต `CM-2` หาก seed ไม่ถูกใส่ ระบบอาจทำงานถูกแต่ส่ง array ว่าง
3. ดู log ของ API เพื่อยืนยันว่า request เข้าถึง route และไม่มี exception ระหว่างประมวลผล
4. ทดสอบ route หรือ component test ด้วยข้อมูลที่ควบคุมได้ หาก status, authorization หรือรูปแบบ JSON ผิด มีแนวโน้มว่าปัญหาอยู่ที่ route หรือ middleware
5. ทดสอบ service แยกจากฐานข้อมูล หากการเลือกเขตหรือกฎทางธุรกิจผิด มีแนวโน้มว่าปัญหาอยู่ที่ service
6. ทดสอบ repository กับ PostgreSQL จริง หาก query กรองเขต เรียงหมายเลข หรือ join พรรคผิด มีแนวโน้มว่าปัญหาอยู่ที่ repository

ตัวอย่างจากงานนี้ เมื่อเปลี่ยน voter เป็น `CM-1` และเมื่อไม่ใช้ context `e2e-exercise` ทั้งสองกรณีได้ response เป็น `[]` เหมือนกัน จึงต้องตรวจทั้งข้อมูลใน token และข้อมูล seed ก่อนสรุปว่า route มี bug

### ทำไม E2E test ควรมีน้อยกว่า unit test และ E2E จับอะไรได้บ้าง?

E2E test ใช้เวลารันและเตรียมสภาพแวดล้อมมากกว่า เพราะต้องเปิดฐานข้อมูล migrate ข้อมูล build ระบบ และสื่อสารผ่าน HTTP เมื่อ fail ยังมีส่วนประกอบที่อาจเป็นสาเหตุหลายจุด ทำให้วิเคราะห์ยากกว่า unit test นอกจากนี้ test ที่ใช้ข้อมูลร่วมกันอาจชนกันได้หากออกแบบ test data ไม่ดี

Unit test รันเร็ว แยก dependency ได้ และเหมาะสำหรับตรวจ business rules, validation, edge cases และหลายเงื่อนไขย่อย จึงควรมีจำนวนมากกว่า ส่วน E2E ควรเลือกเฉพาะ user journey สำคัญที่แสดงว่าระบบหลายส่วนทำงานร่วมกันได้จริง

สิ่งที่ E2E test ตรวจพบได้ดีกว่า test ที่แยกเป็นหน่วย ได้แก่:

- route และ middleware ถูกประกอบเข้ากับ application จริง
- JWT, authorization header และ role ทำงานร่วมกันถูกต้อง
- request/response ผ่าน HTTP มี status และ JSON ตาม contract
- application เชื่อมต่อ PostgreSQL ด้วย configuration จริง
- Liquibase สร้าง schema และ seed ที่ระบบต้องใช้ได้
- query, service และ route ส่งข้อมูลต่อกันได้ครบ
- Docker image เปิดทำงานและ health check ผ่าน

### การ inject test data ผ่าน Liquibase กับผ่าน API ต่างกันอย่างไร และแบบไหนเสี่ยงกว่าเมื่อ schema เปลี่ยน?

การ inject ผ่าน Liquibase เขียนข้อมูลลงตารางโดยตรง จึงทำงานเร็ว ได้ข้อมูลชุดเดิมทุกครั้ง และเก็บ version ของข้อมูลไว้ร่วมกับ schema ได้ เหมาะสำหรับ reference data หรือข้อมูลตั้งต้นจำนวนมาก แต่จะข้าม validation, authorization และ business rules ของ API

การเตรียมข้อมูลผ่าน API ช้ากว่าและต้องจัดการ token กับลำดับ dependency เช่น ต้องสร้างพรรคก่อนเพิ่มผู้สมัคร แต่มีข้อดีคือข้อมูลผ่านกฎเดียวกับการใช้งานจริง และ test ผูกกับ API contract มากกว่าโครงสร้างตารางภายใน

เมื่อ schema เปลี่ยน วิธี Liquibase SQL มีความเสี่ยงมากกว่า เพราะอ้างอิงชื่อตาราง ชื่อคอลัมน์ constraint และลำดับการ insert โดยตรง หาก schema เปลี่ยน seed ต้องแก้ตามทันที ส่วนการเตรียมผ่าน API จะได้รับผลกระทบน้อยกว่าตราบใดที่ API contract ยังเหมือนเดิม อย่างไรก็ตาม หาก business rule หรือ API contract เปลี่ยน การเตรียมข้อมูลผ่าน API ก็ต้องปรับตามเช่นกัน

## การปิดระบบ

เมื่อทดสอบเสร็จ ให้รันจากโฟลเดอร์ `app/`:

```bash
docker compose --profile e2e down
```

ฐานข้อมูล E2E ใช้ `tmpfs` ข้อมูลจะถูกลบพร้อม container และพร้อมเริ่มรอบใหม่จากสภาพเดิม

## สรุปผล

ผลการทดสอบรอบสุดท้ายผ่านทั้งหมด 4 tests หลังจากลบและสร้างสภาพแวดล้อมใหม่ จึงยืนยันได้ว่า Election API รองรับ journey การลงทะเบียน เข้าสู่ระบบ แสดงรายชื่อผู้สมัครตามเขต ป้องกันการเข้าถึงโดยไม่มี token และบันทึกการลงคะแนนได้ตามที่กำหนด รวมถึงสามารถรันทดสอบซ้ำจากข้อมูลเริ่มต้นชุดเดิมได้

## สมาชิกกลุ่ม

![ภาพสมาชิกกลุ่ม](e2e-exercise/assets/group-members.jpg)

1. ณัฐพนธ์ พรหมปัน 682132004
2. วิภาวี ไพศาล 682132005
3. อภิสรา อรุณวงค์ 682132006
4. ณิชาภัทร คอทอง 682132011
5. จีรัง วงศ์วุฒิ 682132023
