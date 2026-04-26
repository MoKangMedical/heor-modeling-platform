"""
HEOR Modeling Platform — Markov队列模型引擎
支持多状态Markov模型，含半周期校正、贴现和敏感性分析接口
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ModelState:
    """Markov模型状态"""
    name: str
    cost: float = 0.0
    utility: float = 0.0
    is_absorbing: bool = False


@dataclass
class TransitionProbability:
    """转移概率"""
    from_state: str
    to_state: str
    probability: float
    distribution: str = "fixed"  # fixed, beta, normal
    params: Optional[Dict] = None


class MarkovModel:
    """
    Markov队列模型
    
    支持功能：
    - 多状态Markov模型
    - 半周期校正（Half-cycle correction）
    - 成本和效用贴现
    - 队列向量计算
    - 基础敏感性分析接口
    
    示例：
        >>> model = MarkovModel(
        ...     states=["健康", "疾病", "死亡"],
        ...     cycle_length=1,
        ...     num_cycles=30,
        ...     discount_rate=0.03
        ... )
        >>> model.set_transition_matrix([
        ...     [0.85, 0.10, 0.05],
        ...     [0.00, 0.75, 0.25],
        ...     [0.00, 0.00, 1.00]
        ... ])
        >>> results = model.run()
    """
    
    def __init__(
        self,
        states: List[str],
        cycle_length: float = 1.0,
        cycle_unit: str = "年",
        num_cycles: int = 30,
        half_cycle_correction: bool = True,
        discount_rate: float = 0.03,
        discount_type: str = "连续",
        initial_distribution: Optional[List[float]] = None
    ):
        self.states = states
        self.num_states = len(states)
        self.cycle_length = cycle_length
        self.cycle_unit = cycle_unit
        self.num_cycles = num_cycles
        self.half_cycle_correction = half_cycle_correction
        self.discount_rate = discount_rate
        self.discount_type = discount_type
        
        # 初始分布：默认全在第一个状态
        if initial_distribution is None:
            self.initial_distribution = [1.0] + [0.0] * (self.num_states - 1)
        else:
            self.initial_distribution = initial_distribution
        
        # 转移矩阵
        self.transition_matrix = np.eye(self.num_states)
        
        # 成本和效用
        self.costs = {state: 0.0 for state in states}
        self.utilities = {state: 0.0 for state in states}
        
        # 计算结果缓存
        self._results = None
    
    def set_transition_matrix(self, matrix: List[List[float]]) -> None:
        """设置转移概率矩阵"""
        matrix = np.array(matrix)
        assert matrix.shape == (self.num_states, self.num_states), \
            f"转移矩阵维度应为 ({self.num_states}, {self.num_states})"
        
        # 验证每行之和为1
        for i, row_sum in enumerate(matrix.sum(axis=1)):
            if not np.isclose(row_sum, 1.0, atol=1e-6):
                raise ValueError(f"状态 '{self.states[i]}' 的转移概率之和为 {row_sum:.4f}，应为1.0")
        
        self.transition_matrix = matrix
        self._results = None
    
    def set_transition(self, from_state: str, to_state: str, probability: float) -> None:
        """设置单个转移概率"""
        from_idx = self.states.index(from_state)
        to_idx = self.states.index(to_state)
        self.transition_matrix[from_idx, to_idx] = probability
        self._results = None
    
    def set_state_costs(self, state: str, cost: float) -> None:
        """设置状态成本"""
        if state not in self.states:
            raise ValueError(f"未知状态: {state}")
        self.costs[state] = cost
        self._results = None
    
    def set_state_utilities(self, state: str, utility: float) -> None:
        """设置状态效用值"""
        if state not in self.states:
            raise ValueError(f"未知状态: {state}")
        if not 0 <= utility <= 1:
            raise ValueError(f"效用值应在0-1之间，当前值: {utility}")
        self.utilities[state] = utility
        self._results = None
    
    def set_costs(self, costs: Dict[str, float]) -> None:
        """批量设置状态成本"""
        for state, cost in costs.items():
            self.set_state_costs(state, cost)
    
    def set_utilities(self, utilities: Dict[str, float]) -> None:
        """批量设置状态效用值"""
        for state, utility in utilities.items():
            self.set_state_utilities(state, utility)
    
    def _get_discount_factor(self, cycle: int) -> float:
        """计算贴现因子"""
        time = cycle * self.cycle_length
        if self.discount_type == "连续":
            return np.exp(-self.discount_rate * time)
        else:  # 离散
            return 1 / (1 + self.discount_rate) ** time
    
    def _apply_half_cycle_correction(
        self, cycle_results: np.ndarray
    ) -> np.ndarray:
        """应用半周期校正"""
        if not self.half_cycle_correction:
            return cycle_results
        
        corrected = cycle_results.copy()
        # 第一个和最后一个周期折半
        corrected[0] = cycle_results[0] * 0.5
        corrected[-1] = cycle_results[-1] * 0.5
        # 中间周期取相邻两个周期的平均
        for i in range(1, len(cycle_results) - 1):
            corrected[i] = (cycle_results[i] + cycle_results[i - 1]) / 2
        return corrected
    
    def run(self) -> Dict:
        """
        运行Markov模型
        
        Returns:
            Dict: 包含以下键值：
                - trace: 状态分布矩阵 (num_cycles+1, num_states)
                - total_cost: 总贴现成本
                - total_qaly: 总贴现QALY
                - cycle_costs: 每周期成本
                - cycle_qalys: 每周期QALY
                - undiscounted_cost: 未贴现成本
                - undiscounted_qaly: 未贴现QALY
        """
        # 初始化轨迹矩阵
        trace = np.zeros((self.num_cycles + 1, self.num_states))
        trace[0] = self.initial_distribution
        
        # 运行模型
        for cycle in range(1, self.num_cycles + 1):
            trace[cycle] = trace[cycle - 1] @ self.transition_matrix
        
        # 计算每周期的加权成本和效用
        cost_vector = np.array([self.costs[s] for s in self.states])
        utility_vector = np.array([self.utilities[s] for s in self.states])
        
        cycle_costs = trace[1:] @ cost_vector  # 从第1周期开始
        cycle_qalys = trace[1:] @ utility_vector * self.cycle_length
        
        # 应用半周期校正
        if self.half_cycle_correction:
            cycle_costs = self._apply_half_cycle_correction(cycle_costs)
            cycle_qalys = self._apply_half_cycle_correction(cycle_qalys)
        
        # 计算贴现
        discount_factors = np.array([
            self._get_discount_factor(c) for c in range(1, self.num_cycles + 1)
        ])
        
        discounted_costs = cycle_costs * discount_factors
        discounted_qalys = cycle_qalys * discount_factors
        
        self._results = {
            "trace": trace,
            "total_cost": discounted_costs.sum(),
            "total_qaly": discounted_qalys.sum(),
            "cycle_costs": cycle_costs,
            "cycle_qalys": cycle_qalys,
            "discounted_cycle_costs": discounted_costs,
            "discounted_cycle_qalys": discounted_qalys,
            "undiscounted_cost": cycle_costs.sum(),
            "undiscounted_qaly": cycle_qalys.sum(),
            "discount_factors": discount_factors
        }
        
        return self._results
    
    def get_trace(self) -> np.ndarray:
        """获取状态分布轨迹"""
        if self._results is None:
            self.run()
        return self._results["trace"]
    
    def get_total_cost(self) -> float:
        """获取总贴现成本"""
        if self._results is None:
            self.run()
        return self._results["total_cost"]
    
    def get_total_qaly(self) -> float:
        """获取总贴现QALY"""
        if self._results is None:
            self.run()
        return self._results["total_qaly"]
    
    def run_psa(
        self,
        n_simulations: int = 1000,
        cost_distributions: Optional[Dict] = None,
        utility_distributions: Optional[Dict] = None,
        transition_distributions: Optional[Dict] = None
    ) -> Dict:
        """
        概率敏感性分析（PSA）接口
        
        Args:
            n_simulations: 模拟次数
            cost_distributions: 成本分布参数 {state: (dist_name, params)}
            utility_distributions: 效用分布参数 {state: (dist_name, params)}
            transition_distributions: 转移概率分布参数
            
        Returns:
            Dict: PSA结果，包含costs和qalys数组
        """
        psa_costs = np.zeros(n_simulations)
        psa_qalys = np.zeros(n_simulations)
        
        original_costs = self.costs.copy()
        original_utilities = self.utilities.copy()
        original_matrix = self.transition_matrix.copy()
        
        for i in range(n_simulations):
            # 采样成本
            if cost_distributions:
                for state, (dist, params) in cost_distributions.items():
                    if dist == "gamma":
                        self.costs[state] = np.random.gamma(params["shape"], params["scale"])
                    elif dist == "lognormal":
                        self.costs[state] = np.random.lognormal(params["mu"], params["sigma"])
            
            # 采样效用
            if utility_distributions:
                for state, (dist, params) in utility_distributions.items():
                    if dist == "beta":
                        self.utilities[state] = np.random.beta(params["alpha"], params["beta"])
            
            # 采样转移概率（Dirichlet分布）
            if transition_distributions:
                for from_idx, alphas in transition_distributions.items():
                    sampled = np.random.dirichlet(alphas)
                    self.transition_matrix[from_idx] = sampled
            
            # 运行模型
            results = self.run()
            psa_costs[i] = results["total_cost"]
            psa_qalys[i] = results["total_qaly"]
            
            # 恢复原始参数
            self.costs = original_costs.copy()
            self.utilities = original_utilities.copy()
            self.transition_matrix = original_matrix.copy()
            self._results = None
        
        return {
            "costs": psa_costs,
            "qalys": psa_qalys,
            "mean_cost": psa_costs.mean(),
            "mean_qaly": psa_qalys.mean(),
            "std_cost": psa_costs.std(),
            "std_qaly": psa_qalys.std()
        }
    
    def sensitivity_one_way(
        self,
        parameter: str,
        values: List[float],
        state: Optional[str] = None
    ) -> List[Dict]:
        """
        单因素敏感性分析
        
        Args:
            parameter: 参数类型 ("cost", "utility", "transition")
            values: 参数值列表
            state: 状态名称
            
        Returns:
            List[Dict]: 每个值对应的模型结果
        """
        results = []
        original_cost = self.costs.get(state, 0)
        original_utility = self.utilities.get(state, 0)
        
        for value in values:
            if parameter == "cost" and state:
                self.costs[state] = value
                self._results = None
            elif parameter == "utility" and state:
                self.utilities[state] = value
                self._results = None
            
            run_result = self.run()
            results.append({
                "value": value,
                "total_cost": run_result["total_cost"],
                "total_qaly": run_result["total_qaly"]
            })
        
        # 恢复原始值
        if state:
            if parameter == "cost":
                self.costs[state] = original_cost
            elif parameter == "utility":
                self.utilities[state] = original_utility
            self._results = None
        
        return results
    
    def summary(self) -> str:
        """生成模型摘要"""
        if self._results is None:
            self.run()
        
        lines = [
            "=" * 60,
            "📊 Markov模型运行结果摘要",
            "=" * 60,
            f"模型类型: Markov队列模型",
            f"状态数: {self.num_states}",
            f"状态: {', '.join(self.states)}",
            f"周期: {self.num_cycles} × {self.cycle_length} {self.cycle_unit}",
            f"半周期校正: {'是' if self.half_cycle_correction else '否'}",
            f"贴现率: {self.discount_rate * 100:.1f}%",
            "-" * 60,
            f"总贴现成本: ¥{self._results['total_cost']:,.2f}",
            f"总贴现QALY: {self._results['total_qaly']:.4f}",
            f"未贴现成本: ¥{self._results['undiscounted_cost']:,.2f}",
            f"未贴现QALY: {self._results['undiscounted_qaly']:.4f}",
            "=" * 60
        ]
        
        return "\n".join(lines)


# 示例用法
if __name__ == "__main__":
    # 创建3状态Markov模型
    model = MarkovModel(
        states=["健康", "疾病", "死亡"],
        cycle_length=1,
        num_cycles=30,
        half_cycle_correction=True,
        discount_rate=0.03
    )
    
    # 设置转移矩阵
    model.set_transition_matrix([
        [0.85, 0.10, 0.05],
        [0.00, 0.75, 0.25],
        [0.00, 0.00, 1.00]
    ])
    
    # 设置成本和效用
    model.set_costs({
        "健康": 0,
        "疾病": 15000,
        "死亡": 0
    })
    
    model.set_utilities({
        "健康": 1.00,
        "疾病": 0.75,
        "死亡": 0.00
    })
    
    # 运行模型
    results = model.run()
    print(model.summary())
