"""间接比较模块 - HEOR Modeling Platform"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class IndirectComparisonResult:
    """间接比较结果"""
    treatment1: str = ""
    treatment2: str = ""
    comparator: str = ""
    method: str = ""
    effect: float = 0.0
    se: float = 0.0
    ci_lower: float = 0.0
    ci_upper: float = 0.0
    p_value: float = 0.0
    significant: bool = False


class IndirectComparison:
    """间接比较工具"""

    def __init__(self):
        self.studies: Dict[str, Dict] = {}

    def add_direct_evidence(self, comparison: str, effect: float,
                            se: float, n_studies: int = 1) -> None:
        """添加直接证据"""
        self.studies[comparison] = {
            "effect": effect, "se": se,
            "n_studies": n_studies,
            "variance": se**2
        }

    def bucher_method(self, t1: str, t2: str,
                      common_comparator: str) -> Optional[IndirectComparisonResult]:
        """Bucher间接比较"""
        comp1 = f"{t1} vs {common_comparator}"
        comp2 = f"{t2} vs {common_comparator}"
        if comp1 not in self.studies or comp2 not in self.studies:
            # Try reverse
            comp1_rev = f"{common_comparator} vs {t1}"
            comp2_rev = f"{common_comparator} vs {t2}"
            if comp1_rev in self.studies:
                d1 = self.studies[comp1_rev]
                d1 = {"effect": -d1["effect"], "se": d1["se"], "variance": d1["variance"]}
            elif comp1 in self.studies:
                d1 = self.studies[comp1]
            else:
                return None
            if comp2_rev in self.studies:
                d2 = self.studies[comp2_rev]
                d2 = {"effect": -d2["effect"], "se": d2["se"], "variance": d2["variance"]}
            elif comp2 in self.studies:
                d2 = self.studies[comp2]
            else:
                return None
        else:
            d1 = self.studies[comp1]
            d2 = self.studies[comp2]

        indirect_effect = d2["effect"] - d1["effect"]
        indirect_var = d1["variance"] + d2["variance"]
        indirect_se = np.sqrt(indirect_var)
        z = indirect_effect / max(indirect_se, 0.001)
        p_value = 2 * (1 - self._norm_cdf(abs(z)))

        return IndirectComparisonResult(
            treatment1=t1, treatment2=t2,
            comparator=common_comparator,
            method="Bucher",
            effect=indirect_effect,
            se=indirect_se,
            ci_lower=indirect_effect - 1.96 * indirect_se,
            ci_upper=indirect_effect + 1.96 * indirect_se,
            p_value=p_value,
            significant=p_value < 0.05
        )

    def adjusted_indirect_comparison(self, t1: str, t2: str,
                                      common: str,
                                      adjustment_factor: float = 1.0) -> Optional[IndirectComparisonResult]:
        """调整间接比较"""
        result = self.bucher_method(t1, t2, common)
        if not result:
            return None
        result.effect *= adjustment_factor
        result.se *= adjustment_factor
        result.ci_lower = result.effect - 1.96 * result.se
        result.ci_upper = result.effect + 1.96 * result.se
        result.method = "Adjusted Indirect Comparison"
        return result

    def unanchored_comparison(self, t1_data: Dict, t2_data: Dict) -> IndirectComparisonResult:
        """无锚定间接比较"""
        effect1 = t1_data.get("effect", 0)
        se1 = t1_data.get("se", 0)
        effect2 = t2_data.get("effect", 0)
        se2 = t2_data.get("se", 0)
        diff = effect2 - effect1
        se = np.sqrt(se1**2 + se2**2)
        z = diff / max(se, 0.001)
        p = 2 * (1 - self._norm_cdf(abs(z)))
        return IndirectComparisonResult(
            treatment1=t1_data.get("name", "T1"),
            treatment2=t2_data.get("name", "T2"),
            comparator="none (unanchored)",
            method="Unanchored",
            effect=diff, se=se,
            ci_lower=diff - 1.96 * se,
            ci_upper=diff + 1.96 * se,
            p_value=p, significant=p < 0.05
        )

    def pop_adjusted_comparison(self, t1: str, t2: str, common: str,
                                 effect_modifiers: Dict[str, float]) -> Optional[IndirectComparisonResult]:
        """人群调整间接比较"""
        result = self.bucher_method(t1, t2, common)
        if not result:
            return None
        adjustment = sum(effect_modifiers.values())
        result.effect += adjustment
        result.method = "Population-adjusted Indirect Comparison"
        result.ci_lower = result.effect - 1.96 * result.se
        result.ci_upper = result.effect + 1.96 * result.se
        return result

    @staticmethod
    def _norm_cdf(x):
        return 0.5 * (1 + np.math.erf(x / np.sqrt(2)))

    def get_all_comparisons(self) -> List[Dict]:
        return [{
            "comparison": k, "effect": v["effect"],
            "se": v["se"], "n_studies": v["n_studies"]
        } for k, v in self.studies.items()]

    def get_evidence_network(self) -> Dict:
        nodes = set()
        edges = []
        for comp in self.studies:
            parts = comp.split(" vs ")
            if len(parts) == 2:
                nodes.update(parts)
                edges.append({"source": parts[0], "target": parts[1]})
        return {"nodes": list(nodes), "edges": edges}
