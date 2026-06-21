# แผนปรับปรุงเกม Insider Online

> สถานะ: **✅ อนุมัติแล้ว + implement T1–T10, T12 เสร็จ (T11 พักไว้)**
> จัดทำโดย: Lead Planner · วันที่ 2026-06-21

## สถานะการ implement (อัปเดตหลังอนุมัติ)
| Task | สถานะ | ไฟล์ที่แก้จริง |
|------|-------|----------------|
| T1 redaction | ✅ | `insider-be/main.go` (`buildSnapshotFor`, `broadcastRoom`, `sendRoomToPlayer`) |
| T2 สิทธิ์ host/judge | ✅ | `main.go` (`set_judge`, `start_round`) |
| T3 validate guess_correct | ✅ | `main.go` |
| T4 reconnect token + ที่นั่งถาวร | ✅ | `main.go`, `InsiderGamePage.js` (localStorage+token) |
| T5 void รอบ | ✅ | `main.go` (disconnect defer), `InsiderGamePage.js` (notice banner) |
| T6 cleanup offline + eligible | ✅ | `main.go` (`eligibleVoters`, `handleNextRound`) |
| T7 คลังคำ/สุ่มคำ | ✅ | `insider-be/words.go` (ใหม่), `main.go`, `LobbyView.js` |
| T8 ใบ้ + ตัวนับคำถาม | ✅ | `main.go` (`add_hint`,`ask_question`), `TimerView.js` |
| T9 เสียง+เอฟเฟกต์+เตือนเวลา | ✅ | `InsiderGamePage.js` (Web Audio, mute toggle) |
| T10 reactions + spectator | ✅ | `main.go` (`react`, spectator), `InsiderGamePage.js` |
| T12 hardening | ✅ | `main.go` (max players, name clamp, chat rate-limit) |
| T11 โหมดใหม่ | ⏸️ พักไว้ | — |

**Verify**: `go build` ✅ · `go vet` ✅ · `go test` (redaction/leak 4 เคส) ✅ · server boot ✅ · `next build` ✅
**ไฟล์ทดสอบ**: `insider-be/snapshot_test.go` (regression กันความลับรั่วกลับมา)

---

## 0. กฎเหล็ก (บังคับใช้ในทุก task ที่เกี่ยวข้อง)

1. **ตรรกะตัดสินอยู่ฝั่ง SERVER เท่านั้น** — คำลับ, ใครคือ Insider, การนับโหวต, การยืนยันทายถูก, การคิดคะแนน ต้องคำนวณและบังคับใช้ที่ `insider-be/main.go` ห้ามให้ client เป็นผู้ตัดสิน
2. **ห้ามส่งคำลับ / role ของ Insider ไปยัง client ของ Commons เด็ดขาด** — ต้อง redact ที่ server ก่อนส่งทุกครั้ง การซ่อนด้วย UI ฝั่ง client ไม่นับว่าปลอดภัย
3. **Append-only เข้ากับสถาปัตยกรรมเดิม** — เพิ่ม field / message type ใหม่ได้ แต่ห้ามทำให้ message เดิมพัง; protocol ต้อง backward-compatible เท่าที่เป็นไปได้
4. **เฟสวางแผนนี้แก้ได้แค่ `plan.md`** — ห้ามแตะไฟล์เกมจริง

---

## 1. สรุปสถาปัตยกรรม & การทำงานปัจจุบัน (จากการอ่านโค้ดจริง)

### โครงสร้าง
- **Frontend**: Next.js 16 + React 19 + MUI 7 (`insider-game/`) — client component เดียวคือ `InsiderGamePage.js` คุม state ทั้งหมดผ่าน WebSocket
- **Backend**: **Go + Fiber + gofiber/websocket** (`insider-be/main.go`) — เก็บ room ใน memory (`rooms` map) ไม่มี DB; ปิด server = ข้อมูลห้องหายหมด
- **เชื่อมต่อ**: WebSocket `GET /ws?room=<code>&name=<name>&mode=create|join` (พอร์ต 3001)

### โปรโตคอล WS
- **Client → Server**: `set_judge`, `start_round{secretWord,duration?}`, `guess_correct{correctGuesserId?}`, `vote_insider{suspectId}`, `next_round`, `chat{text}`, `set_chat_enabled{chatEnabled}`, `kick{targetId}`
- **Server → Client**: `{type:"room", selfId?, room}`, `{type:"chat", from, text, ts}`, `{type:"error", message}`

### State machine
`lobby → assign_roles → countdown(เล่น, 300s) → voting(90s) → scoreboard → (next_round) → lobby`

### บทบาท & ลูปการเล่น
1. **lobby**: Host เลือก Judge (มือ/สุ่ม), Judge พิมพ์คำลับ — เริ่มได้เมื่อมี Judge + ผู้เล่นไม่นับ Judge ≥ 3 + มีคำลับ
2. **assign_roles → countdown**: server สุ่ม Insider 1 คนจากผู้เล่นที่ไม่ใช่ Judge; ทุกคนถาม-ตอบ; Judge/Insider เห็นคำลับ; Judge กด "ทายถูกแล้ว" + เลือกคนทายถูก
3. **voting** (90s): ทุกคน (ยกเว้น Judge + คนใน `blockedVoters`) โหวตหา Insider; เสมอ → block ผู้ถูกโหวตสูงสุดทุกคน แล้ว revote (timer หาร 2, ขั้นต่ำ 15s)
4. **scoreboard**: เฉลย Insider + ผลแพ้/ชนะ

### การคิดคะแนน (`handleTallyVotes`)
- จับ Insider ถูก (เสียงข้างมากเดี่ยว) → ทุกคนยกเว้น Insider+Judge ได้ **+1**
- จับผิด → Insider ได้ **+2**
- หมดเวลา countdown ก่อนทายถูก → ไม่มีใครได้แต้ม (`roundEndByTimeout`)
- **Judge และคนทายถูก (`correctGuesserId`) ไม่ได้แต้มเลย**

### Disconnect/Reconnect ปัจจุบัน
- Client เก็บ `{roomCode,name}` ใน `sessionStorage` + auto-reconnect (exp backoff, สูงสุด 5 ครั้ง)
- **Server สร้าง `playerID` ใหม่ทุก connection** และลบผู้เล่นทิ้งทันทีตอน disconnect → reconnect = ผู้เล่นใหม่ คะแนน 0 เสีย role/host/judge

---

## 2. บั๊ก & ช่องโหว่ที่ยืนยันจากโค้ด (เรียงตามความรุนแรง)

| # | ความรุนแรง | ปัญหา | ตำแหน่ง |
|---|-----------|-------|---------|
| B1 | 🔴 CRITICAL | `broadcastRoom`/`sendRoomToPlayer` ส่ง snapshot ก้อนเดียวที่มี `secretWord` + `insiderId` + `role` ของทุกคนไปให้ทุก client → Commons เปิด DevTools เห็นคำลับและรู้ตัว Insider ตั้งแต่ต้นรอบ **(ความลับรั่ว)** | main.go:148–242 |
| B2 | 🟠 สูง | `set_judge` ไม่เช็คสิทธิ์ Host — ใครก็ตั้งกรรมการได้ | main.go:614–620 |
| B3 | 🟠 สูง | `start_round` ไม่เช็คสิทธิ์ + เซ็ต `SecretWord` ก่อน validate (เหลือ secret ค้าง) | main.go:637–663 |
| B4 | 🟠 สูง | Reconnect สร้างผู้เล่นใหม่เสมอ → คะแนน/role/ที่นั่งหาย; feature reconnect ฝั่ง client แทบไร้ผล | main.go:560–600 |
| B5 | 🟡 กลาง | Judge/Insider หลุดกลางรอบ → `InsiderID` ชี้ player ที่ถูกลบ (คิดคะแนนเพี้ยน) / Judge หาย กด guess_correct ไม่ได้ รอบค้าง | main.go:391–512, 581–600 |
| B6 | 🟡 กลาง | `guess_correct` ไม่ validate `correctGuesserId` (รับ string อะไรก็ได้) | main.go:665–673 |
| B7 | 🟢 ต่ำ | ไม่มี max players / rate-limit / จำกัดความยาวชื่อ → abuse/DoS | ทั่วไฟล์ |

---

## 3. แผนงาน (Task List)

> ลำดับความสำคัญ: **P0** = ความปลอดภัย/บั๊กพัง · **P1** = state หลายผู้เล่น · **P2** = ความสนุก · **P3** = โหมดใหม่ (พักไว้)
> ทุก task ปฏิบัติตามกฎเหล็กข้อ 0

### 🔴 P0 — ความลับรั่ว + บั๊กตัดสินฝั่ง server

#### T1 — Per-recipient snapshot redaction (ปิดความลับรั่ว B1)
- **ไฟล์ที่จะแตะ**: `insider-be/main.go` (frontend ไม่ต้องแก้ — รับ schema เดิม)
- **สิ่งที่เปลี่ยน**:
  - เพิ่มฟังก์ชัน `buildSnapshotFor(room, viewerID) *Room` สร้าง snapshot เฉพาะผู้รับ:
    - `SecretWord` ใส่เฉพาะเมื่อ `viewerID == JudgeID || viewerID == InsiderID` ที่เหลือเป็น `""`
    - `Players[].Role` เปิดเผยเฉพาะ role ของ **viewer เองเท่านั้น**; ของคนอื่น → `""` (ตรวจแล้ว: frontend ดึง judge จาก `room.judgeId` ไม่ใช่ `player.role`, และใช้ `me.role` เฉพาะของตัวเอง → ปลอดภัยที่จะ redact role คนอื่นทั้งหมด)
    - `InsiderID` ใส่เฉพาะเมื่อ `State == "scoreboard"` (เฟสเฉลย) ที่เหลือ `""`
    - **`Token` ของ player ห้ามอยู่ใน `Players[]` เด็ดขาด** (ใช้ `json:"-"`); ส่ง token ของ viewer เองผ่าน field แยกใน `OutgoingRoomMessage` เท่านั้น (ดู T4)
  - `broadcastRoom` วนลูปผู้เล่น แล้วส่ง snapshot ที่ build ต่อคน; `sendRoomToPlayer` ใช้ตัวเดียวกัน
  - **ตัวเลือก optimize**: ระหว่าง countdown ที่ broadcast ทุกวินาที อาจส่ง message เบา ๆ `{type:"tick", timer}` แทนการ build snapshot เต็มทุกวินาที (append-only, ลดงาน O(players)/วินาที) — ทำหรือไม่ทำก็ได้
- **เหตุผล**: ปิดช่องรั่วที่ทำให้เกมไร้ความหมาย — บังคับ redact ที่ server (กฎเหล็กข้อ 2)
- **ความเสี่ยง**: build snapshot ต่อคน = งานเพิ่ม O(players) ต่อ broadcast (ทุกวินาทีตอนจับเวลา) — ปาร์ตี้ขนาดเล็กไม่กระทบ; ระวัง field `omitempty` ของ Go (เช่น `secretWord,omitempty`) ทำงานถูกต้องเมื่อส่ง `""`; ต้องทดสอบว่า client เดิมไม่พังเมื่อ `insiderId`/`role` ว่างก่อน scoreboard
- **กฎเหล็ก**: ข้อ 1, 2

#### T2 — บังคับสิทธิ์ฝั่ง server สำหรับ action สำคัญ (B2, B3)
- **ไฟล์**: `insider-be/main.go`
- **สิ่งที่เปลี่ยน**:
  - `set_judge`: เพิ่มเช็ค `room.HostID == playerID` + ทำได้เฉพาะ `State == "lobby"` ไม่งั้นส่ง error
  - `start_round`: จำกัดให้เริ่มได้เฉพาะ **Judge** (สอดคล้องกับ UI ที่ปุ่มอยู่ที่ Judge) หรือ Host — ตัดสินใจ default = Judge; ย้าย validation ทั้งหมด (มีคำลับ, จำนวนผู้เล่น) ไป**ก่อน**เซ็ต `room.SecretWord` เพื่อไม่ให้เหลือ secret ค้างเมื่อ validate ล้มเหลว
- **เหตุผล**: กันผู้เล่นทั่วไป/ผู้ไม่หวังดีคุมเกม; ทำให้ source of truth ตรงกับ UI
- **ความเสี่ยง**: ถ้ามี client/flow อื่นที่เรียก start_round โดยไม่ใช่ Judge จะ break — ต้องยืนยันว่ามีแค่ปุ่มใน `TimerView`/`LobbyView`
- **กฎเหล็ก**: ข้อ 1, 3

#### T3 — validate `guess_correct` + แก้คะแนน Insider เมื่อ player หาย (B6, ส่วนของ B5)
- **ไฟล์**: `insider-be/main.go`
- **สิ่งที่เปลี่ยน**:
  - `guess_correct`: ถ้า `correctGuesserId != ""` ต้องตรวจว่าเป็น player จริงและไม่ใช่ Judge ไม่งั้น set เป็น `""`
  - `handleTallyVotes`: ป้องกัน `InsiderID` ที่ชี้ player ที่หายไป (เช็ค `ok` ก่อนบวกแต้ม — มีอยู่แล้วบางส่วน แต่กรณี Insider หายแล้ว "ชนะ" จะไม่ได้แต้ม → ครอบคลุมด้วย T5 void รอบ)
- **เหตุผล**: กัน input ปลอม + ความสอดคล้องของคะแนน
- **ความเสี่ยง**: ต่ำ
- **กฎเหล็ก**: ข้อ 1

### 🟠 P1 — State หลายผู้เล่น (reconnect / หลุดกลางรอบ)

> การตัดสินใจดีไซน์ (จากเจ้าของเกม): **เก็บที่นั่งถาวร ไม่มี grace timer** · **Judge/Insider หลุดกลางรอบ → void รอบกลับ lobby**

#### T4 — Reconnect token + ที่นั่งถาวร (B4)
- **ไฟล์**: `insider-be/main.go`, `insider-game/src/components/insider/InsiderGamePage.js`
- **สิ่งที่เปลี่ยน**:
  - **Server**: เพิ่ม field `Token string` ให้ Player (สุ่มตอนสร้าง, ไม่ส่งให้คนอื่น), เพิ่ม query param `?token=` ตอน reconnect
    - ถ้า `mode=join` + มี `token` ตรงกับ player เดิมในห้อง → **re-attach `Conn` เข้ากับ Player เดิม** (คง `Score`, `Role`, ที่นั่ง, `HostID`/`JudgeID`/`InsiderID` ที่อ้างถึง) แทนการสร้างใหม่
    - **ไม่ลบ player ออกตอน disconnect** — ตั้ง flag `Connected bool = false` + `Conn = nil` แทน (ที่นั่งอยู่ถาวรตามดีไซน์); ลบจริงเฉพาะตอน `kick` หรือ next_round cleanup ที่เหมาะสม (ดู T6)
  - **Client**: เปลี่ยนจาก `sessionStorage` → `localStorage` เก็บ `token` ที่ server ส่งกลับ (เพิ่ม field ใน `{type:"room", selfId, token}`); ส่ง `token` กลับตอน reconnect
  - เพิ่มการแสดง "ออฟไลน์" บน PlayerCard เมื่อ `connected == false`
- **เหตุผล**: ทำให้ reconnect รักษาความต่อเนื่องของ state จริง (แก้ B4 ที่ทำให้ feature เดิมไร้ผล)
- **ความเสี่ยง**:
  - **ไม่มี grace + ที่นั่งถาวร** → ผู้เล่นที่ปิดเบราว์เซอร์ถาวรจะเหลือเป็นที่นั่งออฟไลน์ค้าง (ghost seat) จนกว่า Host จะ kick — ต้องมีปุ่ม kick ใช้ได้กับ player ออฟไลน์ (มีอยู่แล้ว) และอาจ cleanup ที่นั่งออฟไลน์ตอนกลับ lobby (กำหนดใน T6)
  - token เก็บใน localStorage = ถ้าเครื่องเดียวเปิดหลายแท็บอาจชนกัน — ต้องกำหนดให้ token ผูกกับ (room+seat)
  - ต้องกัน race: reconnect ระหว่าง broadcast (ใช้ `room.mu`)
- **กฎเหล็ก**: ข้อ 1, 3 (Token ห้ามรั่ว → อยู่ใน redaction ของ T1 ด้วย: ไม่ส่ง Token ของคนอื่น)

#### T5 — Void รอบเมื่อ Judge/Insider หลุดกลางรอบ (B5)
- **ไฟล์**: `insider-be/main.go`, `insider-game/src/components/insider/InsiderGamePage.js`
- **สิ่งที่เปลี่ยน**:
  - ใน handler ของ disconnect (defer): ถ้า `State ∈ {assign_roles, countdown, voting}` และ player ที่หลุด `== JudgeID || == InsiderID` → หยุด timer, ตั้ง `State = "lobby"`, เคลียร์ secret/role/votes, ส่ง notice (เพิ่ม field `roundVoidedReason` หรือ message type `notice`)
  - Frontend: แสดง banner "รอบถูกยกเลิกเพราะ Judge/Insider หลุด"
  - **ไม่มี grace/pause** ตามดีไซน์ — void ทันที
- **เหตุผล**: กันรอบค้าง/คะแนนเพี้ยนเมื่อ critical role หาย
- **ความเสี่ยง**: เน็ตกระตุกสั้น ๆ ของ Judge/Insider ก็ทำให้รอบ void (ผลข้างเคียงของ "ไม่มี grace") — **บันทึกเป็น tradeoff ที่เจ้าของเลือกแล้ว**; ถ้าภายหลังพบว่ารำคาญ ค่อยเติม debounce 2–3s ได้แบบ append-only
- **กฎเหล็ก**: ข้อ 1

#### T6 — Cleanup ที่นั่งออฟไลน์ & host reassignment ให้สอดคล้องที่นั่งถาวร
- **ไฟล์**: `insider-be/main.go`
- **สิ่งที่เปลี่ยน**:
  - ตอน `next_round`/กลับ lobby: ลบ player ที่ `Connected == false` ออก (ป้องกัน ghost seat สะสม) — รอบใหม่เริ่มด้วยคนที่อยู่จริง
  - Host reassignment: ถ้า Host ออฟไลน์ ให้โอนชั่วคราวไป player ที่ออนไลน์คนแรก แต่ถ้า Host เดิม reconnect ด้วย token ภายในห้องเดิม คืนสิทธิ์ได้ (กำหนด policy ให้ชัด)
  - **⚠️ สำคัญ (พบตอน review)**: เมื่อ "ที่นั่งถาวร" ผู้เล่นออฟไลน์ยังอยู่ใน `room.Players` → การนับ `eligible` ในการ tally โหวต (main.go:724–734) และเกณฑ์ auto-tally `len(Votes) >= eligible` จะรวมคนออฟไลน์ด้วย → **โหวตจะไม่จบจนกว่า timer หมด** (ค้างรอคนออฟไลน์โหวต) ต้อง **กรอง `Connected == false` ออกจาก `eligible` และจากเกณฑ์ auto-tally** ทั้งในเฟส voting; เช่นเดียวกัน countdown auto-end ที่อิงจำนวนผู้เล่นต้องไม่นับคนออฟไลน์
- **เหตุผล**: คุมจำนวนที่นั่งและสิทธิ์ให้สมเหตุสมผลภายใต้ "ที่นั่งถาวร" + กันโหวตค้าง
- **ความเสี่ยง**: policy host ซับซ้อนขึ้น — ต้องเขียน test กรณี host หลุด/กลับ และกรณีคนออฟไลน์ระหว่าง voting
- **กฎเหล็ก**: ข้อ 1

### 🟢 P2 — ความสนุก (เลือกครบทั้ง 4 โดยเจ้าของ)

#### T7 — คลังคำ + สุ่มคำ/หมวด
- **ไฟล์**: `insider-be/main.go` (+ ไฟล์ใหม่ `insider-be/words.go` หรือ JSON ฝัง), `insider-game/src/components/insider/LobbyView.js`
- **สิ่งที่เปลี่ยน**:
  - **Server เป็นเจ้าของคลังคำ** (หมวด: อาหาร/สถานที่/ของใช้/บันเทิง ฯลฯ) — เพิ่ม message `start_round{mode:"random", category?}` ให้ server สุ่มคำเอง **โดยไม่ส่งคำกลับให้ใครนอกจาก Judge+Insider** (ผ่าน redaction T1)
  - LobbyView: เพิ่มปุ่ม "สุ่มคำให้ Judge" + เลือกหมวด
- **เหตุผล**: เล่นไว ลดภาระ Judge และลด leak ทางสังคม (Judge ไม่ต้องพิมพ์ต่อหน้าคนอื่น)
- **ความเสี่ยง**: ต้องมั่นใจว่าคำสุ่มไม่ถูกส่งใน snapshot ของ Commons (พึ่ง T1); คลังคำภาษาไทยต้อง curate
- **กฎเหล็ก**: ข้อ 1, 2

#### T8 — ระบบใบ้ / จำกัดจำนวนคำถาม
- **ไฟล์**: `insider-be/main.go`, `insider-game/src/components/insider/TimerView.js`
- **สิ่งที่เปลี่ยน**:
  - ตัวนับคำถาม/ใบ้ฝั่ง server (เช่น message `ask_question` เพิ่ม counter) หรือปุ่ม "ขอใบ้" ที่ Judge เปิดเผยใบ้สาธารณะ (เพิ่ม field `hints []string` ใน room — ใบ้เปิดเผยได้ ไม่ใช่คำลับ)
  - แสดง counter/ใบ้บน UI ระหว่าง countdown
- **เหตุผล**: เพิ่มความตึงเครียด/จังหวะเกม
- **ความเสี่ยง**: ใบ้ที่ Judge พิมพ์ต้องไม่หลุดคำลับ (เป็นความรับผิดชอบผู้เล่น) — ระบบแค่ broadcast ใบ้ที่ตั้งใจเปิด
- **กฎเหล็ก**: ข้อ 1

#### T9 — เสียง + เอฟเฟกต์ + เตือนเวลา (client-only)
- **ไฟล์**: `insider-game/src/components/insider/*` (+ assets ใน `public/`)
- **สิ่งที่เปลี่ยน**: เสียงตอนเริ่มรอบ/โหวต/เฉลย, countdown warning เมื่อเหลือ ≤ 10s (ใช้ `room.timer` ที่ server ส่งอยู่แล้ว), แอนิเมชันเฉลย role
- **เหตุผล**: feedback และอารมณ์ร่วม
- **ความเสี่ยง**: ต่ำ (เป็น client-only, ไม่แตะ logic ตัดสิน); ต้องมี toggle ปิดเสียง
- **กฎเหล็ก**: ข้อ 1 (ห้ามย้าย logic เวลา/ตัดสินมา client — แค่ render จาก `room.timer`)

#### T10 — Emoji reactions + Spectator mode
- **ไฟล์**: `insider-be/main.go`, `insider-game/src/components/insider/*`
- **สิ่งที่เปลี่ยน**:
  - reactions: message `react{emoji}` broadcast ชั่วคราว (ไม่กระทบ state ตัดสิน)
  - spectator: เข้าด้วย `mode=spectate` → ดูได้แต่ **ไม่ได้รับ snapshot ที่มีคำลับ/role/insiderId** (redaction เข้มกว่าผู้เล่น), โหวต/แชทไม่ได้ (หรือแชทแยก)
- **เหตุผล**: คนเกินโควตา/รอรอบถัดไปมีส่วนร่วมได้
- **ความเสี่ยง**: spectator ต้องถูก redact เข้มที่สุด (พึ่ง T1) — เป็นจุดเสี่ยง leak ถ้าพลาด; ต้องกันไม่ให้ spectator ส่ง action ตัดสิน
- **กฎเหล็ก**: ข้อ 1, 2

#### T12 — Hardening (B7, พบว่าตกหล่นตอน review)
- **ไฟล์**: `insider-be/main.go`
- **สิ่งที่เปลี่ยน**: จำกัดจำนวนผู้เล่นต่อห้อง (เช่น ≤ 12), clamp ความยาวชื่อ (เช่น ≤ 24 ตัว) + sanitize, rate-limit แชท (เช่น 1 ข้อความ/0.5s/คน), reject message ที่ field ผิด schema
- **เหตุผล**: กัน abuse/DoS และ payload ผิดรูป
- **ความเสี่ยง**: ต่ำ; ระวัง limit ไม่ให้กระทบการเล่นปกติ
- **กฎเหล็ก**: ข้อ 1, 3

### 🔵 P3 — โหมดใหม่ (พักไว้ตามคำสั่งเจ้าของ)
#### T11 — New game mode (DEFERRED)
- **สถานะ**: เจ้าของเกมตอบว่า "ยังก่อน" — **ยังไม่ออกแบบ**
- ตัวเลือกที่เคยเสนอไว้ (ไว้ตัดสินใจภายหลัง): คลังคำอัตโนมัติเป็นโหมดเต็ม, Multi-Insider สเกลตามจำนวนคน, Mr.White (role ไม่รู้คำ)
- เมื่อจะทำ ต้องผ่านขั้นตอนถามดีไซน์ + กฎเหล็กเดิม

---

## 4. ลำดับการลงมือ (แนะนำ)
1. **T1** (ปิดความลับรั่ว) — ทำก่อนสุด เพราะกระทบความหมายของเกมทั้งหมด และเป็นฐานของ T7/T10
2. **T2, T3** (สิทธิ์ + validate) — เล็ก เสี่ยงต่ำ ได้ความถูกต้องทันที
3. **T4, T5, T6** (reconnect/void/cleanup) — กลุ่ม state หลายผู้เล่น ทำเป็นชุดเดียวเพราะเกี่ยวพันกัน
4. **T7–T10** (ความสนุก) — ทำหลังฐานมั่นคง; T7/T10 ต้องพึ่ง redaction ของ T1
5. **T11** — เมื่อเจ้าของพร้อม

## 5. หมายเหตุการทดสอบ
- ทดสอบ multi-client จริง: เปิด ≥ 4 แท็บ ตรวจว่า **Commons มองไม่เห็น `secretWord`/`insiderId`/`role` คนอื่นใน WS frame** (เปิด DevTools → Network → WS)
- ทดสอบ reconnect: ปิด/เปิดแท็บกลางรอบ ตรวจว่าคะแนน/role/ที่นั่งคงอยู่
- ทดสอบ void: ปิดแท็บ Judge/Insider กลางรอบ ตรวจว่ากลับ lobby + แจ้งเตือน
- ทดสอบ tie/revote, deadlock, หมดเวลา ว่าคะแนนถูกต้อง

---

## ภาคผนวก A — สรุป Q&A กับเจ้าของเกม
| คำถาม | คำตอบ |
|-------|-------|
| โหมดใหม่อยากได้แบบไหน? | **ยังก่อน** (พักไว้ → T11 DEFERRED) |
| reconnect เก็บที่นั่ง/คะแนน/role ไหม? | **เก็บที่นั่งถาวร ไม่มี grace** → T4/T6 |
| Judge/Insider หลุดกลางรอบทำอย่างไร? | **Void รอบ → กลับ lobby** → T5 |
| ฟีเจอร์ความสนุก (เลือกหลายได้) | **ครบทั้ง 4**: คลังคำ/สุ่มคำ, ใบ้/จำกัดคำถาม, เสียง+เอฟเฟกต์+เตือนเวลา, reactions+spectator → T7–T10 |
| ช่องทาง ask-human | Telegram ส่งได้แต่อ่าน reply ไม่ได้ → ใช้ **Discord** เป็นช่องสองทาง (รองรับ `read`) หรือถามใน IDE |

## ภาคผนวก B — สถานะเครื่องมือ (ข้อเท็จจริง)
- **`ask-human`**: ไม่มี command นี้ในเครื่อง — ใช้ `openclaw message send --channel telegram --target 5541422783` ส่งได้ (ทดสอบแล้ว msg id 1140) แต่ Telegram **ไม่รองรับ `read`** จึงอ่าน reply กลับไม่ได้; **Discord รองรับทั้ง `send` + `read`** ใช้เป็นช่องสองทางได้ (ต้องระบุ Discord target id)
- **`antigravity-review`**: ไม่มี command นี้ — Antigravity ที่ติดตั้งคือ **GUI IDE** (`...\Programs\antigravity\Antigravity.exe`) ไม่มี CLI สำหรับ review แบบ blocking จึงสคริปต์ไม่ได้
  - ทางเลือกการรีวิว plan.md: (ก) เปิด `plan.md` ใน Antigravity เองแล้วให้ AI ใน IDE วิจารณ์ → paste กลับมา, (ข) ให้ผมรีวิวเอง (red-team) / เรียก reviewer subagent, (ค) ใช้ `/code-review` ของ Claude Code (เหมาะกับ diff โค้ดมากกว่าเอกสาร)

## ภาคผนวก C — บันทึกการรีวิว
**Antigravity CLI ใช้ไม่ได้ (GUI IDE)** จึงทำ **self red-team review** แทน รอบที่ 1 พบและแก้ไปแล้ว:

| จุดที่พบ | การแก้ |
|---------|--------|
| T1 เดิมให้เปิด role `judge` ของคนอื่นแบบสาธารณะ — ซับซ้อนและเสี่ยงเกินจำเป็น | ตรวจ frontend แล้วพบว่า judge ดึงจาก `room.judgeId` ไม่ใช่ `player.role` → เปลี่ยนเป็น **redact role คนอื่นทั้งหมด เปิดเฉพาะของ viewer เอง** |
| Token reconnect (T4) อาจหลุดถ้าใส่ใน `Players[]` | ระบุชัดให้ `Token` เป็น `json:"-"` และส่งเฉพาะ token ของ viewer ผ่าน field แยกใน `OutgoingRoomMessage` + ผูกไว้ในกฎ redaction T1 |
| **"ที่นั่งถาวร" + การนับ `eligible` voters** → ผู้เล่นออฟไลน์ถูกนับเป็นผู้มีสิทธิ์โหวต ทำให้โหวตค้างไม่จบจนหมดเวลา | เพิ่มข้อกำหนดใน T6: กรอง `Connected==false` ออกจาก `eligible` และเกณฑ์ auto-tally (จุดนี้สำคัญ — เป็นผลข้างเคียงโดยตรงของดีไซน์ "ไม่มี grace + ที่นั่งถาวร") |
| B7 (hardening) อยู่ในตารางบั๊กแต่ไม่มี task | เพิ่ม **T12 Hardening** |

**ยังเปิดรับรีวิวเพิ่ม**: ถ้าต้องการรีวิวจากภายนอกจริง เลือกได้ตามภาคผนวก B — เปิด `plan.md` ใน Antigravity เอง / ให้ผมเรียก reviewer subagent / ใช้ `/code-review`
