"""
UX Personas Module

Defines UX-focused persona attributes for comprehensive usability testing.
Extends basic demographics with cognitive, accessibility, and behavioral traits.
"""

import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class TechFamiliarity(Enum):
    """User's familiarity with technology"""
    NOVICE = "novice"           # Rarely uses computers, needs guidance
    BEGINNER = "beginner"       # Basic computer skills, some web experience
    INTERMEDIATE = "intermediate"  # Regular internet user, comfortable with most sites
    ADVANCED = "advanced"       # Power user, knows shortcuts and tricks
    EXPERT = "expert"           # Tech professional, very demanding of UX


class AttentionSpan(Enum):
    """User's attention span and patience"""
    VERY_SHORT = "very_short"   # Gets frustrated quickly, skims content
    SHORT = "short"             # Wants quick results, moderate patience
    MODERATE = "moderate"       # Average attention, will explore if interested
    LONG = "long"               # Patient, reads carefully, thorough
    VERY_LONG = "very_long"     # Extremely patient, methodical approach


class VisualAbility(Enum):
    """User's visual capabilities"""
    FULL = "full"               # Normal vision
    LOW_VISION = "low_vision"   # Needs larger text, high contrast
    COLORBLIND_DEUTERANOPIA = "colorblind_deuteranopia"  # Red-green (most common)
    COLORBLIND_PROTANOPIA = "colorblind_protanopia"      # Red blind
    COLORBLIND_TRITANOPIA = "colorblind_tritanopia"      # Blue-yellow
    SCREEN_READER = "screen_reader"  # Uses screen reader software


class MotorAbility(Enum):
    """User's motor/dexterity capabilities"""
    FULL = "full"               # No motor impairments
    REDUCED = "reduced"         # Some difficulty with precise movements
    KEYBOARD_ONLY = "keyboard_only"  # Cannot use mouse, keyboard navigation
    VOICE_CONTROL = "voice_control"  # Uses voice commands
    SWITCH_ACCESS = "switch_access"  # Uses switch or alternative input


class CognitiveLoad(Enum):
    """User's tolerance for cognitive complexity"""
    LOW = "low"                 # Easily overwhelmed, needs simple interfaces
    MODERATE = "moderate"       # Average complexity tolerance
    HIGH = "high"               # Can handle complex interfaces


class ExplorationStyle(Enum):
    """How the user explores interfaces"""
    GOAL_FOCUSED = "goal_focused"   # Direct path to goal, minimal exploration
    BALANCED = "balanced"           # Some exploration, mainly task-focused
    EXPLORATORY = "exploratory"     # Likes to browse and discover


class ErrorTolerance(Enum):
    """How user responds to errors"""
    GIVES_UP_QUICKLY = "gives_up_quickly"  # Abandons after 1-2 errors
    TRIES_FEW_TIMES = "tries_few_times"    # Will try 2-3 approaches
    PERSISTENT = "persistent"              # Keeps trying different solutions


@dataclass
class UXPersona:
    """A comprehensive UX testing persona"""
    
    # Basic demographics
    name: str = ""
    age: int = 35
    occupation: str = ""
    income_bracket: str = ""
    gender: str = ""
    location: str = ""
    
    # Intent for this session
    intent: str = ""
    
    # Cognitive attributes
    tech_familiarity: TechFamiliarity = TechFamiliarity.INTERMEDIATE
    attention_span: AttentionSpan = AttentionSpan.MODERATE
    cognitive_load_tolerance: CognitiveLoad = CognitiveLoad.MODERATE
    reading_level: str = "intermediate"  # basic, intermediate, advanced
    
    # Accessibility attributes
    visual_ability: VisualAbility = VisualAbility.FULL
    motor_ability: MotorAbility = MotorAbility.FULL
    hearing_ability: str = "full"  # full, reduced, deaf
    
    # Behavioral attributes
    patience_level: AttentionSpan = AttentionSpan.MODERATE
    exploration_style: ExplorationStyle = ExplorationStyle.BALANCED
    error_tolerance: ErrorTolerance = ErrorTolerance.TRIES_FEW_TIMES
    
    # Context
    device: str = "desktop"  # desktop, tablet, mobile
    connection_speed: str = "fast"  # slow, medium, fast
    browser: str = "chrome"
    time_pressure: bool = False  # Is user in a hurry?
    
    # Personal preferences
    preferences: Dict[str, Any] = field(default_factory=dict)
    
    def to_prompt_text(self) -> str:
        """Generate natural language persona description for prompts"""
        lines = [
            f"I am {self.name}, a {self.age}-year-old {self.occupation}.",
            f"",
            f"**Technology Background:**",
            f"- Tech familiarity: {self.tech_familiarity.value} - {self._tech_description()}",
            f"- I typically use a {self.device} with {self.connection_speed} internet",
            f"",
            f"**Cognitive Style:**",
            f"- Attention span: {self.attention_span.value}",
            f"- Reading level: {self.reading_level}",
            f"- Cognitive load tolerance: {self.cognitive_load_tolerance.value}",
            f"",
            f"**Accessibility Needs:**",
            f"- Visual ability: {self.visual_ability.value}",
            f"- Motor ability: {self.motor_ability.value}",
            f"",
            f"**Behavioral Traits:**",
            f"- Patience: {self.patience_level.value}",
            f"- Exploration style: {self.exploration_style.value}",
            f"- Error tolerance: {self.error_tolerance.value}",
            f"- Time pressure: {'Yes, in a hurry' if self.time_pressure else 'No, taking my time'}",
            f"",
            f"**Today's Goal:**",
            f"{self.intent}"
        ]
        return "\n".join(lines)
    
    def _tech_description(self) -> str:
        """Get description of tech familiarity level"""
        descriptions = {
            TechFamiliarity.NOVICE: "I rarely use computers and often need help with basic tasks",
            TechFamiliarity.BEGINNER: "I can do basic web browsing but get confused by complex sites",
            TechFamiliarity.INTERMEDIATE: "I'm comfortable with most websites and apps",
            TechFamiliarity.ADVANCED: "I know keyboard shortcuts and expect efficient interfaces",
            TechFamiliarity.EXPERT: "I'm a tech professional with high standards for UX"
        }
        return descriptions.get(self.tech_familiarity, "")
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "name": self.name,
            "age": self.age,
            "occupation": self.occupation,
            "gender": self.gender,
            "intent": self.intent,
            "tech_familiarity": self.tech_familiarity.value,
            "attention_span": self.attention_span.value,
            "cognitive_load_tolerance": self.cognitive_load_tolerance.value,
            "reading_level": self.reading_level,
            "visual_ability": self.visual_ability.value,
            "motor_ability": self.motor_ability.value,
            "patience_level": self.patience_level.value,
            "exploration_style": self.exploration_style.value,
            "error_tolerance": self.error_tolerance.value,
            "device": self.device,
            "time_pressure": self.time_pressure
        }


# Predefined persona templates for common testing scenarios
PERSONA_TEMPLATES = {
    "tech_novice_elderly": UXPersona(
        name="Margaret",
        age=72,
        occupation="Retired Teacher",
        tech_familiarity=TechFamiliarity.NOVICE,
        attention_span=AttentionSpan.LONG,
        visual_ability=VisualAbility.LOW_VISION,
        patience_level=AttentionSpan.LONG,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        error_tolerance=ErrorTolerance.GIVES_UP_QUICKLY,
        device="tablet"
    ),
    
    "busy_professional": UXPersona(
        name="Michael",
        age=38,
        occupation="Marketing Manager",
        tech_familiarity=TechFamiliarity.INTERMEDIATE,
        attention_span=AttentionSpan.VERY_SHORT,
        patience_level=AttentionSpan.VERY_SHORT,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        error_tolerance=ErrorTolerance.TRIES_FEW_TIMES,
        time_pressure=True,
        device="mobile"
    ),
    
    "accessibility_screen_reader": UXPersona(
        name="James",
        age=45,
        occupation="Accountant",
        tech_familiarity=TechFamiliarity.ADVANCED,
        visual_ability=VisualAbility.SCREEN_READER,
        motor_ability=MotorAbility.KEYBOARD_ONLY,
        patience_level=AttentionSpan.MODERATE,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        device="desktop"
    ),
    
    "colorblind_user": UXPersona(
        name="David",
        age=29,
        occupation="Graphic Designer",
        tech_familiarity=TechFamiliarity.EXPERT,
        visual_ability=VisualAbility.COLORBLIND_DEUTERANOPIA,
        patience_level=AttentionSpan.MODERATE,
        exploration_style=ExplorationStyle.EXPLORATORY,
        device="desktop"
    ),
    
    "explorer_teenager": UXPersona(
        name="Sophia",
        age=16,
        occupation="High School Student",
        tech_familiarity=TechFamiliarity.ADVANCED,
        attention_span=AttentionSpan.SHORT,
        exploration_style=ExplorationStyle.EXPLORATORY,
        error_tolerance=ErrorTolerance.PERSISTENT,
        device="mobile"
    ),
    
    "keyboard_only_user": UXPersona(
        name="Patricia",
        age=52,
        occupation="Data Analyst",
        tech_familiarity=TechFamiliarity.ADVANCED,
        motor_ability=MotorAbility.KEYBOARD_ONLY,
        patience_level=AttentionSpan.MODERATE,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        device="desktop"
    ),
    
    "low_literacy_user": UXPersona(
        name="Carlos",
        age=34,
        occupation="Construction Worker",
        tech_familiarity=TechFamiliarity.BEGINNER,
        reading_level="basic",
        cognitive_load_tolerance=CognitiveLoad.LOW,
        attention_span=AttentionSpan.SHORT,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        device="mobile"
    ),
    
    "power_user": UXPersona(
        name="Alex",
        age=27,
        occupation="Software Engineer",
        tech_familiarity=TechFamiliarity.EXPERT,
        attention_span=AttentionSpan.SHORT,
        patience_level=AttentionSpan.VERY_SHORT,
        exploration_style=ExplorationStyle.GOAL_FOCUSED,
        error_tolerance=ErrorTolerance.PERSISTENT,
        device="desktop"
    )
}


def generate_random_ux_persona(
    intent: str,
    name: Optional[str] = None,
    **overrides
) -> UXPersona:
    """Generate a random UX persona with the given intent"""
    
    first_names = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
                   "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia"]
    
    occupations = ["Teacher", "Nurse", "Engineer", "Retail Worker", "Student",
                   "Accountant", "Designer", "Manager", "Freelancer", "Retired"]
    
    persona = UXPersona(
        name=name or random.choice(first_names),
        age=random.randint(18, 75),
        occupation=random.choice(occupations),
        gender=random.choice(["Male", "Female", "Non-binary"]),
        intent=intent,
        tech_familiarity=random.choice(list(TechFamiliarity)),
        attention_span=random.choice(list(AttentionSpan)),
        cognitive_load_tolerance=random.choice(list(CognitiveLoad)),
        reading_level=random.choice(["basic", "intermediate", "advanced"]),
        visual_ability=random.choices(
            list(VisualAbility),
            weights=[80, 8, 5, 3, 2, 2]  # Full vision most common
        )[0],
        motor_ability=random.choices(
            list(MotorAbility),
            weights=[90, 5, 3, 1, 1]  # Full ability most common
        )[0],
        patience_level=random.choice(list(AttentionSpan)),
        exploration_style=random.choice(list(ExplorationStyle)),
        error_tolerance=random.choice(list(ErrorTolerance)),
        device=random.choices(
            ["desktop", "mobile", "tablet"],
            weights=[50, 40, 10]
        )[0],
        connection_speed=random.choice(["slow", "medium", "fast"]),
        time_pressure=random.choice([True, False, False, False])  # 25% in a hurry
    )
    
    # Apply any overrides
    for key, value in overrides.items():
        if hasattr(persona, key):
            setattr(persona, key, value)
    
    return persona


def generate_accessibility_persona_set(intent: str) -> List[UXPersona]:
    """Generate a set of personas focused on accessibility testing"""
    return [
        PERSONA_TEMPLATES["tech_novice_elderly"]._replace(intent=intent) if hasattr(UXPersona, '_replace') 
        else UXPersona(**{**PERSONA_TEMPLATES["tech_novice_elderly"].to_dict(), "intent": intent}),
        UXPersona(**{**PERSONA_TEMPLATES["accessibility_screen_reader"].to_dict(), "intent": intent}),
        UXPersona(**{**PERSONA_TEMPLATES["colorblind_user"].to_dict(), "intent": intent}),
        UXPersona(**{**PERSONA_TEMPLATES["keyboard_only_user"].to_dict(), "intent": intent}),
        UXPersona(**{**PERSONA_TEMPLATES["low_literacy_user"].to_dict(), "intent": intent}),
    ]


def generate_diverse_persona_set(
    intent: str,
    count: int = 5
) -> List[UXPersona]:
    """Generate a diverse set of personas for comprehensive testing"""
    personas = []
    
    # Ensure diversity by picking from different attribute combinations
    tech_levels = list(TechFamiliarity)
    devices = ["desktop", "mobile", "tablet"]
    
    for i in range(count):
        persona = generate_random_ux_persona(
            intent=intent,
            tech_familiarity=tech_levels[i % len(tech_levels)],
            device=devices[i % len(devices)]
        )
        personas.append(persona)
    
    return personas
