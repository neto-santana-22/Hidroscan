import io
from datetime import date

from django.http import FileResponse, StreamingHttpResponse
from drf_spectacular.utils import extend_schema
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hidroscan.services import register_audit

from .serializers import ReportQuerySerializer
from .services import UnsupportedReportError, build_report, csv_rows


@extend_schema(parameters=[ReportQuerySerializer], responses={(200, "text/csv"): str, (200, "application/pdf"): bytes})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_report(request, report_type):
    query = ReportQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    filters = query.validated_data
    try:
        title, headers, rows = build_report(report_type=report_type, user=request.user, filters=filters)
    except UnsupportedReportError as error:
        return Response({"detail": str(error)}, status=status.HTTP_404_NOT_FOUND)

    filename = f"hidroscan-{report_type}-{date.today().isoformat()}"
    register_audit(actor=request.user, action="report.exported", resource=request.user, details={"type": report_type, "format": filters["formato"]})
    if filters["formato"] == "csv":
        response = StreamingHttpResponse(csv_rows(headers, rows), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
        return response

    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    y = height - 48
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, f"Hidroscan — {title}")
    y -= 28
    pdf.setFont("Helvetica-Bold", 8)
    header_text = " | ".join(headers)
    pdf.drawString(40, y, header_text[:150])
    y -= 16
    pdf.setFont("Helvetica", 8)
    for row in rows:
        line = " | ".join(str(value) for value in row)
        if y < 42:
            pdf.showPage()
            y = height - 48
            pdf.setFont("Helvetica", 8)
        pdf.drawString(40, y, line[:150])
        y -= 13
    pdf.save()
    output.seek(0)
    return FileResponse(output, as_attachment=True, filename=f"{filename}.pdf", content_type="application/pdf")
