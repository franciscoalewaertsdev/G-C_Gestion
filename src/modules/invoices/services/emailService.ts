import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error("Faltan variables SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.");
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT debe ser un numero entero valido.");
  }

  return { host, port, user, pass, from };
}

export async function sendInvoiceEmail(
  customerEmail: string,
  invoiceNumber: string,
  invoiceFileName: string,
  invoicePdf: Buffer
) {
  const { host, port, user, pass, from } = getSmtpConfig();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    const result = await transporter.sendMail({
      from,
      to: customerEmail,
      subject: "Tu factura",
      html: `<p>Hola,</p><p>Gracias por tu compra. Adjuntamos tu factura <strong>${invoiceNumber}</strong> en PDF.</p>`,
      attachments: [
        {
          filename: invoiceFileName,
          content: invoicePdf,
          contentType: "application/pdf"
        }
      ]
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    throw new Error(`No se pudo enviar la factura por email: ${message}`);
  }
}
