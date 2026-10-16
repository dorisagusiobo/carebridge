"""Fictional discharge instructions for the demo and tests.

These patients don't exist. They were written to look like real discharge
paperwork (dense, abbreviated, a few gaps) so the plan has something to fix.
"""

SAMPLES = {
    "heart-failure": {
        "title": "Heart failure",
        "patient": "Fictional patient, 68",
        "instructions": """DISCHARGE INSTRUCTIONS
Diagnosis: Acute on chronic systolic heart failure (CHF exacerbation).

MEDICATIONS
- NEW: Furosemide 40 mg PO once daily in the morning (water pill).
- CHANGED: Metoprolol succinate increased to 50 mg PO daily.
- CONTINUE: Lisinopril 10 mg PO daily.
- STOP: Ibuprofen. Do not take NSAIDs (Advil, Motrin, Aleve).
- Potassium chloride 20 mEq PO daily.

DIET / ACTIVITY
Low sodium diet, less than 2,000 mg sodium per day. Limit fluids to 2 liters per day.
Weigh yourself every morning after urinating and before breakfast. Write it down.
Walk as tolerated. No heavy lifting over 10 lbs for 2 weeks.

FOLLOW-UP
Cardiology clinic (Dr. Reyes) in 7 days. Call 555-0142 to confirm time.
PCP follow-up in 1-2 weeks. Labs (BMP) at that visit.

CALL YOUR DOCTOR IF: weight gain of more than 2 lbs in one day or 5 lbs in one week, increased swelling in legs or ankles, dizziness.
CALL 911 IF: chest pain, severe shortness of breath, fainting.""",
    },
    "appendectomy": {
        "title": "Appendix surgery",
        "patient": "Fictional patient, 24",
        "instructions": """Discharge summary - Laparoscopic appendectomy, uncomplicated.

Pain: Acetaminophen 1000 mg every 6 hours as needed for pain, max 4000 mg per day. Oxycodone 5 mg every 4-6 hours as needed for severe pain (Rx given, #10). Do not drive while taking oxycodone.
Docusate 100 mg twice daily while taking oxycodone to prevent constipation.

Wound care: Keep incisions clean and dry. You may shower after 48 hours; pat dry. No baths, swimming or hot tubs until cleared. Steri-strips will fall off on their own.
Activity: No lifting more than 15 pounds and no strenuous exercise for 4 weeks. May return to desk work when off narcotic pain medication.
Diet: Regular diet as tolerated.

Follow up with general surgery clinic in 2 weeks for wound check.

Return to the ER for fever over 101.5 F, redness or pus at incision sites, vomiting and unable to keep fluids down, or worsening abdominal pain.""",
    },
    "pneumonia": {
        "title": "Pneumonia",
        "patient": "Fictional patient, 54",
        "instructions": """Dx: Community-acquired pneumonia.
Meds: Amoxicillin-clavulanate 875-125 mg PO BID x 5 more days. Azithromycin 250 mg PO daily x 3 more days. Finish all antibiotics even if you feel better.
Albuterol inhaler 2 puffs q4-6h PRN wheeze/SOB.
Home: Rest, drink plenty of fluids. Use incentive spirometer 10x/hour while awake. No smoking.
F/u with PCP.
Seek care for: fever returns, worsening cough, confusion, lips turning blue, trouble breathing.""",
    },
}
