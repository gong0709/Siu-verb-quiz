# 🦊 동사 변신 놀이 (Verb Quiz)

영어 불규칙동사(현재형 → 과거형·과거분사) 연습용 단일 페이지 웹앱. 어린이용.

**▶ 바로 하기: https://gong0709.github.io/Siu-verb-quiz/**

## 사용법

- 한 줄에 동사 하나: `현재 과거 과거분사 (뜻)` (예: `swim swam swum 수영하다`)
- 복수 정답은 `/`로: `dream dreamed/dreamt dreamed/dreamt 꿈꾸다`
- 과거형·과거분사 칸에 답을 적고 **Enter**, 🔊로 발음 듣기
- 진행 상황은 자동 저장 — 다음에 **이어하기**로 계속
- 다른 기기로 옮기려면 **내보내기 / 파일 불러오기**
- 처음부터 다시 하려면 **리셋**

## 작동 원리 (간격 반복)

- 한 단어를 **연속 2번** 맞히면 잠시 제외(마스터)
- 틀린 단어는 맞힐 때까지 계속 출제
- 남은 단어가 0개가 되면 **100점** → 전체를 한 바퀴 더
- 2바퀴부터는 첫 회차에 1번만 맞혀도 통과, 틀리면 다시 2번 연속 필요

## 구조

- `verb-quiz.html` — UI, 입력/채점, 저장, 화면
- `quiz-logic.js` — 순수 출제/마스터 로직 (브라우저 전역 + Node `require` 겸용)
- `quiz-logic.test.js` — 로직 단위 테스트
- `index.html` — `verb-quiz.html`로 리다이렉트

## 개발

```bash
# 로직 테스트
node --test quiz-logic.test.js

# 로컬 확인 (localStorage·내보내기 정상 동작하려면 http로)
python3 -m http.server 8000
# → http://localhost:8000/verb-quiz.html
```

의존성 없음. 빌드 단계 없음.
