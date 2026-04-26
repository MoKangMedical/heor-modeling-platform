"""网络Meta分析模块 - HEOR Modeling Platform"""

import numpy as np
import uuid
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class StudyData:
    """研究数据"""
    study_id: str = ""
    treatment: str = ""
    n_patients: int = 0
    effect: float = 0.0
    se: float = 0.0
    ci_lower: float = 0.0
    ci_upper: float = 0.0
    outcome: str = ""

    def to_dict(self) -> Dict:
        return {
            "study_id": self.study_id, "treatment": self.treatment,
            "n_patients": self.n_patients, "effect": self.effect,
            "se": self.se, "ci_lower": self.ci_lower,
            "ci_upper": self.ci_upper, "outcome": self.outcome
        }


@dataclass
class ComparisonResult:
    """比较结果"""
    treatment1: str = ""
    treatment2: str = ""
    effect: float = 0.0
    ci_lower: float = 0.0
    ci_upper: float = 0.0
    p_value: float = 0.0
    significance: bool = False


@dataclass
class NetworkMetaResult:
    """网络Meta分析结果"""
    comparisons: List[ComparisonResult] = field(default_factory=list)
    ranking: Dict[str, float] = field(default_factory=dict)
    surface: Dict[str, float] = field(default_factory=dict)
    consistency: Dict = field(default_factory=dict)
    heterogeneity: Dict = field(default_factory=dict)


class NetworkMetaAnalysis:
    """网络Meta分析"""

    def __init__(self):
        self.studies: Dict[str, List[StudyData]] = {}
        self.treatments: List[str] = []
        self.outcome_type: str = "continuous"  # continuous, binary
        self.consistency_model: bool = True

    def add_study(self, study_id: str, arms: List[Dict]) -> None:
        """添加研究"""
        self.studies[study_id] = []
        for arm in arms:
            data = StudyData(
                study_id=study_id,
                treatment=arm.get("treatment", ""),
                n_patients=arm.get("n", 0),
                effect=arm.get("effect", 0),
                se=arm.get("se", 0),
                outcome=arm.get("outcome", "")
            )
            self.studies[study_id].append(data)
            if data.treatment not in self.treatments:
                self.treatments.append(data.treatment)

    def set_outcome_type(self, outcome_type: str) -> None:
        self.outcome_type = outcome_type

    def _get_direct_comparisons(self) -> Dict[Tuple[str, str], List[Tuple[float, float]]]:
        """获取直接比较"""
        comparisons = {}
        for study_id, arms in self.studies.items():
            for i in range(len(arms)):
                for j in range(i + 1, len(arms)):
                    key = tuple(sorted([arms[i].treatment, arms[j].treatment]))
                    if key not in comparisons:
                        comparisons[key] = []
                    diff = arms[j].effect - arms[i].effect
                    se = np.sqrt(arms[i].se**2 + arms[j].se**2)
                    comparisons[key].append((diff, se))
        return comparisons

    def _pool_direct(self, comparisons: Dict) -> Dict[Tuple[str, str], Dict]:
        """合并直接比较"""
        pooled = {}
        for key, values in comparisons.items():
            effects = [v[0] for v in values]
            ses = [v[1] for v in values]
            weights = [1 / max(s**2, 0.001) for s in ses]
            total_weight = sum(weights)
            pooled_effect = sum(e * w for e, w in zip(effects, weights)) / total_weight
            pooled_se = np.sqrt(1 / total_weight)
            pooled[key] = {
                "effect": pooled_effect,
                "se": pooled_se,
                "ci_lower": pooled_effect - 1.96 * pooled_se,
                "ci_upper": pooled_effect + 1.96 * pooled_se,
                "n_studies": len(values)
            }
        return pooled

    def _indirect_comparison(self, t1: str, t2: str,
                              direct: Dict) -> Optional[Dict]:
        """间接比较"""
        for t_intermediate in self.treatments:
            if t_intermediate == t1 or t_intermediate == t2:
                continue
            key1 = tuple(sorted([t1, t_intermediate]))
            key2 = tuple(sorted([t2, t_intermediate]))
            if key1 in direct and key2 in direct:
                d1 = direct[key1]
                d2 = direct[key2]
                # Bucher方法
                indirect_effect = d2["effect"] - d1["effect"]
                indirect_se = np.sqrt(d1["se"]**2 + d2["se"]**2)
                return {
                    "treatment1": t1, "treatment2": t2,
                    "via": t_intermediate,
                    "effect": indirect_effect,
                    "se": indirect_se,
                    "ci_lower": indirect_effect - 1.96 * indirect_se,
                    "ci_upper": indirect_effect + 1.96 * indirect_se,
                    "method": "Bucher indirect"
                }
        return None

    def _rank_treatments(self, comparisons: Dict) -> Dict[str, float]:
        """治疗排名"""
        scores = {t: 0.0 for t in self.treatments}
        counts = {t: 0 for t in self.treatments}
        for (t1, t2), data in comparisons.items():
            effect = data["effect"]
            if t1 in scores:
                scores[t1] -= effect  # lower is better for some outcomes
                counts[t1] += 1
            if t2 in scores:
                scores[t2] += effect
                counts[t2] += 1
        # Normalize
        for t in scores:
            if counts[t] > 0:
                scores[t] /= counts[t]
        # Rank
        sorted_treatments = sorted(scores.items(), key=lambda x: x[1])
        rankings = {}
        for rank, (t, score) in enumerate(sorted_treatments, 1):
            rankings[t] = rank
        return rankings

    def _consistency_check(self, direct: Dict) -> Dict:
        """一致性检验"""
        consistency_results = {}
        for (t1, t2), direct_data in direct.items():
            indirect = self._indirect_comparison(t1, t2, direct)
            if indirect:
                diff = abs(direct_data["effect"] - indirect["effect"])
                se = np.sqrt(direct_data["se"]**2 + indirect["se"]**2)
                z = diff / max(se, 0.001)
                p = 2 * (1 - self._norm_cdf(abs(z)))
                consistency_results[f"{t1} vs {t2}"] = {
                    "direct_effect": direct_data["effect"],
                    "indirect_effect": indirect["effect"],
                    "difference": diff,
                    "p_value": p,
                    "consistent": p > 0.05
                }
        return consistency_results

    @staticmethod
    def _norm_cdf(x):
        return 0.5 * (1 + np.math.erf(x / np.sqrt(2)))

    def analyze(self) -> NetworkMetaResult:
        """执行网络Meta分析"""
        direct = self._get_direct_comparisons()
        pooled = self._pool_direct(direct)
        ranking = self._rank_treatments(pooled)
        consistency = self._consistency_check(pooled)

        comparisons = []
        for (t1, t2), data in pooled.items():
            comparisons.append(ComparisonResult(
                treatment1=t1, treatment2=t2,
                effect=data["effect"],
                ci_lower=data["ci_lower"],
                ci_upper=data["ci_upper"],
                p_value=0.05,  # simplified
                significance=abs(data["effect"]) > 1.96 * data["se"]
            ))

        # SUCRA (Simplified)
        n = len(self.treatments)
        sucra = {}
        for t in self.treatments:
            rank = ranking.get(t, n)
            sucra[t] = round((n - rank) / (n - 1) * 100, 1) if n > 1 else 50

        return NetworkMetaResult(
            comparisons=comparisons,
            ranking=ranking,
            surface=sucra,
            consistency=consistency,
            heterogeneity={
                "total_comparisons": len(pooled),
                "total_studies": len(self.studies),
                "treatments": len(self.treatments)
            }
        )

    def get_network_geometry(self) -> Dict:
        """获取网络几何结构"""
        edges = []
        for study_id, arms in self.studies.items():
            treatments = [a.treatment for a in arms]
            for i in range(len(treatments)):
                for j in range(i + 1, len(treatments)):
                    edges.append({
                        "source": treatments[i],
                        "target": treatments[j],
                        "study": study_id
                    })
        return {
            "nodes": [{"id": t, "label": t} for t in self.treatments],
            "edges": edges
        }
