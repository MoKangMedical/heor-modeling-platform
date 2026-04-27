"""微观模拟模块 - HEOR Modeling Platform"""

import numpy as np
import uuid
from typing import Dict, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class PatientProfile:
    """患者档案"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    age: int = 50
    gender: str = "unknown"
    baseline_state: str = "healthy"
    attributes: Dict = field(default_factory=dict)
    history: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "id": self.id, "age": self.age, "gender": self.gender,
            "baseline_state": self.baseline_state, "attributes": self.attributes
        }


@dataclass
class MicroSimResult:
    """微观模拟结果"""
    patient_id: str = ""
    state_path: List[str] = field(default_factory=list)
    costs: List[float] = field(default_factory=list)
    qalys: List[float] = field(default_factory=list)
    total_cost: float = 0
    total_qaly: float = 0
    survival_time: float = 0
    events: List[Dict] = field(default_factory=list)


class MicroSimulation:
    """微观模拟引擎"""

    def __init__(self):
        self.states: List[str] = []
        self.transitions: Dict[str, Dict[str, float]] = {}
        self.state_costs: Dict[str, float] = {}
        self.state_utilities: Dict[str, float] = {}
        self.cycle_length: float = 1.0  # 年
        self.discount_rate: float = 0.03
        self.max_cycles: int = 100

    def set_states(self, states: List[str]) -> None:
        self.states = states

    def set_transition(self, from_state: str, to_state: str,
                       probability: float, age_modifier: Optional[Callable] = None) -> None:
        if from_state not in self.transitions:
            self.transitions[from_state] = {}
        self.transitions[from_state][to_state] = probability

    def set_state_cost(self, state: str, cost: float) -> None:
        self.state_costs[state] = cost

    def set_state_utility(self, state: str, utility: float) -> None:
        self.state_utilities[state] = utility

    def _get_transition_probs(self, current_state: str, patient: PatientProfile,
                               cycle: int) -> Dict[str, float]:
        """获取转移概率（可含年龄修正）"""
        probs = self.transitions.get(current_state, {})
        return probs

    def _select_next_state(self, probs: Dict[str, str]) -> str:
        """根据概率选择下一状态"""
        if not probs:
            return "death"
        states = list(probs.keys())
        probabilities = list(probs.values())
        total = sum(probabilities)
        if total > 0:
            probabilities = [p / total for p in probabilities]
        else:
            return states[0] if states else "death"
        return np.random.choice(states, p=probabilities)

    def simulate_patient(self, patient: PatientProfile,
                         max_cycles: Optional[int] = None) -> MicroSimResult:
        """模拟单个患者"""
        max_c = max_cycles or self.max_cycles
        current_state = patient.baseline_state
        state_path = [current_state]
        costs = []
        qalys = []
        events = []

        for cycle in range(max_c):
            # 计算成本和效用
            cost = self.state_costs.get(current_state, 0)
            utility = self.state_utilities.get(current_state, 0)
            discount_factor = 1 / (1 + self.discount_rate) ** cycle
            costs.append(cost * discount_factor)
            qalys.append(utility * self.cycle_length * discount_factor)

            # 检查吸收状态
            if current_state in ("death",):
                break

            # 转移
            probs = self._get_transition_probs(current_state, patient, cycle)
            next_state = self._select_next_state(probs)
            if next_state != current_state:
                events.append({
                    "cycle": cycle, "from": current_state,
                    "to": next_state, "age": patient.age + cycle * self.cycle_length
                })
            current_state = next_state
            state_path.append(current_state)

        result = MicroSimResult(
            patient_id=patient.id,
            state_path=state_path,
            costs=costs, qalys=qalys,
            total_cost=sum(costs),
            total_qaly=sum(qalys),
            survival_time=len(state_path) * self.cycle_length,
            events=events
        )
        patient.history.append(result.__dict__)
        return result

    def run_cohort(self, patients: List[PatientProfile],
                   max_cycles: Optional[int] = None) -> List[MicroSimResult]:
        """运行队列模拟"""
        return [self.simulate_patient(p, max_cycles) for p in patients]

    def run_n_patients(self, n: int, baseline_state: str = "healthy",
                       age_range: Tuple[int, int] = (30, 70)) -> List[MicroSimResult]:
        """生成并运行N个患者"""
        patients = []
        for i in range(n):
            age = np.random.randint(age_range[0], age_range[1])
            patients.append(PatientProfile(
                id=f"patient_{i}", age=age,
                baseline_state=baseline_state
            ))
        return self.run_cohort(patients)

    def summarize_results(self, results: List[MicroSimResult]) -> Dict:
        """汇总结果"""
        costs = [r.total_cost for r in results]
        qalys = [r.total_qaly for r in results]
        survivals = [r.survival_time for r in results]
        return {
            "n_patients": len(results),
            "mean_cost": float(np.mean(costs)),
            "std_cost": float(np.std(costs)),
            "mean_qaly": float(np.mean(qalys)),
            "std_qaly": float(np.std(qalys)),
            "mean_survival": float(np.mean(survivals)),
            "median_survival": float(np.median(survivals)),
            "ic_ratio": float(np.mean(costs) / max(np.mean(qalys), 0.001)),
        }

    def generate_patients(self, n: int, age_dist: Dict = None) -> List[PatientProfile]:
        """生成患者群体"""
        age_dist = age_dist or {"mean": 55, "std": 10}
        patients = []
        for i in range(n):
            age = int(np.random.normal(age_dist["mean"], age_dist["std"]))
            age = max(18, min(100, age))
            gender = np.random.choice(["male", "female"])
            patients.append(PatientProfile(
                id=f"sim_{i}", age=age, gender=gender,
                baseline_state=self.states[0] if self.states else "healthy"
            ))
        return patients
