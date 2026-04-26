"""
HEOR Modeling Platform — 成本-效果分析模块
支持CEA、CUA、ICER计算、净货币效益分析
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class AnalysisType(Enum):
    """分析类型"""
    CEA = "成本-效果分析"
    CUA = "成本-效用分析"
    CBA = "成本-效益分析"


class DominanceType(Enum):
    """优势类型"""
    DOMINANT = "绝对优势"  # 成本更低，效果更好
    DOMINATED = "绝对劣势"  # 成本更高，效果更差
    EXTENDED = "扩展优势"  # 成本更低，效果相当
    NON_DOMINATED = "非绝对优劣"  # 需要计算ICER


@dataclass
class Intervention:
    """干预方案"""
    name: str
    cost: float
    effect: float  # QALYs 或其他效果指标
    cost_components: Dict[str, float] = field(default_factory=dict)
    effect_components: Dict[str, float] = field(default_factory=dict)
    is_comparator: bool = False


@dataclass
class ICERResult:
    """ICER计算结果"""
    intervention: str
    comparator: str
    delta_cost: float
    delta_effect: float
    icer: float
    dominance: DominanceType
    interpretation: str


class CostEffectivenessAnalysis:
    """
    成本-效果分析
    
    支持功能：
    - 成本-效果分析（CEA）
    - 成本-效用分析（CUA）
    - ICER计算
    - 净货币效益（NMB）和净健康效益（NHB）
    - 增量分析
    - 优势判定
    
    示例：
        >>> cea = CostEffectivenessAnalysis(
        ...     analysis_type=AnalysisType.CUA,
        ...     wtp_threshold=31250
        ... )
        >>> cea.add_intervention("标准治疗", cost=50000, effect=8.5)
        >>> cea.add_intervention("新药A", cost=120000, effect=10.2)
        >>> results = cea.run()
    """
    
    def __init__(
        self,
        analysis_type: AnalysisType = AnalysisType.CUA,
        wtp_threshold: float = 31250,
        currency: str = "CNY",
        effect_unit: str = "QALY"
    ):
        self.analysis_type = analysis_type
        self.wtp_threshold = wtp_threshold
        self.currency = currency
        self.effect_unit = effect_unit
        self.interventions: Dict[str, Intervention] = {}
        self._results = None
    
    def add_intervention(
        self,
        name: str,
        cost: float,
        effect: float,
        cost_components: Optional[Dict[str, float]] = None,
        effect_components: Optional[Dict[str, float]] = None,
        is_comparator: bool = False
    ) -> None:
        """添加干预方案"""
        self.interventions[name] = Intervention(
            name=name,
            cost=cost,
            effect=effect,
            cost_components=cost_components or {},
            effect_components=effect_components or {},
            is_comparator=is_comparator
        )
        self._results = None
    
    def set_comparator(self, name: str) -> None:
        """设置对照方案"""
        if name not in self.interventions:
            raise ValueError(f"未知干预方案: {name}")
        for n, intervention in self.interventions.items():
            intervention.is_comparator = (n == name)
        self._results = None
    
    def _find_comparator(self) -> Optional[Intervention]:
        """查找对照方案"""
        for intervention in self.interventions.values():
            if intervention.is_comparator:
                return intervention
        return None
    
    def _calculate_dominance(self, intervention: Intervention, comparator: Intervention) -> DominanceType:
        """判定优势类型"""
        delta_cost = intervention.cost - comparator.cost
        delta_effect = intervention.effect - comparator.effect
        
        if delta_cost < 0 and delta_effect > 0:
            return DominanceType.DOMINANT
        elif delta_cost > 0 and delta_effect < 0:
            return DominanceType.DOMINATED
        elif delta_cost < 0 and abs(delta_effect) < 0.001:
            return DominanceType.EXTENDED
        else:
            return DominanceType.NON_DOMINATED
    
    def _calculate_icer(self, intervention: Intervention, comparator: Intervention) -> ICERResult:
        """计算ICER"""
        delta_cost = intervention.cost - comparator.cost
        delta_effect = intervention.effect - comparator.effect
        dominance = self._calculate_dominance(intervention, comparator)
        
        if dominance == DominanceType.DOMINANT:
            icer = None
            interpretation = f"{intervention.name}是绝对优势方案（成本更低，效果更好）"
        elif dominance == DominanceType.DOMINATED:
            icer = None
            interpretation = f"{intervention.name}是绝对劣势方案（成本更高，效果更差）"
        elif dominance == DominanceType.EXTENDED:
            icer = None
            interpretation = f"{intervention.name}具有扩展优势（成本更低，效果相当）"
        else:
            if abs(delta_effect) < 1e-10:
                icer = float('inf')
                interpretation = "效果差异极小，ICER接近无穷大"
            else:
                icer = delta_cost / delta_effect
                interpretation = self._interpret_icer(icer)
        
        return ICERResult(
            intervention=intervention.name,
            comparator=comparator.name,
            delta_cost=delta_cost,
            delta_effect=delta_effect,
            icer=icer,
            dominance=dominance,
            interpretation=interpretation
        )
    
    def _interpret_icer(self, icer: float) -> str:
        """解释ICER值"""
        if icer < 0:
            return "负ICER：干预方案具有绝对优势"
        elif icer <= self.wtp_threshold:
            return f"ICER ≤ 阈值({self.currency} {self.wtp_threshold:,.0f}/{self.effect_unit})：具有成本-效果"
        else:
            return f"ICER > 阈值({self.currency} {self.wtp_threshold:,.0f}/{self.effect_unit})：不具有成本-效果"
    
    def calculate_nmb(self, cost: float, effect: float) -> float:
        """计算净货币效益（Net Monetary Benefit）"""
        return self.wtp_threshold * effect - cost
    
    def calculate_nhb(self, cost: float, effect: float) -> float:
        """计算净健康效益（Net Health Benefit）"""
        return effect - cost / self.wtp_threshold
    
    def run(self) -> Dict:
        """
        运行成本-效果分析
        
        Returns:
            Dict: 分析结果
        """
        if len(self.interventions) < 2:
            raise ValueError("至少需要2个干预方案")
        
        comparator = self._find_comparator()
        if comparator is None:
            # 默认选择第一个作为对照
            first_key = list(self.interventions.keys())[0]
            self.interventions[first_key].is_comparator = True
            comparator = self.interventions[first_key]
        
        # 按效果排序
        sorted_interventions = sorted(
            self.interventions.values(),
            key=lambda x: x.effect
        )
        
        # 增量分析
        incremental_results = []
        for intervention in sorted_interventions:
            if intervention.name == comparator.name:
                continue
            icer_result = self._calculate_icer(intervention, comparator)
            incremental_results.append(icer_result)
        
        # 计算各方案的NMB和NHB
        nmb_results = {}
        nhb_results = {}
        for name, intervention in self.interventions.items():
            nmb_results[name] = self.calculate_nmb(intervention.cost, intervention.effect)
            nhb_results[name] = self.calculate_nhb(intervention.cost, intervention.effect)
        
        # 找出最优方案
        best_nmb = max(nmb_results, key=nmb_results.get)
        best_nhb = max(nhb_results, key=nhb_results.get)
        
        self._results = {
            "analysis_type": self.analysis_type.value,
            "wtp_threshold": self.wtp_threshold,
            "currency": self.currency,
            "effect_unit": self.effect_unit,
            "comparator": comparator.name,
            "interventions": {name: vars(iv) for name, iv in self.interventions.items()},
            "incremental_analysis": incremental_results,
            "nmb": nmb_results,
            "nhb": nhb_results,
            "best_by_nmb": best_nmb,
            "best_by_nhb": best_nhb,
            "ce_at_threshold": {
                name: nmb_results[name] >= 0
                for name in self.interventions
            }
        }
        
        return self._results
    
    def run_dsa(
        self,
        parameter: str,
        values: List[float],
        intervention_name: str
    ) -> List[Dict]:
        """
        单因素敏感性分析
        
        Args:
            parameter: 要变化的参数 ("cost" 或 "effect")
            values: 参数值列表
            intervention_name: 要分析的干预方案
            
        Returns:
            List[Dict]: 每个值的分析结果
        """
        if intervention_name not in self.interventions:
            raise ValueError(f"未知干预方案: {intervention_name}")
        
        original = self.interventions[intervention_name]
        original_cost = original.cost
        original_effect = original.effect
        
        dsa_results = []
        for value in values:
            if parameter == "cost":
                original.cost = value
            elif parameter == "effect":
                original.effect = value
            
            self._results = None
            result = self.run()
            dsa_results.append({
                "value": value,
                "nmb": result["nmb"][intervention_name],
                "nhb": result["nhb"][intervention_name],
                "is_cost_effective": result["ce_at_threshold"][intervention_name]
            })
        
        # 恢复原始值
        original.cost = original_cost
        original.effect = original_effect
        self._results = None
        
        return dsa_results
    
    def run_bia(
        self,
        target_population: int,
        adoption_rate: float,
        time_horizon: int,
        annual_growth_rate: float = 0.0
    ) -> Dict:
        """
        预算影响分析（BIA）
        
        Args:
            target_population: 目标人群数量
            adoption_rate: 新技术采用率 (0-1)
            time_horizon: 分析时间跨度（年）
            annual_growth_rate: 人群年增长率
            
        Returns:
            Dict: BIA结果
        """
        if not self._results:
            self.run()
        
        comparator = self._find_comparator()
        interventions = [iv for iv in self.interventions.values() if not iv.is_comparator]
        
        bia_results = []
        for year in range(1, time_horizon + 1):
            population = target_population * (1 + annual_growth_rate) ** (year - 1)
            adopters = population * adoption_rate
            
            current_cost = comparator.cost * population
            new_cost = sum(iv.cost * adopters for iv in interventions) + \
                       comparator.cost * (population - adopters)
            
            budget_impact = new_cost - current_cost
            
            bia_results.append({
                "year": year,
                "population": int(population),
                "adopters": int(adopters),
                "current_cost": current_cost,
                "new_cost": new_cost,
                "budget_impact": budget_impact,
                "incremental_cost_per_patient": budget_impact / population if population > 0 else 0
            })
        
        total_impact = sum(r["budget_impact"] for r in bia_results)
        
        return {
            "target_population": target_population,
            "adoption_rate": adoption_rate,
            "time_horizon": time_horizon,
            "annual_growth_rate": annual_growth_rate,
            "total_budget_impact": total_impact,
            "yearly_results": bia_results
        }
    
    def sensitivity_range_analysis(
        self,
        parameter_ranges: Dict[str, Tuple[float, float]],
        model_function: Optional[Callable] = None
    ) -> Dict:
        """
        范围敏感性分析
        
        Args:
            parameter_ranges: {param_name: (low, high)}
            model_function: 可选的模型函数
            
        Returns:
            Dict: 范围分析结果
        """
        results = {}
        
        for param_name, (low, high) in parameter_ranges.items():
            if model_function:
                params_low = {"cost": low if "cost" in param_name else None,
                             "effect": low if "effect" in param_name else None}
                result_low = model_function(params_low)
                results[param_name] = {
                    "low": result_low,
                    "range": (low, high)
                }
            else:
                results[param_name] = {
                    "low_value": low,
                    "high_value": high,
                    "note": "请提供model_function以获得详细结果"
                }
        
        return results
    
    def summary(self) -> str:
        """生成分析结果摘要"""
        if not self._results:
            self.run()
        
        lines = [
            "=" * 70,
            "📊 成本-效果分析结果",
            "=" * 70,
            f"分析类型: {self._results['analysis_type']}",
            f"支付意愿阈值: {self._results['currency']} {self._results['wtp_threshold']:,.0f}/{self._results['effect_unit']}",
            f"对照方案: {self._results['comparator']}",
            "-" * 70,
            "\n📋 各方案结果:",
        ]
        
        for name, iv in self._results["interventions"].items():
            lines.append(f"\n  {name}:")
            lines.append(f"    总成本: {self._results['currency']} {iv['cost']:,.2f}")
            lines.append(f"    总效果: {iv['effect']:.4f} {self._results['effect_unit']}")
            lines.append(f"    NMB: {self._results['currency']} {self._results['nmb'][name]:,.2f}")
            lines.append(f"    NHB: {self._results['nhb'][name]:.4f} {self._results['effect_unit']}")
            is_ce = "✅ 具有成本-效果" if self._results["ce_at_threshold"][name] else "❌ 不具有成本-效果"
            lines.append(f"    {is_ce}")
        
        lines.append("\n" + "-" * 70)
        lines.append("\n📈 增量分析:")
        
        for result in self._results["incremental_analysis"]:
            lines.append(f"\n  {result.intervention} vs {result.comparator}:")
            lines.append(f"    增量成本: {self._results['currency']} {result.delta_cost:,.2f}")
            lines.append(f"    增量效果: {result.delta_effect:.4f} {self._results['effect_unit']}")
            if result.icer is not None:
                lines.append(f"    ICER: {self._results['currency']} {result.icer:,.0f}/{self._results['effect_unit']}")
            lines.append(f"    优势类型: {result.dominance.value}")
            lines.append(f"    解读: {result.interpretation}")
        
        lines.append("\n" + "-" * 70)
        lines.append(f"\n🏆 最优方案（按NMB）: {self._results['best_by_nmb']}")
        lines.append(f"🏆 最优方案（按NHB）: {self._results['best_by_nhb']}")
        lines.append("=" * 70)
        
        return "\n".join(lines)


# 示例用法
if __name__ == "__main__":
    # 创建CEA实例
    cea = CostEffectivenessAnalysis(
        analysis_type=AnalysisType.CUA,
        wtp_threshold=31250
    )
    
    # 添加干预方案
    cea.add_intervention(
        "标准治疗",
        cost=50000,
        effect=8.5,
        cost_components={"药物": 30000, "检查": 10000, "住院": 10000},
        is_comparator=True
    )
    
    cea.add_intervention(
        "新药A",
        cost=120000,
        effect=10.2,
        cost_components={"药物": 90000, "检查": 15000, "住院": 15000}
    )
    
    # 运行分析
    results = cea.run()
    print(cea.summary())
    
    # 预算影响分析
    bia = cea.run_bia(
        target_population=100000,
        adoption_rate=0.3,
        time_horizon=5,
        annual_growth_rate=0.02
    )
    print(f"\n5年总预算影响: ¥{bia['total_budget_impact']:,.0f}")
