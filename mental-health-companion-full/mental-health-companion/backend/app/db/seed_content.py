"""Static seed content: helplines, crisis keywords, questionnaires, recommendations, templates, FAQs.

IMPORTANT: all helpline numbers are seeded with verified=False. Verify every number
with the operating organisation before any production use.
"""

HELPLINES = [
    # country, region, name, phone, website, hours, language, type
    ("India", None, "National Emergency Number", "112", None, "24x7", "Multiple", "emergency"),
    ("India", None, "Tele-MANAS", "14416", "https://telemanas.mohfw.gov.in", "24x7", "Multiple", "helpline"),
    ("India", None, "KIRAN Mental Health Rehabilitation Helpline", "1800-599-0019", None, "24x7", "Multiple", "helpline"),
    # International directory placeholders -- VERIFY BEFORE PRODUCTION
    ("United States", None, "988 Suicide & Crisis Lifeline", "988", "https://988lifeline.org", "24x7", "English, Spanish", "helpline"),
    ("United States", None, "Emergency Services", "911", None, "24x7", "English", "emergency"),
    ("United Kingdom", None, "Samaritans", "116 123", "https://www.samaritans.org", "24x7", "English", "helpline"),
    ("United Kingdom", None, "Emergency Services", "999", None, "24x7", "English", "emergency"),
    ("Australia", None, "Lifeline", "13 11 14", "https://www.lifeline.org.au", "24x7", "English", "helpline"),
    ("Canada", None, "9-8-8 Suicide Crisis Helpline", "988", "https://988.ca", "24x7", "English, French", "helpline"),
]

# phrase, severity, language
CRISIS_KEYWORDS = [
    ("kill myself", "critical", "en"), ("want to die", "critical", "en"), ("end my life", "critical", "en"),
    ("suicide", "critical", "en"), ("suicidal", "critical", "en"), ("take my own life", "critical", "en"),
    ("can't go on", "critical", "en"), ("cannot go on", "critical", "en"), ("better off dead", "critical", "en"),
    ("no reason to live", "critical", "en"), ("don't want to be here anymore", "critical", "en"),
    ("hurt myself", "critical", "en"), ("self harm", "critical", "en"), ("cut myself", "critical", "en"),
    ("overdose", "critical", "en"),
    ("hopeless", "elevated", "en"), ("no way out", "elevated", "en"), ("can't take it anymore", "elevated", "en"),
    ("worthless", "elevated", "en"), ("nobody cares", "elevated", "en"), ("give up on everything", "elevated", "en"),
    ("being abused", "elevated", "en"), ("he hits me", "elevated", "en"), ("she hits me", "elevated", "en"),
    ("afraid for my safety", "elevated", "en"), ("want to hurt someone", "elevated", "en"),
    ("panic attack", "elevated", "en"), ("can't breathe", "elevated", "en"),
]

RECOMMENDATIONS = [
    # category, title, body, emotion, stress, trend
    ("breathing", "4-7-8 breathing", "Breathe in through your nose for 4 counts, hold for 7, and breathe out slowly for 8. Repeat 4 times. Many people find this settles a racing mind.", "anxiety", None, None),
    ("breathing", "Box breathing", "Inhale 4, hold 4, exhale 4, hold 4. Continue for 2 minutes while focusing only on the count.", "stress", "high", None),
    ("grounding", "5-4-3-2-1 grounding", "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell and 1 you can taste. It gently brings attention back to the present.", "anxiety", None, None),
    ("grounding", "Feet on the floor", "Press your feet into the floor and notice the pressure. Slowly look around the room and name what you see.", "fear", None, None),
    ("sleep", "Wind-down routine", "Try dimming lights and putting screens away 30-60 minutes before bed, and keep a consistent sleep and wake time.", "anxiety", "high", None),
    ("sleep", "Worry notebook", "Keep a notebook by the bed. Write down what is on your mind so you can set it aside until tomorrow.", "stress", None, "increasing"),
    ("exercise", "Ten-minute walk", "A short walk, ideally outdoors, can lift mood and ease tension. Aim for a gentle pace.", "sadness", None, None),
    ("exercise", "Stretch break", "Roll your shoulders, stretch your neck and arms for a couple of minutes every hour you sit.", "stress", "moderate", None),
    ("social", "Reach out to someone you trust", "Message or call a friend or family member. You do not have to explain everything - simply connecting can help.", "sadness", None, None),
    ("social", "Share the load", "If work or study feels heavy, consider telling a colleague, teacher or manager what is on your plate and asking for support.", "stress", "high", None),
    ("journaling", "Three good things", "Write down three things, however small, that went okay today.", "sadness", "low", None),
    ("journaling", "Name the feeling", "Describe what you are feeling in one sentence, then rate its intensity from 1 to 10. Naming feelings can make them easier to handle.", "anger", None, None),
    ("journaling", "Keep the good going", "Write about what helped today feel good so you can repeat it on harder days.", "joy", "low", None),
    ("tip", "Take a real break", "Step away from your desk or phone for five minutes. Drink some water.", "stress", "moderate", None),
    ("tip", "Cool-down pause", "When anger rises, pause and count to ten before responding. Leave the room briefly if you can.", "anger", None, None),
    ("tip", "Steady routine", "You are doing okay. Keeping regular meals, sleep and movement helps you stay steady.", "neutral", "low", "stable"),
    ("professional_help", "Consider speaking with a psychologist", "You have been carrying a lot recently. Talking with a qualified professional can offer support tailored to you.", None, "high", None),
    ("professional_help", "Your stress has been rising", "Your recent entries show stress increasing over time. It may help to talk to a psychologist or counsellor about it.", None, None, "increasing"),
    ("article", "Understanding everyday stress", "A short read on how stress affects body and mind and practical ways to manage it.", "stress", None, None),
    ("article", "Getting better sleep", "Practical, evidence-informed sleep hygiene tips.", "anxiety", None, None),
    ("tip", "Keep it up", "Your stress has been easing lately. Notice what has been helping and keep doing it.", None, None, "decreasing"),
]

TEMPLATES = [
    # kind, emotion, stress, body
    ("empathy", "anxiety", None, "It sounds like your mind has been racing, and that can be exhausting. Thank you for putting it into words."),
    ("empathy", "sadness", None, "I'm sorry you're feeling low. It takes courage to write this down, and your feelings matter."),
    ("empathy", "anger", None, "It sounds like something has really frustrated you. It's understandable to feel that way."),
    ("empathy", "fear", None, "Feeling afraid is hard. You are not alone in this moment."),
    ("empathy", "joy", None, "It's lovely to hear things are going well. Enjoy this feeling."),
    ("empathy", "stress", None, "It sounds like you have a lot on your plate right now. That is a lot to carry."),
    ("empathy", "neutral", None, "Thanks for checking in. Reflecting on your day is a helpful habit."),
    ("nudge", None, "high", "Because things feel heavy right now, consider speaking with a psychologist or another professional you trust."),
    ("nudge", None, None, "Your stress has been trending upward. Consider speaking with a psychologist if this continues."),
    ("crisis_intro", None, None, "I'm really glad you told me. You deserve support right now, and you don't have to face this alone."),
    ("chat_reply", "sadness", None, "That sounds really painful. Would you like to tell me more about what happened?"),
    ("chat_reply", "anxiety", None, "That sounds overwhelming. What feels like the biggest worry right now?"),
    ("chat_reply", "neutral", None, "I'm listening. What's on your mind?"),
]

FAQS = [
    ("Is this app a replacement for therapy?", "No. This tool provides general support only. It is not a medical diagnosis or a substitute for professional care."),
    ("Who can see my journal entries?", "Only you, unless you choose to share entries with a psychologist you have consented to. You can review who viewed your data in the Privacy Center."),
    ("What happens if I write something that suggests I am in danger?", "The app shows emergency support options straight away and, if you enabled it, notifies your care team and emergency contacts."),
    ("How accurate is the analysis?", "It is an automated estimate and can be wrong. Confidence scores are shown, and you can report wrong predictions."),
    ("Can I delete my data?", "Yes. Use the Privacy Center to download or permanently delete your data."),
]

_SCALE_FREQ = ["Not at all", "Several days", "More than half the days", "Nearly every day"]
QUESTIONNAIRES = [
    {
        "code": "PHQ9", "title": "PHQ-9 (Patient Health Questionnaire-9) - screening aid, not a diagnosis",
        "questions": {"intro": "Over the last 2 weeks, how often have you been bothered by the following problems?",
                      "options": [{"value": i, "label": l} for i, l in enumerate(_SCALE_FREQ)],
                      "items": ["Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless",
                                "Trouble falling or staying asleep, or sleeping too much", "Feeling tired or having little energy",
                                "Poor appetite or overeating", "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
                                "Trouble concentrating on things, such as reading or watching television",
                                "Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual",
                                "Thoughts that you would be better off dead, or of hurting yourself in some way"]},
        "scoring_rules": {"max": 27, "reverse_items": [], "safety_item_index": 8,
                          "bands": [{"min": 0, "max": 4, "label": "Minimal"}, {"min": 5, "max": 9, "label": "Mild"},
                                    {"min": 10, "max": 14, "label": "Moderate"}, {"min": 15, "max": 19, "label": "Moderately severe"},
                                    {"min": 20, "max": 27, "label": "Severe"}],
                          "high_threshold": 10},
    },
    {
        "code": "GAD7", "title": "GAD-7 (Generalized Anxiety Disorder-7) - screening aid, not a diagnosis",
        "questions": {"intro": "Over the last 2 weeks, how often have you been bothered by the following problems?",
                      "options": [{"value": i, "label": l} for i, l in enumerate(_SCALE_FREQ)],
                      "items": ["Feeling nervous, anxious, or on edge", "Not being able to stop or control worrying",
                                "Worrying too much about different things", "Trouble relaxing", "Being so restless that it is hard to sit still",
                                "Becoming easily annoyed or irritable", "Feeling afraid, as if something awful might happen"]},
        "scoring_rules": {"max": 21, "reverse_items": [], "safety_item_index": None,
                          "bands": [{"min": 0, "max": 4, "label": "Minimal"}, {"min": 5, "max": 9, "label": "Mild"},
                                    {"min": 10, "max": 14, "label": "Moderate"}, {"min": 15, "max": 21, "label": "Severe"}],
                          "high_threshold": 10},
    },
    {
        # Cohen, S., Kamarck, T., & Mermelstein, R. (1983). Attribution required; free for non-commercial research/education.
        "code": "PSS10", "title": "PSS-10 (Perceived Stress Scale) - screening aid, not a diagnosis",
        "questions": {"intro": "In the last month, how often have you...",
                      "options": [{"value": i, "label": l} for i, l in enumerate(["Never", "Almost never", "Sometimes", "Fairly often", "Very often"])],
                      "items": ["been upset because of something that happened unexpectedly?",
                                "felt that you were unable to control the important things in your life?",
                                "felt nervous and stressed?",
                                "felt confident about your ability to handle your personal problems?",
                                "felt that things were going your way?",
                                "found that you could not cope with all the things that you had to do?",
                                "been able to control irritations in your life?",
                                "felt that you were on top of things?",
                                "been angered because of things that were outside of your control?",
                                "felt difficulties were piling up so high that you could not overcome them?"]},
        "scoring_rules": {"max": 40, "reverse_items": [3, 4, 6, 7], "reverse_max": 4, "safety_item_index": None,
                          "bands": [{"min": 0, "max": 13, "label": "Low perceived stress"}, {"min": 14, "max": 26, "label": "Moderate perceived stress"},
                                    {"min": 27, "max": 40, "label": "High perceived stress"}],
                          "high_threshold": 27},
    },
]

SETTINGS = {
    "stress_thresholds": {"low_max": 33, "moderate_max": 66},
    "trend": {"window_n": 5, "stable_tolerance_pct": 5.0},
    "alert_config": {"high_stress_score": 80, "sla_ack_minutes": 30, "escalate_after_minutes": 60,
                     "channels": ["in_app", "email", "sms"]},
    "session": {"idle_timeout_minutes": 30},
    "feature_flags": {"guest_trial": True, "transformer_models": True, "voice_input": True, "two_fa": True},
    "guest_trial": {"max_analyses": 3},
    "maintenance_mode": False,
    "disclaimer": "This tool provides general support only. It is not a medical diagnosis or a substitute for professional care.",
}

PERMISSIONS = {
    "client": ["entries.own", "analysis.own", "chat.own", "trends.own", "assessments.own", "goals.own",
               "appointments.own", "messages.own", "safety_plan.own", "privacy.own"],
    "staff": ["clients.manage", "assignments.manage", "appointments.manage", "alerts.triage", "announcements.send",
              "tickets.manage", "resources.manage", "reports.operational", "clients.limited_view"],
    "psychologist": ["patients.view_consented", "clinical_notes.manage", "appointments.manage", "alerts.manage",
                     "assignments.manage", "predictions.review", "reports.patient", "messages.own", "referrals.create"],
    "admin": ["users.manage", "roles.manage", "psychologists.verify", "models.manage", "datasets.manage", "content.manage",
              "crisis_keywords.manage", "alert_config.manage", "audit.view", "compliance.manage", "analytics.view",
              "tickets.manage", "settings.manage"],
}
