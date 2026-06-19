# News Mixer 상태 문서

## 현재 AI 엔진

| 용도 | 엔진 | 모델 |
|------|------|------|
| 메인 분석 (callAI) | OpenAI | gpt-4o-mini |
| 기사 분류 (classifyArticle) | OpenAI | gpt-4o-mini |

환경 변수: `OPENAI_API_KEY` (Cloudflare Workers Secret)

## Cloudflare Workers 설정

- **플랜**: Paid (Workers Paid)
- **이름**: news-mixer
- **배포 URL**: https://news-mixer.giseub12.workers.dev
- **compatibility_date**: 2025-03-26
- **D1 데이터베이스**: news-mixer-db (`0e326020-5cf9-49ac-8cf8-d68d219ddb8e`)

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-19 | **OpenAI 엔진 교체**: `callAI` 함수를 Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) → OpenAI gpt-4o-mini로 전환. `[ai]` wrangler 바인딩 제거 |
| 이전 | `classifyArticle` 1단계 분류를 OpenAI gpt-4o-mini로 전환 (feat: classifyArticle OpenAI gpt-4o-mini로 전환) |
| 이전 | Cloudflare Workers AI 전환 및 D1 연동, 저작권 footer 추가 |
