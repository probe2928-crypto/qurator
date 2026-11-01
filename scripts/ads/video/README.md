# QURATOR 광고 영상 엔진 (2026-11)

HTML 한 장(`ad.html`)이 시간 t의 화면을 그리고, Playwright가 30fps로 찍어 ffmpeg로 인코딩합니다.

- 광고: `daily15`(② 출근길 한 점), `daily30`(② 30초), `qr15`(① 설명판 대신 QR), `ssireum15`(③ 김홍도 씨름 질문)
- 비율: `h=1920`(9:16 릴스·스토리, 위 270 / 아래 670 비움), `h=1350`(4:5 피드)
- 준비물: `img/`에 작품(퍼블릭 도메인)·앱 캡처(ad-assets 브랜치), 글꼴은 fontsource(경로는 ad.html 상단)
- 실행: `node render.mjs qr15 1920 out.mp4` → `python3 mix.py qr15 out.mp4 final.mp4`
  (미리보기: `node render.mjs qr15 1920 prev 1.0,4.4,12` → prev-1.0.jpg …)
- 소리: 배경음악은 audio/bgm(자체 연주·작곡), 해설은 앱의 실제 내레이션 파일. 최종 -15 LUFS.
- 원칙: 가격·"무료"·수치·후기 문구 없음. 반 고흐·모나리자 메인 금지. 주홍 꼬리는 엔드카드에서 한 번만.
