'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function LegendSwatch({ className, children }: { className: string; children?: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] h-5 rounded text-[10px] font-semibold text-white ${className}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  swatch,
  children,
}: {
  title: string;
  swatch?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        {swatch}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground pl-[0.1rem]">{children}</div>
    </section>
  );
}

function InsightCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <h4 className="font-semibold text-sm text-amber-500">{title}</h4>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export default function ChartLegendDrawer({ isOpen, onClose }: Props) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">Reading the Price Chart</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 pb-8 px-4">
          <p className="text-sm text-muted-foreground">
            A guide to every element on the chart — candles, bars, lines, and markers — plus a few
            non-obvious tips about how to read them together.
          </p>

          <Section title="Overlays button — how to use it">
            The <b className="text-foreground">Overlays</b> button (top right of this chart) opens a
            side panel where you can turn indicators on and off. Because the list is growing, we
            keep it out of the main header — pick what you want, hit{' '}
            <b className="text-foreground">Apply</b>, and the chart redraws once.
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <b className="text-foreground">Apply</b> — commits your selection to the chart.
              </li>
              <li>
                <b className="text-foreground">Reset</b> — throws away unsaved changes and snaps
                back to what&apos;s currently drawn.
              </li>
              <li>
                <b className="text-foreground">Clear all</b> — unchecks every overlay. Good shortcut
                to go back to a clean candlestick view.
              </li>
            </ul>
            The count badge on the button (e.g. <span className="font-mono">Overlays 3</span>) shows
            how many are currently active at a glance.
          </Section>

          <Section
            title="Candlesticks"
            swatch={
              <span className="inline-flex gap-1">
                <span className="block w-2.5 h-4 bg-green-600 rounded-sm" />
                <span className="block w-2.5 h-4 bg-red-600 rounded-sm" />
              </span>
            }
          >
            Each candle summarises price movement in one interval (e.g. 5 min or 1 day depending on
            the timeframe).
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <b className="text-foreground">Body</b> = range between open and close.
              </li>
              <li>
                <b className="text-foreground">Wicks</b> (thin lines above/below) = intraday high
                and low.
              </li>
              <li>
                <b className="text-green-600">Green</b> candle: close &gt; open (price went up).
              </li>
              <li>
                <b className="text-red-600">Red</b> candle: close &lt; open (price went down).
              </li>
            </ul>
            <p className="mt-2">
              <b className="text-foreground">Shapes worth noticing:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-foreground">Long body, tiny wicks</b> — strong directional move
                with conviction (marubozu).
              </li>
              <li>
                <b className="text-foreground">Tiny body, long wicks</b> — indecision; buyers and
                sellers fought to a draw (doji).
              </li>
              <li>
                <b className="text-foreground">Long lower wick</b> — sellers pushed price down but
                buyers rejected it (possible bottom).
              </li>
              <li>
                <b className="text-foreground">Long upper wick</b> — buyers pushed up but were
                rejected (possible top).
              </li>
            </ul>
          </Section>

          <Section
            title="Volume bars"
            swatch={
              <span className="inline-flex gap-0.5 items-end">
                <span className="block w-1.5 h-2 bg-green-600 rounded-sm" />
                <span className="block w-1.5 h-3 bg-red-600 rounded-sm" />
                <span className="block w-1.5 h-4 bg-green-600 rounded-sm" />
              </span>
            }
          >
            The bottom pane shows how many shares traded during each interval. Taller bar = more
            participation. Bar colour matches whether that interval closed higher (green) or lower
            (red) than the previous close.
            <p className="mt-2">
              <b className="text-foreground">The key principle:</b> volume confirms price. A big
              candle on heavy volume reflects real conviction; the same-size candle on thin volume
              is often noise and tends to retrace. A price breakout above 52W high on low volume is
              especially suspect.
            </p>
            <p className="mt-2 text-xs italic">
              Note: a candle&apos;s colour compares close vs. open, while the volume bar&apos;s
              colour compares close vs. previous close — so they can mismatch (green candle with a
              red volume bar, etc.). That&apos;s expected.
            </p>
          </Section>

          <Section
            title="52-week high / low"
            swatch={
              <span className="inline-flex flex-col gap-1">
                <span className="block w-7 border-t border-dashed border-green-600" />
                <span className="block w-7 border-t border-dashed border-red-700" />
              </span>
            }
          >
            Dashed horizontal lines marking the highest and lowest price over the past year. Useful
            context for whether the current price is near a yearly extreme — a common reference
            point for breakouts and support. Price approaching 52W high on strong volume is a
            bullish continuation signal; tagging it repeatedly and failing can mark a top.
          </Section>

          <Section
            title="Day H/L — current session high &amp; low"
            swatch={
              <span className="inline-flex flex-col gap-1">
                <span className="block w-7 border-t border-emerald-500" />
                <span className="block w-7 border-t border-rose-500" />
              </span>
            }
          >
            Solid horizontal lines marking the highest and lowest price hit so far in the current
            trading session. Toggle it on via the <b className="text-emerald-500">Day H/L</b> button
            — the button itself shows the live values, and the lines on the chart carry the same
            labels so you always know exactly where today&apos;s extremes sit.
            <p className="mt-2">
              Useful for spotting intraday support/resistance. If price is repeatedly tagging the
              day high and failing, buyers are exhausted; a clean break above it with volume is a
              strong continuation signal. Same logic mirrored for the day low.
            </p>
            <p className="mt-2 text-xs italic">
              These are distinct from the 52-week lines (which are dashed and span the year) — think
              of Day H/L as zoomed-in, short-term reference, while 52W is long-term context.
            </p>
          </Section>

          <Section
            title="Support / Resistance — auto-detected pivot levels"
            swatch={
              <span className="inline-flex flex-col gap-1">
                <span className="block w-7 border-t border-green-500" />
                <span className="block w-7 border-t border-dashed border-red-500" />
              </span>
            }
          >
            <p>
              Horizontal lines drawn at price levels where the stock has paused, bounced, or
              reversed multiple times in the past. Built in three steps:
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>
                <b className="text-foreground">Find pivots</b> — every local high or low (a bar
                whose high/low beats the surrounding ±5 bars).
              </li>
              <li>
                <b className="text-foreground">Cluster</b> nearby pivots that sit within ~0.5% of
                each other. Each cluster becomes one line, drawn at the cluster&apos;s mean price.
              </li>
              <li>
                <b className="text-foreground">Rank by touches</b> — the more pivots in a cluster,
                the stronger the level. We keep the top ~8 strongest.
              </li>
            </ol>
            <p className="mt-3">
              <b className="text-foreground">How to read the lines:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-green-500">Green (S · ₹X)</b> — a support level currently
                <em>below</em> price.
              </li>
              <li>
                <b className="text-red-500">Red (R · ₹X)</b> — a resistance level currently
                <em>above</em> price.
              </li>
              <li>
                <b className="text-foreground">Solid line</b> — the level has held in its current
                role; price has not decisively closed through it from the other side.
              </li>
              <li>
                <b className="text-foreground">Dashed line (S* / R*)</b> — <b>role-reversed</b>:
                price has previously traded on the opposite side for ≥ 2 consecutive closes. Old
                support that broke and is now resistance (or vice versa).
              </li>
              <li>
                <b className="text-foreground">Line thickness</b> scales with the touch count shown
                in the label (<span className="font-mono">·&nbsp;4×</span> = 4 pivots in the
                cluster).
              </li>
            </ul>
            <p className="mt-3">
              <b className="text-foreground">Insights you can pull out:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-foreground">Bounce setup</b> — price approaching a strong solid
                support with shrinking selling volume often produces a bounce. The more touches, the
                more &ldquo;respected&rdquo; the level.
              </li>
              <li>
                <b className="text-foreground">Breakout target</b> — once price clears a strong
                resistance, the next resistance line above is the natural first target. Stack of
                unbroken resistances = stairstep targets.
              </li>
              <li>
                <b className="text-foreground">Role-reversal retest</b> — a dashed line being
                retested from its new side (e.g. broken support, now retesting from above as
                resistance) is one of the highest-quality setups in technical analysis. Reject =
                continuation in the breakout direction; reclaim = breakout was a fakeout.
              </li>
              <li>
                <b className="text-foreground">No-trade zones</b> — when price is sitting between
                two close-by levels with no clear breakout, you&apos;re in chop. Wait for a
                definitive break before acting.
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              Detection is purely mechanical (no &ldquo;chart pattern&rdquo; opinions involved).
              Works best on 3M / 1Y views where there are enough bars to find recurring touches; on
              1D you&apos;ll typically see only 1–2 lines, if any.
            </p>
          </Section>

          <Section
            title="Event flags"
            swatch={
              <span className="inline-flex gap-1">
                <LegendSwatch className="bg-sky-500 rounded-full">D</LegendSwatch>
                <LegendSwatch className="bg-orange-500">S</LegendSwatch>
                <LegendSwatch className="bg-purple-500">E</LegendSwatch>
              </span>
            }
          >
            Pinned to the price line, these mark corporate events:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <b className="text-sky-500">D</b> — Dividend paid. Flag is placed on the ex-date;
                hover to see the amount per share.
              </li>
              <li>
                <b className="text-orange-500">S</b> — Stock split (e.g. 5:1). Prices before the
                flag are adjusted for the split, so the chart stays continuous.
              </li>
              <li>
                <b className="text-purple-500">E</b> — Earnings release date. Large gaps or volume
                spikes around this flag usually reflect the market reacting to results.
              </li>
            </ul>
          </Section>

          <Section
            title="SMA 20 — Simple Moving Average, 20 periods"
            swatch={<span className="block w-6 h-0.5 bg-amber-500" />}
          >
            The average closing price over the last 20 intervals, plotted as a line. Smooths out
            noise to show short-term trend direction. Price crossing above/below the SMA 20 is often
            read as a short-term momentum shift.
          </Section>

          <Section
            title="SMA 50 — Simple Moving Average, 50 periods"
            swatch={<span className="block w-6 h-0.5 bg-violet-500" />}
          >
            Same idea as SMA 20 but averaged over 50 intervals. Represents the medium-term trend.
            When SMA 20 crosses above SMA 50 it&apos;s a classic &ldquo;golden cross&rdquo;
            (bullish); the reverse is a &ldquo;death cross&rdquo; (bearish).
          </Section>

          <Section
            title="EMA 9 / 21 / 50 — Exponential Moving Averages"
            swatch={
              <span className="inline-flex flex-col gap-1">
                <span className="block w-6 h-0.5 bg-pink-400" />
                <span className="block w-6 h-0.5 bg-indigo-400" />
                <span className="block w-6 h-0.5 bg-fuchsia-400" />
              </span>
            }
          >
            <p>
              Same goal as SMA — smooth out price to see the underlying trend — but EMA weighs
              recent bars more heavily so it reacts faster to new price action.
            </p>
            <p className="mt-2">
              Formula:{' '}
              <span className="font-mono text-xs">EMA = α · close + (1 − α) · prev_EMA</span>, where{' '}
              <span className="font-mono text-xs">α = 2 / (N + 1)</span>. Larger N = more smoothing,
              slower reaction.
            </p>
            <p className="mt-3">
              <b className="text-foreground">What each one is good for:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-pink-400">EMA 9</b> — hugs price closely. Day-traders use it for
                tight stops and quick entry confirmation. If price keeps closing above EMA 9,
                short-term momentum is bullish.
              </li>
              <li>
                <b className="text-indigo-400">EMA 21</b> — the classic &ldquo;trend filter&rdquo;.
                Price above EMA 21 + EMA 21 rising = healthy uptrend; below + falling = downtrend.
                Many swing setups require price to pull back to EMA 21 before entering.
              </li>
              <li>
                <b className="text-fuchsia-400">EMA 50</b> — broader trend. Institutions often treat
                it as dynamic support/resistance. A clean break through EMA 50 after a long
                consolidation is a common trend-change alert.
              </li>
            </ul>
            <p className="mt-3">
              <b className="text-foreground">Insight you can pull out:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-foreground">Alignment</b> — when EMA 9 &gt; EMA 21 &gt; EMA 50
                and all rising, the stock is in a strong uptrend; reverse order and falling = strong
                downtrend. Mixed / weaving = no trend, don&apos;t force trades.
              </li>
              <li>
                <b className="text-foreground">EMA 9 / 21 cross</b> — the faster line crossing the
                slower is an early momentum signal (earlier than SMA 20 / 50&apos;s golden cross,
                but noisier).
              </li>
              <li>
                <b className="text-foreground">Slope matters</b> — a flat EMA means the trend is
                fading even if price is above it.
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              Trade-off: EMA reacts quickly and catches turns early, but the same speed means more
              whipsaws in sideways markets. Pair it with volume or Bollinger Bands to filter out
              noise.
            </p>
          </Section>

          <Section
            title="Bollinger Bands (20, 2σ) — volatility envelope"
            swatch={<span className="block w-6 h-0.5 bg-teal-400 opacity-80" />}
          >
            <p>
              A shaded band around price showing how volatile the stock has been recently. The
              middle reference is a 20-period SMA; the upper and lower band are{' '}
              <span className="font-mono text-xs">±2</span> standard deviations from that mean,
              computed over the same 20 bars.
            </p>
            <p className="mt-2">
              Statistically, price stays inside the bands ~95% of the time — so tagging the band is
              a rare event by construction.
            </p>
            <p className="mt-3">
              <b className="text-foreground">How to read it for insight:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-foreground">Squeeze</b> — when the band becomes very narrow,
                volatility has collapsed. Often a precursor to a sharp move (direction unknown);
                watch for the breakout candle on volume.
              </li>
              <li>
                <b className="text-foreground">Expansion</b> — bands spreading apart signals a real
                trend is underway. You typically want to <em>ride</em> this, not fade it.
              </li>
              <li>
                <b className="text-foreground">Walking the band</b> — in a strong trend, price will
                ride along the upper (or lower) band for many candles. This is strength, not
                &ldquo;overbought&rdquo; — don&apos;t short a stock just because it&apos;s touching
                the upper band.
              </li>
              <li>
                <b className="text-foreground">Mean reversion</b> — in sideways markets, price tends
                to oscillate between the bands and back to the middle SMA. Useful for fading moves
                when there&apos;s no clear trend.
              </li>
              <li>
                <b className="text-foreground">Double bottom / top into a band</b> — two tests of
                the lower band that hold = classic reversal setup (and vice versa on the upper).
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              Bands tell you <em>how volatile</em>, not <em>which direction</em>. Always combine
              with price action (candle patterns) or a trend filter (EMA) before acting.
            </p>
          </Section>

          <Section
            title="Volume SMA 20 — average trading activity"
            swatch={<span className="block w-6 h-0.5 bg-sky-400" />}
          >
            <p>
              A 20-bar average of volume, drawn as a line on the volume pane. It gives you a
              baseline for &ldquo;typical&rdquo; activity so you can instantly tell whether a given
              bar is unusually loud or quiet.
            </p>
            <p className="mt-3">
              <b className="text-foreground">What to look for:</b>
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <b className="text-foreground">Volume bar &gt; 1.5-2× the line</b> — meaningful
                spike. Combined with a strong candle (big body, small wicks), this is often a real
                institutional move.
              </li>
              <li>
                <b className="text-foreground">Volume bar below the line</b> — participation is
                thin. Price moves on low volume are easier to reverse and generally less
                trustworthy.
              </li>
              <li>
                <b className="text-foreground">Breakout confirmation</b> — a candle clearing 52W
                high <em>and</em> its volume bar towering over Volume SMA 20 = high-conviction
                breakout. Same candle on average volume = suspect.
              </li>
              <li>
                <b className="text-foreground">Climax volume</b> — a volume bar 3×+ the line at the
                end of an extended move often marks exhaustion (buying or selling climax).
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              The line gives you context — the same 50-lakh-share bar is huge for a small-cap and
              tiny for a mega-cap. That&apos;s why comparing to the stock&apos;s own recent average
              is more useful than an absolute number.
            </p>
          </Section>

          <InsightCallout title="Why SMA 20 looks longer than SMA 50">
            An N-period moving average can&apos;t produce a value until it has seen N bars of data —
            so the longer the lookback, the later the line starts.
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-border rounded">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Overlay</th>
                    <th className="text-left px-3 py-2 font-semibold">First point after</th>
                    <th className="text-left px-3 py-2 font-semibold">On a 1D chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2">
                      <span className="text-amber-500 font-medium">SMA 20</span>
                    </td>
                    <td className="px-3 py-2">20 bars</td>
                    <td className="px-3 py-2">~10:55 IST (55 bars visible)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <span className="text-violet-500 font-medium">SMA 50</span>
                    </td>
                    <td className="px-3 py-2">50 bars</td>
                    <td className="px-3 py-2">~13:25 IST (25 bars visible)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <span className="text-cyan-500 font-medium">VWAP</span>
                    </td>
                    <td className="px-3 py-2">1 bar, resets daily</td>
                    <td className="px-3 py-2">Full trading day</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              On a single trading day&apos;s 5-minute candles (75 bars total), SMA 50 only has ~25
              bars of meaningful output — which is why it looks like it &ldquo;starts late&rdquo;.
              On daily candles (1M/3M/1Y views), both SMAs span almost the entire chart because
              there are plenty of prior bars to work with.
            </p>
          </InsightCallout>

          <Section
            title="VWAP — Volume Weighted Average Price"
            swatch={<span className="block w-6 h-0.5 bg-cyan-500 border-t border-dashed" />}
          >
            Average price for the day, weighted by volume. Calculated as&nbsp;
            <span className="font-mono text-xs">Σ(typical price × volume) ÷ Σ(volume)</span>, where{' '}
            <span className="font-mono text-xs">typical = (high + low + close) / 3</span>. Resets at
            the start of each trading day.
            <p className="mt-2">
              Institutional traders treat VWAP as the fair-value benchmark for the session. Common
              intraday heuristic: buying below VWAP / selling above is &ldquo;better than
              average&rdquo; execution. Sustained trading above VWAP = bullish session; below =
              bearish.
            </p>
            <p className="mt-2 text-xs italic">
              Only meaningful on intraday timeframes, so the VWAP toggle is disabled on longer
              ranges.
            </p>
          </Section>

          <Section title="Navigator (mini-chart below)">
            The compact chart at the bottom is a zoom control. Drag its handles to focus on a
            sub-range within the fetched window — helpful on 3M/1Y views when you want to inspect a
            specific week without re-fetching data. The chart preserves its full data — you&apos;re
            just changing what&apos;s visible.
          </Section>

          <Section title="Interval tabs (1D / 1W / 1M / 3M / 1Y)">
            These change both the time range and the candle granularity:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <b className="text-foreground">1D</b> — latest trading day, 5-minute candles (~75
                bars in a full Indian session).
              </li>
              <li>
                <b className="text-foreground">1W</b> — last week, hourly candles.
              </li>
              <li>
                <b className="text-foreground">1M / 3M / 1Y</b> — daily candles over the chosen
                period.
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              All timestamps are shown in IST (Asia/Kolkata), regardless of where you&apos;re
              viewing from.
            </p>
          </Section>

          <InsightCallout title="A few extra reading tips">
            <ul className="list-disc pl-5 mt-1 space-y-2">
              <li>
                <b className="text-foreground">Gaps around earnings flags</b> usually reflect
                overnight reaction to results; the first full candle after is where real price
                discovery happens.
              </li>
              <li>
                <b className="text-foreground">A candle&apos;s body &ne; its total range.</b> Always
                look at the wicks — a small green body with a huge lower wick is a very different
                signal from a plain green candle.
              </li>
              <li>
                <b className="text-foreground">The navigator uses ordinal spacing</b> — weekends and
                overnight gaps are compressed, so consecutive trading sessions look continuous. Real
                wall-clock time is not linear across the x-axis.
              </li>
              <li>
                <b className="text-foreground">SMA crossovers</b> (golden/death cross) are much more
                meaningful on daily candles than intraday — on a 1D view you often don&apos;t have
                enough bars for SMA 50 to make sense.
              </li>
              <li>
                <b className="text-foreground">
                  VWAP is a session benchmark, not a trend indicator.
                </b>{' '}
                It tells you whether today&apos;s average participant is in profit or loss, not
                where the stock is headed longer-term.
              </li>
              <li>
                <b className="text-foreground">Squeeze + volume spike = setup alert.</b> Narrow
                Bollinger Bands plus a volume bar towering over Volume SMA 20 is one of the cleanest
                early-breakout signals. Direction still comes from price action.
              </li>
              <li>
                <b className="text-foreground">Stack your overlays, don&apos;t pile them.</b> Two or
                three well-chosen indicators (e.g. EMA 21 + Bollinger + Volume SMA) cover trend,
                volatility, and participation — adding more usually just clutters the chart without
                adding new information.
              </li>
            </ul>
          </InsightCallout>
        </div>
      </SheetContent>
    </Sheet>
  );
}
