use lettre::{
    message::{header::ContentType, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

use crate::relay::config::SmtpConfig;

fn build_transport(config: &SmtpConfig) -> Result<AsyncSmtpTransport<Tokio1Executor>, String> {
    let creds = Credentials::new(config.user.clone(), config.pass.clone());

    let builder = if config.secure {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&config.host)
            .map_err(|e| e.to_string())?
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)
            .map_err(|e| e.to_string())?
    };

    Ok(builder.port(config.port).credentials(creds).build())
}

pub async fn test_connection(config: &SmtpConfig) -> Result<(), String> {
    let transport = build_transport(config)?;
    transport
        .test_connection()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn send_mail(
    config: &SmtpConfig,
    to: &str,
    subject: &str,
    text: &str,
    html: Option<&str>,
) -> Result<String, String> {
    let from = config
        .from
        .parse()
        .map_err(|e: lettre::address::AddressError| e.to_string())?;
    let to_addr = to
        .parse()
        .map_err(|e: lettre::address::AddressError| e.to_string())?;

    let email = if let Some(html_body) = html {
        Message::builder()
            .from(from)
            .to(to_addr)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(text.to_string()),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html_body.to_string()),
                    ),
            )
            .map_err(|e| e.to_string())?
    } else {
        Message::builder()
            .from(from)
            .to(to_addr)
            .subject(subject)
            .body(text.to_string())
            .map_err(|e| e.to_string())?
    };

    let transport = build_transport(config)?;
    transport.send(email).await.map_err(|e| e.to_string())?;

    Ok(format!("<{}@hesia.local>", uuid::Uuid::new_v4()))
}
