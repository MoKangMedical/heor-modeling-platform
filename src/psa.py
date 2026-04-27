"""
HEOR Modeling Platform — 敏感性分析模块
支持概率敏感性分析（PSA）、单因素/多因素确定性敏感性分析（DSA）、龙卷风图
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field


@dataclass
class ParameterDistribution:
    """参数分布定义"""
    name: str
    distribution: str  # beta, gamma, lognormal, normal, uniform, triangular, dirichlet
    params: Dict
    description: str = ""
    
    def sample(self, n: int = 1) -> np.ndarray:
        """从分布中采样"""
        if self.distribution == "beta":
            return np.random.beta(self.params["alpha"], self.params["beta"], n)
        elif self.distribution == "gamma":
            return np.random.gamma(self.params["shape"], self.params["scale"], n)
        elif self.distribution == "lognormal":
            return np.random.lognormal(self.params["mu"], self.params["sigma"], n)
        elif self.distribution == "normal":
            samples = np.random.normal(self.params["mean"], self.params["sd"], n)
            if "min" in self.params:
                samples = np.maximum(samples, self.params["min"])
            if "max" in self.params:
                samples = np.minimum(samples, self.params["max"])
            return samples
        elif self.distribution == "uniform":
            return np.random.uniform(self.params["min"], self.params["max"], n)
        elif self.distribution == "triangular":
            return np.random.triangular(
                self.params["min"], self.params["mode"], self.params["max"], n
            )
        else:
            raise ValueError(f"不支持的分布类型: {self.distribution}")


class ProbabilisticSensitivityAnalysis:
    """
    概率敏感性分析（PSA）
    
    通过Monte Carlo模拟评估参数不确定性对模型结果的影响
    
    示例：
        >>> psa = ProbabilisticSensitivityAnalysis(n_simulations=1000)
        >>> psa.add_parameter("disease_cost", "gamma", {"shape": 100, "scale": 150})
        >>> psa.add_parameter("utility", "beta", {"alpha": 75, "beta": 25})
        >>> results = psa.run(model_function)
    """
    
    def __init__(self, n_simulations: int = 1000, random_seed: int = 42):
        self.n_simulations = n_simulations
        self.random_seed = random_seed
        self.parameters: Dict[str, ParameterDistribution] = {}
        self._results = None
    
    def add_parameter(
        self,
        name: str,
        distribution: str,
        params: Dict,
        description: str = ""
    ) -> None:
        """添加需要进行PSA的参数"""
        self.parameters[name] = ParameterDistribution(
            name=name,
            distribution=distribution,
            params=params,
            description=description
        )
    
    def add_parameters_from_dict(self, param_dict: Dict) -> None:
        """批量添加参数
        
        Args:
            param_dict: {name: {"distribution": str, "params": dict, "description": str}}
        """
        for name, config in param_dict.items():
            self.add_parameter(
                name=name,
                distribution=config["distribution"],
                params=config["params"],
                description=config.get("description", "")
            )
    
    def run(self, model_function: Callable) -> Dict:
        """
        运行PSA
        
        Args:
            model_function: 接受参数字典并返回 {"cost": float, "qaly": float} 的函数
            
        Returns:
            Dict: PSA结果
        """
        np.random.seed(self.random_seed)
        
        costs = np.zeros(self.n_simulations)
        qalys = np.zeros(self.n_simulations)
        icer_values = np.zeros(self.n_simulations)
        
        # 预采样所有参数
        sampled_params = {}
        for name, param in self.parameters.items():
            sampled_params[name] = param.sample(self.n_simulations)
        
        for i in range(self.n_simulations):
            # 构建第i次模拟的参数
            iteration_params = {
                name: sampled_params[name][i]
                for name in self.parameters
            }
            
            # 运行模型
            result = model_function(iteration_params)
            costs[i] = result.get("cost", 0)
            qalys[i] = result.get("qaly", 0)
            
            if result.get("comparator_cost") and result.get("comparator_qaly"):
                delta_cost = costs[i] - result["comparator_cost"]
                delta_qaly = qalys[i] - result["comparator_qaly"]
                icer_values[i] = delta_cost / delta_qaly if delta_qaly != 0 else np.inf
        
        self._results = {
            "costs": costs,
            "qalys": qalys,
            "icers": icer_values,
            "mean_cost": costs.mean(),
            "mean_qaly": qalys.mean(),
            "std_cost": costs.std(),
            "std_qaly": qalys.std(),
            "median_cost": np.median(costs),
            "median_qaly": np.median(qalys),
            "ci_95_cost": (np.percentile(costs, 2.5), np.percentile(costs, 97.5)),
            "ci_95_qaly": (np.percentile(qalys, 2.5), np.percentile(qalys, 97.5)),
            "n_simulations": self.n_simulations
        }
        
        return self._results
    
    def plot_ce_plane(
        self,
        intervention_label: str = "干预组",
        comparator_label: str = "对照组",
        wtp_threshold: float = 31250
    ) -> Dict:
        """
        生成成本-效果平面图数据
        
        Returns:
            Dict: 绘图数据
        """
        if self._results is None:
            raise ValueError("请先运行PSA")
        
        return {
            "type": "ce_plane",
            "x": self._results["qalys"],
            "y": self._results["costs"],
            "intervention_label": intervention_label,
            "comparator_label": comparator_label,
            "wtp_threshold": wtp_threshold,
            "mean_x": self._results["mean_qaly"],
            "mean_y": self._results["mean_cost"]
        }
    
    def plot_ceac(
        self,
        wtp_range: Tuple[float, float] = (0, 100000),
        n_points: int = 100
    ) -> Dict:
        """
        生成成本-效果可接受曲线（CEAC）数据
        
        Args:
            wtp_range: 意愿支付阈值范围
            n_points: 采样点数
            
        Returns:
            Dict: CEAC绘图数据
        """
        if self._results is None:
            raise ValueError("请先运行PSA")
        
        wtp_values = np.linspace(wtp_range[0], wtp_range[1], n_points)
        ceac_values = np.zeros(n_points)
        
        for i, wtp in enumerate(wtp_values):
            # 计算净货币效益 > 0 的比例
            nmb = wtp * self._results["qalys"] - self._results["costs"]
            ceac_values[i] = (nmb > 0).mean()
        
        return {
            "type": "ceac",
            "wtp_values": wtp_values,
            "ceac_values": ceac_values,
            "optimal_wtp": wtp_values[np.argmax(np.abs(ceac_values - 0.5) < 0.01)] if any(np.abs(ceac_values - 0.5) < 0.01) else None
        }
    
    def plot_evpi(
        self,
        wtp_range: Tuple[float, float] = (0, 100000),
        n_points: int = 100
    ) -> Dict:
        """
        期望完美信息价值（EVPI）数据
        
        Returns:
            Dict: EVPI绘图数据
        """
        if self._results is None:
            raise ValueError("请先运行PSA")
        
        wtp_values = np.linspace(wtp_range[0], wtp_range[1], n_points)
        evpi_values = np.zeros(n_points)
        
        for i, wtp in enumerate(wtp_values):
            nmb = wtp * self._results["qalys"] - self._results["costs"]
            evpi_values[i] = nmb.max() - nmb.mean()
        
        return {
            "type": "evpi",
            "wtp_values": wtp_values,
            "evpi_values": evpi_values
        }
    
    def summary(self) -> str:
        """生成PSA结果摘要"""
        if self._results is None:
            return "PSA尚未运行"
        
        lines = [
            "=" * 60,
            "📊 概率敏感性分析（PSA）结果",
            "=" * 60,
            f"模拟次数: {self._results['n_simulations']}",
            f"参数数量: {len(self.parameters)}",
            "-" * 60,
            f"成本均值: ¥{self._results['mean_cost']:,.2f} ± ¥{self._results['std_cost']:,.2f}",
            f"成本中位数: ¥{self._results['median_cost']:,.2f}",
            f"成本95%CI: ¥{self._results['ci_95_cost'][0]:,.2f} ~ ¥{self._results['ci_95_cost'][1]:,.2f}",
            "-" * 60,
            f"QALY均值: {self._results['mean_qaly']:.4f} ± {self._results['std_qaly']:.4f}",
            f"QALY中位数: {self._results['median_qaly']:.4f}",
            f"QALY95%CI: {self._results['ci_95_qaly'][0]:.4f} ~ {self._results['ci_95_qaly'][1]:.4f}",
            "=" * 60
        ]
        
        return "\n".join(lines)


class DeterministicSensitivityAnalysis:
    """
    确定性敏感性分析（DSA）
    
    支持单因素、双因素敏感性分析和龙卷风图
    """
    
    def __init__(self, base_case_params: Dict):
        """
        Args:
            base_case_params: 基础案例参数 {name: value}
        """
        self.base_case = base_case_params.copy()
        self._results = {}
    
    def one_way(
        self,
        parameter_name: str,
        low: float,
        high: float,
        model_function: Callable,
        n_points: int = 50
    ) -> Dict:
        """
        单因素敏感性分析
        
        Args:
            parameter_name: 参数名称
            low: 参数下限
            high: 参数上限
            model_function: 接受参数字典并返回结果的函数
            n_points: 采样点数
            
        Returns:
            Dict: 分析结果
        """
        values = np.linspace(low, high, n_points)
        costs = np.zeros(n_points)
        qalys = np.zeros(n_points)
        
        for i, value in enumerate(values):
            params = self.base_case.copy()
            params[parameter_name] = value
            result = model_function(params)
            costs[i] = result.get("cost", 0)
            qalys[i] = result.get("qaly", 0)
        
        self._results[parameter_name] = {
            "values": values,
            "costs": costs,
            "qalys": qalys,
            "range": (low, high)
        }
        
        return self._results[parameter_name]
    
    def two_way(
        self,
        param1_name: str,
        param1_range: Tuple[float, float],
        param2_name: str,
        param2_range: Tuple[float, float],
        model_function: Callable,
        n_points: int = 20
    ) -> Dict:
        """
        双因素敏感性分析
        
        Returns:
            Dict: 包含网格结果
        """
        param1_values = np.linspace(param1_range[0], param1_range[1], n_points)
        param2_values = np.linspace(param2_range[0], param2_range[1], n_points)
        
        cost_grid = np.zeros((n_points, n_points))
        qaly_grid = np.zeros((n_points, n_points))
        
        for i, v1 in enumerate(param1_values):
            for j, v2 in enumerate(param2_values):
                params = self.base_case.copy()
                params[param1_name] = v1
                params[param2_name] = v2
                result = model_function(params)
                cost_grid[i, j] = result.get("cost", 0)
                qaly_grid[i, j] = result.get("qaly", 0)
        
        key = f"{param1_name}_vs_{param2_name}"
        self._results[key] = {
            "param1_name": param1_name,
            "param1_values": param1_values,
            "param2_name": param2_name,
            "param2_values": param2_values,
            "cost_grid": cost_grid,
            "qaly_grid": qaly_grid
        }
        
        return self._results[key]
    
    def tornado(
        self,
        parameters: List[Dict],
        model_function: Callable,
        outcome: str = "icer"
    ) -> Dict:
        """
        龙卷风图分析
        
        Args:
            parameters: [{"name": str, "low": float, "high": float}]
            model_function: 模型函数
            outcome: 结局指标 ("icer", "cost", "qaly")
            
        Returns:
            Dict: 龙卷风图数据
        """
        base_result = model_function(self.base_case)
        base_value = base_result.get(outcome, 0)
        
        tornado_data = []
        
        for param in parameters:
            params_low = self.base_case.copy()
            params_low[param["name"]] = param["low"]
            result_low = model_function(params_low)
            value_low = result_low.get(outcome, 0)
            
            params_high = self.base_case.copy()
            params_high[param["name"]] = param["high"]
            result_high = model_function(params_high)
            value_high = result_high.get(outcome, 0)
            
            tornado_data.append({
                "name": param["name"],
                "low_value": min(value_low, value_high),
                "high_value": max(value_low, value_high),
                "range": abs(value_high - value_low),
                "base": base_value
            })
        
        # 按影响范围排序
        tornado_data.sort(key=lambda x: x["range"], reverse=True)
        
        return {
            "type": "tornado",
            "outcome": outcome,
            "base_value": base_value,
            "data": tornado_data
        }
    
    def summary(self) -> str:
        """生成DSA结果摘要"""
        lines = [
            "=" * 60,
            "📊 确定性敏感性分析结果",
            "=" * 60
        ]
        
        for param_name, results in self._results.items():
            if "values" in results:
                lines.append(f"\n参数: {param_name}")
                lines.append(f"  范围: {results['range'][0]:.4f} ~ {results['range'][1]:.4f}")
                lines.append(f"  成本范围: ¥{results['costs'].min():,.2f} ~ ¥{results['costs'].max():,.2f}")
                lines.append(f"  QALY范围: {results['qalys'].min():.4f} ~ {results['qalys'].max():.4f}")
        
        lines.append("=" * 60)
        return "\n".join(lines)


# 预定义常用参数分布
COMMON_DISTRIBUTIONS = {
    "probability": {
        "description": "概率参数（0-1）",
        "recommended": "beta",
        "example": {"alpha": 30, "beta": 70}  # 均值0.3
    },
    "cost": {
        "description": "成本参数",
        "recommended": "gamma",
        "example": {"shape": 100, "scale": 100}  # 均值10000
    },
    "utility": {
        "description": "效用值（0-1）",
        "recommended": "beta",
        "example": {"alpha": 75, "beta": 25}  # 均值0.75
    },
    "relative_risk": {
        "description": "相对风险",
        "recommended": "lognormal",
        "example": {"mu": 0, "sigma": 0.3}
    },
    "hazard_ratio": {
        "description": "风险比",
        "recommended": "lognormal",
        "example": {"mu": -0.1, "sigma": 0.2}
    }
}


# 示例用法
if __name__ == "__main__":
    # 创建PSA实例
    psa = ProbabilisticSensitivityAnalysis(n_simulations=1000)
    
    # 添加参数
    psa.add_parameter("disease_cost", "gamma", {"shape": 100, "scale": 150})
    psa.add_parameter("utility_disease", "beta", {"alpha": 75, "beta": 25})
    psa.add_parameter("transition_prob", "beta", {"alpha": 10, "beta": 90})
    
    # 定义模型函数
    def simple_model(params):
        cost = params["disease_cost"] * 10
        qaly = params["utility_disease"] * 30
        return {"cost": cost, "qaly": qaly}
    
    # 运行PSA
    results = psa.run(simple_model)
    print(psa.summary())
