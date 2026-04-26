"""效用测量模块 - HEOR Modeling Platform"""

import numpy as np
import uuid
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class UtilityValue:
    """效用值"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    health_state: str = ""
    utility: float = 1.0
    method: str = ""
    source: str = ""
    sample_size: int = 0
    ci_lower: float = 0.0
    ci_upper: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        return {
            "id": self.id, "health_state": self.health_state,
            "utility": self.utility, "method": self.method,
            "source": self.source, "sample_size": self.sample_size,
            "ci_lower": self.ci_lower, "ci_upper": self.ci_upper
        }


class UtilityMeasurement:
    """效用测量工具"""

    # EQ-5D权重（中国版示例）
    EQ5D_CHINA = {
        "mobility": {1: 0, 2: -0.0740, 3: -0.1900},
        "self_care": {1: 0, 2: -0.0540, 3: -0.1460},
        "usual_activities": {1: 0, 2: -0.0610, 3: -0.1620},
        "pain_discomfort": {1: 0, 2: -0.0680, 3: -0.1800},
        "anxiety_depression": {1: 0, 2: -0.0630, 3: -0.1650},
    }

    def __init__(self):
        self.utilities: Dict[str, UtilityValue] = {}
        self.tariff_system: str = "uk"  # uk, us, china

    def set_tariff_system(self, system: str) -> None:
        self.tariff_system = system

    def add_utility(self, health_state: str, utility: float,
                    method: str = "", source: str = "",
                    sample_size: int = 0) -> UtilityValue:
        """添加效用值"""
        uv = UtilityValue(
            health_state=health_state, utility=utility,
            method=method, source=source, sample_size=sample_size
        )
        self.utilities[uv.id] = uv
        return uv

    def get_utility(self, health_state: str) -> Optional[float]:
        """获取健康状态效用值"""
        for uv in self.utilities.values():
            if uv.health_state == health_state:
                return uv.utility
        return None

    def calculate_eq5d(self, mobility: int, self_care: int,
                       usual_activities: int, pain: int,
                       anxiety: int) -> float:
        """计算EQ-5D效用值"""
        if self.tariff_system == "china":
            tariff = self.EQ5D_CHINA
        else:
            tariff = self.EQ5D_CHINA  # 默认

        base = 1.0
        base += tariff["mobility"].get(mobility, 0)
        base += tariff["self_care"].get(self_care, 0)
        base += tariff["usual_activities"].get(usual_activities, 0)
        base += tariff["pain_discomfort"].get(pain, 0)
        base += tariff["anxiety_depression"].get(anxiety, 0)
        return round(max(min(base, 1.0), -0.5), 4)

    def calculate_hui(self, vision: int, hearing: int, speech: int,
                      ambulation: int, dexterity: int, emotion: int,
                      cognition: int, pain: int) -> float:
        """计算HUI效用值（简化版）"""
        weights = {
            1: 1.0, 2: 0.95, 3: 0.88, 4: 0.78,
            5: 0.65, 6: 0.50
        }
        scores = [vision, hearing, speech, ambulation,
                  dexterity, emotion, cognition, pain]
        return round(np.mean([weights.get(s, 1.0) for s in scores]), 4)

    def time_trade_off(self, time_full_health: float,
                       time_impaired: float,
                       utility_threshold: float = 0.0) -> float:
        """时间权衡法"""
        if time_full_health <= 0:
            return 0.0
        return round(min(time_impaired / time_full_health, 1.0), 4)

    def standard_gamble(self, p_death: float, p_full_health: float,
                        utility_impaired: float) -> float:
        """标准博弈法"""
        if p_full_health <= 0:
            return 0.0
        return round((1 - p_death) * p_full_health + p_death * 0, 4)

    def calculate_qaly(self, utility: float, time_years: float,
                       discount_rate: float = 0.03) -> float:
        """计算QALY"""
        if discount_rate <= 0:
            return utility * time_years
        qaly = utility * (1 - np.exp(-discount_rate * time_years)) / discount_rate
        return round(qaly, 4)

    def disutility_from_adverse_event(self, base_utility: float,
                                       event_disutility: float) -> float:
        """不良事件导致的效用损失"""
        return round(max(base_utility - event_disutility, -0.5), 4)

    def pooled_utility(self, health_state: str) -> Dict:
        """合并效用值"""
        matching = [uv for uv in self.utilities.values()
                    if uv.health_state == health_state]
        if not matching:
            return {"health_state": health_state, "utility": None}
        utilities = [uv.utility for uv in matching]
        weights = [uv.sample_size if uv.sample_size > 0 else 1 for uv in matching]
        total_weight = sum(weights)
        pooled = sum(u * w for u, w in zip(utilities, weights)) / total_weight
        return {
            "health_state": health_state,
            "utility": round(pooled, 4),
            "n_studies": len(matching),
            "range": [round(min(utilities), 4), round(max(utilities), 4)],
            "std": round(float(np.std(utilities)), 4)
        }

    def get_all_utilities(self) -> List[Dict]:
        return [uv.to_dict() for uv in self.utilities.values()]

    def get_statistics(self) -> Dict:
        utilities = [uv.utility for uv in self.utilities.values()]
        return {
            "total": len(utilities),
            "mean": round(float(np.mean(utilities)), 4) if utilities else 0,
            "std": round(float(np.std(utilities)), 4) if utilities else 0,
            "min": round(min(utilities), 4) if utilities else 0,
            "max": round(max(utilities), 4) if utilities else 0,
        }
