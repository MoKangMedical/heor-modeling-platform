"""情景分析模块 - HEOR Modeling Platform"""

import numpy as np
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Scenario:
    """情景定义"""
    name: str = ""
    description: str = ""
    parameters: Dict[str, float] = field(default_factory=dict)
    probability: float = 0.0
    result: Optional[Dict] = None

    def to_dict(self) -> Dict:
        return {
            "name": self.name, "description": self.description,
            "parameters": self.parameters, "probability": self.probability,
            "result": self.result
        }


class ScenarioAnalysis:
    """情景分析"""

    def __init__(self):
        self.scenarios: Dict[str, Scenario] = {}
        self.base_parameters: Dict[str, float] = {}
        self.model_func: Optional[Callable] = None
        self.results: Dict[str, Dict] = {}

    def set_base_parameters(self, params: Dict[str, float]) -> None:
        self.base_parameters = params

    def set_model(self, func: Callable) -> None:
        self.model_func = func

    def add_scenario(self, name: str, description: str = "",
                     parameter_overrides: Optional[Dict[str, float]] = None,
                     probability: float = 0.0) -> Scenario:
        """添加情景"""
        scenario = Scenario(
            name=name, description=description,
            parameters=parameter_overrides or {},
            probability=probability
        )
        self.scenarios[name] = scenario
        return scenario

    def create_automated_scenarios(self) -> List[Scenario]:
        """自动创建情景"""
        scenarios = []
        # 乐观情景
        optimistic = {k: v * 1.2 for k, v in self.base_parameters.items()
                      if isinstance(v, (int, float)) and v > 0}
        scenarios.append(self.add_scenario("optimistic", "乐观情景", optimistic, 0.25))

        # 悲观情景
        pessimistic = {k: v * 0.8 for k, v in self.base_parameters.items()
                       if isinstance(v, (int, float)) and v > 0}
        scenarios.append(self.add_scenario("pessimistic", "悲观情景", pessimistic, 0.25))

        # 基线情景
        scenarios.append(self.add_scenario("base_case", "基线情景", {}, 0.5))
        return scenarios

    def run_scenario(self, name: str) -> Optional[Dict]:
        """运行单个情景"""
        scenario = self.scenarios.get(name)
        if not scenario or not self.model_func:
            return None
        params = dict(self.base_parameters)
        params.update(scenario.parameters)
        try:
            result = self.model_func(**params)
            if isinstance(result, dict):
                scenario.result = result
            else:
                scenario.result = {"value": result}
            self.results[name] = scenario.result
            return scenario.result
        except Exception as e:
            scenario.result = {"error": str(e)}
            return scenario.result

    def run_all(self) -> Dict[str, Dict]:
        """运行所有情景"""
        for name in self.scenarios:
            self.run_scenario(name)
        return self.results

    def compare_scenarios(self) -> List[Dict]:
        """比较情景"""
        comparison = []
        for name, scenario in self.scenarios.items():
            if scenario.result and "error" not in scenario.result:
                comparison.append({
                    "scenario": name,
                    "description": scenario.description,
                    "probability": scenario.probability,
                    "result": scenario.result,
                    "parameters": scenario.parameters
                })
        return comparison

    def expected_value(self) -> Optional[float]:
        """计算期望值"""
        total = 0
        total_prob = 0
        for name, scenario in self.scenarios.items():
            if scenario.result and scenario.probability > 0:
                value = scenario.result.get("value", scenario.result.get("cost", 0))
                if isinstance(value, (int, float)):
                    total += value * scenario.probability
                    total_prob += scenario.probability
        return total / total_prob if total_prob > 0 else None

    def tornado_data(self) -> List[Dict]:
        """生成龙卷风图数据"""
        if not self.model_func:
            return []
        results = []
        for param_name, base_value in self.base_parameters.items():
            if not isinstance(base_value, (int, float)) or base_value == 0:
                continue
            params_low = dict(self.base_parameters)
            params_high = dict(self.base_parameters)
            params_low[param_name] = base_value * 0.8
            params_high[param_name] = base_value * 1.2
            try:
                low_result = self.model_func(**params_low)
                high_result = self.model_func(**params_high)
                if isinstance(low_result, (int, float)) and isinstance(high_result, (int, float)):
                    results.append({
                        "parameter": param_name,
                        "base_value": base_value,
                        "low": float(low_result),
                        "high": float(high_result),
                        "range": abs(high_result - low_result)
                    })
            except Exception:
                continue
        results.sort(key=lambda x: x["range"], reverse=True)
        return results

    def summary(self) -> Dict:
        return {
            "total_scenarios": len(self.scenarios),
            "base_parameters": self.base_parameters,
            "scenarios": {name: s.to_dict() for name, s in self.scenarios.items()},
            "expected_value": self.expected_value(),
            "results": self.results
        }
