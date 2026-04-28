Product Definition: Institutional Options Terminal

1. Product Vision

To provide retail and professional traders with a high-performance, institutional-grade options analysis tool that simplifies complex Black-Scholes modeling and volatility analysis into an intuitive, real-time interface.

2. Target Audience

Options Traders: Users looking for quick Greek calculations and "what-if" volatility scenarios.

Risk Managers: Individuals needing to visualize expected moves and probable price ranges.

Financial Analysts: Users requiring a dense, matrix-based view of option chains across multiple expirations.

3. Key Features & Functionality

Phase 1: Core Engine (Current State)

Black-Scholes Calculator: Real-time computation of Delta, Gamma, Theta, and Vega.

Volatility Suite: Display of IV Rank, Implied Volatility, and 30-Day Historical Volatility.

Visual Expected Move: A graphical "1-Standard Deviation" range chart showing the 68% probability zone.

Dynamic Matrix: A cross-sectional view of strikes and expirations to compare premium decay.

Phase 2: Enhanced Analysis (Planned)

Strategy Builder: Multi-leg spread support (Verticals, Iron Condors, Straddles).

P&L Visualizer: Interactive payoff diagrams at expiration and T+0.

Historical IV Backtesting: Comparison of current IV rank against 1-year historical percentiles.

4. Technical Stack

Frontend: React (State-driven UI).

Styles: Tailwind CSS for responsive, mobile-first design.

Data Layer: Integration with Gemini-2.5-Flash for synthetic market data generation and ticker lookup.

Mathematics: Pure JavaScript implementation of the Cumulative Normal Distribution and Black-Scholes Formula.

5. UI/UX Principles

Information Density: Maintain high data density without clutter (Institutional look).

Color Semantics: Consistent use of Emerald/Rose for bullish/bearish indicators and Indigo for primary system actions.

Performance: All heavy mathematical operations must be memoized to ensure 60fps UI responsiveness.

6. Success Metrics

Calculation Latency: < 50ms for Greek updates upon input change.

Accuracy: Parity with standard brokerage platforms (e.g., ThinkOrSwim, Tastytrade).

Engagement: Users utilizing the "Chain Matrix" to identify optimal premium selling opportunities.

Created by Gemini for the Options Terminal Project.