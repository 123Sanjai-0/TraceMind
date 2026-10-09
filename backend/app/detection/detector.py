import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.database import Anomaly, Service, MetricRecord
from app.detection.statistical import StatisticalDetector
from app.detection.multivariate import MultivariateAnomalyDetector
from app.core.config import settings

class AnomalyDetectionService:
    def __init__(self):
        self.stat_detector = StatisticalDetector(z_threshold=settings.Z_SCORE_THRESHOLD)
        self.mv_detector = MultivariateAnomalyDetector()

    def run_detection_for_service(
        self,
        db: Session,
        service: Service,
        incident_id: Optional[str] = None,
        time_window_minutes: int = 15
    ) -> List[Anomaly]:
        detected_anomalies: List[Anomaly] = []
        now = datetime.datetime.utcnow()
        window_start = now - datetime.timedelta(minutes=time_window_minutes)

        # 1. Fetch metric history
        latency_records = db.query(MetricRecord).filter(
            MetricRecord.service_name == service.id,
            MetricRecord.metric_name == "latency",
            MetricRecord.timestamp >= window_start
        ).order_by(MetricRecord.timestamp.asc()).all()

        lat_values = [r.metric_value for r in latency_records]

        # Check Latency
        if lat_values:
            current_lat = service.p95_latency if service.p95_latency > 0 else (lat_values[-1] if lat_values else 0.0)
            baseline_lats = lat_values[:-1] if len(lat_values) > 1 else lat_values
            lat_res = self.stat_detector.detect_latency_anomaly(baseline_lats, current_lat)
            if lat_res:
                anomaly = Anomaly(
                    id=f"anom-{uuid.uuid4().hex[:8]}",
                    incident_id=incident_id,
                    service_name=service.id,
                    metric_name="p95_latency",
                    observed_value=lat_res["observed_value"],
                    baseline_value=lat_res["baseline_value"],
                    deviation_pct=lat_res["deviation_pct"],
                    severity=lat_res["severity"],
                    detected_at=now,
                    detection_method=lat_res["method"],
                    time_window=f"{time_window_minutes}m",
                    supporting_evidence=lat_res["evidence"],
                    is_simulated=service.is_simulated
                )
                db.add(anomaly)
                detected_anomalies.append(anomaly)

        # Check Error Rate
        error_records = db.query(MetricRecord).filter(
            MetricRecord.service_name == service.id,
            MetricRecord.metric_name == "error_rate",
            MetricRecord.timestamp >= window_start
        ).order_by(MetricRecord.timestamp.asc()).all()

        err_values = [r.metric_value for r in error_records]
        current_err = service.error_rate
        if err_values or current_err > settings.ERROR_RATE_THRESHOLD:
            baseline_errs = err_values[:-1] if len(err_values) > 1 else ([0.0] if not err_values else err_values)
            err_res = self.stat_detector.detect_error_rate_anomaly(
                baseline_errs,
                current_err,
                error_threshold=settings.ERROR_RATE_THRESHOLD
            )
            if err_res:
                anomaly = Anomaly(
                    id=f"anom-{uuid.uuid4().hex[:8]}",
                    incident_id=incident_id,
                    service_name=service.id,
                    metric_name="error_rate",
                    observed_value=err_res["observed_value"],
                    baseline_value=err_res["baseline_value"],
                    deviation_pct=err_res["deviation_pct"],
                    severity=err_res["severity"],
                    detected_at=now,
                    detection_method=err_res["method"],
                    time_window=f"{time_window_minutes}m",
                    supporting_evidence=err_res["evidence"],
                    is_simulated=service.is_simulated
                )
                db.add(anomaly)
                detected_anomalies.append(anomaly)

        # Check CPU or Memory
        if service.cpu_util > 85.0:
            anomaly = Anomaly(
                id=f"anom-{uuid.uuid4().hex[:8]}",
                incident_id=incident_id,
                service_name=service.id,
                metric_name="cpu_utilization",
                observed_value=round(service.cpu_util, 2),
                baseline_value=35.0,
                deviation_pct=round(((service.cpu_util - 35.0) / 35.0) * 100.0, 2),
                severity="high" if service.cpu_util < 95 else "critical",
                detected_at=now,
                detection_method="threshold_exceeded",
                time_window=f"{time_window_minutes}m",
                supporting_evidence=f"CPU utilization reached {service.cpu_util:.1f}%, exceeding 85% safety threshold.",
                is_simulated=service.is_simulated
            )
            db.add(anomaly)
            detected_anomalies.append(anomaly)

        return detected_anomalies

    def scan_all_services(self, db: Session, incident_id: Optional[str] = None) -> List[Anomaly]:
        services = db.query(Service).all()
        all_anomalies = []
        for svc in services:
            anoms = self.run_detection_for_service(db, svc, incident_id=incident_id)
            all_anomalies.extend(anoms)
        db.commit()
        return all_anomalies

anomaly_detector_service = AnomalyDetectionService()
