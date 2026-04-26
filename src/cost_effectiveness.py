"""成本效果分析模块 - HEOR Modeling Platform"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class CostEffectivenessResult:
    """成本效果分析结果"""
    strategy: str = ""
    total_cost: float = 0
    total_effectiveness: float = 0
    incremental_cost: float = 0
    incremental_effectiveness: float = 0
    icer: float = 0
    dominated: bool = False
    extended_dominated: bool = False
    cost_effective: bool = False


class CostEffectivenessAnalysis:
    """成本效果分析"""

    def __init__(self):
        self.strategies: Dict[str, Dict] = {}
        self.willingness_to_pay: float = 50000  # 元/QALY
        self.discount_rate: float = 0.03
        self.horizon_years: int = 10
        self.perspective: str = "healthcare"  # healthcare, societal

    def set_wtp(self, wtp: float) -> None:
        self.willingness_to_pay = wtp

    def add_strategy(self, name: str, cost: float, effectiveness: float,
                     costs_by_category: Optional[Dict] = None,
                     effects_by_category: Optional[Dict] = None) -> None:
        """添加策略"""
        self.strategies[name] = {
            "cost": cost, "effectiveness": effectiveness,
            "costs_by_category": costs_by_category or {},
            "effects_by_category": effects_by_category or {}
        }

    def _find_dominance(self, sorted_strategies: List[Tuple[str, Dict]]) -> Dict[str, str]:
        """查找优劣势"""
        dominance = {}
        for i, (name1, s1) in enumerate(sorted_strategies):
            for j, (name2, s2) in enumerate(sorted_strategies):
                if i >= j:
                    continue
                if s2["cost"] <= s1["cost"] and s2["effectiveness"] >= s1["effectiveness"]:
                    dominance[name1] = "dominated"
                elif s2["cost"] >= s1["cost"] and s2["effectiveness"] <= s1["effectiveness"]:
                    dominance[name2] = "dominated"
        return dominance

    def _check_extended_dominance(self, sorted_strategies: List[Tuple[str, Dict]]) -> Dict[str, bool]:
        """检查扩展优劣势"""
        result = {}
        for i in range(1, len(sorted_strategies) - 1):
            name = sorted_strategies[i][0]
            prev_name, prev = sorted_strategies[i - 1]
            next_name, next_s = sorted_strategies[i + 1]
            current = sorted_strategies[i][1]
            # 如果中间策略的ICER大于下一策略的ICER，则扩展劣势
            icer_current = (current["cost"] - prev["cost"]) / max(current["effectiveness"] - prev["effectiveness"], 0.001)
            icer_next = (next_s["cost"] - current["cost"]) / max(next_s["effectiveness"] - current["effectiveness"], 0.001)
            result[name] = icer_current > icer_next
        return result

    def analyze(self) -> List[CostEffectivenessResult]:
        """执行成本效果分析"""
        sorted_strategies = sorted(
            self.strategies.items(),
            key=lambda x: x[1]["effectiveness"]
        )
        dominance = self._find_dominance(sorted_strategies)
        extended = self._check_extended_dominance(sorted_strategies)

        results = []
        prev_cost = 0
        prev_effectiveness = 0

        for name, strategy in sorted_strategies:
            dominated = dominance.get(name) == "dominated"
            ext_dominated = extended.get(name, False)

            incremental_cost = strategy["cost"] - prev_cost
            incremental_eff = strategy["effectiveness"] - prev_effectiveness
            icer = incremental_cost / max(incremental_eff, 0.001) if incremental_eff > 0 else float('inf')

            cost_effective = icer <= self.willingness_to_pay and not dominated

            result = CostEffectivenessResult(
                strategy=name,
                total_cost=strategy["cost"],
                total_effectiveness=strategy["effectiveness"],
                incremental_cost=incremental_cost,
                incremental_effectiveness=incremental_eff,
                icer=icer,
                dominated=dominated,
                extended_dominated=ext_dominated,
                cost_effective=cost_effective
            )
            results.append(result)

            if not dominated and not ext_dominated:
                prev_cost = strategy["cost"]
                prev_effectiveness = strategy["effectiveness"]

        return results

    def icer_table(self) -> List[Dict]:
        """生成ICER表"""
        results = self.analyze()
        return [{
            "Strategy": r.strategy,
            "Total Cost": round(r.total_cost, 2),
            "Effectiveness": round(r.total_effectiveness, 4),
            "Incremental Cost": round(r.incremental_cost, 2),
            "Incremental Effectiveness": round(r.incremental_effectiveness, 4),
            "ICER": round(r.icer, 2) if r.icer != float('inf') else "N/A",
            "Dominated": "Yes" if r.dominated else "Extended" if r.extended_dominated else "No",
            "Cost-Effective": "Yes" if r.cost_effective else "No"
        } for r in results]

    def net_monetary_benefit(self, strategy_name: str, wtp: Optional[float] = None) -> float:
        """净货币效益"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return 0
        wtp = wtp or self.willingness_to_pay
        return wtp * strategy["effectiveness"] - strategy["cost"]

    def net_health_benefit(self, strategy_name: str, wtp: Optional[float] = None) -> float:
        """净健康效益"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return 0
        wtp = wtp or self.willingness_to_pay
        return strategy["effectiveness"] - strategy["cost"] / wtp

    def cost_effectiveness_acceptability(self, results_list: List[Dict],
                                          wtp_range: List[float]) -> List[Dict]:
        """成本效果可接受性"""
        cea_data = []
        for wtp in wtp_range:
            best_strategy = None
            best_nmb = float('-inf')
            for name, strategy in self.strategies.items():
                nmb = wtp * strategy["effectiveness"] - strategy["cost"]
                if nmb > best_nmb:
                    best_nmb = nmb
                    best_strategy = name
            cea_data.append({
                "wtp": wtp,
                "best_strategy": best_strategy,
                "net_monetary_benefit": best_nmb
            })
        return cea_data

    def summary(self) -> Dict:
        results = self.analyze()
        cost_effective = [r for r in results if r.cost_effective]
        return {
            "total_strategies": len(results),
            "cost_effective_strategies": [r.strategy for r in cost_effective],
            "willingness_to_pay": self.willingness_to_pay,
            "perspective": self.perspective,
            "discount_rate": self.discount_rate,
            "icer_table": self.icer_table()
        }
