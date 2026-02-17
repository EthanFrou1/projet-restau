import os
import smtplib
from email.message import EmailMessage


def _smtp_enabled() -> bool:
    return bool(os.getenv("SMTP_HOST")) and bool(os.getenv("SMTP_FROM"))


def send_temporary_password_email(
    *,
    to_email: str,
    temp_password: str,
    created_by_email: str,
) -> tuple[bool, str | None]:
    if not _smtp_enabled():
        return (False, "SMTP non configure (SMTP_HOST/SMTP_FROM)")

    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", "")
    use_tls = os.getenv("SMTP_STARTTLS", "true").lower() != "false"
    app_base_url = os.getenv("APP_BASE_URL", "http://localhost:5173")

    msg = EmailMessage()
    msg["Subject"] = "Projet Restau - Votre compte a été créé"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "\n".join(
            [
                "Bonjour,",
                "",
                "Un compte Projet Restau vient d'être créé pour vous.",
                f"Email: {to_email}",
                f"Mot de passe temporaire: {temp_password}",
                "",
                "À votre première connexion, vous devrez changer ce mot de passe.",
                f"Connexion: {app_base_url}/login",
                "",
                f"Créé par: {created_by_email}",
            ]
        )
    )

    try:
        with smtplib.SMTP(host=host, port=port, timeout=15) as server:
            if use_tls:
                server.starttls()
            if username:
                server.login(username, password)
            server.send_message(msg)
        return (True, None)
    except Exception as exc:  # pragma: no cover
        return (False, str(exc))
