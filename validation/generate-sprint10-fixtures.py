"""Generate synthetic SIU-like PDFs for the first-upload regression. No personal data."""

from pathlib import Path
from reportlab.pdfgen import canvas
import sys

destination = Path(sys.argv[1])
destination.mkdir(parents=True, exist_ok=True)

for title in ("Profesorado", "Licenciatura"):
    path = destination / f"sprint10-plastica-{title.lower()}-dibujo-2006.pdf"
    pdf = canvas.Canvas(str(path))
    pdf.setFont("Helvetica", 11)
    y = 800
    for line in (
        "SIU Guarani - Analitico con regularizadas",
        f"{title} en Artes Plasticas con orientacion en Dibujo",
        "Plan: 2006",
        "Aprobadas",
        "Arte Contemporaneo 8 (Ocho) 16/12/2019 33736",
        "Historia Social General 9 (Nueve) 20/11/2020 33737",
        "Dibujo 1 7 (Siete) 15/12/2021 33738",
        "Creditos / Optativas",
        "Escenografia Complementaria 8 (Ocho) 10/12/2022 33739",
    ):
        pdf.drawString(52, y, line)
        y -= 24
    pdf.save()
    print(path)
