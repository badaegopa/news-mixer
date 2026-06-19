# 기자야 내가 간다 — 변경 이력

## 2026-06-19 v5.1
- 다층분석 프레임워크 명칭 확정
- 기본 템플릿 v1.0 고정
- OpenAI gpt-4o-mini 엔진 교체 완료

## 2026-06-19

### 🔧 인프라
- Cloudflare Workers Free → Paid ($5/월) 전환
- 심사 트래픽 무제한 대응 완료

### 🤖 AI 엔진 교체
- Cloudflare Workers AI (llama-3.3-70b) → OpenAI gpt-4o-mini
- 안정성 대폭 향상
- 뉴런 소비 0으로 감소

### ✅ 테스트 완료
- MCP 4개 툴 정상 작동 확인
- 분석 엔진 정상 응답 확인
- 누적 분석 61건 돌파

### 📌 배포 정보
- URL: https://news-mixer.giseub12.workers.dev/mcp
- 플랫폼: Cloudflare Workers Paid
- 엔진: OpenAI gpt-4o-mini
