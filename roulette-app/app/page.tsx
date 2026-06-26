"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

// ── 룰렛 상수 ─────────────────────────────────────────────
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function numColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

function colorLabel(n: number) {
  const c = numColor(n);
  return c === "red" ? "빨강" : c === "black" ? "검정" : "초록";
}

function multiplier(type: string): number {
  if (type.startsWith("n-")) return 36;
  if (["red", "black", "odd", "even", "low", "high"].includes(type)) return 2;
  if (["d1", "d2", "d3", "c1", "c2", "c3"].includes(type)) return 3;
  return 0;
}

const BOARD_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const CHIP_VALUES = [1, 5, 25, 100] as const;
const CHIP_COLORS: Record<number, string> = {
  1: "#e5e5e5",
  5: "#dc2626",
  25: "#2563eb",
  100: "#16a34a",
};

interface Bet {
  type: string;
  label: string;
  numbers: number[];
  amount: number;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function RoulettePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const animRef = useRef<number>(0);

  const [balance, setBalance] = useState(() => {
    if (typeof window === "undefined") return 1000;
    const saved = localStorage.getItem("roulette_balance");
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return isNaN(parsed) || parsed <= 0 ? 1000 : parsed;
  });
  const [chip, setChip] = useState<number>(5);
  const [bets, setBets] = useState<Bet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmt, setWinAmt] = useState<number | null>(null);
  const [status, setStatus] = useState("베팅을 선택하고 SPIN 버튼을 클릭하세요.");
  const [winFlash, setWinFlash] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  // 잔액 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem("roulette_balance", String(balance));
  }, [balance]);

  // ── 캔버스 휠 ────────────────────────────────────────────
  const drawWheel = useCallback(
    (wheelRot: number, ball?: { a: number; r: number } | null, highlight?: number | null) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d")!;
      const W = cv.width, H = cv.height;
      const cx = W / 2, cy = H / 2;
      const OR = Math.min(cx, cy) - 3;
      const IR = OR * 0.58;
      const NR = OR * 0.8;
      const SA = (Math.PI * 2) / 37;

      ctx.clearRect(0, 0, W, H);

      // 외부 림
      const rimGrad = ctx.createRadialGradient(cx - OR * 0.1, cy - OR * 0.1, OR * 0.7, cx, cy, OR + 3);
      rimGrad.addColorStop(0, "#6b3a1e");
      rimGrad.addColorStop(1, "#2c1503");
      ctx.beginPath();
      ctx.arc(cx, cy, OR + 3, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // 섹터
      for (let i = 0; i < 37; i++) {
        const n = WHEEL_NUMBERS[i];
        const a1 = wheelRot - Math.PI / 2 + i * SA;
        const a2 = a1 + SA;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, OR, a1, a2);
        ctx.closePath();
        const c = numColor(n);
        if (n === highlight) {
          ctx.fillStyle = c === "green" ? "#22c55e" : c === "red" ? "#ef4444" : "#525252";
        } else {
          ctx.fillStyle = c === "green" ? "#15803d" : c === "red" ? "#991b1b" : "#171717";
        }
        ctx.fill();
        ctx.strokeStyle = "#3d2a10";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // 구분선 (금색)
      ctx.strokeStyle = "rgba(218,165,32,0.55)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 37; i++) {
        const a = wheelRot - Math.PI / 2 + i * SA;
        ctx.beginPath();
        ctx.moveTo(cx + (IR + 1) * Math.cos(a), cy + (IR + 1) * Math.sin(a));
        ctx.lineTo(cx + OR * Math.cos(a), cy + OR * Math.sin(a));
        ctx.stroke();
      }

      // 내부 원
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, IR);
      innerGrad.addColorStop(0, "#166534");
      innerGrad.addColorStop(1, "#0f4c24");
      ctx.beginPath();
      ctx.arc(cx, cy, IR, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.strokeStyle = "#0a3d1e";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, IR * 0.83, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(218,165,32,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 숫자
      for (let i = 0; i < 37; i++) {
        const n = WHEEL_NUMBERS[i];
        const midA = wheelRot - Math.PI / 2 + i * SA + SA / 2;
        const nx = cx + NR * Math.cos(midA);
        const ny = cy + NR * Math.sin(midA);
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = n === highlight ? "#ffd700" : "#ffffff";
        ctx.font = `bold ${Math.floor(OR * 0.09)}px Tahoma, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }

      // 볼
      if (ball) {
        const bx = cx + ball.r * Math.cos(ball.a);
        const by = cy + ball.r * Math.sin(ball.a);
        const bg = ctx.createRadialGradient(bx - 1.5, by - 2, 0.5, bx, by, 5);
        bg.addColorStop(0, "#ffffff");
        bg.addColorStop(0.5, "#e0e0e0");
        bg.addColorStop(1, "#888888");
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // 중앙 허브
      const hg = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, IR * 0.18);
      hg.addColorStop(0, "#d4d0c8");
      hg.addColorStop(1, "#707070");
      ctx.beginPath();
      ctx.arc(cx, cy, IR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.strokeStyle = "#505050";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 포인터
      const pW = 11;
      const pDepth = OR * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx - pW / 2, 5);
      ctx.lineTo(cx + pW / 2, 5);
      ctx.lineTo(cx, 5 + pDepth);
      ctx.closePath();
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      ctx.strokeStyle = "#a07800";
      ctx.lineWidth = 1;
      ctx.stroke();
    },
    []
  );

  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const getBetAmt = (type: string) => bets.find((b) => b.type === type)?.amount ?? 0;

  const placeBet = useCallback(
    (type: string, label: string, numbers: number[]) => {
      if (spinning) return;
      if (balance < chip) { setStatus("잔액이 부족합니다!"); return; }
      setBets((prev) => {
        const idx = prev.findIndex((b) => b.type === type);
        if (idx >= 0) return prev.map((b, i) => i === idx ? { ...b, amount: b.amount + chip } : b);
        return [...prev, { type, label, numbers, amount: chip }];
      });
      setBalance((b) => b - chip);
      setResult(null);
      setWinAmt(null);
      setStatus(`${label}에 ${chip}칩 베팅 추가`);
    },
    [spinning, balance, chip]
  );

  const clearBets = useCallback(() => {
    if (spinning) return;
    setBalance((b) => b + totalBet);
    setBets([]);
    setStatus("베팅이 초기화되었습니다.");
  }, [spinning, totalBet]);

  const doSpin = useCallback(() => {
    if (spinning) return;
    if (bets.length === 0) { setStatus("먼저 베팅을 선택해 주세요!"); return; }
    cancelAnimationFrame(animRef.current);

    const rIdx = Math.floor(Math.random() * 37);
    const rNum = WHEEL_NUMBERS[rIdx];
    const SA = (Math.PI * 2) / 37;
    const base = -Math.PI / 2 - rIdx * SA - SA / 2;
    const turns = 5 + Math.random() * 4;
    const targetRot = base - turns * Math.PI * 2;
    const startRot = rotRef.current;
    const dur = 4500 + Math.random() * 800;
    const t0 = performance.now();
    const ballStartA = Math.random() * Math.PI * 2;
    const cv = canvasRef.current!;
    const OR = cv.width / 2 - 3;

    setSpinning(true);
    setResult(null);
    setWinAmt(null);
    setStatus("룰렛 스핀 중...");

    const animate = (now: number) => {
      const el = now - t0;
      const t = Math.min(el / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const curRot = startRot + (targetRot - startRot) * ease;
      rotRef.current = curRot;

      const ballA = ballStartA - (1 - t) * turns * Math.PI * 2 * 1.4;
      const ballR = t < 0.65
        ? OR - 6
        : (OR - 6) - ((t - 0.65) / 0.35) * ((OR - 6) - (OR * 0.62 + 6));

      drawWheel(curRot, t < 1 ? { a: ballA, r: Math.max(ballR, OR * 0.62 + 6) } : null);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        drawWheel(targetRot, null, rNum);
        setSpinning(false);
        setResult(rNum);
        setHistory((prev) => [rNum, ...prev].slice(0, 20));

        let won = 0;
        bets.forEach((b) => { if (b.numbers.includes(rNum)) won += b.amount * multiplier(b.type); });
        setWinAmt(won);

        if (won > 0) {
          setBalance((b) => b + won);
          setStatus(`결과: ${rNum} (${colorLabel(rNum)})  ●  +${won} 칩 획득!`);
          setWinFlash(true);
          setTimeout(() => setWinFlash(false), 2000);
        } else {
          setStatus(`결과: ${rNum} (${colorLabel(rNum)})  ●  아쉽습니다. 다시 도전하세요!`);
        }
        setBets([]);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [spinning, bets, drawWheel]);

  // ── 베팅 셀 배경색 ────────────────────────────────────────
  const numBg = (n: number) => numColor(n) === "red" ? "#7f1d1d" : "#111111";
  const numBorder = (n: number) => getBetAmt(`n-${n}`) > 0
    ? "2px solid #ffd700"
    : numColor(n) === "red" ? "1px solid #991b1b" : "1px solid #2a2a2a";

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(135deg, #007878 0%, #005f5f 40%, #004848 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11,
    }}>
      {/* ── 메인 윈도우 ── */}
      <div style={{
        background: "#d4d0c8",
        borderTop: "2px solid #ffffff",
        borderLeft: "2px solid #ffffff",
        borderRight: "2px solid #404040",
        borderBottom: "2px solid #404040",
        boxShadow: "3px 3px 0 #202020",
        minWidth: 860, maxWidth: "98vw",
      }}>

        {/* 타이틀 바 */}
        <div style={{
          background: "linear-gradient(to right, #000080 0%, #0050c8 60%, #1084d0 100%)",
          padding: "3px 4px 3px 6px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          userSelect: "none",
        }}>
          <div style={{ color: "#ffffff", fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 14 }}>♦</span>
            Windows Casino — Roulette
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {(["_", "□", "✕"] as const).map((lbl, i) => (
              <button key={i} style={{
                width: 18, height: 16, fontSize: 10, fontWeight: "bold",
                background: "#d4d0c8", color: "#000",
                borderTop: "1px solid #ffffff", borderLeft: "1px solid #ffffff",
                borderRight: "1px solid #404040", borderBottom: "1px solid #404040",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0, lineHeight: 1,
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* 메뉴 바 */}
        <div style={{
          background: "#d4d0c8", borderBottom: "1px solid #808080",
          padding: "1px 2px", display: "flex",
        }}>
          {["파일(F)", "게임(G)", "보기(V)", "도움말(H)"].map((m) => (
            <span key={m} style={{ padding: "2px 8px", cursor: "default", fontSize: 11 }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#000080"; (e.target as HTMLElement).style.color = "#ffffff"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ""; (e.target as HTMLElement).style.color = ""; }}
            >{m}</span>
          ))}
        </div>

        {/* 툴바 */}
        <div style={{
          background: "#d4d0c8", borderBottom: "1px solid #808080",
          padding: "3px 6px", display: "flex", alignItems: "center", gap: 4,
        }}>
          <button className="win-btn" onClick={doSpin} disabled={spinning} style={{ minWidth: 90, fontWeight: "bold" }}>
            ▶ SPIN
          </button>
          <button className="win-btn" onClick={clearBets} disabled={spinning}>
            ↺ 베팅 취소
          </button>
          {balance === 0 && (
            <button className="win-btn" style={{ color: "#006600", fontWeight: "bold" }}
              onClick={() => { localStorage.setItem("roulette_balance", "1000"); setBalance(1000); setStatus("잔액이 1000칩으로 충전되었습니다."); }}>
              💰 충전 (+1000)
            </button>
          )}
          <div style={{ width: 1, height: 22, background: "#808080", borderRight: "1px solid #ffffff", margin: "0 4px" }} />
          <span>잔액:</span>
          <span className="led-display" style={{ fontSize: 13, minWidth: 80, textAlign: "right" }}>
            {String(balance).padStart(6, " ")} 칩
          </span>
          <span style={{ marginLeft: 6 }}>현재 베팅:</span>
          <span style={{ fontWeight: "bold", color: totalBet > 0 ? "#990000" : "#666", minWidth: 50 }}>
            {totalBet} 칩
          </span>
          {result !== null && (
            <>
              <div style={{ width: 1, height: 22, background: "#808080", borderRight: "1px solid #ffffff", margin: "0 4px" }} />
              <span>직전 결과:</span>
              <div className={winFlash ? "win-pulse" : ""} style={{
                width: 28, height: 22, borderRadius: 3, marginLeft: 4,
                background: result === 0 ? "#15803d" : RED_NUMBERS.has(result) ? "#b91c1c" : "#171717",
                color: "#fff", fontWeight: "bold", fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid #505050",
              }}>{result}</div>
              {winAmt !== null && winAmt > 0 && (
                <span className={winFlash ? "win-pulse" : ""} style={{ color: "#006600", fontWeight: "bold", marginLeft: 4 }}>
                  +{winAmt}칩!
                </span>
              )}
            </>
          )}
        </div>

        {/* 콘텐츠 */}
        <div style={{ padding: 6, display: "flex", gap: 6, background: "#d4d0c8" }}>

          {/* 왼쪽: 휠 + 칩 선택 + 베팅 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 304 }}>

            {/* 휠 */}
            <div style={{
              borderTop: "2px solid #404040", borderLeft: "2px solid #404040",
              borderRight: "2px solid #ffffff", borderBottom: "2px solid #ffffff",
              background: "#0a0a1a", padding: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <canvas ref={canvasRef} width={288} height={288} />
            </div>

            {/* 칩 선택 */}
            <div style={{
              borderTop: "2px solid #404040", borderLeft: "2px solid #404040",
              borderRight: "2px solid #ffffff", borderBottom: "2px solid #ffffff",
              background: "#d4d0c8", padding: "6px 8px",
            }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>칩 선택:</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {CHIP_VALUES.map((v) => (
                  <div key={v} className={`chip${chip === v ? " selected" : ""}`}
                    style={{ background: CHIP_COLORS[v], color: v === 1 ? "#333" : "#fff", fontSize: v >= 100 ? 11 : 13 }}
                    onClick={() => setChip(v)}
                  >{v}</div>
                ))}
              </div>
            </div>

            {/* 현재 베팅 목록 */}
            <div style={{
              borderTop: "2px solid #404040", borderLeft: "2px solid #404040",
              borderRight: "2px solid #ffffff", borderBottom: "2px solid #ffffff",
              background: "#ffffff", padding: "4px 6px",
              minHeight: 54, maxHeight: 72, overflowY: "auto", fontSize: 10,
            }}>
              {bets.length === 0 ? (
                <span style={{ color: "#888" }}>베팅 없음</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {bets.map((b) => (
                    <span key={b.type} style={{
                      background: "#d4d0c8", padding: "1px 5px",
                      borderTop: "1px solid #ffffff", borderLeft: "1px solid #ffffff",
                      borderRight: "1px solid #808080", borderBottom: "1px solid #808080",
                      whiteSpace: "nowrap",
                    }}>
                      {b.label}: {b.amount}칩
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 베팅 테이블 + 히스토리 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>

            {/* 그린 테이블 */}
            <div style={{
              borderTop: "2px solid #404040", borderLeft: "2px solid #404040",
              borderRight: "2px solid #ffffff", borderBottom: "2px solid #ffffff",
              background: "#1a5c3a", padding: 4,
            }}>
              <div style={{ display: "flex", gap: 2 }}>

                {/* 0 */}
                <div onClick={() => placeBet("n-0", "0", [0])} style={{
                  width: 36, background: "#15803d",
                  border: getBetAmt("n-0") > 0 ? "2px solid #ffd700" : "1px solid #22c55e",
                  color: "#fff", fontWeight: "bold", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative", borderRadius: 2, userSelect: "none",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                >
                  0
                  {getBetAmt("n-0") > 0 && <div className="board-chip">{getBetAmt("n-0")}</div>}
                </div>

                {/* 숫자 그리드 + 베팅 셀 */}
                <div style={{ flex: 1 }}>
                  {BOARD_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 1, marginBottom: ri < 2 ? 1 : 0 }}>
                      {row.map((n) => (
                        <div key={n} onClick={() => placeBet(`n-${n}`, String(n), [n])} style={{
                          flex: 1, height: 44, background: numBg(n), border: numBorder(n),
                          color: "#fff", fontWeight: "bold", fontSize: 11,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", position: "relative", minWidth: 26, userSelect: "none",
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.3)")}
                          onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                        >
                          {n}
                          {getBetAmt(`n-${n}`) > 0 && <div className="board-chip">{getBetAmt(`n-${n}`)}</div>}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* 더즌 */}
                  <div style={{ display: "flex", gap: 1, marginTop: 2 }}>
                    {(
                      [
                        ["d1", "1st 12", Array.from({ length: 12 }, (_, i) => i + 1)],
                        ["d2", "2nd 12", Array.from({ length: 12 }, (_, i) => i + 13)],
                        ["d3", "3rd 12", Array.from({ length: 12 }, (_, i) => i + 25)],
                      ] as [string, string, number[]][]
                    ).map(([t, l, ns]) => (
                      <BetCell key={t} type={t} label={l} nums={ns} amt={getBetAmt(t)} bg="#0f4c2a" bdr="#1e8a50" onBet={placeBet} h={30} />
                    ))}
                  </div>

                  {/* 외부 베팅 */}
                  <div style={{ display: "flex", gap: 1, marginTop: 1 }}>
                    {(
                      [
                        ["low", "1-18", Array.from({ length: 18 }, (_, i) => i + 1), "#0f4c2a", "#1e8a50"],
                        ["even", "짝수", [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36], "#0f4c2a", "#1e8a50"],
                        ["red", "■ 빨강", [...RED_NUMBERS], "#7f1d1d", "#991b1b"],
                        ["black", "■ 검정", [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35], "#111111", "#2a2a2a"],
                        ["odd", "홀수", [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35], "#0f4c2a", "#1e8a50"],
                        ["high", "19-36", Array.from({ length: 18 }, (_, i) => i + 19), "#0f4c2a", "#1e8a50"],
                      ] as [string, string, number[], string, string][]
                    ).map(([t, l, ns, bg, bdr]) => (
                      <BetCell key={t} type={t} label={l} nums={ns} amt={getBetAmt(t)} bg={bg} bdr={bdr} onBet={placeBet} h={30} />
                    ))}
                  </div>
                </div>

                {/* 컬럼 베팅 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1, width: 38 }}>
                  {(
                    [
                      ["c3", "2:1", [3,6,9,12,15,18,21,24,27,30,33,36]],
                      ["c2", "2:1", [2,5,8,11,14,17,20,23,26,29,32,35]],
                      ["c1", "2:1", [1,4,7,10,13,16,19,22,25,28,31,34]],
                    ] as [string, string, number[]][]
                  ).map(([t, l, ns]) => (
                    <BetCell key={t} type={t} label={l} nums={ns} amt={getBetAmt(t)} bg="#0f3320" bdr="#1e8a50" onBet={placeBet} h={44} />
                  ))}
                </div>
              </div>

              {/* 배당률 */}
              <div style={{ marginTop: 4, display: "flex", gap: 8, justifyContent: "center", fontSize: 10, color: "#90ee90" }}>
                <span>단일 번호 35:1</span><span>|</span>
                <span>컬럼/더즌 2:1</span><span>|</span>
                <span>Red·Black·홀짝·High·Low 1:1</span>
              </div>
            </div>

            {/* 히스토리 */}
            <div style={{
              borderTop: "2px solid #404040", borderLeft: "2px solid #404040",
              borderRight: "2px solid #ffffff", borderBottom: "2px solid #ffffff",
              background: "#ffffff", padding: "4px 6px",
            }}>
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>결과 히스토리:</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {history.length === 0 ? (
                  <span style={{ color: "#888", fontSize: 10 }}>결과 없음</span>
                ) : (
                  history.map((n, i) => (
                    <div key={i} style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: n === 0 ? "#15803d" : RED_NUMBERS.has(n) ? "#b91c1c" : "#171717",
                      color: "#fff", fontSize: 9, fontWeight: "bold",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: i === 0 ? "2px solid #ffd700" : "1px solid #808080",
                      flexShrink: 0,
                    }}>{n}</div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 상태 바 */}
        <div style={{
          background: "#d4d0c8", borderTop: "1px solid #808080",
          padding: "2px 4px", display: "flex", alignItems: "center", gap: 2, fontSize: 11,
        }}>
          <div className="statusbar-panel" style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{status}</div>
          <div className="statusbar-panel" style={{ whiteSpace: "nowrap" }}>잔액: {balance} 칩</div>
          <div className="statusbar-panel" style={{ whiteSpace: "nowrap" }}>베팅: {totalBet} 칩</div>
        </div>

      </div>
    </div>
  );
}

// ── 베팅 셀 컴포넌트 ─────────────────────────────────────
function BetCell({
  type, label, nums, amt, bg, bdr, onBet, h,
}: {
  type: string; label: string; nums: number[]; amt: number;
  bg: string; bdr: string;
  onBet: (type: string, label: string, numbers: number[]) => void;
  h: number;
}) {
  return (
    <div
      style={{
        flex: 1, height: h, background: bg,
        border: amt > 0 ? "2px solid #ffd700" : `1px solid ${bdr}`,
        color: "#e0e0e0", fontWeight: "bold", fontSize: 11,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", position: "relative", userSelect: "none",
      }}
      onClick={() => onBet(type, label, nums)}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
    >
      {label}
      {amt > 0 && <div className="board-chip">{amt}</div>}
    </div>
  );
}
