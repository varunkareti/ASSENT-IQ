"""PDF generation using reportlab for AssentIQ consent forms."""

import os
import logging
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.utils import ImageReader

from database import DB_PATH

logger = logging.getLogger(__name__)

# Color tokens matching frontend
NAVY_900 = HexColor("#0C1B4D")
NAVY_700 = HexColor("#16255E")
BLUE_500 = HexColor("#2E6BE6")
TEAL_400 = HexColor("#22C7B0")
TEAL_300 = HexColor("#4FE0C8")
WHITE = HexColor("#FFFFFF")
BLACK = HexColor("#000000")
BORDER_SUBTLE = HexColor("#E3E8F0")
TEXT_MUTED = HexColor("#5C6B85")
DANGER = HexColor("#E4574C")

LOGO_PATH_PROJECT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo", "assentiq_logo.png")
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
STORAGE_LOGO_PATH = os.path.join(STORAGE_DIR, "assentiq_logo.png")
PDFS_DIR = os.path.join(STORAGE_DIR, "pdfs")
os.makedirs(PDFS_DIR, exist_ok=True)

# Use logo from storage if available, otherwise fall back to project assets
LOGO_PATH = STORAGE_LOGO_PATH if os.path.exists(STORAGE_LOGO_PATH) else LOGO_PATH_PROJECT


def _get_styles():
    """Return custom styles for the PDF."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "ClinicHeader",
        parent=styles["Title"],
        fontSize=16,
        textColor=NAVY_900,
        spaceAfter=2,
        spaceBefore=0,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "SectionTitle",
        parent=styles["Title"],
        fontSize=14,
        textColor=NAVY_900,
        spaceAfter=10,
        spaceBefore=14,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading1"],
        fontSize=12,
        textColor=NAVY_900,
        spaceBefore=12,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "SubSectionHeader",
        parent=styles["Heading2"],
        fontSize=10.5,
        textColor=NAVY_700,
        spaceBefore=8,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "BodyText2",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_900,
        spaceAfter=5,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "BodyItalic",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_900,
        spaceAfter=5,
        leading=14,
        fontName="Helvetica-Oblique",
    ))
    styles.add(ParagraphStyle(
        "BulletItem",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_900,
        leftIndent=18,
        spaceAfter=2,
        leading=13,
        bulletIndent=6,
    ))
    styles.add(ParagraphStyle(
        "InfoLabel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_700,
        fontName="Helvetica-Bold",
        leftIndent=0,
        spaceAfter=2,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "InfoValue",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_900,
        leftIndent=0,
        spaceAfter=2,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "SignatureLabel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=NAVY_700,
        fontName="Helvetica-Bold",
        spaceAfter=2,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "SmallMuted",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=TEXT_MUTED,
        spaceAfter=3,
        leading=11,
    ))
    styles.add(ParagraphStyle(
        "PracticeInfo",
        parent=styles["Normal"],
        fontSize=9,
        textColor=NAVY_700,
        spaceAfter=1,
        leading=12,
    ))

    return styles


def _add_pulse_line(canvas, doc):
    """Draw a thin line divider on each page."""
    canvas.saveState()
    canvas.setStrokeColor(BORDER_SUBTLE)
    canvas.setLineWidth(0.5)
    y = 720
    canvas.line(54, y, 556, y)
    canvas.restoreState()


def generate_consent_pdf(session, procedure_json, qa_summary, signature_path) -> str:
    """
    Generate a professional consent PDF matching the clinical form.

    Args:
        session: dict-like with session fields (id, patient_name, procedure_id, tooth,
                 clinic_name, doctor_name, created_at, clinic_address, clinic_phone,
                 clinic_email, clinic_website)
        procedure_json: dict with procedure content
        qa_summary: str Gemini-generated Q&A summary
        signature_path: filesystem path to the signature PNG

    Returns:
        Filesystem path to the generated PDF.
    """
    session_id = session["id"]
    pdf_path = os.path.join(PDFS_DIR, f"{session_id}.pdf")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pg = letter  # 612 x 792 points

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=pg,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = _get_styles()
    story = []

    # ---- HEADER: Practice/Clinic info + Doctor info ----
    practice_name = session.get("clinic_name", "Dental Practice")
    doctor_name = session.get("doctor_name", "N/A")
    clinic_address = session.get("clinic_address", "")
    clinic_phone = session.get("clinic_phone", "")
    clinic_email = session.get("clinic_email", "")
    clinic_website = session.get("clinic_website", "")

    # Top row: Practice info (left) + Doctor info (right)
    practice_lines = [practice_name]
    if clinic_address:
        practice_lines.append(clinic_address)
    if clinic_phone:
        practice_lines.append(f"Phone: {clinic_phone}")
    if clinic_email:
        practice_lines.append(f"Email: {clinic_email}")
    if clinic_website:
        practice_lines.append(f"Website: {clinic_website}")

    doctor_lines = []
    if doctor_name:
        doctor_lines.append(f"Doctor: {doctor_name}")
    if clinic_phone:
        doctor_lines.append(f"Phone: {clinic_phone}")
    if clinic_email:
        doctor_lines.append(f"Email: {clinic_email}")
    if clinic_website:
        doctor_lines.append(f"Website: {clinic_website}")

    practice_data = [[Paragraph(line, styles["PracticeInfo"]) for line in practice_lines]]
    doctor_data = [[Paragraph(line, styles["PracticeInfo"]) for line in doctor_lines]]

    header_table = Table(practice_data + doctor_data, colWidths=[280, 280])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY_900))
    story.append(Spacer(1, 14))

    # ---- TITLE ----
    story.append(Paragraph("Informed Consent Form", styles["SectionTitle"]))
    story.append(Spacer(1, 12))

    # ---- PATIENT INFORMATION ----
    patient_name = session.get("patient_name", "N/A")
    tooth = session.get("tooth", "Not specified")
    consent_date = now

    patient_info_data = [
        ["Patient Name:", patient_name, "Tooth/Teeth:", tooth],
        ["Date:", consent_date, "", ""],
    ]
    patient_table = Table(patient_info_data, colWidths=[100, 180, 80, 180])
    patient_table.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
        ("FONT", (2, 0), (2, -1), "Helvetica-Bold", 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), NAVY_700),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 14))

    # ---- DIAGNOSIS & PROGNOSIS ----
    story.append(Paragraph("Diagnosis & Prognosis", styles["SectionHeader"]))

    diagnosis_text = procedure_json.get("diagnosis", "")
    prognosis_text = procedure_json.get("prognosis", "")

    diag_prognosis_data = [
        [Paragraph("<b>Diagnosis:</b>", styles["InfoLabel"]), Paragraph(diagnosis_text, styles["InfoValue"])],
        [Paragraph("<b>Prognosis:</b>", styles["InfoLabel"]), Paragraph(prognosis_text, styles["InfoValue"])],
    ]
    dp_table = Table(diag_prognosis_data, colWidths=[100, 460])
    dp_table.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_SUBTLE),
        ("GRID", (0, 1), (-1, -1), 0.5, BORDER_SUBTLE),
        ("BACKGROUND", (0, 0), (0, 0), HexColor("#F7F9FC")),
        ("BACKGROUND", (0, 1), (0, 1), HexColor("#F7F9FC")),
    ]))
    story.append(dp_table)
    story.append(Spacer(1, 10))

    # ---- PROPOSED TREATMENT ----
    story.append(Paragraph("Proposed Treatment", styles["SectionHeader"]))
    story.append(Paragraph(
        "The recommended treatment is <b>{}</b>. This procedure has been explained to me, including how it is "
        "performed and its intended purpose.".format(
            procedure_json.get("display_name", "the proposed treatment")
        ),
        styles["BodyText2"]
    ))
    story.append(Spacer(1, 6))

    # ---- ALTERNATIVES TO TREATMENT ----
    story.append(Paragraph("Alternatives to Treatment", styles["SectionHeader"]))
    alternatives = procedure_json.get("alternatives", [])
    if alternatives:
        alt_text = ", ".join(["<b>{}</b>".format(a) for a in alternatives])
        story.append(Paragraph(
            "I understand that alternatives include {}, and that the risks and benefits of "
            "each have been explained to me.".format(alt_text),
            styles["BodyText2"]
        ))
    else:
        story.append(Paragraph(
            "I understand that alternatives to this treatment have been explained to me, "
            "including the risks and benefits of each.",
            styles["BodyText2"]
        ))
    story.append(Spacer(1, 6))

    # ---- RISKS OF TREATMENT ----
    story.append(Paragraph("Risks of {}".format(
        procedure_json.get("display_name", "This Treatment")
    ), styles["SectionHeader"]))

    risks = procedure_json.get("risks", [])
    if risks:
        # Each risk must be a separate Paragraph because reportlab only allows one <bullet> tag per Paragraph
        for risk in risks:
            story.append(Paragraph("<bullet>&bull;</bullet> {}".format(risk), styles["BulletItem"]))
    else:
        story.append(Paragraph(
            "Possible risks may include, but are not limited to: swelling, sensitivity, bleeding, or pain; "
            "infection; numbness or tingling; reactions to injections or medications; treatment failure; "
            "and other complications as discussed with my doctor.",
            styles["BodyText2"]
        ))
    story.append(Spacer(1, 6))

    # ---- NO GUARANTEE, QUESTIONS & DISCUSSION ----
    story.append(Paragraph("No Guarantee, Questions & Discussion", styles["SectionHeader"]))
    story.append(Paragraph(
        "I understand that <b>no specific result or perfect outcome is guaranteed or warranted</b>. "
        "I acknowledge that I have had the opportunity to ask questions about my diagnosis, treatment, "
        "risks, and alternatives, and that all questions have been answered to my satisfaction. "
        "I understand that this form summarizes, but does not replace, the discussion I had with my doctor.",
        styles["BodyText2"]
    ))
    story.append(Spacer(1, 10))

    # ---- CONSENT TO TREATMENT ----
    story.append(Paragraph("Consent to Treatment", styles["SectionHeader"]))
    story.append(Paragraph(
        "By signing below, I authorize the doctor named above to perform the <b>{}</b> described in this form. "
        "I understand that my consent is limited to the procedures discussed and that I will be asked to "
        "provide further consent if the treatment plan changes materially.".format(
            procedure_json.get("display_name", "the proposed treatment")
        ),
        styles["BodyText2"]
    ))
    story.append(Spacer(1, 20))

    # ---- SIGNATURES ----
    story.append(Paragraph("Signatures", styles["SectionHeader"]))

    # Check if signature image exists and add it
    sig_img = None
    if signature_path and os.path.exists(signature_path):
        try:
            sig_img = Image(signature_path)
            # Scale signature to fit in the table cell
            sig_img.drawHeight = 40
            sig_img.drawWidth = 120
        except Exception:
            sig_img = None

    # Build signature rows
    sig_placeholder = "_________________________ "
    sig_label = "Patient/Authorized Representative"

    if sig_img:
        sig_rows = [
            ["Patient Signature:", "", "Doctor Signature:"],
            [sig_img, "", ""],  # Signature image in patient column
            [sig_placeholder, "", sig_placeholder],
            [sig_label, "", "Doctor"],
            ["Date/Time:", consent_date, "Date/Time:"],
        ]
    else:
        sig_rows = [
            ["Patient Signature:", "", "Doctor Signature:"],
            ["", "", ""],
            [sig_placeholder, "", sig_placeholder],
            [sig_label, "", "Doctor"],
            ["Date/Time:", consent_date, "Date/Time:"],
        ]

    sig_table = Table(sig_rows, colWidths=[200, 112, 200])
    sig_table.setStyle(TableStyle([
        ("FONT", (0, 0), (0, 0), "Helvetica-Bold", 9),
        ("FONT", (2, 0), (2, 0), "Helvetica-Bold", 9),
        ("FONT", (0, 3), (0, 3), "Helvetica-Oblique", 8),
        ("FONT", (2, 3), (2, 3), "Helvetica-Oblique", 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 16))

    # ---- Q&A LOG (if any questions were asked) ----
    if qa_summary and qa_summary != "Patient had no additional questions.":
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_SUBTLE))
        story.append(Spacer(1, 8))
        story.append(Paragraph("Patient Questions & Answers", styles["SubSectionHeader"]))
        story.append(Paragraph(qa_summary, styles["BodyText2"]))
        story.append(Spacer(1, 10))

    # ---- FOOTER ----
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_SUBTLE))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<i>No medical or dental procedure is without risk, and no outcome can be guaranteed. "
        "This consent form is a record of your education and consent. It does not replace the "
        "doctor's clinical judgment or the in-person informed-consent discussion, which remains "
        "the standard of care.</i>",
        styles["SmallMuted"]
    ))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        f"Generated by AssentIQ — AI Dental Consent Assistant | {now}",
        styles["Footer"],
    ))

    # Build with page callback for pulse line
    doc.build(story, onFirstPage=_add_pulse_line, onLaterPages=_add_pulse_line)

    return pdf_path