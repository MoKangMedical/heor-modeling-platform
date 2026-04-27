"""决策树模型 - HEOR Modeling Platform"""

import uuid
import numpy as np
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class NodeType(Enum):
    DECISION = "decision"
    CHANCE = "chance"
    TERMINAL = "terminal"


@dataclass
class TreeNode:
    """决策树节点"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    node_type: str = "chance"
    probability: float = 1.0
    cost: float = 0.0
    utility: float = 1.0
    children: List['TreeNode'] = field(default_factory=list)
    parent: Optional['TreeNode'] = None
    attributes: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "id": self.id, "name": self.name,
            "node_type": self.node_type,
            "probability": self.probability,
            "cost": self.cost, "utility": self.utility,
            "children": [c.to_dict() for c in self.children],
            "attributes": self.attributes
        }


@dataclass
class DecisionTreeResult:
    """决策树分析结果"""
    strategy: str = ""
    expected_cost: float = 0
    expected_utility: float = 0
    expected_qaly: float = 0
    cost_per_qaly: float = 0
    probabilities: Dict[str, float] = field(default_factory=dict)
    path_costs: List[Dict] = field(default_factory=list)


class DecisionTree:
    """决策树模型"""

    def __init__(self):
        self.root: Optional[TreeNode] = None
        self.strategies: Dict[str, TreeNode] = {}
        self.discount_rate: float = 0.03
        self.cycle_length: float = 1.0

    def create_node(self, name: str, node_type: str = "chance",
                    probability: float = 1.0, cost: float = 0.0,
                    utility: float = 1.0, parent: Optional[TreeNode] = None,
                    **attributes) -> TreeNode:
        """创建节点"""
        node = TreeNode(
            name=name, node_type=node_type,
            probability=probability, cost=cost,
            utility=utility, parent=parent,
            attributes=attributes
        )
        if parent:
            parent.children.append(node)
        if node_type == "decision":
            self.strategies[name] = node
            if not self.root:
                self.root = node
        return node

    def add_strategy(self, name: str) -> TreeNode:
        """添加决策策略"""
        return self.create_node(name, node_type="decision")

    def add_branch(self, parent: TreeNode, name: str,
                   probability: float, cost: float = 0,
                   utility: float = 1.0, **attributes) -> TreeNode:
        """添加分支"""
        node_type = "terminal" if not attributes.get("has_children", False) else "chance"
        return self.create_node(
            name, node_type=node_type,
            probability=probability, cost=cost,
            utility=utility, parent=parent, **attributes
        )

    def _calculate_path(self, node: TreeNode, path: List[str] = None) -> List[Dict]:
        """计算所有路径"""
        if path is None:
            path = []
        current_path = path + [{
            "node": node.name, "type": node.node_type,
            "probability": node.probability, "cost": node.cost,
            "utility": node.utility
        }]
        if not node.children:
            return [current_path]
        all_paths = []
        for child in node.children:
            all_paths.extend(self._calculate_path(child, current_path))
        return all_paths

    def _expected_value(self, node: TreeNode, depth: int = 0) -> Tuple[float, float]:
        """计算期望值"""
        discount = 1 / (1 + self.discount_rate) ** (depth * self.cycle_length)
        if not node.children:
            return node.cost * discount, node.utility * discount

        total_cost = node.cost * discount
        total_utility = 0
        for child in node.children:
            child_cost, child_utility = self._expected_value(child, depth + 1)
            total_cost += child_cost * child.probability
            total_utility += child_utility * child.probability
        return total_cost, total_utility + node.utility * discount

    def analyze_strategy(self, strategy_name: str) -> Optional[DecisionTreeResult]:
        """分析单个策略"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return None
        expected_cost, expected_utility = self._expected_value(strategy)
        paths = self._calculate_path(strategy)

        outcome_probs = {}
        for path in paths:
            terminal = path[-1]
            outcome_name = terminal["node"]
            path_prob = 1.0
            for step in path:
                path_prob *= step["probability"]
            outcome_probs[outcome_name] = outcome_probs.get(outcome_name, 0) + path_prob

        return DecisionTreeResult(
            strategy=strategy_name,
            expected_cost=expected_cost,
            expected_utility=expected_utility,
            expected_qaly=expected_utility * self.cycle_length,
            cost_per_qaly=expected_cost / max(expected_utility * self.cycle_length, 0.001),
            probabilities=outcome_probs,
            path_costs=[{"path": [s["node"] for s in p], "cost": sum(s["cost"] for s in p)} for p in paths[:20]]
        )

    def analyze_all(self) -> List[DecisionTreeResult]:
        """分析所有策略"""
        return [r for name in self.strategies
                if (r := self.analyze_strategy(name)) is not None]

    def icer(self, strategy1: str, strategy2: str) -> Optional[Dict]:
        """计算增量成本效果比"""
        r1 = self.analyze_strategy(strategy1)
        r2 = self.analyze_strategy(strategy2)
        if not r1 or not r2:
            return None
        delta_cost = r2.expected_cost - r1.expected_cost
        delta_qaly = r2.expected_qaly - r1.expected_qaly
        return {
            "strategy1": strategy1, "strategy2": strategy2,
            "cost1": r1.expected_cost, "cost2": r2.expected_cost,
            "qaly1": r1.expected_qaly, "qaly2": r2.expected_qaly,
            "delta_cost": delta_cost, "delta_qaly": delta_qaly,
            "icer": delta_cost / max(delta_qaly, 0.0001),
            "dominance": "dominant" if delta_cost < 0 and delta_qaly > 0
                         else "dominated" if delta_cost > 0 and delta_qaly < 0
                         else "neither"
        }

    def export_to_json(self) -> str:
        import json
        if not self.root:
            return "{}"
        return json.dumps(self.root.to_dict(), indent=2, ensure_ascii=False)

    def get_statistics(self) -> Dict:
        def count_nodes(node):
            count = 1
            for child in node.children:
                count += count_nodes(child)
            return count
        return {
            "strategies": len(self.strategies),
            "total_nodes": count_nodes(self.root) if self.root else 0,
            "depth": self._get_depth(self.root) if self.root else 0
        }

    def _get_depth(self, node: TreeNode, depth: int = 0) -> int:
        if not node.children:
            return depth
        return max(self._get_depth(child, depth + 1) for child in node.children)
