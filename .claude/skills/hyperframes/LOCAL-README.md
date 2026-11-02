# HyperFrames (로컬 설치 메모)

- 원본: https://github.com/heygen-com/hyperframes @ `7c5c1ce849a6b479f957b69de8dcac8db7eab127` (Apache-2.0, LICENSE 동봉)
- 렌더러 CLI는 저장소에 설치하지 않았다. 필요할 때만 버전 고정으로 실행한다:

```bash
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1 HYPERFRAMES_NO_UPDATE_CHECK=1
npx hyperframes@0.8.230 init video/<이름> --skip-skills
npx hyperframes@0.8.230 check --json
npx hyperframes@0.8.230 render --quality delivery -o video/<이름>/out.mp4
```

- 요구사항: Node 22+, FFmpeg, Chrome(`npx hyperframes@0.8.230 browser ensure`).
- 금지: `@latest`, 전역 설치, `upgrade`, `skills update`, `feedback`, `publish`, `cloud`/`lambda`/`cloudrun`, `auth`.
- 버전을 올릴 때는 사람이 원본 변경분을 검토한 뒤 이 파일·SKILL.md·`.claude/skills/THIRD_PARTY.md`를 함께 고친다.
- 빠진 파일과 이유: `.claude/skills/THIRD_PARTY.md` 참고.
