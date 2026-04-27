"""预算影响分析模块 - HEOR Modeling Platform"""

import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class TreatmentMix:
    """治疗方案组合"""
    name: str = ""
    market_share: float = 0.0
    annual_cost: float = 0.0
    efficacy: float = 0.0
    adverse_event_cost: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "name": self.name, "market_share": self.market_share,
            "annual_cost": self.annual_cost, "efficacy": self.efficacy,
            "adverse_event_cost": self.adverse_event_cost
        }


@dataclass
class BudgetImpactResult:
    """预算影响结果"""
    year: int = 0
    total_patients: int = 0
    total_cost: float = 0
    cost_by_treatment: Dict[str, float] = field(default_factory=dict)
    incremental_cost: float = 0
    per_patient_cost: float = 0


class BudgetImpactModel:
    """预算影响分析模型"""

    def __init__(self):
        self.population_size: int = 100000
        self.incidence_rate: float = 0.01
        self.prevalence_rate: float = 0.05
        self.horizon_years: int = 5
        self.discount_rate: float = 0.03
        self.population_growth: float = 0.01
        self.treatments: Dict[str, TreatmentMix] = {}
        self.baseline_treatments: Dict[str, TreatmentMix] = {}
        self.new_treatment: Optional[TreatmentMix] = None

    def set_population(self, size: int, incidence: float = 0.01,
                       prevalence: float = 0.05, growth: float = 0.01) -> None:
        self.population_size = size
        self.incidence_rate = incidence
        self.prevalence_rate = prevalence
        self.population_growth = growth

    def set_horizon(self, years: int, discount_rate: float = 0.03) -> None:
        self.horizon_years = years
        self.discount_rate = discount_rate

    def add_baseline_treatment(self, name: str, market_share: float,
                               annual_cost: float, efficacy: float = 1.0,
                               adverse_event_cost: float = 0) -> TreatmentMix:
        treatment = TreatmentMix(
            name=name, market_share=market_share,
            annual_cost=annual_cost, efficacy=efficacy,
            adverse_event_cost=adverse_event_cost
        )
        self.baseline_treatments[name] = treatment
        return treatment

    def set_new_treatment(self, name: str, market_share: float,
                          annual_cost: float, efficacy: float = 1.0,
                          adverse_event_cost: float = 0) -> TreatmentMix:
        self.new_treatment = TreatmentMix(
            name=name, market_share=market_share,
            annual_cost=annual_cost, efficacy=efficacy,
            adverse_event_cost=adverse_event_cost
        )
        return self.new_treatment

    def _get_patient_count(self, year: int) -> int:
        """计算某年患者数"""
        growth = (1 + self.population_growth) ** year
        return int(self.population_size * self.prevalence_rate * growth)

    def _baseline_scenario(self, year: int) -> Dict[str, float]:
        """基线情景"""
        n_patients = self._get_patient_count(year)
        costs = {}
        for name, t in self.baseline_treatments.items():
            n_treated = int(n_patients * t.market_share)
            costs[name] = n_treated * (t.annual_cost + t.adverse_event_cost)
        return costs

    def _new_scenario(self, year: int) -> Dict[str, float]:
        """新方案情景"""
        n_patients = self._get_patient_count(year)
        costs = {}
        # 调整市场占有率
        for name, t in self.baseline_treatments.items():
            adjusted_share = t.market_share * (1 - (self.new_treatment.market_share if self.new_treatment else 0))
            n_treated = int(n_patients * adjusted_share)
            costs[name] = n_treated * (t.annual_cost + t.adverse_event_cost)
        if self.new_treatment:
            n_new = int(n_patients * self.new_treatment.market_share)
            costs[self.new_treatment.name] = n_new * (self.new_treatment.annual_cost + self.new_treatment.adverse_event_cost)
        return costs

    def analyze(self) -> List[Dict]:
        """执行预算影响分析"""
        results = []
        baseline_total = 0
        new_total = 0

        for year in range(1, self.horizon_years + 1):
            discount = 1 / (1 + self.discount_rate) ** year
            baseline_costs = self._baseline_scenario(year)
            new_costs = self._new_scenario(year)
            baseline_year_total = sum(baseline_costs.values()) * discount
            new_year_total = sum(new_costs.values()) * discount
            incremental = new_year_total - baseline_year_total
            n_patients = self._get_patient_count(year)
            baseline_total += baseline_year_total
            new_total += new_year_total
            results.append({
                "year": year,
                "patients": n_patients,
                "baseline_cost": round(baseline_year_total, 2),
                "new_scenario_cost": round(new_year_total, 2),
                "incremental_cost": round(incremental, 2),
                "cumulative_incremental": round(new_total - baseline_total, 2),
                "per_patient_incremental": round(incremental / max(n_patients, 1), 2),
                "baseline_breakdown": {k: round(v * discount, 2) for k, v in baseline_costs.items()},
                "new_breakdown": {k: round(v * discount, 2) for k, v in new_costs.items()}
            })

        return results

    def summarize(self) -> Dict:
        results = self.analyze()
        total_incremental = sum(r["incremental_cost"] for r in results)
        total_patients = sum(r["patients"] for r in results)
        return {
            "horizon_years": self.horizon_years,
            "total_incremental_cost": round(total_incremental, 2),
            "total_patients": total_patients,
            "avg_per_patient_impact": round(total_incremental / max(total_patients, 1), 2),
            "new_treatment": self.new_treatment.name if self.new_treatment else None,
            "yearly_results": results
        }

    def sensitivity_on_market_share(self, shares: List[float]) -> List[Dict]:
        """市场占有率敏感性分析"""
        if not self.new_treatment:
            return []
        original_share = self.new_treatment.market_share
        results = []
        for share in shares:
            self.new_treatment.market_share = share
            summary = self.summarize()
            results.append({
                "market_share": share,
                "total_incremental_cost": summary["total_incremental_cost"],
                "per_patient_impact": summary["avg_per_patient_impact"]
            })
        self.new_treatment.market_share = original_share
        return results
