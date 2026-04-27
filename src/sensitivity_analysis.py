"""敏感性分析模块 - HEOR Modeling Platform"""

import numpy as np
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ParameterRange:
    """参数范围"""
    name: str = ""
    base_value: float = 0
    min_value: float = 0
    max_value: float = 0
    distribution: str = "uniform"  # uniform, triangular, normal, beta, gamma
    std: float = 0
    description: str = ""

    def to_dict(self) -> Dict:
        return {
            "name": self.name, "base_value": self.base_value,
            "min_value": self.min_value, "max_value": self.max_value,
            "distribution": self.distribution
        }


@dataclass
class SensitivityResult:
    """敏感性分析结果"""
    parameter: str = ""
    base_result: float = 0
    low_result: float = 0
    high_result: float = 0
    range_pct: float = 0
    tornado_width: float = 0


class SensitivityAnalysis:
    """敏感性分析"""

    def __init__(self):
        self.parameters: Dict[str, ParameterRange] = {}
        self.model_func: Optional[Callable] = None
        self.base_case_result: float = 0
        self.n_simulations: int = 1000

    def set_model(self, func: Callable) -> None:
        """设置模型函数"""
        self.model_func = func

    def add_parameter(self, name: str, base_value: float,
                      min_value: float, max_value: float,
                      distribution: str = "uniform",
                      std: float = 0) -> ParameterRange:
        """添加参数"""
        param = ParameterRange(
            name=name, base_value=base_value,
            min_value=min_value, max_value=max_value,
            distribution=distribution, std=std
        )
        self.parameters[name] = param
        return param

    def set_base_case(self, result: float) -> None:
        self.base_case_result = result

    def one_way(self, param_name: str,
                model_func: Optional[Callable] = None) -> Optional[SensitivityResult]:
        """单因素敏感性分析"""
        param = self.parameters.get(param_name)
        func = model_func or self.model_func
        if not param or not func:
            return None

        base_params = {name: p.base_value for name, p in self.parameters.items()}
        base_result = func(**base_params)

        low_params = dict(base_params)
        low_params[param_name] = param.min_value
        low_result = func(**low_params)

        high_params = dict(base_params)
        high_params[param_name] = param.max_value
        high_result = func(**high_params)

        return SensitivityResult(
            parameter=param_name,
            base_result=base_result,
            low_result=low_result,
            high_result=high_result,
            range_pct=abs(high_result - low_result),
            tornado_width=abs(high_result - low_result)
        )

    def tornado_analysis(self, model_func: Optional[Callable] = None) -> List[SensitivityResult]:
        """龙卷风图分析"""
        results = []
        for param_name in self.parameters:
            result = self.one_way(param_name, model_func)
            if result:
                results.append(result)
        results.sort(key=lambda r: r.tornado_width, reverse=True)
        return results

    def two_way(self, param1: str, param2: str,
                model_func: Optional[Callable] = None,
                steps: int = 10) -> List[List[float]]:
        """双因素敏感性分析"""
        p1 = self.parameters.get(param1)
        p2 = self.parameters.get(param2)
        func = model_func or self.model_func
        if not p1 or not p2 or not func:
            return []

        values1 = np.linspace(p1.min_value, p1.max_value, steps)
        values2 = np.linspace(p2.min_value, p2.max_value, steps)
        base_params = {name: p.base_value for name, p in self.parameters.items()}

        matrix = []
        for v1 in values1:
            row = []
            for v2 in values2:
                params = dict(base_params)
                params[param1] = v1
                params[param2] = v2
                try:
                    result = func(**params)
                    row.append(result)
                except Exception:
                    row.append(float('nan'))
            matrix.append(row)
        return matrix

    def probabilistic(self, model_func: Optional[Callable] = None,
                       n_simulations: Optional[int] = None) -> Dict:
        """概率敏感性分析（蒙特卡洛）"""
        func = model_func or self.model_func
        n = n_simulations or self.n_simulations
        if not func:
            return {}

        results = []
        param_samples = {}
        for name, param in self.parameters.items():
            if param.distribution == "uniform":
                samples = np.random.uniform(param.min_value, param.max_value, n)
            elif param.distribution == "normal":
                samples = np.random.normal(param.base_value, param.std or (param.max_value - param.min_value) / 4, n)
                samples = np.clip(samples, param.min_value, param.max_value)
            elif param.distribution == "triangular":
                samples = np.random.triangular(param.min_value, param.base_value, param.max_value, n)
            elif param.distribution == "beta":
                alpha = 2
                beta_param = 2
                samples = np.random.beta(alpha, beta_param, n)
                samples = param.min_value + samples * (param.max_value - param.min_value)
            elif param.distribution == "gamma":
                shape = (param.base_value / max(param.std, 1)) ** 2
                scale = max(param.std, 1) ** 2 / max(param.base_value, 0.001)
                samples = np.random.gamma(max(shape, 0.1), max(scale, 0.001), n)
                samples = np.clip(samples, param.min_value, param.max_value)
            else:
                samples = np.random.uniform(param.min_value, param.max_value, n)
            param_samples[name] = samples

        for i in range(n):
            params = {name: samples[i] for name, samples in param_samples.items()}
            try:
                result = func(**params)
                results.append(result)
            except Exception:
                continue

        if not results:
            return {}

        results_arr = np.array(results)
        return {
            "n_simulations": len(results),
            "mean": float(np.mean(results_arr)),
            "std": float(np.std(results_arr)),
            "median": float(np.median(results_arr)),
            "ci_2.5": float(np.percentile(results_arr, 2.5)),
            "ci_97.5": float(np.percentile(results_arr, 97.5)),
            "min": float(np.min(results_arr)),
            "max": float(np.max(results_arr)),
            "prob_below_threshold": float(np.mean(results_arr < self.base_case_result)),
            "histogram": {
                "bins": [float(x) for x in np.linspace(np.min(results_arr), np.max(results_arr), 20)],
                "counts": [int(x) for x in np.histogram(results_arr, 20)[0]]
            }
        }

    def scenario_analysis(self, scenarios: Dict[str, Dict[str, float]],
                           model_func: Optional[Callable] = None) -> List[Dict]:
        """情景分析"""
        func = model_func or self.model_func
        if not func:
            return []
        results = []
        for scenario_name, overrides in scenarios.items():
            params = {name: p.base_value for name, p in self.parameters.items()}
            params.update(overrides)
            try:
                result = func(**params)
                results.append({
                    "scenario": scenario_name,
                    "result": result,
                    "parameters": overrides
                })
            except Exception as e:
                results.append({
                    "scenario": scenario_name,
                    "error": str(e)
                })
        return results

    def get_parameter_info(self) -> List[Dict]:
        return [p.to_dict() for p in self.parameters.values()]
