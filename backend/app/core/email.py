import os
import smtplib
from datetime import date
from email.message import EmailMessage


def _smtp_enabled() -> bool:
    return bool(os.getenv("SMTP_HOST")) and bool(os.getenv("SMTP_FROM"))


def _build_html_email(
    *,
    to_email: str,
    temp_password: str,
    created_by_email: str,
    login_url: str,
) -> str:
    current_year = date.today().year
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre compte BK Reports</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Bree+Serif&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#F5ECD7;font-family:'Barlow','Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5ECD7;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Carte principale -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(74,40,16,0.12);">

          <!-- ═══════════ HEADER ═══════════ -->
          <tr>
            <td style="background-color:#4A2810;padding:0;">
              <!-- Bande rouge BK en haut -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#D62900;height:6px;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <!-- Flamme BK SVG inline -->
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:14px;">
                                <div style="width:44px;height:44px;background-color:#D62900;border-radius:8px;display:inline-block;text-align:center;line-height:44px;">
                                  <span style="color:#FFD98A;font-size:22px;font-weight:900;font-family:'Bree Serif',Georgia,serif;line-height:44px;display:block;">BK</span>
                                </div>
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-family:'Bree Serif',Georgia,serif;font-size:22px;font-weight:400;color:#FFD98A;letter-spacing:0.5px;">
                                  BK Reports
                                </p>
                                <p style="margin:2px 0 0 0;font-size:12px;color:#C49A6C;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">
                                  Gestion &amp; Performance
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="background-color:#D62900;color:#FFFFFF;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;">
                            Nouveau compte
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ CORPS ═══════════ -->
          <tr>
            <td style="background-color:#FFFCF0;padding:40px 40px 32px 40px;">

              <!-- Salutation -->
              <p style="margin:0 0 8px 0;font-family:'Bree Serif',Georgia,serif;font-size:24px;color:#4A2810;">
                Bienvenue&nbsp;! 👋
              </p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#6B4226;line-height:1.6;">
                Un compte vient d'être créé pour vous sur la plateforme <strong>BK Reports</strong>.<br/>
                Retrouvez ci-dessous vos identifiants de connexion.
              </p>

              <!-- Bloc identifiants -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#FDF5E4;border:1.5px solid #FFD98A;border-radius:10px;padding:24px 28px;">

                    <!-- Email -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:2px;">
                          <div style="width:16px;height:16px;background-color:#D62900;border-radius:50%;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#9B6A3A;text-transform:uppercase;letter-spacing:1px;">Adresse email</p>
                          <p style="margin:0;font-size:16px;font-weight:600;color:#4A2810;font-family:'Courier New',Courier,monospace;">{to_email}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Séparateur -->
                    <div style="height:1px;background-color:#FFD98A;margin-bottom:16px;"></div>

                    <!-- Mot de passe -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:2px;">
                          <div style="width:16px;height:16px;background-color:#D62900;border-radius:50%;"></div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;color:#9B6A3A;text-transform:uppercase;letter-spacing:1px;">Mot de passe temporaire</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#D62900;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">{temp_password}</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Avertissement changement de mdp -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#FFF3CD;border-left:4px solid #D62900;border-radius:0 6px 6px 0;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#7A4010;line-height:1.5;">
                      ⚠️&nbsp; <strong>Mot de passe temporaire :</strong> lors de votre première connexion, il vous sera demandé de le modifier immédiatement.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Bouton CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background-color:#D62900;border-radius:8px;">
                    <a href="{login_url}"
                       style="display:inline-block;padding:14px 40px;font-family:'Bree Serif',Georgia,serif;font-size:16px;font-weight:400;color:#FFFFFF;text-decoration:none;letter-spacing:0.5px;border-radius:8px;">
                      Se connecter à BK Reports →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien texte fallback -->
              <p style="margin:16px 0 0 0;text-align:center;font-size:12px;color:#9B6A3A;">
                Ou copiez ce lien :
                <a href="{login_url}" style="color:#D62900;text-decoration:underline;">{login_url}</a>
              </p>

            </td>
          </tr>

          <!-- ═══════════ FOOTER ═══════════ -->
          <tr>
            <td style="background-color:#4A2810;padding:0;">
              <!-- Ligne décorative orange -->
              <div style="height:3px;background:linear-gradient(90deg,#D62900 0%,#FFB347 50%,#FFD98A 100%);"></div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 40px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-size:12px;color:#C49A6C;line-height:1.5;">
                      Ce compte a été créé par <strong style="color:#FFD98A;">{created_by_email}</strong>.
                    </p>
                    <p style="margin:0;font-size:11px;color:#8B6040;line-height:1.5;">
                      Vous recevez cet e-mail car un administrateur a créé un compte à votre adresse.<br/>
                      Si vous n'êtes pas concerné(e), ignorez ce message.
                    </p>
                  </td>
                  <td align="right" style="vertical-align:bottom;padding-left:24px;white-space:nowrap;">
                    <p style="margin:0;font-family:'Bree Serif',Georgia,serif;font-size:13px;color:#FFD98A;opacity:0.6;">BK Reports</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- Fin carte principale -->

        <!-- Mention sous la carte -->
        <p style="margin:20px 0 0 0;font-size:11px;color:#9B6A3A;text-align:center;">
          © {current_year} BK Reports — Usage interne uniquement
        </p>

      </td>
    </tr>
  </table>

</body>
</html>"""


def _build_plain_text_email(
    *,
    to_email: str,
    temp_password: str,
    created_by_email: str,
    login_url: str,
) -> str:
    return "\n".join([
        "BK REPORTS — Votre compte a été créé",
        "=" * 40,
        "",
        "Bonjour,",
        "",
        "Un compte BK Reports vient d'être créé pour vous.",
        "",
        f"  Email              : {to_email}",
        f"  Mot de passe temp. : {temp_password}",
        "",
        "Lors de votre première connexion, vous devrez changer ce mot de passe.",
        "",
        f"  Connexion : {login_url}",
        "",
        "-" * 40,
        f"Créé par : {created_by_email}",
        "",
        "Si vous n'êtes pas concerné(e), ignorez ce message.",
    ])


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
    login_url = f"{app_base_url}/login"

    msg = EmailMessage()
    msg["Subject"] = "BK Reports — Votre compte a été créé"
    msg["From"] = from_email
    msg["To"] = to_email

    # Fallback texte brut
    msg.set_content(_build_plain_text_email(
        to_email=to_email,
        temp_password=temp_password,
        created_by_email=created_by_email,
        login_url=login_url,
    ))

    # Version HTML riche (préférée par les clients mail modernes)
    msg.add_alternative(_build_html_email(
        to_email=to_email,
        temp_password=temp_password,
        created_by_email=created_by_email,
        login_url=login_url,
    ), subtype="html")

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
