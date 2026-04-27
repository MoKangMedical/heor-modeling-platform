"""
HEOR Modeling Platform — 冰山模型（Iceberg Model）
展示疾病经济负担的全貌，包括直接成本和间接成本
"""

import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class CostCategory:
    """成本类别"""
    name: str
    amount: float
    visible: bool = True  # True=水面以上（直接成本），False=水面以下（间接成本）
    description: str = ""


class IcebergModel:
    """
    冰山模型 — 疾病经济负担全景分析
    
    水面以上（可见）：直接医疗成本、直接非医疗成本
    水面以下（隐性）：间接成本（生产力损失）、无形成本（痛苦/生活质量）
    
    示例：
        >>> iceberg = IcebergModel(disease="2型糖尿病", population_size=100000)
        >>> iceberg.add_cost("药物费用", 5000, visible=True)
        >>> iceberg.add_cost("住院费用", 8000, visible=True)
        >>> iceberg.add_cost("误工损失", 3000, visible=False)
        >>> report = iceberg.generate_report()
    """
    
    def __init__(
        self,
        disease: str,
        population_size: int = 100000,
        time_horizon: float = 1.0,
        time_unit: str = "年",
        perspective: str = "社会"
    ):
        self.disease = disease
        self.population_size = population_size
        self.time_horizon = time_horizon
        self.time_unit = time_unit
        self.perspective = perspective
        self.costs: List[CostCategory] = []
    
    def add_cost(
        self,
        name: str,
        amount: float,
        visible: bool = True,
        description: str = ""
    ) -> None:
        """添加成本项目"""
        self.costs.append(CostCategory(
            name=name,
            amount=amount,
            visible=visible,
            description=description
        ))
    
    def add_direct_medical_costs(self, costs: Dict[str, float]) -> None:
        """批量添加直接医疗成本"""
        for name, amount in costs.items():
            self.add_cost(name, amount, visible=True, description="直接医疗成本")
    
    def add_direct_non_medical_costs(self, costs: Dict[str, float]) -> None:
        """批量添加直接非医疗成本"""
        for name, amount in costs.items():
            self.add_cost(name, amount, visible=True, description="直接非医疗成本")
    
    def add_indirect_costs(self, costs: Dict[str, float]) -> None:
        """批量添加间接成本"""
        for name, amount in costs.items():
            self.add_cost(name, amount, visible=False, description="间接成本")
    
    def add_intangible_costs(self, costs: Dict[str, float]) -> None:
        """批量添加无形成本"""
        for name, amount in costs.items():
            self.add_cost(name, amount, visible=False, description="无形成本")
    
    def get_direct_total(self) -> float:
        """计算直接成本合计（水面以上）"""
        return sum(c.amount for c in self.costs if c.visible)
    
    def get_indirect_total(self) -> float:
        """计算间接成本合计（水面以下）"""
        return sum(c.amount for c in self.costs if not c.visible)
    
    def get_total_burden(self) -> float:
        """计算总经济负担"""
        return self.get_direct_total() + self.get_indirect_total()
    
    def get_per_capita_burden(self) -> float:
        """计算人均经济负担"""
        return self.get_total_burden() / max(self.population_size, 1)
    
    def get_burden_ratio(self) -> float:
        """计算隐性/显性成本比"""
        direct = self.get_direct_total()
        if direct == 0:
            return float('inf')
        return self.get_indirect_total() / direct
    
    def breakdown_by_category(self) -> Dict[str, Dict]:
        """按类别分解成本"""
        categories = {}
        for cost in self.costs:
            cat = cost.description if cost.description else "其他"
            if cat not in categories:
                categories[cat] = {"items": [], "total": 0.0}
            categories[cat]["items"].append({
                "name": cost.name,
                "amount": cost.amount,
                "visible": cost.visible
            })
            categories[cat]["total"] += cost.amount
        return categories
    
    def generate_report(self) -> Dict:
        """生成完整的冰山模型分析报告"""
        direct_total = self.get_direct_total()
        indirect_total = self.get_indirect_total()
        total = self.get_total_burden()
        
        report = {
            "disease": self.disease,
            "population_size": self.population_size,
            "time_horizon": f"{self.time_horizon} {self.time_unit}",
            "perspective": self.perspective,
            "summary": {
                "direct_costs": round(direct_total, 2),
                "indirect_costs": round(indirect_total, 2),
                "total_burden": round(total, 2),
                "per_capita_burden": round(self.get_per_capita_burden(), 2),
                "iceberg_ratio": round(self.get_burden_ratio(), 2),
                "direct_percentage": round(direct_total / max(total, 1) * 100, 1),
                "indirect_percentage": round(indirect_total / max(total, 1) * 100, 1)
            },
            "visible_costs": [
                {"name": c.name, "amount": c.amount, "description": c.description}
                for c in self.costs if c.visible
            ],
            "hidden_costs": [
                {"name": c.name, "amount": c.amount, "description": c.description}
                for c in self.costs if not c.visible
            ],
            "breakdown": self.breakdown_by_category()
        }
        return report
    
    def summary(self) -> str:
        """生成文本摘要"""
        report = self.generate_report()
        s = report["summary"]
        
        lines = [
            "=" * 60,
            f"🧊 冰山模型 — {self.disease}疾病经济负担分析",
            "=" * 60,
            f"人群规模: {self.population_size:,}人",
            f"时间范围: {report['time_horizon']}",
            f"分析角度: {self.perspective}",
            "-" * 60,
            f"🏔️  水面以上（直接成本）: ¥{s['direct_costs']:,.2f} ({s['direct_percentage']}%)",
        ]
        for c in report["visible_costs"]:
            lines.append(f"    • {c['name']}: ¥{c['amount']:,.2f}")
        
        lines.append("-" * 60)
        lines.append(f"🌊 水面以下（间接成本）: ¥{s['indirect_costs']:,.2f} ({s['indirect_percentage']}%)")
        for c in report["hidden_costs"]:
            lines.append(f"    • {c['name']}: ¥{c['amount']:,.2f}")
        
        lines.extend([
            "-" * 60,
            f"📊 总经济负担: ¥{s['total_burden']:,.2f}",
            f"👤 人均负担: ¥{s['per_capita_burden']:,.2f}",
            f"🧊 冰山比（隐性/显性）: {s['iceberg_ratio']:.2f}x",
            "=" * 60
        ])
        
        return "\n".join(lines)


# 示例
if __name__ == "__main__":
    iceberg = IcebergModel(
        disease="2型糖尿病",
        population_size=100000,
        time_horizon=1,
        perspective="社会"
    )
    
    iceberg.add_direct_medical_costs({
        "降糖药物": 4800,
        "胰岛素": 6000,
        "血糖监测": 1200,
        "门诊挂号": 600,
        "住院治疗": 15000,
        "并发症治疗": 8000
    })
    
    iceberg.add_direct_non_medical_costs({
        "交通费": 1500,
        "营养品": 2400,
        "护工费": 3000
    })
    
    iceberg.add_indirect_costs({
        "误工损失": 8000,
        "提前退休": 12000,
        "过早死亡生产力损失": 25000
    })
    
    iceberg.add_intangible_costs({
        "疼痛与不适": 5000,
        "心理负担": 3000,
        "生活质量下降": 6000
    })
    
    print(iceberg.summary())
