# 퍼니스낵 재무 관리 모듈 — 추가 개발 계획서

본 계획서는 기존 "퍼니스낵" 입고 및 재고관리 단일 HTML 웹앱에 월별 통장 거래 내역 기반의 **재무 관리 모듈(💰 재무 현황 탭)**을 추가하기 위한 설계서입니다.

## User Review Required

> [!IMPORTANT]
> **Gemini API 통장 판독 보안**
> - 업로드되는 통장 사진 이미지 데이터는 구글 Gemini API를 통해 파싱됩니다. 영수증과 동일하게 API 키는 브라우저 LocalStorage에 안전하게 보관되지만, 통장 사본의 다른 개인정보(계좌번호, 이름 등)가 분석 영역에 포함될 수 있으므로 통장 촬영 시 해당 부분을 가리고 촬영할 것을 사용자에게 안내하는 툴팁을 제공하겠습니다.

> [!TIP]
> **차트 구현 방식 피드백**
> - 추가 기획서에는 Canvas API 또는 순수 SVG를 활용한 차트 그리기가 언급되어 있으나, 기존 앱에 이미 탑재된 **Chart.js(CDN)** 라이브러리를 활용하면 범례, 모바일 툴팁 터치, 다크 모드 연동 및 디자인 일관성을 훨씬 고품질로 확보할 수 있습니다. 따라서 **Chart.js를 이용해 묶음 막대 차트 및 꺾은선 차트를 구현**하는 방식으로 설계했습니다.

---

## Proposed Changes

### [MODIFY] [index.html](file:///Users/leehyungjun/python%20work/funny/index.html)

모든 수정은 단일 파일인 `index.html` 내부에 이루어집니다.

#### 1. UI 구조 확장 (재무 현황 탭 추가)
* **데스크톱 사이드바 & 모바일 하단 네비게이션**: 5번째 메뉴로 `💰 재무 현황`을 추가합니다.
* **재무 현황 탭 템플릿 (`#finance-tab`)**:
  * **상단 영역**: 통장 내역 사진 업로드용 Dropzone (`#bank-dropzone`), 연/월 선택기 (Year & Month Selector), AI 분석 실행 버튼.
  * **중간 영역 (차트 2종)**: 
    * **월별 수입·지출 그래프**: Chart.js 묶음 막대 차트 (수입: 초록 `#10b981`, 지출: 빨강 `#ef4444`). 막대 클릭 시 해당 월의 전체 거래 상세 목록이 나타나는 인터랙션 모달 연동.
    * **월별 순이익 추이 그래프**: Chart.js 꺾은선 차트. `0원 기준선` 표시 및 적자 구간 배경 붉은 틴트 강조. 연간 누적 순이익 금액 정보 카드 결합.
  * **하단 영역 (영수증 vs 통장 대사)**:
    * 현재 선택된 월 기준 대사 실행 버튼.
    * 대사 결과 통계 카드 (`✅ 매칭`, `⚠️ 금액 불일치`, `❌ 통장 누락` 건수).
    * 결과 테이블: 영수증 입고일자, 납품처, 영수증 금액, 통장 출금 금액, 대사 상태 배지, 금액 차이 표출.

#### 2. 데이터 구조 (LocalStorage 스키마 추가)
* **`state.bank_records`**: 월별 통장 내역 리스트
  ```typescript
  interface Transaction {
    id: string; // tx_uuid
    date: string; // YYYY-MM-DD
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: 'sales' | 'purchase' | 'utilities' | 'rent' | 'other';
  }

  interface BankRecord {
    id: string; // bank_YYYYMM
    year: number;
    month: number;
    transactions: Transaction[];
    total_income: number;
    total_expense: number;
    net_profit: number;
    created_at: string;
  }
  ```
* **데이터 백업 및 복원 지원**: `funny_bank_records` 키를 저장소에 연계하고 `exportDataBackup`/`importDataBackup`에서 통장 내역도 같이 백업 파일에 담기도록 업데이트합니다.

#### 3. 핵심 알고리즘 구현 및 AI 연동
* **Gemini API 통장 판독 (`runBankAiAnalysis()`)**:
  * 프롬프트를 통해 업로드된 통장 이미지로부터 날짜, 거래 구분(입금/출금), 금액, 적요(설명)를 정확한 JSON 구조로 가져옵니다.
  * 가져온 결과는 중간 검토 모달을 띄워 사용자가 직접 수정(거래 항목 추가, 삭제, 내용 변경)한 후 저장할 수 있도록 안전 장치를 마련합니다.
* **대사 처리 엔진 (`reconcileReceiptsWithBank()`)**:
  * 사용자가 선택한 월의 입고 데이터(`state.stock_in`)와 통장 지출 내역(`state.bank_records` 중 `expense` 항목)을 교차 검증합니다.
  * **매칭 공식**: 
    1. 날짜 차이 `Math.abs(Date1 - Date2) <= 3일`
    2. 금액 차이 `Math.abs(BankAmount - ReceiptAmount) / ReceiptAmount <= 0.05 (5%)`
  * **상태 분류**:
    - `✅ 매칭 (matched)`: 날짜와 금액 조건 모두 만족.
    - `⚠️ 금액 불일치 (amount_diff)`: 날짜 조건(±3일) 내 거래는 있으나 금액이 오차 범위(5%)를 초과.
    - `❌ 통장 누락 (unmatched)`: 날짜 및 금액 매칭 범위 내에 통장 출금 거래가 없음.

---

## Verification Plan

### 수동 검증 및 시뮬레이션
1. **샘플 데이터 적재 확인**:
   * 최초 앱 진입 시, 2026년 1월 ~ 5월의 월별 수입/지출/순이익 데이터가 미리 입력되어 차트 그래프가 즉시 활성화되는지 확인합니다.
   * 특히 **2026년 5월**은 기본 탑재된 입고 영수증 5건(`in_001`~`in_005`)에 대응하는 통장 거래 내역들이 세팅되어, 대사 검증 시 **매칭 3건, 불일치 1건, 누락 1건**이 정확히 산출되는지 테스트합니다.
2. **AI 판독 및 중간 확인 팝업**:
   * 설정 탭에 Gemini API 키를 입력한 뒤, 샘플 통장 내역 사진을 업로드하고 판독을 실행하여 JSON 추출 및 편집 모달창이 정상 작동하는지 확인합니다.
3. **그래프 인터랙션**:
   * 월별 수입/지출 그래프 막대를 클릭하면 해당 월의 거래 내역 상세 목록이 팝업 테이블로 올바르게 출력되는지 확인합니다.
4. **백업 파일 데이터 호환성**:
   * 통장 내역 추가 후 백업 파일을 내려받고 초기화한 뒤 복원하여 통장 정보가 완전하게 유지되는지 검증합니다.
5. **Node.js 구문 정밀 검사**:
   * 구현 후 `vm.Script`를 이용해 구문 에러 여부를 다시 검증합니다.
