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
            </ul>
          </InsightCallout>
        </div>
      </SheetContent>
    </Sheet>
  );
}
