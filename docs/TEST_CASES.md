# GateGuard Manual Test Cases

Record actual outcomes and evidence before the competition. Do not mark a case PASS without running it.

| ID | Scenario | Steps | Expected result | Actual / evidence | Status |
|---|---|---|---|---|---|
| TC-01 | Register valid user | Register with a new valid email/password | Account created and session established | `[FILL IN]` | NOT RUN |
| TC-02 | Duplicate registration | Register same email again | Clear validation error; no duplicate account | `[FILL IN]` | NOT RUN |
| TC-03 | Login invalid password | Sign in with wrong password | Authentication rejected | `[FILL IN]` | NOT RUN |
| TC-04 | Protected API | Call protected endpoint without JWT | 401/unauthorized response | `[FILL IN]` | NOT RUN |
| TC-05 | Add repository | Add accessible GitHub repository | Project stored and visible in workspace | `[FILL IN]` | NOT RUN |
| TC-06 | Duplicate repository | Add same repository twice | Duplicate prevented or clear error returned | `[FILL IN]` | NOT RUN |
| TC-07 | Invalid webhook signature | Send webhook with incorrect signature | Request rejected | `[FILL IN]` | NOT RUN |
| TC-08 | Valid webhook signature | Redeliver valid GitHub event | Request accepted and event handled | `[FILL IN]` | NOT RUN |
| TC-09 | Invalid CI token | Submit CI result with invalid token | Request rejected | `[FILL IN]` | NOT RUN |
| TC-10 | Valid CI result | Submit valid workflow result | Analysis saved and visible in history | `[FILL IN]` | NOT RUN |
| TC-11 | Quality rule failure | Submit metrics below configured threshold | Gate returns FAIL/WARNING as configured | `[FILL IN]` | NOT RUN |
| TC-12 | PDF export | Export an analysis owned by signed-in user | Valid readable PDF downloaded | `[FILL IN]` | NOT RUN |
| TC-13 | Offline demo | Enable `VITE_DEMO_MODE=true`; run offline demo | Sample history row appears and is labelled sample | `[FILL IN]` | NOT RUN |
