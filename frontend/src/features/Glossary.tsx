import { useState } from "react";
import { Button } from "../components/ui/button";

interface Term {
  zh: string;
  en?: string;
  desc: string;
  judge?: string;
}

interface Group {
  title: string;
  terms: Term[];
}

const GROUPS: Group[] = [
  {
    title: "報酬",
    terms: [
      {
        zh: "年化報酬",
        en: "CAGR",
        desc: "複合年均成長率。把整段總報酬換算成「每年平均的複利成長率」,可跨不同長度區間比較。",
        judge: "要 > 同期買進持有,否則不如直接抱大盤。",
      },
      {
        zh: "總報酬",
        en: "Total Return",
        desc: "整段期間的累積報酬率(權益淨值從 1.0 漲到多少)。",
      },
    ],
  },
  {
    title: "風險",
    terms: [
      {
        zh: "最大回撤",
        en: "MDD / Max Drawdown",
        desc: "帳戶從歷史高點回落的最大跌幅,衡量「最壞情況要扛多深」。",
        judge: "越小越好;要 < 你心理能撐的幅度,否則實盤會在低點放棄。",
      },
    ],
  },
  {
    title: "風險調整後報酬",
    terms: [
      {
        zh: "夏普值",
        en: "Sharpe",
        desc: "每承受一單位「總波動」換得的報酬。把報酬和波動擺在一起看。",
        judge: "> 1 可用,> 2 優秀。",
      },
      {
        zh: "索提諾",
        en: "Sortino",
        desc: "類似夏普,但只算「下檔波動」(虧損時的波動),更貼近實際痛感。",
      },
      {
        zh: "報酬回撤比",
        en: "Calmar",
        desc: "年化報酬 ÷ 最大回撤。每承受一單位最大回撤換得多少年化報酬。",
        judge: "> 1 健康。",
      },
    ],
  },
  {
    title: "交易品質",
    terms: [
      {
        zh: "勝率",
        en: "Win Rate",
        desc: "賺錢交易筆數佔總筆數的比例。",
        judge: "★單看會騙人。必須配「盈虧比 + 期望值」一起看。",
      },
      {
        zh: "盈虧比",
        en: "Payoff",
        desc: "平均每筆獲利 ÷ 平均每筆虧損。賺的比賠的大幾倍。",
      },
      {
        zh: "期望值",
        en: "Expectancy",
        desc: "每筆交易平均賺賠 = 勝率×均賺 − 敗率×均賠。是勝率的最終裁判。",
        judge: "扣成本後 > 0 才是會賺的策略;低勝率+高盈虧比仍可正期望。",
      },
      {
        zh: "獲利因子",
        en: "Profit Factor",
        desc: "總獲利 ÷ 總虧損。",
        judge: "> 1.5 較健康。",
      },
    ],
  },
  {
    title: "驗證(防過擬合)",
    terms: [
      {
        zh: "樣本內 / 樣本外",
        en: "IS / OOS",
        desc: "樣本內(In-Sample)用來調參數;樣本外(Out-of-Sample)用來驗證,是策略沒看過的資料。線圖上灰=樣本內、綠=樣本外。",
        judge: "樣本外不崩,策略才算真的有效(不是只擬合了歷史)。",
      },
      {
        zh: "樣本外效率",
        en: "WFE / Walk-Forward Efficiency",
        desc: "Walk-Forward 中,樣本外年化 ÷ 樣本內年化。出場後績效還剩多少。",
        judge: "> 0.5 較可信;< 0.3 多半是過度擬合。",
      },
      {
        zh: "樣本外衰退",
        en: "OOS Decay",
        desc: "樣本外相對樣本內的績效衰退幅度。",
        judge: "< 30% 才算穩健。",
      },
      {
        zh: "參數敏感度",
        en: "Parameter Sensitivity",
        desc: "微調參數時績效的變化。對參數「鈍感」(各值績效接近)代表抓到真 edge。",
        judge: "劇烈跳動 = 可能只是擬合雜訊,實盤易失效。",
      },
    ],
  },
  {
    title: "對照基準",
    terms: [
      {
        zh: "買進持有",
        en: "Buy & Hold",
        desc: "什麼都不做、單純買進並一直抱著的報酬,當作策略的對照基準(benchmark)。",
        judge: "策略沒贏過買進持有 → 不如直接抱 ETF。",
      },
    ],
  },
];

export function Glossary() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        📖 術語說明
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-lg my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card rounded-t-lg">
              <h2 className="font-semibold">術語說明</h2>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => setOpen(false)}
                aria-label="關閉"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-6">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <div className="text-xs uppercase text-muted-foreground mb-2">
                    {g.title}
                  </div>
                  <div className="space-y-3">
                    {g.terms.map((t) => (
                      <div
                        key={t.zh}
                        className="border-l-2 border-primary/50 pl-3"
                      >
                        <div className="text-sm font-medium">
                          {t.zh}
                          {t.en && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              {t.en}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {t.desc}
                        </div>
                        {t.judge && (
                          <div className="text-xs text-amber-400/90 mt-1">
                            判讀:{t.judge}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
