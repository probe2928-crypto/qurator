# 제3자 스킬 기록

원본은 `git clone --depth 1`로 받은 고정 커밋에서 내용을 직접 읽어 확인한 뒤 필요한 파일만 복사했다. 설치 스크립트(npx/install.sh/postinstall)는 실행하지 않았다. 업데이트는 사람이 원본 변경분을 검토한 뒤에만.

## hyperframes
- 원본: https://github.com/heygen-com/hyperframes
- 커밋: `7c5c1ce849a6b479f957b69de8dcac8db7eab127`
- 라이선스: Apache-2.0 (LICENSE 동봉)
- 설치일: 2026-11-02
- 복사: `skills/hyperframes/SKILL.md`·`references/`(+types) → `hyperframes/`, `skills/hyperframes-cli/SKILL.md`·`references/` → `hyperframes-cli/`. SKILL.md 상단에 로컬 정책 블록 추가(수정 표시), `LOCAL-README.md` 추가. 렌더러는 설치 안 함 — `npx hyperframes@0.8.230`.
- 뺀 것: `references/feedback.md`(렌더 후 공개 채널로 피드백 자동 전송 지시), `cloud.md`·`lambda.md`·`cloudrun.md`(프로젝트를 외부 클라우드로 업로드·자격증명 사용), `skill-lifecycle.md`(`@latest` 자동 업그레이드·스킬 자동 갱신 지시 — 버전 고정과 충돌), `plugin-installation.md`(플러그인 전용), `scripts/`(실행 스크립트 불필요), `assets/frame-presets/`(슬라이드 덱 프리셋, 외부 CDN 참조). 다른 스킬(registry, media-use 등)은 설치 안 함.

## impeccable
- 원본: https://github.com/pbakaus/impeccable
- 커밋: `e89e3ada3e875a89ac2c5d33d11e65ebef6fe285`
- 라이선스: Apache-2.0 (LICENSE·NOTICE.md 동봉)
- 설치일: 2026-11-02
- 복사: `.claude/skills/impeccable/SKILL.md`(v4.8.0)와 `reference/*.md`·`reference/degraded/*.md` → `impeccable/`. SKILL.md 상단에 로컬 정책 블록 추가(수정 표시).
- 뺀 것: `scripts/` 전체(첫 실행 때 바이너리를 내려받는 런처, 563KB 번들 JS, concept-seed 사용 신호 전송 등 — 제3자 실행 코드), `reference/live.md`·`live-setup.md`·`generate.md`(로컬 서버·브라우저 주입·CSP 수정 필요), `hooks.md`(편집마다 자동 실행 훅 설치). 스킬은 런처 없이 'Launcher unavailable' 경로로 PRODUCT.md/DESIGN.md를 직접 읽어 동작.

## security-audit
- 원본: https://github.com/cloudflare/security-audit-skill
- 커밋: `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`
- 라이선스: MIT (LICENSE 동봉)
- 설치일: 2026-11-02
- 복사: `skills/security-audit/` 의 모든 `.md`, `report-schema.json`, `validate-findings.cjs`, `validate-coverage-ledger.cjs`(로컬 파일만 읽는 검증기, 네트워크 없음) → `security-audit/`. SKILL.md 상단에 로컬 정책 블록 추가(수정 표시).
- 뺀 것: `*.test.cjs`(테스트, 불필요). 의심 지시 없음.
