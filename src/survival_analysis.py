"""
HEOR Modeling Platform — 生存分析模块
支持Kaplan-Meier估计、参数生存模型拟合和分区生存模型（PartSA）
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from scipy import stats, optimize


@dataclass
class SurvivalData:
    """生存数据"""
    times: np.ndarray       # 事件/删失时间
    events: np.ndarray      # 事件指示（1=事件发生，0=删失）
    groups: Optional[np.ndarray] = None  # 分组标签


class KaplanMeierEstimator:
    """
    Kaplan-Meier 生存估计
    
    示例：
        >>> km = KaplanMeierEstimator()
        >>> km.fit(times=[1,2,3,4,5], events=[1,0,1,1,0])
        >>> km.survival_function()
    """
    
    def __init__(self):
        self.survival_times = None
        self.survival_probs = None
        self.confidence_lower = None
        self.confidence_upper = None
        self.median_survival = None
        self.n_at_risk = None
    
    def fit(
        self,
        times: List[float],
        events: List[int],
        confidence_level: float = 0.95
    ) -> Dict:
        """拟合KM生存曲线"""
        times = np.array(times)
        events = np.array(events)
        
        # 按时间排序
        sorted_idx = np.argsort(times)
        times = times[sorted_idx]
        events = events[sorted_idx]
        
        n = len(times)
        
        # 获取所有事件时间点
        event_times = np.unique(times[events == 1])
        
        survival_probs = [1.0]
        survival_times = [0.0]
        n_risk_list = [n]
        var_list = [0.0]
        
        current_survival = 1.0
        n_at_risk = n
        
        for t in event_times:
            # 在时间t之前删失的人数
            n_censored_before = np.sum((times < t) & (events == 0))
            n_at_risk -= n_censored_before
            
            # 在时间t发生事件的人数
            n_events = np.sum((times == t) & (events == 1))
            
            # 更新生存概率
            current_survival *= (1 - n_events / n_at_risk)
            
            # Greenwood方差
            var = current_survival ** 2 * np.sum(
                n_events / (n_at_risk * (n_at_risk - n_events))
                if n_at_risk > n_events else 0
            )
            
            survival_probs.append(current_survival)
            survival_times.append(t)
            n_risk_list.append(n_at_risk - n_events)
            var_list.append(var)
            
            n_at_risk -= n_events
        
        self.survival_times = np.array(survival_times)
        self.survival_probs = np.array(survival_probs)
        self.n_at_risk = np.array(n_risk_list)
        
        # 置信区间
        z = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        se = np.sqrt(var_list)
        self.confidence_lower = np.clip(self.survival_probs - z * se, 0, 1)
        self.confidence_upper = np.clip(self.survival_probs + z * se, 0, 1)
        
        # 中位生存时间
        self.median_survival = self._find_median()
        
        return {
            "times": self.survival_times,
            "survival": self.survival_probs,
            "ci_lower": self.confidence_lower,
            "ci_upper": self.confidence_upper,
            "median_survival": self.median_survival,
            "n_at_risk": self.n_at_risk
        }
    
    def _find_median(self) -> Optional[float]:
        """查找中位生存时间"""
        for i, p in enumerate(self.survival_probs):
            if p <= 0.5:
                return self.survival_times[i]
        return None
    
    def survival_at_time(self, t: float) -> float:
        """获取特定时间点的生存概率"""
        if self.survival_times is None:
            raise ValueError("请先调用 fit() 方法")
        idx = np.searchsorted(self.survival_times, t, side='right') - 1
        if idx < 0:
            return 1.0
        return self.survival_probs[idx]
    
    def restricted_mean_survival_time(self, tau: float) -> float:
        """计算限制平均生存时间（RMST）"""
        if self.survival_times is None:
            raise ValueError("请先调用 fit() 方法")
        
        times = self.survival_times
        probs = self.survival_probs
        
        # 限制在tau以内
        mask = times <= tau
        times = np.append(times[mask], tau)
        probs = np.append(probs[mask], self.survival_at_time(tau))
        
        # 计算梯形面积
        rmst = np.sum(np.diff(times) * probs[:-1])
        return rmst


class ParametricSurvivalModel:
    """
    参数生存模型 — 支持Weibull、指数、Log-normal、Log-logistic、Gompertz分布
    
    示例：
        >>> model = ParametricSurvivalModel(distribution="weibull")
        >>> model.fit(times=[1,2,3,4,5], events=[1,0,1,1,0])
        >>> model.predict_survival(np.array([1, 2, 3, 5, 10]))
    """
    
    DISTRIBUTIONS = {
        "exponential": {"params": ["lambda"], "bounds": [(1e-10, None)]},
        "weibull": {"params": ["shape", "scale"], "bounds": [(1e-10, None), (1e-10, None)]},
        "lognormal": {"params": ["mu", "sigma"], "bounds": [(None, None), (1e-10, None)]},
        "loglogistic": {"params": ["alpha", "beta"], "bounds": [(1e-10, None), (1e-10, None)]},
        "gompertz": {"params": ["shape", "rate"], "bounds": [(None, None), (1e-10, None)]}
    }
    
    def __init__(self, distribution: str = "weibull"):
        if distribution not in self.DISTRIBUTIONS:
            raise ValueError(f"不支持的分布: {distribution}，可选: {list(self.DISTRIBUTIONS.keys())}")
        self.distribution = distribution
        self.params = None
        self.aic = None
        self.bic = None
        self.log_likelihood = None
    
    def _survival_function(self, t: np.ndarray, params: Tuple) -> np.ndarray:
        """生存函数"""
        dist = self.distribution
        if dist == "exponential":
            lam = params[0]
            return np.exp(-lam * t)
        elif dist == "weibull":
            shape, scale = params
            return np.exp(-(t / scale) ** shape)
        elif dist == "lognormal":
            mu, sigma = params
            return 1 - stats.norm.cdf((np.log(t) - mu) / sigma)
        elif dist == "loglogistic":
            alpha, beta = params
            return 1 / (1 + (t / alpha) ** beta)
        elif dist == "gompertz":
            shape, rate = params
            return np.exp(-rate / shape * (np.exp(shape * t) - 1))
    
    def _hazard_function(self, t: np.ndarray, params: Tuple) -> np.ndarray:
        """风险函数"""
        dist = self.distribution
        if dist == "exponential":
            return np.full_like(t, params[0])
        elif dist == "weibull":
            shape, scale = params
            return (shape / scale) * (t / scale) ** (shape - 1)
        elif dist == "lognormal":
            mu, sigma = params
            z = (np.log(t) - mu) / sigma
            pdf = stats.norm.pdf(z) / (sigma * t)
            sf = 1 - stats.norm.cdf(z)
            return pdf / np.clip(sf, 1e-10, 1)
        elif dist == "loglogistic":
            alpha, beta = params
            return (beta / alpha) * (t / alpha) ** (beta - 1) / (1 + (t / alpha) ** beta)
        elif dist == "gompertz":
            shape, rate = params
            return rate * np.exp(shape * t)
    
    def _negative_log_likelihood(self, params: Tuple, times: np.ndarray, events: np.ndarray) -> float:
        """负对数似然"""
        S = self._survival_function(times, params)
        h = self._hazard_function(times, params)
        
        S = np.clip(S, 1e-10, 1)
        h = np.clip(h, 1e-10, None)
        
        nll = -np.sum(events * np.log(h) + np.log(S))
        return nll
    
    def fit(self, times: List[float], events: List[int]) -> Dict:
        """拟合参数生存模型"""
        times = np.array(times, dtype=float)
        events = np.array(events, dtype=float)
        
        bounds = self.DISTRIBUTIONS[self.distribution]["bounds"]
        
        # 初始参数估计
        x0 = self._initial_params(times, events)
        
        result = optimize.minimize(
            self._negative_log_likelihood,
            x0=x0,
            args=(times, events),
            bounds=bounds,
            method='L-BFGS-B'
        )
        
        self.params = tuple(result.x)
        self.log_likelihood = -result.fun
        k = len(self.params)
        n = len(times)
        self.aic = 2 * k - 2 * self.log_likelihood
        self.bic = k * np.log(n) - 2 * self.log_likelihood
        
        return {
            "distribution": self.distribution,
            "params": dict(zip(self.DISTRIBUTIONS[self.distribution]["params"], self.params)),
            "log_likelihood": self.log_likelihood,
            "aic": self.aic,
            "bic": self.bic,
            "converged": result.success
        }
    
    def _initial_params(self, times: np.ndarray, events: np.ndarray) -> List[float]:
        """初始参数估计"""
        mean_time = np.mean(times[events == 1]) if np.any(events == 1) else np.mean(times)
        
        if self.distribution == "exponential":
            return [1.0 / max(mean_time, 0.1)]
        elif self.distribution == "weibull":
            return [1.0, max(mean_time, 0.1)]
        elif self.distribution == "lognormal":
            log_times = np.log(times[times > 0])
            return [np.mean(log_times), max(np.std(log_times), 0.1)]
        elif self.distribution == "loglogistic":
            return [max(mean_time, 0.1), 1.0]
        elif self.distribution == "gompertz":
            return [0.1, 1.0 / max(mean_time, 0.1)]
    
    def predict_survival(self, times: np.ndarray) -> np.ndarray:
        """预测生存概率"""
        if self.params is None:
            raise ValueError("请先调用 fit() 方法")
        return self._survival_function(times, self.params)
    
    def predict_hazard(self, times: np.ndarray) -> np.ndarray:
        """预测风险函数"""
        if self.params is None:
            raise ValueError("请先调用 fit() 方法")
        return self._hazard_function(times, self.params)
    
    def predict_rmtst(self, tau: float, n_points: int = 1000) -> float:
        """预测限制平均生存时间"""
        t = np.linspace(0, tau, n_points)
        S = self.predict_survival(t)
        return np.trapz(S, t)
    
    @staticmethod
    def fit_all_distributions(times: List[float], events: List[int]) -> List[Dict]:
        """拟合所有支持的分布，返回按AIC排序的结果"""
        results = []
        for dist_name in ParametricSurvivalModel.DISTRIBUTIONS:
            try:
                model = ParametricSurvivalModel(distribution=dist_name)
                result = model.fit(times, events)
                results.append(result)
            except Exception:
                pass
        results.sort(key=lambda x: x["aic"])
        return results


class PartitionedSurvivalModel:
    """
    分区生存模型（PartSA）
    
    基于PFS和OS曲线的分区生存模型，特别适用于肿瘤药物经济学评价。
    
    状态：PFS（无进展生存）→ PPS（进展后生存）→ 死亡
    
    示例：
        >>> psa = PartitionedSurvivalModel(num_cycles=60, cycle_length=1)
        >>> psa.set_pfs_params("weibull", shape=0.85, scale=14.2)
        >>> psa.set_os_params("weibull", shape=0.92, scale=22.5)
        >>> results = psa.run()
    """
    
    def __init__(
        self,
        num_cycles: int = 60,
        cycle_length: float = 1.0,
        cycle_unit: str = "月",
        half_cycle_correction: bool = True,
        discount_rate: float = 0.03
    ):
        self.num_cycles = num_cycles
        self.cycle_length = cycle_length
        self.cycle_unit = cycle_unit
        self.half_cycle_correction = half_cycle_correction
        self.discount_rate = discount_rate
        
        self.pfs_model = ParametricSurvivalModel(distribution="weibull")
        self.os_model = ParametricSurvivalModel(distribution="weibull")
        
        self.costs = {"PFS": {}, "PPS": {}, "死亡": {}}
        self.utilities = {"PFS": 0.8, "PPS": 0.5, "死亡": 0.0}
        self._results = None
    
    def set_pfs_params(self, distribution: str, **params):
        """设置PFS模型参数"""
        self.pfs_model = ParametricSurvivalModel(distribution=distribution)
        self.pfs_model.params = tuple(params.values())
    
    def set_os_params(self, distribution: str, **params):
        """设置OS模型参数"""
        self.os_model = ParametricSurvivalModel(distribution=distribution)
        self.os_model.params = tuple(params.values())
    
    def set_costs(self, state: str, costs: Dict[str, float]):
        """设置状态成本"""
        self.costs[state] = costs
    
    def set_utilities(self, utilities: Dict[str, float]):
        """设置效用值"""
        self.utilities.update(utilities)
    
    def run(self) -> Dict:
        """运行分区生存模型"""
        times = np.arange(0, self.num_cycles + 1) * self.cycle_length
        
        # PFS和OS生存概率
        pfs_probs = self.pfs_model.predict_survival(times)
        os_probs = self.os_model.predict_survival(times)
        
        # PPS概率 = OS - PFS
        pps_probs = os_probs - pfs_probs
        pps_probs = np.clip(pps_probs, 0, None)
        
        # 死亡概率
        death_probs = 1 - os_probs
        
        # 各状态人数（每个周期末）
        n_pfs = pfs_probs
        n_pps = pps_probs
        n_death = death_probs
        
        # 半周期校正
        if self.half_cycle_correction:
            n_pfs_hc = (n_pfs[:-1] + n_pfs[1:]) / 2
            n_pps_hc = (n_pps[:-1] + n_pps[1:]) / 2
            n_death_hc = (n_death[:-1] + n_death[1:]) / 2
        else:
            n_pfs_hc = n_pfs[1:]
            n_pps_hc = n_pps[1:]
            n_death_hc = n_death[1:]
        
        # 贴现因子
        cycle_times = np.arange(1, self.num_cycles + 1) * self.cycle_length
        discount_factors = 1 / (1 + self.discount_rate) ** (cycle_times / 12)
        
        # 计算QALYs
        qaly_pfs = np.sum(n_pfs_hc * self.utilities.get("PFS", 0.8) * self.cycle_length / 12 * discount_factors)
        qaly_pps = np.sum(n_pps_hc * self.utilities.get("PPS", 0.5) * self.cycle_length / 12 * discount_factors)
        total_qaly = qaly_pfs + qaly_pps
        
        # 计算成本
        cost_pfs = np.sum(n_pfs_hc * sum(self.costs.get("PFS", {}).values()) * discount_factors)
        cost_pps = np.sum(n_pps_hc * sum(self.costs.get("PPS", {}).values()) * discount_factors)
        cost_death = np.sum(np.diff(death_probs) * sum(self.costs.get("死亡", {}).values()) * discount_factors[1:])
        total_cost = cost_pfs + cost_pps + cost_death
        
        # PFS和OS中位数
        median_pfs = self._find_median(pfs_probs, times)
        median_os = self._find_median(os_probs, times)
        
        self._results = {
            "pfs_curve": pfs_probs,
            "os_curve": os_probs,
            "pps_curve": pps_probs,
            "death_curve": death_probs,
            "times": times,
            "total_qaly": total_qaly,
            "total_cost": total_cost,
            "qaly_pfs": qaly_pfs,
            "qaly_pps": qaly_pps,
            "cost_pfs": cost_pfs,
            "cost_pps": cost_pps,
            "median_pfs": median_pfs,
            "median_os": median_os
        }
        
        return self._results
    
    def _find_median(self, survival_probs: np.ndarray, times: np.ndarray) -> Optional[float]:
        """查找中位生存时间"""
        for i, p in enumerate(survival_probs):
            if p <= 0.5:
                return times[i]
        return None
    
    def summary(self) -> str:
        """生成模型摘要"""
        if self._results is None:
            self.run()
        
        r = self._results
        lines = [
            "=" * 60,
            "📊 分区生存模型（PartSA）运行结果",
            "=" * 60,
            f"周期: {self.num_cycles} × {self.cycle_length} {self.cycle_unit}",
            f"贴现率: {self.discount_rate * 100:.1f}%",
            f"半周期校正: {'是' if self.half_cycle_correction else '否'}",
            "-" * 60,
            f"中位PFS: {r['median_pfs']:.1f} {self.cycle_unit}" if r['median_pfs'] else "中位PFS: 未达到",
            f"中位OS: {r['median_os']:.1f} {self.cycle_unit}" if r['median_os'] else "中位OS: 未达到",
            "-" * 60,
            f"总QALY: {r['total_qaly']:.4f}",
            f"  PFS阶段: {r['qaly_pfs']:.4f}",
            f"  PPS阶段: {r['qaly_pps']:.4f}",
            "-" * 60,
            f"总成本: ¥{r['total_cost']:,.2f}",
            f"  PFS阶段: ¥{r['cost_pfs']:,.2f}",
            f"  PPS阶段: ¥{r['cost_pps']:,.2f}",
            "=" * 60
        ]
        return "\n".join(lines)


if __name__ == "__main__":
    # Kaplan-Meier示例
    print("=== Kaplan-Meier 生存分析 ===")
    km = KaplanMeierEstimator()
    times = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 24]
    events = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]
    result = km.fit(times, events)
    print(f"中位生存时间: {result['median_survival']} 月")
    
    # 参数模型示例
    print("\n=== 参数生存模型对比 ===")
    all_results = ParametricSurvivalModel.fit_all_distributions(times, events)
    for r in all_results:
        print(f"{r['distribution']}: AIC={r['aic']:.2f}, BIC={r['bic']:.2f}")
    
    # 分区生存模型示例
    print("\n=== 分区生存模型 ===")
    psa = PartitionedSurvivalModel(num_cycles=60)
    psa.set_pfs_params("weibull", shape=0.85, scale=14.2)
    psa.set_os_params("weibull", shape=0.92, scale=22.5)
    psa.set_costs("PFS", {"drug": 8500, "monitoring": 2000})
    psa.set_costs("PPS", {"treatment": 12000, "palliative": 6000})
    psa.set_utilities({"PFS": 0.80, "PPS": 0.55, "死亡": 0.0})
    psa.run()
    print(psa.summary())
