# Predictive SLA Engine
# ============================================
# Hybrid Rule-Based + ML approach for SLA prediction
# Predicts resolution time and breach probability

"""
Predictive SLA Engine for SmartClaim

This module implements a hybrid approach to SLA prediction:
1. Rule-Based Baseline: Deterministic rules based on category/priority
2. ML Model: XGBoost/LightGBM trained on historical data
3. Hybrid Decision Engine: Combines both approaches

OUTPUT CONTRACT:
{
    "predicted_resolution_hours": float,
    "breach_probability": float (0.0-1.0),
    "risk_level": "low" | "medium" | "high" | "critical",
    "explanation": string,
    "confidence": float (0.0-1.0),
    "factors": [
        {"name": string, "impact": "positive" | "negative", "weight": float}
    ]
}
"""

import os
import json
import logging
import pickle
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# ENUMS & CONSTANTS
# ============================================

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Category(str, Enum):
    SAFETY = "safety"
    QUALITY = "quality"
    MAINTENANCE = "maintenance"
    LOGISTICS = "logistics"
    HR = "hr"
    IT = "IT"
    LEGAL = "legal"
    FINANCE = "finance"
    OTHER = "other"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Base SLA hours by category (deterministic baseline)
CATEGORY_BASE_SLA = {
    Category.SAFETY: 4,       # Safety issues need urgent resolution
    Category.QUALITY: 24,     # Quality within 1 day
    Category.MAINTENANCE: 48, # Maintenance within 2 days
    Category.LOGISTICS: 24,   # Logistics within 1 day
    Category.HR: 72,          # HR issues within 3 days
    Category.IT: 16,          # IT within same day/next day
    Category.LEGAL: 120,      # Legal takes longer
    Category.FINANCE: 72,     # Finance within 3 days
    Category.OTHER: 48,       # Default 2 days
}

# Priority multipliers
PRIORITY_MULTIPLIER = {
    Priority.CRITICAL: 0.25,  # 4x faster
    Priority.HIGH: 0.5,       # 2x faster
    Priority.MEDIUM: 1.0,     # Baseline
    Priority.LOW: 1.5,        # 1.5x slower
}

# Visual severity impact on SLA
VISUAL_SEVERITY_MULTIPLIER = {
    "critical": 0.5,   # Visual evidence of critical issue
    "high": 0.75,
    "medium": 1.0,
    "low": 1.2,
}

# Business hours per day (for calculation)
BUSINESS_HOURS_PER_DAY = 8


# ============================================
# DATA STRUCTURES
# ============================================

@dataclass
class SLAInput:
    """Input data for SLA prediction"""
    category: str
    priority: str
    description_length: int = 0
    has_attachments: bool = False
    has_visual_evidence: bool = False
    visual_severity: Optional[str] = None
    source_count: int = 1
    confidence_score: float = 0.8
    requires_human_review: bool = False
    department_workload: Optional[float] = None  # 0-1 scale
    time_of_day: Optional[int] = None  # Hour 0-23
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    keywords: List[str] = None


@dataclass
class SLAFactor:
    """A factor that influenced the SLA prediction"""
    name: str
    impact: str  # "positive" or "negative"
    weight: float  # How much this factor contributed


@dataclass
class SLAPrediction:
    """SLA prediction output"""
    predicted_resolution_hours: float
    breach_probability: float
    risk_level: RiskLevel
    explanation: str
    confidence: float
    factors: List[SLAFactor]
    rule_based_hours: float
    ml_based_hours: Optional[float]
    hybrid_weight_rule: float
    hybrid_weight_ml: float


# ============================================
# RULE-BASED ENGINE
# ============================================

class RuleBasedSLAEngine:
    """
    Deterministic rule-based SLA calculation.
    
    Uses business rules to calculate baseline SLA based on:
    - Category (safety, quality, maintenance, etc.)
    - Priority (critical, high, medium, low)
    - Visual severity from LVM
    - Human review requirements
    - Time-based factors (weekends, holidays)
    """
    
    def __init__(self):
        self.base_sla = CATEGORY_BASE_SLA
        self.priority_mult = PRIORITY_MULTIPLIER
        self.severity_mult = VISUAL_SEVERITY_MULTIPLIER
    
    def predict(self, input_data: SLAInput) -> Tuple[float, List[SLAFactor], str]:
        """
        Calculate SLA hours using business rules.
        
        Returns:
            - hours: Predicted resolution hours
            - factors: List of factors that influenced the prediction
            - explanation: Human-readable explanation
        """
        factors: List[SLAFactor] = []
        explanations: List[str] = []
        
        # 1. Start with category baseline
        try:
            category = Category(input_data.category.lower())
        except ValueError:
            category = Category.OTHER
        
        base_hours = self.base_sla.get(category, 48)
        factors.append(SLAFactor(
            name=f"Category: {category.value}",
            impact="positive" if base_hours <= 24 else "negative",
            weight=0.3
        ))
        explanations.append(f"Base SLA for {category.value}: {base_hours}h")
        
        # 2. Apply priority multiplier
        try:
            priority = Priority(input_data.priority.lower())
        except ValueError:
            priority = Priority.MEDIUM
        
        priority_mult = self.priority_mult.get(priority, 1.0)
        hours = base_hours * priority_mult
        
        if priority_mult < 1.0:
            factors.append(SLAFactor(
                name=f"Priority: {priority.value}",
                impact="positive",
                weight=0.25
            ))
            explanations.append(f"{priority.value} priority reduces SLA by {int((1-priority_mult)*100)}%")
        elif priority_mult > 1.0:
            factors.append(SLAFactor(
                name=f"Priority: {priority.value}",
                impact="negative",
                weight=0.15
            ))
            explanations.append(f"{priority.value} priority extends SLA by {int((priority_mult-1)*100)}%")
        
        # 3. Apply visual severity if available
        if input_data.has_visual_evidence and input_data.visual_severity:
            severity_mult = self.severity_mult.get(input_data.visual_severity.lower(), 1.0)
            hours *= severity_mult
            
            if severity_mult < 1.0:
                factors.append(SLAFactor(
                    name=f"Visual severity: {input_data.visual_severity}",
                    impact="positive",
                    weight=0.2
                ))
                explanations.append(f"Visual evidence of {input_data.visual_severity} severity")
        
        # 4. Human review adds buffer
        if input_data.requires_human_review:
            hours += 4  # Add 4 hours for human review
            factors.append(SLAFactor(
                name="Requires human review",
                impact="negative",
                weight=0.15
            ))
            explanations.append("Human review required (+4h)")
        
        # 5. Time-based factors
        if input_data.day_of_week is not None:
            if input_data.day_of_week >= 5:  # Weekend
                hours += 16  # Add weekend buffer
                factors.append(SLAFactor(
                    name="Weekend submission",
                    impact="negative",
                    weight=0.1
                ))
                explanations.append("Weekend submission (+16h)")
        
        # 6. Department workload factor
        if input_data.department_workload is not None:
            if input_data.department_workload > 0.8:
                workload_penalty = (input_data.department_workload - 0.8) * 24
                hours += workload_penalty
                factors.append(SLAFactor(
                    name="High department workload",
                    impact="negative",
                    weight=0.1
                ))
                explanations.append(f"Department overloaded (+{workload_penalty:.0f}h)")
        
        # 7. Multiple evidence sources can speed up resolution
        if input_data.source_count > 1:
            evidence_bonus = 0.95 ** (input_data.source_count - 1)
            hours *= evidence_bonus
            factors.append(SLAFactor(
                name=f"Multiple evidence sources ({input_data.source_count})",
                impact="positive",
                weight=0.1
            ))
            explanations.append(f"{input_data.source_count} evidence sources help diagnosis")
        
        explanation = ". ".join(explanations)
        return max(1.0, round(hours, 1)), factors, explanation


# ============================================
# ML-BASED ENGINE (Placeholder)
# ============================================

class MLBasedSLAEngine:
    """
    Machine Learning based SLA prediction.
    
    Uses XGBoost/LightGBM model trained on historical ticket data.
    This is a placeholder implementation - in production, load a trained model.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = model_path
        self.feature_names = [
            "category_encoded",
            "priority_encoded", 
            "description_length",
            "has_attachments",
            "has_visual_evidence",
            "visual_severity_encoded",
            "source_count",
            "confidence_score",
            "requires_human_review",
            "hour_of_day",
            "day_of_week",
            "department_workload"
        ]
        self._load_model()
    
    def _load_model(self):
        """Load pre-trained model if available"""
        if self.model_path and os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"Loaded ML model from {self.model_path}")
            except Exception as e:
                logger.warning(f"Failed to load ML model: {e}")
                self.model = None
        else:
            # Use fallback statistical model
            self.model = None
    
    def _encode_category(self, category: str) -> int:
        """Encode category to numeric"""
        categories = list(Category)
        try:
            return categories.index(Category(category.lower()))
        except (ValueError, KeyError):
            return len(categories) - 1  # OTHER
    
    def _encode_priority(self, priority: str) -> int:
        """Encode priority to numeric"""
        priority_map = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        return priority_map.get(priority.lower(), 1)
    
    def _encode_severity(self, severity: Optional[str]) -> int:
        """Encode visual severity to numeric"""
        if not severity:
            return 1  # medium as default
        severity_map = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        return severity_map.get(severity.lower(), 1)
    
    def _prepare_features(self, input_data: SLAInput) -> np.ndarray:
        """Convert SLAInput to feature vector"""
        features = [
            self._encode_category(input_data.category),
            self._encode_priority(input_data.priority),
            input_data.description_length,
            int(input_data.has_attachments),
            int(input_data.has_visual_evidence),
            self._encode_severity(input_data.visual_severity),
            input_data.source_count,
            input_data.confidence_score,
            int(input_data.requires_human_review),
            input_data.time_of_day or 12,
            input_data.day_of_week or 2,
            input_data.department_workload or 0.5
        ]
        return np.array(features).reshape(1, -1)
    
    def predict(self, input_data: SLAInput) -> Tuple[Optional[float], float]:
        """
        Predict SLA hours using ML model.
        
        Returns:
            - hours: Predicted hours (None if model unavailable)
            - confidence: Model confidence (0.0-1.0)
        """
        if self.model is None:
            # Fallback: simple statistical estimate
            return self._statistical_fallback(input_data), 0.5
        
        try:
            features = self._prepare_features(input_data)
            prediction = self.model.predict(features)[0]
            
            # Get confidence from model if available
            if hasattr(self.model, 'predict_proba'):
                confidence = float(np.max(self.model.predict_proba(features)))
            else:
                confidence = 0.75
            
            return max(1.0, float(prediction)), confidence
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return self._statistical_fallback(input_data), 0.3
    
    def _statistical_fallback(self, input_data: SLAInput) -> float:
        """Simple statistical fallback when ML model is unavailable"""
        # Based on typical ticket resolution times (hypothetical data)
        base = 36.0  # Average resolution time
        
        # Adjust by priority
        priority_adj = {"critical": -20, "high": -10, "medium": 0, "low": 12}
        base += priority_adj.get(input_data.priority.lower(), 0)
        
        # Adjust by category
        category_adj = {
            "safety": -15,
            "quality": -5,
            "maintenance": 10,
            "logistics": 0,
            "hr": 15,
            "IT": -5,
        }
        base += category_adj.get(input_data.category.lower(), 0)
        
        return max(1.0, base)
    
    @property
    def is_available(self) -> bool:
        """Check if ML model is loaded and ready"""
        return self.model is not None


# ============================================
# HYBRID DECISION ENGINE
# ============================================

class HybridSLAEngine:
    """
    Combines Rule-Based and ML predictions.
    
    Uses weighted combination based on:
    - ML model confidence
    - Data availability
    - Agreement between methods
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.rule_engine = RuleBasedSLAEngine()
        self.ml_engine = MLBasedSLAEngine(model_path)
        
        # Default weights (adjusted based on ML availability and confidence)
        self.default_rule_weight = 0.6
        self.default_ml_weight = 0.4
    
    def predict(self, input_data: SLAInput) -> SLAPrediction:
        """
        Generate hybrid SLA prediction.
        
        Combines rule-based and ML predictions using adaptive weighting.
        """
        # Get rule-based prediction
        rule_hours, rule_factors, rule_explanation = self.rule_engine.predict(input_data)
        
        # Get ML prediction
        ml_hours, ml_confidence = self.ml_engine.predict(input_data)
        
        # Calculate adaptive weights
        if self.ml_engine.is_available and ml_hours is not None:
            # Weight ML more if it's confident and trained
            ml_weight = self.default_ml_weight * ml_confidence
            rule_weight = 1.0 - ml_weight
        else:
            # Fall back to rule-based only
            ml_weight = 0.0
            rule_weight = 1.0
            ml_hours = None
        
        # Calculate final prediction
        if ml_hours is not None:
            final_hours = (rule_hours * rule_weight) + (ml_hours * ml_weight)
        else:
            final_hours = rule_hours
        
        # Calculate breach probability
        breach_prob = self._calculate_breach_probability(
            final_hours, input_data.priority, input_data.confidence_score
        )
        
        # Determine risk level
        risk_level = self._determine_risk_level(breach_prob, input_data.priority)
        
        # Calculate overall confidence
        overall_confidence = self._calculate_confidence(
            rule_weight, ml_weight, ml_confidence if ml_hours else 0.0
        )
        
        # Build explanation
        explanation = self._build_explanation(
            rule_explanation, rule_hours, ml_hours, 
            rule_weight, ml_weight, final_hours
        )
        
        return SLAPrediction(
            predicted_resolution_hours=round(final_hours, 1),
            breach_probability=round(breach_prob, 3),
            risk_level=risk_level,
            explanation=explanation,
            confidence=round(overall_confidence, 2),
            factors=rule_factors,
            rule_based_hours=rule_hours,
            ml_based_hours=ml_hours,
            hybrid_weight_rule=round(rule_weight, 2),
            hybrid_weight_ml=round(ml_weight, 2)
        )
    
    def _calculate_breach_probability(
        self, 
        predicted_hours: float, 
        priority: str,
        confidence: float
    ) -> float:
        """
        Calculate probability of SLA breach.
        
        Based on:
        - How tight the SLA is
        - Historical breach rates by category
        - Confidence in prediction
        """
        # Base breach probability by priority
        priority_breach_base = {
            "critical": 0.15,  # Critical tickets have higher scrutiny
            "high": 0.12,
            "medium": 0.10,
            "low": 0.08,
        }
        base_prob = priority_breach_base.get(priority.lower(), 0.10)
        
        # Adjust by predicted hours (tighter SLAs have higher breach risk)
        if predicted_hours < 8:
            time_factor = 1.3  # Short SLAs are harder to meet
        elif predicted_hours < 24:
            time_factor = 1.0
        elif predicted_hours < 48:
            time_factor = 0.9
        else:
            time_factor = 0.8
        
        # Adjust by confidence (lower confidence = higher uncertainty)
        confidence_factor = 1.0 + (1.0 - confidence) * 0.3
        
        breach_prob = base_prob * time_factor * confidence_factor
        return min(1.0, max(0.0, breach_prob))
    
    def _determine_risk_level(self, breach_prob: float, priority: str) -> RiskLevel:
        """Determine risk level from breach probability and priority"""
        if priority.lower() == "critical" or breach_prob > 0.3:
            return RiskLevel.CRITICAL
        elif priority.lower() == "high" or breach_prob > 0.2:
            return RiskLevel.HIGH
        elif breach_prob > 0.1:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _calculate_confidence(
        self, 
        rule_weight: float, 
        ml_weight: float, 
        ml_confidence: float
    ) -> float:
        """Calculate overall prediction confidence"""
        # Rule-based is always reliable (0.85 baseline)
        rule_confidence = 0.85
        
        if ml_weight > 0 and ml_confidence > 0:
            # Weighted average of confidences
            return (rule_confidence * rule_weight) + (ml_confidence * ml_weight)
        else:
            return rule_confidence
    
    def _build_explanation(
        self,
        rule_explanation: str,
        rule_hours: float,
        ml_hours: Optional[float],
        rule_weight: float,
        ml_weight: float,
        final_hours: float
    ) -> str:
        """Build human-readable explanation of prediction"""
        parts = [rule_explanation]
        
        if ml_hours is not None and ml_weight > 0:
            parts.append(
                f"ML model predicts {ml_hours:.1f}h (weight: {ml_weight:.0%}). "
                f"Combined prediction: {final_hours:.1f}h"
            )
        else:
            parts.append(f"Final prediction: {final_hours:.1f} hours")
        
        return " ".join(parts)


# ============================================
# CONVENIENCE FUNCTIONS
# ============================================

def predict_sla(
    category: str,
    priority: str,
    has_visual_evidence: bool = False,
    visual_severity: Optional[str] = None,
    requires_human_review: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Convenience function for SLA prediction.
    
    Returns prediction as dictionary.
    """
    input_data = SLAInput(
        category=category,
        priority=priority,
        has_visual_evidence=has_visual_evidence,
        visual_severity=visual_severity,
        requires_human_review=requires_human_review,
        **{k: v for k, v in kwargs.items() if k in SLAInput.__dataclass_fields__}
    )
    
    engine = HybridSLAEngine()
    prediction = engine.predict(input_data)
    
    return {
        "predicted_resolution_hours": prediction.predicted_resolution_hours,
        "breach_probability": prediction.breach_probability,
        "risk_level": prediction.risk_level.value,
        "explanation": prediction.explanation,
        "confidence": prediction.confidence,
        "factors": [asdict(f) for f in prediction.factors]
    }


# Export main classes and functions
__all__ = [
    "SLAInput",
    "SLAPrediction",
    "SLAFactor",
    "RuleBasedSLAEngine",
    "MLBasedSLAEngine", 
    "HybridSLAEngine",
    "predict_sla",
    "RiskLevel",
    "Category",
    "Priority",
]
