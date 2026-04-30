# Options Expected Move and Premium Evaluation Guide

## 1. The Core Formulas
To determine how much a stock is expected to move by a specific expiration, use the following methods:

### The Mathematical Formula (1-Standard Deviation)
This formula calculates the expected price range with ~68% statistical confidence.

<div style="text-align:center; margin:1em 0; font-size:1.1em;">
<span class="math">EM = S &times; IV &times; &radic;(T / 365)</span>
</div>

* **S**: Current Stock Price
* **IV**: Implied Volatility (decimal)
* **T**: Days to Expiration (DTE)

### The Market-Price Method (The Straddle)
This uses actual market pricing to determine the move.

<div style="text-align:center; margin:1em 0; font-size:1.1em;">
<span class="math">EM &approx; (Price of ATM Call + Price of ATM Put) &times; 0.85</span>
</div>

### The "Rule of 16" (Daily Move)
A quick mental shortcut for the daily fluctuation.

<div style="text-align:center; margin:1em 0; font-size:1.1em;">
<span class="math">Daily Expected Move = (S &times; IV) / 16</span>
</div>

---

## 2. Premium Efficiency Ratio (The "Worth It" Test)
To evaluate if a **Cash Secured Put** or **Covered Call** provides enough compensation for the risk, calculate the **Premium Efficiency Ratio**.

### The Calculation
1. **Daily Income (DI)**: Premium / Days to Expiration
2. **Daily Move (DM)**: (Price &times; IV) / 16
3. **Ratio**: DI / DM

### Benchmarks for 0.30 Delta
| Ratio | Assessment | Action |
| :--- | :--- | :--- |
| **< 6%** | Underpriced Risk | Skip; reward doesn't justify the daily volatility. |
| **6% - 10%** | Fair Value | Standard for stable blue-chip income strategies. |
| **10% - 15%** | Rich Premium | Aggressive Sell; high compensation for the risk. |
| **> 15%** | Extreme / Warning | High value, but check for catalysts (Earnings/News). |

---

## 3. Implementation Logic for Automated Tools
For terminal or custom scripts, follow this logic:
1. **Fetch Data**: Get Price, IV, and Premium (at 0.30 Delta).
2. **Compute DM**: Apply the Rule of 16.
3. **Compute DI**: Divide premium by days remaining.
4. **Filter**: Highlight any ticker where the ratio exceeds **8.0%**.