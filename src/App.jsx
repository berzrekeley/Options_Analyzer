import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { useLocalStorage }  from './hooks/useLocalStorage.js';
import { useKeyboard }      from './hooks/useKeyboard.js';
import { useMarketData }    from './hooks/useMarketData.js';

import { calculateGreeks, getExpectedMove, getAvailableExpirations } from './lib/blackScholes.js';
import { fmt } from './lib/format.js';

import { Header }          from './components/Header.jsx';
import { MarketSummary }   from './components/MarketSummary.jsx';
import { ContractConfig }  from './components/ContractConfig.jsx';
import { GreeksGrid }      from './components/GreeksGrid.jsx';
import { BellCurveChart }  from './components/BellCurveChart.jsx';
import { ChainMatrix }     from './components/ChainMatrix.jsx';
import { StrategyOutlook } from './components/StrategyOutlook.jsx';
import { StrategyBuilder } from './components/StrategyBuilder.jsx';
import { PayoffDiagram }   from './components/PayoffDiagram.jsx';
import { IVHistoryChart }  from './components/IVHistoryChart.jsx';
import { CommandPalette }  from './components/CommandPalette.jsx';
import { KeyboardHints }   from './components/KeyboardHints.jsx';

// ── App ──────────────────────────────────────────────────

const App = () => {
  // Persistent state
  const [ticker,     setTicker]     = useLocalStorage('ot:ticker',  'AAPL');
  const [activeTab,  setActiveTab]  = useLocalStorage('ot:tab',     'dashboard');
  const [optionType, setOptionType] = useLocalStorage('ot:optType', 'put');

  // Session state
  const [strikePrice,  setStrikePrice]  = useState(null);   // null = auto 5% OTM
  const [selectedDte,  setSelectedDte]  = useState(45);
  const [matrixType,   setMatrixType]   = useState('put');
  const [legs,         setLegs]         = useState([]);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [hintsOpen,    setHintsOpen]    = useState(false);

  // Market data
  const { quote, options, history, intraday, riskFreeRate, hv30, hvHistory, iv, ivRank, isLoading, error, isStale, isDemo, refresh } = useMarketData(ticker);

  // Keyboard shortcuts
  useKeyboard(useMemo(() => ({
    'p':     () => setOptionType('put'),
    'c':     () => setOptionType('call'),
    '1':     () => setActiveTab('dashboard'),
    '2':     () => setActiveTab('matrix'),
    '3':     () => setActiveTab('strategy'),
    '/':     (e) => { e.preventDefault(); setCmdOpen(true); },
    'mod+k': (e) => { e.preventDefault(); setCmdOpen(true); },
    '?':     () => setHintsOpen(h => !h),
  }), [setOptionType, setActiveTab]));

  // Derived
  const S  = quote?.price ?? 185.92;
  const IV = iv           ?? 0.22;
  const r  = riskFreeRate ?? 0.045;

  const effectiveStrike = strikePrice ?? Math.round(S * (optionType === 'put' ? 0.95 : 1.05));
  const T = selectedDte / 365;

  const greeks = useMemo(
    () => calculateGreeks(S, effectiveStrike, T, r, IV, optionType),
    [S, effectiveStrike, T, r, IV, optionType]
  );
  const expectedMove   = useMemo(() => getExpectedMove(S, IV, T),       [S, IV, T]);
  const expectedMove15 = useMemo(() => 1.5 * getExpectedMove(S, IV, T), [S, IV, T]);

  // Available expirations: prefer real chain, fallback to local Friday finder
  const availableExpirations = useMemo(() => {
    if (options?.expirationDates?.length > 0) {
      return options.expirationDates.slice(0, 12).map(unix => {
        const d = new Date(unix * 1000);
        const dte = Math.round((d - new Date()) / 86_400_000);
        return {
          dte,
          formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          iso: d.toISOString().split('T')[0],
          unix,
        };
      }).filter(e => e.dte >= 0);
    }
    return getAvailableExpirations(7, 90);
  }, [options]);

  const currentExpiry = availableExpirations.find(e => e.dte === selectedDte) ?? availableExpirations[0];

  // Handle ticker search — clear cache so new ticker always fetches fresh
  const handleSearch = useCallback((t) => {
    const sym = t.toUpperCase();
    try {
      ['quote', 'options', 'intraday'].forEach(k =>
        localStorage.removeItem(`ot:${k}:${sym}`)
      );
    } catch {}
    setTicker(sym);
    setStrikePrice(null);
    setLegs([]);
  }, [setTicker]);

  return (
    <div className="min-h-screen bg-[#08080c] grid-lines font-sans">
      <div className="max-w-7xl mx-auto p-3 md:p-5 space-y-3">

        <Header
          ticker={ticker}
          quote={quote}
          isLoading={isLoading}
          isStale={isStale}
          isDemo={isDemo}
          onSearch={handleSearch}
          onCommandOpen={() => setCmdOpen(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <MarketSummary
          quote={quote}
          iv={IV}
          hv30={hv30}
          ivRank={ivRank}
          intraday={intraday}
          isLoading={isLoading}
          onRefresh={refresh}
        />

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={refresh} className="flex items-center gap-1.5 text-xs hover:text-rose-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── Tab content with Framer Motion transitions ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-3"
            >
              {/* Left column */}
              <div className="space-y-3">
                <ContractConfig
                  optionType={optionType}
                  setOptionType={setOptionType}
                  strikePrice={strikePrice}
                  setStrikePrice={setStrikePrice}
                  selectedDte={selectedDte}
                  setSelectedDte={setSelectedDte}
                  availableExpirations={availableExpirations}
                  spotPrice={S}
                />
                <StrategyOutlook ivRank={ivRank} dte={selectedDte} />
              </div>

              {/* Right columns */}
              <div className="lg:col-span-2 space-y-3">
                <GreeksGrid
                  greeks={greeks}
                  expectedMove={expectedMove}
                  expectedMove15={expectedMove15}
                  spotPrice={S}
                  strikePrice={effectiveStrike}
                  dte={selectedDte}
                  iv={IV}
                  riskFreeRate={r}
                  optionType={optionType}
                  isLoading={isLoading}
                />
                <BellCurveChart
                  spotPrice={S}
                  expectedMove={expectedMove}
                  expectedMove15={expectedMove15}
                  strikePrice={effectiveStrike}
                  expirationLabel={currentExpiry?.formatted}
                  optionType={optionType}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'matrix' && (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ChainMatrix
                ticker={ticker}
                spotPrice={S}
                iv={IV}
                riskFreeRate={r}
                matrixType={matrixType}
                onMatrixTypeChange={setMatrixType}
                isLoading={isLoading}
                optionsData={options}
              />
            </motion.div>
          )}

          {activeTab === 'strategy' && (
            <motion.div
              key="strategy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              <div className="space-y-3">
                <StrategyBuilder
                  legs={legs}
                  setLegs={setLegs}
                  spotPrice={S}
                  selectedDte={selectedDte}
                  iv={IV}
                  riskFreeRate={r}
                />
                <IVHistoryChart
                  hvHistory={hvHistory}
                  currentIV={IV}
                  isLoading={isLoading}
                />
              </div>
              <PayoffDiagram
                legs={legs}
                spotPrice={S}
                selectedDte={selectedDte}
                iv={IV}
                riskFreeRate={r}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hint */}
        <div className="text-center py-2">
          <button
            onClick={() => setHintsOpen(true)}
            className="text-[9px] text-slate-700 hover:text-slate-600 transition-colors mono"
          >
            Press ? for keyboard shortcuts
          </button>
        </div>

      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelect={handleSearch}
        currentTicker={ticker}
      />
      <KeyboardHints
        open={hintsOpen}
        onClose={() => setHintsOpen(false)}
      />
    </div>
  );
};

export default App;
