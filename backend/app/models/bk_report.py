from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BKDailyReport(Base):
    __tablename__ = "bk_daily_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_code: Mapped[str] = mapped_column(String(10), nullable=False, default="BK")
    restaurant_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    channel_sales: Mapped[list["BKChannelSales"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    consumption_modes: Mapped[list["BKConsumptionMode"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    corrections: Mapped[list["BKCorrections"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    divers: Mapped[list["BKDivers"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    payments: Mapped[list["BKPayment"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    remises: Mapped[list["BKRemises"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    tva_summary: Mapped[list["BKTvaSummary"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    annex_sales: Mapped[list["BKAnnexSale"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )


class BKChannelSales(Base):
    __tablename__ = "bk_channel_sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    channel_label: Mapped[str] = mapped_column(String(120), nullable=False)
    tac: Mapped[int] = mapped_column(Integer, nullable=True)
    ca_net: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    ca_ttc: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    pm_net: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    pm_ttc: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    net_total_profit: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="channel_sales")


class BKConsumptionMode(Base):
    __tablename__ = "bk_consumption_modes"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)  # SP / AE
    tac: Mapped[int] = mapped_column(Integer, nullable=True)
    ca_ht: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    ca_ttc: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    pct: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="consumption_modes")


class BKCorrections(Base):
    __tablename__ = "bk_corrections"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    taux: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    montant: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    nombre: Mapped[int] = mapped_column(Integer, nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="corrections")


class BKDivers(Base):
    __tablename__ = "bk_divers"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    nombre_repas_employes: Mapped[int] = mapped_column(Integer, nullable=True)
    nombre_commandes_ouvertes: Mapped[int] = mapped_column(Integer, nullable=True)
    montant_valorise_repas_employes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    nombre_annulations: Mapped[int] = mapped_column(Integer, nullable=True)
    montant_annulations: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    taux_commandes_ouvertes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    taux_repas_employes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    montant_commandes_ouvertes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    taux_annulations: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="divers")


class BKPayment(Base):
    __tablename__ = "bk_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    payment_type: Mapped[str] = mapped_column(String(80), nullable=False)
    theorique: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    preleve: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    compte: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    ecart: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="payments")


class BKRemises(Base):
    __tablename__ = "bk_remises"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    taux_remises: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    montant_remises: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    nombre_remises: Mapped[int] = mapped_column(Integer, nullable=True)
    taux_sauces_offertes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    montant_sauces_offertes: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    nbr_sauces_offertes: Mapped[int] = mapped_column(Integer, nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="remises")


class BKTvaSummary(Base):
    __tablename__ = "bk_tva_summary"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    tva_label: Mapped[str] = mapped_column(String(30), nullable=False)
    ht: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    tva: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    ttc: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="tva_summary")


class BKAnnexSale(Base):
    __tablename__ = "bk_annex_sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("bk_daily_reports.id"), index=True)
    libelle: Mapped[str] = mapped_column(String(255), nullable=False)
    nbr: Mapped[int] = mapped_column(Integer, nullable=True)
    montant_ht: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)
    montant_ttc: Mapped[float] = mapped_column(Numeric(14, 6), nullable=True)

    report: Mapped[BKDailyReport] = relationship(back_populates="annex_sales")
